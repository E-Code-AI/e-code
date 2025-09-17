package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/gorilla/mux"
)

// ExecutionRequest represents a code execution request
type ExecutionRequest struct {
	Code     string            `json:"code"`
	Language string            `json:"language"`
	Files    map[string]string `json:"files,omitempty"`
	Timeout  int               `json:"timeout,omitempty"`
}

// ExecutionResult represents the result of code execution
type ExecutionResult struct {
	Success       bool   `json:"success"`
	ExitCode      int    `json:"exit_code"`
	Stdout        string `json:"stdout"`
	Stderr        string `json:"stderr"`
	ExecutionTime int64  `json:"execution_time_ms"`
	Error         string `json:"error,omitempty"`
}

// DockerRunner manages container execution using Docker CLI
type DockerRunner struct {
	apiKey       string
	timeout      time.Duration
	sandboxImage string
	seccompPath  string
}

// NewDockerRunner creates a new DockerRunner instance
func NewDockerRunner() (*DockerRunner, error) {
	// Check if Docker is available
	if err := exec.Command("docker", "version").Run(); err != nil {
		return nil, fmt.Errorf("Docker is not available: %v", err)
	}

	// Get configuration from environment
	apiKey := os.Getenv("EXECUTOR_API_KEY")
	if apiKey == "" {
		apiKey = "development-key-change-in-production"
		log.Println("WARNING: Using default API key - set EXECUTOR_API_KEY in production")
	}

	timeoutSec := 30
	if envTimeout := os.Getenv("SANDBOX_TIMEOUT_SEC"); envTimeout != "" {
		fmt.Sscanf(envTimeout, "%d", &timeoutSec)
	}

	sandboxImage := os.Getenv("SANDBOX_IMAGE")
	if sandboxImage == "" {
		sandboxImage = "ecode-sandbox:latest"
	}

	seccompPath := os.Getenv("SECCOMP_PROFILE")
	if seccompPath == "" {
		seccompPath = "./seccomp.json"
	}

	return &DockerRunner{
		apiKey:       apiKey,
		timeout:      time.Duration(timeoutSec) * time.Second,
		sandboxImage: sandboxImage,
		seccompPath:  seccompPath,
	}, nil
}

// authenticate checks the API key
func (dr *DockerRunner) authenticate(r *http.Request) bool {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return false
	}

	// Support both "Bearer token" and "token" formats
	token := strings.TrimPrefix(authHeader, "Bearer ")
	return token == dr.apiKey
}

// getCommand returns the appropriate command for the given language
func (dr *DockerRunner) getCommand(language, mainFile string) []string {
	switch strings.ToLower(language) {
	case "python", "python3":
		return []string{"python3", mainFile}
	case "javascript", "node", "nodejs":
		return []string{"node", mainFile}
	case "java":
		className := strings.TrimSuffix(mainFile, ".java")
		return []string{"sh", "-c", fmt.Sprintf("javac %s && java %s", mainFile, className)}
	case "go":
		return []string{"go", "run", mainFile}
	case "bash", "shell":
		return []string{"bash", mainFile}
	default:
		return []string{"cat", mainFile} // Default: just show the file content
	}
}

// getMainFileName returns the appropriate filename for the given language
func (dr *DockerRunner) getMainFileName(language string) string {
	switch strings.ToLower(language) {
	case "python", "python3":
		return "main.py"
	case "javascript", "node", "nodejs":
		return "main.js"
	case "java":
		return "Main.java"
	case "go":
		return "main.go"
	case "bash", "shell":
		return "script.sh"
	default:
		return "main.txt"
	}
}

