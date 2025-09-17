package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

// ExecutionRequest represents a request to execute code
type ExecutionRequest struct {
	Language string            `json:"language"`
	Code     string            `json:"code"`
	Input    string            `json:"input,omitempty"`
	Files    map[string]string `json:"files,omitempty"`
	Options  map[string]interface{} `json:"options,omitempty"`
}

// ExecutionResponse represents the response from code execution
type ExecutionResponse struct {
	Success   bool   `json:"success"`
	Output    string `json:"output"`
	Error     string `json:"error,omitempty"`
	ExitCode  int    `json:"exitCode"`
	Runtime   int64  `json:"runtime"`
	MemoryUsed int64 `json:"memoryUsed,omitempty"`
}

// RemoteRunner forwards execution requests to external sandbox service
type RemoteRunner struct {
	sandboxServiceURL string
	client           *http.Client
}

// NewRemoteRunner creates a new remote runner instance
func NewRemoteRunner() *RemoteRunner {
	sandboxURL := os.Getenv("SANDBOX_SERVICE_URL")
	if sandboxURL == "" {
		log.Println("⚠️  WARNING: SANDBOX_SERVICE_URL not set. Code execution will fail.")
		log.Println("📝 Please set SANDBOX_SERVICE_URL in Replit secrets to enable code execution.")
		sandboxURL = "http://localhost:8000" // Fallback URL
	}

	return &RemoteRunner{
		sandboxServiceURL: sandboxURL,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// handleRun forwards execution requests to the external sandbox service
func (rr *RemoteRunner) handleRun(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Content-Type", "application/json")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Read the request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Error reading request body: %v", err)
		http.Error(w, "Failed to read request", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Parse the execution request
	var execReq ExecutionRequest
	if err := json.Unmarshal(body, &execReq); err != nil {
		log.Printf("Error parsing execution request: %v", err)
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	log.Printf("🔄 Forwarding %s execution request to sandbox service", execReq.Language)

	// Forward the request to the sandbox service
	forwardURL := fmt.Sprintf("%s/run", rr.sandboxServiceURL)
	req, err := http.NewRequest("POST", forwardURL, bytes.NewBuffer(body))
	if err != nil {
		log.Printf("Error creating forward request: %v", err)
		rr.sendErrorResponse(w, "Failed to create forward request", 500)
		return
	}

	// Copy headers from original request
	req.Header.Set("Content-Type", "application/json")
	for name, values := range r.Header {
		for _, value := range values {
			req.Header.Add(name, value)
		}
	}

	// Make the request to sandbox service
	startTime := time.Now()
	resp, err := rr.client.Do(req)
	duration := time.Since(startTime)

	if err != nil {
		log.Printf("Error forwarding to sandbox service: %v", err)
		rr.sendErrorResponse(w, fmt.Sprintf("Sandbox service unavailable: %v", err), 503)
		return
	}
	defer resp.Body.Close()

	// Read the response
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error reading sandbox response: %v", err)
		rr.sendErrorResponse(w, "Failed to read sandbox response", 502)
		return
	}

	// Forward the response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	w.Write(responseBody)

	log.Printf("✅ Request forwarded successfully in %v", duration)
}

// sendErrorResponse sends a standardized error response
func (rr *RemoteRunner) sendErrorResponse(w http.ResponseWriter, message string, statusCode int) {
	errorResp := ExecutionResponse{
		Success:  false,
		Output:   "",
		Error:    message,
		ExitCode: 1,
		Runtime:  0,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(errorResp)
}

// handleHealth provides a health check endpoint
func (rr *RemoteRunner) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	health := map[string]interface{}{
		"status":            "ok",
		"service":           "remote-runner",
		"sandboxServiceURL": rr.sandboxServiceURL,
		"timestamp":         time.Now().Unix(),
	}

	// Test connection to sandbox service
	if rr.sandboxServiceURL != "http://localhost:8000" {
		testReq, err := http.NewRequest("GET", fmt.Sprintf("%s/health", rr.sandboxServiceURL), nil)
		if err == nil {
			testReq.Header.Set("User-Agent", "e-code-remote-runner/1.0")
			resp, err := rr.client.Do(testReq)
			if err != nil {
				health["sandboxStatus"] = "unreachable"
				health["sandboxError"] = err.Error()
			} else {
				resp.Body.Close()
				health["sandboxStatus"] = "connected"
				health["sandboxStatusCode"] = resp.StatusCode
			}
		}
	} else {
		health["sandboxStatus"] = "not_configured"
		health["warning"] = "SANDBOX_SERVICE_URL not set"
	}

	json.NewEncoder(w).Encode(health)
}

func main() {
	runner := NewRemoteRunner()

	// Setup routes
	http.HandleFunc("/run", runner.handleRun)
	http.HandleFunc("/health", runner.handleHealth)
	
	// Root endpoint with service information
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		info := map[string]string{
			"service":     "E-Code Remote Runner",
			"version":     "1.0.0",
			"description": "Forwards code execution requests to external sandbox service",
			"endpoints":   "/run (POST), /health (GET)",
		}
		json.NewEncoder(w).Encode(info)
	})

	port := os.Getenv("RUNNER_PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 E-Code Remote Runner starting on port %s", port)
	log.Printf("🔗 Sandbox service URL: %s", runner.sandboxServiceURL)
	log.Printf("📋 Available endpoints:")
	log.Printf("   - POST /run - Execute code")
	log.Printf("   - GET /health - Health check")
	log.Printf("   - GET / - Service info")

	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("❌ Failed to start server: %v", err)
	}
}