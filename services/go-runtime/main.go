package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"
)

type healthResponse struct {
	Status    string    `json:"status"`
	Service   string    `json:"service"`
	Port      int       `json:"port"`
	Mock      bool      `json:"mock"`
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
}

type mockResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
	Service string `json:"service"`
	Mock    bool   `json:"mock"`
	Method  string `json:"method"`
	Path    string `json:"path"`
}

func main() {
	mux := http.NewServeMux()

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		respondJSON(w, http.StatusOK, healthResponse{
			Status:    "healthy",
			Service:   "go-runtime",
			Port:      8080,
			Mock:      true,
			Message:   "Go runtime service running in mock mode. No real container orchestration is available.",
			Timestamp: time.Now().UTC(),
		})
	})

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		log.Printf("[GO-RUNTIME] Received %s %s while in mock mode", r.Method, r.URL.Path)
		respondJSON(w, http.StatusNotImplemented, mockResponse{
			Error:   "not_implemented",
			Message: "Go runtime service is a mock placeholder and does not execute runtime tasks.",
			Service: "go-runtime",
			Mock:    true,
			Method:  r.Method,
			Path:    r.URL.Path,
		})
	})

	server := &http.Server{
		Addr:    ":8080",
		Handler: loggingMiddleware(mux),
	}

	log.Println("[GO-RUNTIME] Mock runtime service starting on port 8080")
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("[GO-RUNTIME] Server error: %v", err)
	}
}

func respondJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("[GO-RUNTIME] Failed to encode response: %v", err)
	}
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("[GO-RUNTIME] %s %s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}