// executeCode runs the provided code in a secure container using Docker CLI
func (dr *DockerRunner) executeCode(ctx context.Context, req ExecutionRequest) (*ExecutionResult, error) {
	startTime := time.Now()

	// Prepare files
	files := req.Files
	if files == nil {
		files = make(map[string]string)
	}

	// Add main file
	mainFile := dr.getMainFileName(req.Language)
	files[mainFile] = req.Code

	// Create temporary directory for files
	tempDir, err := os.MkdirTemp("", "ecode-execution-*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Write files to temp directory
	for filename, content := range files {
		filePath := filepath.Join(tempDir, filename)
		if err := os.MkdirAll(filepath.Dir(filePath), 0755); err != nil {
			return nil, fmt.Errorf("failed to create directory for %s: %v", filename, err)
		}
		if err := os.WriteFile(filePath, []byte(content), 0644); err != nil {
			return nil, fmt.Errorf("failed to write file %s: %v", filename, err)
		}
	}

	// Prepare Docker command
	cmd := dr.getCommand(req.Language, mainFile)
	dockerArgs := []string{
		"run",
		"--rm",                                    // Remove container after execution
		"--network", "none",                       // No network access
		"--memory", "512m",                        // Memory limit
		"--cpus", "1",                             // CPU limit
		"--pids-limit", "100",                     // Process limit
		"-v", tempDir + ":/workspace",             // Mount code directory
		"-w", "/workspace",                        // Working directory
		"--user", "coderunner",                    // Non-root user
		"--security-opt", "no-new-privileges",     // Security option
	}

	// Add seccomp profile if available
	if _, err := os.Stat(dr.seccompPath); err == nil {
		seccompArg := fmt.Sprintf("seccomp=%s", dr.seccompPath)
		dockerArgs = append(dockerArgs, "--security-opt", seccompArg)
	}

	// Add image and command
	dockerArgs = append(dockerArgs, dr.sandboxImage)
	dockerArgs = append(dockerArgs, cmd...)

	// Execute with timeout
	execCtx, cancel := context.WithTimeout(ctx, dr.timeout)
	defer cancel()

	dockerCmd := exec.CommandContext(execCtx, "docker", dockerArgs...)

	var stdout, stderr bytes.Buffer
	dockerCmd.Stdout = &stdout
	dockerCmd.Stderr = &stderr

	err = dockerCmd.Run()

	var exitCode int
	var errorMsg string

	if err != nil {
		if execCtx.Err() == context.DeadlineExceeded {
			errorMsg = "timeout"
			exitCode = -1
		} else if exitError, ok := err.(*exec.ExitError); ok {
			exitCode = exitError.ExitCode()
		} else {
			errorMsg = err.Error()
			exitCode = -1
		}
	}

	return &ExecutionResult{
		Success:       exitCode == 0,
		ExitCode:      exitCode,
		Stdout:        stdout.String(),
		Stderr:        stderr.String(),
		ExecutionTime: time.Since(startTime).Milliseconds(),
		Error:         errorMsg,
	}, nil
}

// handleExecute handles POST /execute requests
func (dr *DockerRunner) handleExecute(w http.ResponseWriter, r *http.Request) {
	// Check authentication
	if !dr.authenticate(r) {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse request
	var req ExecutionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Validate request
	if req.Code == "" || req.Language == "" {
		http.Error(w, "Missing code or language", http.StatusBadRequest)
		return
	}

	log.Printf("Executing %s code: %.50s...", req.Language, req.Code)

	// Execute code
	result, err := dr.executeCode(r.Context(), req)
	if err != nil {
		log.Printf("Execution error: %v", err)
		result = &ExecutionResult{
			Success: false,
			Error:   err.Error(),
		}
	}

	// Return result
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// handleHealth handles GET /health requests
func (dr *DockerRunner) handleHealth(w http.ResponseWriter, r *http.Request) {
	// Check Docker connectivity
	cmd := exec.Command("docker", "version")
	if err := cmd.Run(); err != nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]string{
			"status": "unhealthy",
			"error":  err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "healthy",
		"image":  dr.sandboxImage,
	})
}

func main() {
	// Initialize Docker runner
	runner, err := NewDockerRunner()
	if err != nil {
		log.Fatalf("Failed to initialize Docker runner: %v", err)
	}

	// Setup routes
	r := mux.NewRouter()
	r.HandleFunc("/execute", runner.handleExecute).Methods("POST")
	r.HandleFunc("/health", runner.handleHealth).Methods("GET")

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting executor service on port %s", port)
	log.Printf("Sandbox image: %s", runner.sandboxImage)
	log.Printf("Timeout: %v", runner.timeout)

	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}