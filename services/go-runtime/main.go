package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "os"
    "os/exec"
    "sync"
    "time"

    "github.com/gorilla/mux"
    "github.com/gorilla/websocket"
)

type RuntimeService struct {
    containers map[string]*Container
    mutex      sync.RWMutex
    upgrader   websocket.Upgrader
}

type Container struct {
    ID       string            `json:"id"`
    Status   string            `json:"status"`
    Image    string            `json:"image"`
    Ports    map[string]string `json:"ports"`
    Env      map[string]string `json:"env"`
    Logs     []string          `json:"logs"`
    Created  time.Time         `json:"created"`
    cmd      *exec.Cmd
    cancel   context.CancelFunc
}

type ContainerRequest struct {
    Image     string            `json:"image"`
    Command   []string          `json:"command"`
    Env       map[string]string `json:"env"`
    Ports     []int             `json:"ports"`
    ProjectID string            `json:"projectId"`
}

type BuildRequest struct {
    ProjectID string `json:"projectId"`
    Language  string `json:"language"`
    Files     []File `json:"files"`
}

type File struct {
    Path    string `json:"path"`
    Content string `json:"content"`
}

type FileOperation struct {
    Operation string `json:"operation"`
    Path      string `json:"path"`
    Content   string `json:"content,omitempty"`
    NewPath   string `json:"newPath,omitempty"`
}

func NewRuntimeService() *RuntimeService {
    return &RuntimeService{
        containers: make(map[string]*Container),
        upgrader: websocket.Upgrader{
            CheckOrigin: func(r *http.Request) bool {
                return true // Allow all origins in development
            },
        },
    }
}

// Container management endpoints
func (rs *RuntimeService) createContainer(w http.ResponseWriter, r *http.Request) {
    var req ContainerRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    containerID := fmt.Sprintf("container_%s_%d", req.ProjectID, time.Now().Unix())
    
    ctx, cancel := context.WithCancel(context.Background())
    
    container := &Container{
        ID:      containerID,
        Status:  "creating",
        Image:   req.Image,
        Ports:   make(map[string]string),
        Env:     req.Env,
        Logs:    []string{},
        Created: time.Now(),
        cancel:  cancel,
    }

    rs.mutex.Lock()
    rs.containers[containerID] = container
    rs.mutex.Unlock()

    // Start container in goroutine
    go rs.startContainer(ctx, container, req)

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(container)
}

func (rs *RuntimeService) startContainer(ctx context.Context, container *Container, req ContainerRequest) {
    container.Status = "starting"
    container.Logs = append(container.Logs, fmt.Sprintf("Starting container %s with image %s", container.ID, req.Image))
    
    // Simulate container startup with Docker-like behavior
    cmd := exec.CommandContext(ctx, "docker", "run", "--rm", "-d", 
        "--name", container.ID,
        req.Image)
    
    for k, v := range req.Env {
        cmd.Env = append(cmd.Env, fmt.Sprintf("%s=%s", k, v))
    }

    if err := cmd.Start(); err != nil {
        container.Status = "failed"
        container.Logs = append(container.Logs, fmt.Sprintf("Failed to start container: %v", err))
        return
    }

    container.cmd = cmd
    container.Status = "running"
    container.Logs = append(container.Logs, "Container started successfully")

    // Wait for container to finish
    if err := cmd.Wait(); err != nil {
        container.Status = "failed"
        container.Logs = append(container.Logs, fmt.Sprintf("Container exited with error: %v", err))
    } else {
        container.Status = "stopped"
        container.Logs = append(container.Logs, "Container exited successfully")
    }
}

func (rs *RuntimeService) listContainers(w http.ResponseWriter, r *http.Request) {
    rs.mutex.RLock()
    defer rs.mutex.RUnlock()

    containers := make([]*Container, 0, len(rs.containers))
    for _, container := range rs.containers {
        containers = append(containers, container)
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(containers)
}

func (rs *RuntimeService) getContainer(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    containerID := vars["id"]

    rs.mutex.RLock()
    container, exists := rs.containers[containerID]
    rs.mutex.RUnlock()

    if !exists {
        http.Error(w, "Container not found", http.StatusNotFound)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(container)
}

func (rs *RuntimeService) stopContainer(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    containerID := vars["id"]

    rs.mutex.Lock()
    container, exists := rs.containers[containerID]
    rs.mutex.Unlock()

    if !exists {
        http.Error(w, "Container not found", http.StatusNotFound)
        return
    }

    if container.cancel != nil {
        container.cancel()
    }

    container.Status = "stopping"
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"status": "stopping"})
}

// High-performance file operations
func (rs *RuntimeService) handleFileOperations(w http.ResponseWriter, r *http.Request) {
    var ops []FileOperation
    if err := json.NewDecoder(r.Body).Decode(&ops); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    results := make([]map[string]interface{}, 0, len(ops))
    
    for _, op := range ops {
        result := map[string]interface{}{
            "operation": op.Operation,
            "path":      op.Path,
            "success":   false,
        }

        switch op.Operation {
        case "read":
            content, err := os.ReadFile(op.Path)
            if err != nil {
                result["error"] = err.Error()
            } else {
                result["content"] = string(content)
                result["success"] = true
            }

        case "write":
            err := os.WriteFile(op.Path, []byte(op.Content), 0644)
            if err != nil {
                result["error"] = err.Error()
            } else {
                result["success"] = true
            }

        case "delete":
            err := os.Remove(op.Path)
            if err != nil {
                result["error"] = err.Error()
            } else {
                result["success"] = true
            }

        case "move":
            err := os.Rename(op.Path, op.NewPath)
            if err != nil {
                result["error"] = err.Error()
            } else {
                result["success"] = true
            }

        case "mkdir":
            err := os.MkdirAll(op.Path, 0755)
            if err != nil {
                result["error"] = err.Error()
            } else {
                result["success"] = true
            }
        }

        results = append(results, result)
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(results)
}

// Fast build pipeline
func (rs *RuntimeService) buildProject(w http.ResponseWriter, r *http.Request) {
    var req BuildRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    buildID := fmt.Sprintf("build_%s_%d", req.ProjectID, time.Now().Unix())
    
    // Create build directory
    buildDir := fmt.Sprintf("/tmp/builds/%s", buildID)
    if err := os.MkdirAll(buildDir, 0755); err != nil {
        http.Error(w, fmt.Sprintf("Failed to create build directory: %v", err), http.StatusInternalServerError)
        return
    }

    // Write files to build directory
    for _, file := range req.Files {
        filePath := fmt.Sprintf("%s/%s", buildDir, file.Path)
        
        // Create parent directories if needed
        if err := os.MkdirAll(fmt.Sprintf("%s/..", filePath), 0755); err != nil {
            continue
        }
        
        if err := os.WriteFile(filePath, []byte(file.Content), 0644); err != nil {
            continue
        }
    }

    // Build based on language
    var buildCmd *exec.Cmd
    switch req.Language {
    case "javascript", "typescript":
        buildCmd = exec.Command("npm", "run", "build")
    case "python":
        buildCmd = exec.Command("python", "-m", "pip", "install", "-r", "requirements.txt")
    case "go":
        buildCmd = exec.Command("go", "build", "-o", "main", ".")
    case "rust":
        buildCmd = exec.Command("cargo", "build", "--release")
    default:
        buildCmd = exec.Command("echo", "No build command for", req.Language)
    }

    buildCmd.Dir = buildDir
    
    output, err := buildCmd.CombinedOutput()
    
    response := map[string]interface{}{
        "buildId":   buildID,
        "success":   err == nil,
        "output":    string(output),
        "buildDir":  buildDir,
        "language":  req.Language,
        "timestamp": time.Now(),
    }

    if err != nil {
        response["error"] = err.Error()
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

// WebSocket for real-time collaboration and terminal
func (rs *RuntimeService) handleWebSocket(w http.ResponseWriter, r *http.Request) {
    conn, err := rs.upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Printf("WebSocket upgrade failed: %v", err)
        return
    }
    defer conn.Close()

    projectID := r.URL.Query().Get("projectId")
    sessionType := r.URL.Query().Get("type") // "terminal", "collaboration", "logs"

    log.Printf("WebSocket connection established for project %s, type %s", projectID, sessionType)

    for {
        var message map[string]interface{}
        if err := conn.ReadJSON(&message); err != nil {
            log.Printf("WebSocket read error: %v", err)
            break
        }

        switch sessionType {
        case "terminal":
            rs.handleTerminalMessage(conn, message)
        case "collaboration":
            rs.handleCollaborationMessage(conn, message, projectID)
        case "logs":
            rs.handleLogsMessage(conn, message, projectID)
        }
    }
}

func (rs *RuntimeService) handleTerminalMessage(conn *websocket.Conn, message map[string]interface{}) {
    command, ok := message["command"].(string)
    if !ok {
        return
    }

    cmd := exec.Command("sh", "-c", command)
    output, err := cmd.CombinedOutput()
    
    response := map[string]interface{}{
        "type":   "terminal_output",
        "output": string(output),
    }
    
    if err != nil {
        response["error"] = err.Error()
    }

    conn.WriteJSON(response)
}

func (rs *RuntimeService) handleCollaborationMessage(conn *websocket.Conn, message map[string]interface{}, projectID string) {
    // Handle real-time collaboration messages
    message["timestamp"] = time.Now()
    message["projectId"] = projectID
    
    // Broadcast to all connected clients for this project
    conn.WriteJSON(map[string]interface{}{
        "type": "collaboration_update",
        "data": message,
    })
}

func (rs *RuntimeService) handleLogsMessage(conn *websocket.Conn, message map[string]interface{}, projectID string) {
    // Stream container logs
    containerID, ok := message["containerId"].(string)
    if !ok {
        return
    }

    rs.mutex.RLock()
    container, exists := rs.containers[containerID]
    rs.mutex.RUnlock()

    if exists {
        conn.WriteJSON(map[string]interface{}{
            "type": "logs",
            "logs": container.Logs,
        })
    }
}

// Health check endpoint
func (rs *RuntimeService) health(w http.ResponseWriter, r *http.Request) {
    status := map[string]interface{}{
        "status":      "healthy",
        "service":     "go-runtime",
        "containers":  len(rs.containers),
        "timestamp":   time.Now(),
        "version":     "1.0.0",
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(status)
}

func main() {
    rs := NewRuntimeService()
    
    r := mux.NewRouter()
    
    // Container management
    r.HandleFunc("/api/containers", rs.createContainer).Methods("POST")
    r.HandleFunc("/api/containers", rs.listContainers).Methods("GET")
    r.HandleFunc("/api/containers/{id}", rs.getContainer).Methods("GET")
    r.HandleFunc("/api/containers/{id}/stop", rs.stopContainer).Methods("POST")
    
    // File operations
    r.HandleFunc("/api/files/batch", rs.handleFileOperations).Methods("POST")
    
    // Build pipeline
    r.HandleFunc("/api/build", rs.buildProject).Methods("POST")
    
    // WebSocket
    r.HandleFunc("/ws", rs.handleWebSocket)
    
    // Health check
    r.HandleFunc("/health", rs.health).Methods("GET")

    // Enable CORS for development
    r.Use(func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            w.Header().Set("Access-Control-Allow-Origin", "*")
            w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
            
            if r.Method == "OPTIONS" {
                w.WriteHeader(http.StatusOK)
                return
            }
            
            next.ServeHTTP(w, r)
        })
    })

    port := os.Getenv("GO_RUNTIME_PORT")
    if port == "" {
        port = "8080"
    }

    log.Printf("Go Runtime Service starting on port %s", port)
    log.Printf("Available endpoints:")
    log.Printf("  POST /api/containers - Create container")
    log.Printf("  GET /api/containers - List containers")
    log.Printf("  GET /api/containers/{id} - Get container")
    log.Printf("  POST /api/containers/{id}/stop - Stop container")
    log.Printf("  POST /api/files/batch - Batch file operations")
    log.Printf("  POST /api/build - Build project")
    log.Printf("  GET /ws - WebSocket connection")
    log.Printf("  GET /health - Health check")

    if err := http.ListenAndServe(":"+port, r); err != nil {
        log.Fatal("Server failed to start:", err)
    }
}