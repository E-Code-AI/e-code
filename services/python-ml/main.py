"""
Python ML Backend Service for E-Code Platform
Handles AI/ML processing, data analysis, and scientific computing
"""

import asyncio
import json
import logging
import os
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
import traceback

from fastapi import FastAPI, HTTPException, WebSocket, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn

# ML and Data Analysis
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.metrics import accuracy_score, mean_squared_error, classification_report
from sklearn.preprocessing import StandardScaler, LabelEncoder

# Text Processing and NLP
import nltk
from textblob import TextBlob
import re

# Code Analysis
import ast
import tokenize
import io
from collections import defaultdict

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="E-Code Python ML Service", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data Models
class CodeAnalysisRequest(BaseModel):
    code: str
    language: str = "python"
    analysis_type: str = "full"  # full, syntax, complexity, security

class MLTrainingRequest(BaseModel):
    data: List[Dict[str, Any]]
    target_column: str
    model_type: str = "auto"  # auto, classification, regression
    test_size: float = 0.2

class TextAnalysisRequest(BaseModel):
    text: str
    analysis_type: str = "sentiment"  # sentiment, keywords, summary

class DataProcessingRequest(BaseModel):
    data: List[Dict[str, Any]]
    operations: List[str]  # clean, transform, analyze

class AIModelRequest(BaseModel):
    model_type: str
    input_data: Dict[str, Any]
    parameters: Optional[Dict[str, Any]] = {}

# In-memory storage for models and analysis results
models_cache = {}
analysis_results = {}
training_jobs = {}

class MLService:
    """Machine Learning Service for advanced AI operations"""
    
    def __init__(self):
        self.models = {}
        self.scalers = {}
        
    def auto_detect_problem_type(self, y):
        """Automatically detect if it's a classification or regression problem"""
        if isinstance(y[0], str) or len(np.unique(y)) < 10:
            return "classification"
        return "regression"
    
    def train_model(self, X, y, model_type="auto"):
        """Train ML model with automatic type detection"""
        if model_type == "auto":
            model_type = self.auto_detect_problem_type(y)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Choose model
        if model_type == "classification":
            if len(np.unique(y)) == 2:
                model = LogisticRegression(random_state=42)
            else:
                model = RandomForestClassifier(random_state=42)
        else:
            model = RandomForestRegressor(random_state=42)
        
        # Train model
        model.fit(X_train_scaled, y_train)
        
        # Evaluate
        y_pred = model.predict(X_test_scaled)
        
        if model_type == "classification":
            score = accuracy_score(y_test, y_pred)
            metrics = {
                "accuracy": score,
                "classification_report": classification_report(y_test, y_pred, output_dict=True)
            }
        else:
            score = mean_squared_error(y_test, y_pred)
            metrics = {
                "mse": score,
                "rmse": np.sqrt(score)
            }
        
        return {
            "model": model,
            "scaler": scaler,
            "model_type": model_type,
            "metrics": metrics,
            "feature_importance": getattr(model, 'feature_importances_', None)
        }

class CodeAnalyzer:
    """Advanced code analysis and optimization"""
    
    def __init__(self):
        self.complexity_weights = {
            'for': 1, 'while': 1, 'if': 1, 'elif': 1,
            'try': 1, 'except': 1, 'with': 1, 'lambda': 1
        }
    
    def analyze_python_code(self, code: str) -> Dict[str, Any]:
        """Comprehensive Python code analysis"""
        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            return {
                "error": "Syntax Error",
                "details": str(e),
                "valid": False
            }
        
        analysis = {
            "valid": True,
            "lines_of_code": len(code.splitlines()),
            "complexity": self._calculate_complexity(tree),
            "functions": self._extract_functions(tree),
            "classes": self._extract_classes(tree),
            "imports": self._extract_imports(tree),
            "security_issues": self._check_security_issues(code),
            "performance_suggestions": self._get_performance_suggestions(tree),
            "code_quality_score": 0
        }
        
        # Calculate code quality score
        analysis["code_quality_score"] = self._calculate_quality_score(analysis)
        
        return analysis
    
    def _calculate_complexity(self, tree) -> int:
        """Calculate cyclomatic complexity"""
        complexity = 1  # Base complexity
        for node in ast.walk(tree):
            if isinstance(node, (ast.If, ast.While, ast.For, ast.Try)):
                complexity += 1
            elif isinstance(node, ast.Lambda):
                complexity += 1
        return complexity
    
    def _extract_functions(self, tree) -> List[Dict[str, Any]]:
        """Extract function definitions and their metadata"""
        functions = []
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                functions.append({
                    "name": node.name,
                    "args": [arg.arg for arg in node.args.args],
                    "line": node.lineno,
                    "docstring": ast.get_docstring(node)
                })
        return functions
    
    def _extract_classes(self, tree) -> List[Dict[str, Any]]:
        """Extract class definitions and their metadata"""
        classes = []
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                methods = []
                for item in node.body:
                    if isinstance(item, ast.FunctionDef):
                        methods.append(item.name)
                
                classes.append({
                    "name": node.name,
                    "methods": methods,
                    "line": node.lineno,
                    "docstring": ast.get_docstring(node)
                })
        return classes
    
    def _extract_imports(self, tree) -> List[str]:
        """Extract all imports"""
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for name in node.names:
                    imports.append(name.name)
            elif isinstance(node, ast.ImportFrom):
                module = node.module or ""
                for name in node.names:
                    imports.append(f"{module}.{name.name}")
        return imports
    
    def _check_security_issues(self, code: str) -> List[Dict[str, str]]:
        """Check for potential security issues"""
        issues = []
        
        # Check for dangerous functions
        dangerous_patterns = [
            (r"exec\s*\(", "Use of exec() can be dangerous"),
            (r"eval\s*\(", "Use of eval() can be dangerous"),
            (r"__import__\s*\(", "Dynamic imports can be security risks"),
            (r"pickle\.loads?", "Pickle deserialization can be unsafe"),
        ]
        
        for pattern, message in dangerous_patterns:
            if re.search(pattern, code):
                issues.append({
                    "type": "security",
                    "severity": "high",
                    "message": message
                })
        
        return issues
    
    def _get_performance_suggestions(self, tree) -> List[str]:
        """Generate performance optimization suggestions"""
        suggestions = []
        
        # Check for list comprehensions vs loops
        has_loops = False
        for node in ast.walk(tree):
            if isinstance(node, (ast.For, ast.While)):
                has_loops = True
                break
        
        if has_loops:
            suggestions.append("Consider using list comprehensions for better performance")
        
        return suggestions
    
    def _calculate_quality_score(self, analysis: Dict[str, Any]) -> float:
        """Calculate overall code quality score (0-100)"""
        score = 100
        
        # Deduct for high complexity
        if analysis["complexity"] > 10:
            score -= (analysis["complexity"] - 10) * 2
        
        # Deduct for security issues
        score -= len(analysis["security_issues"]) * 10
        
        # Bonus for documentation
        documented_functions = sum(1 for f in analysis["functions"] if f["docstring"])
        if analysis["functions"]:
            doc_ratio = documented_functions / len(analysis["functions"])
            score += doc_ratio * 10
        
        return max(0, min(100, score))

class DataProcessor:
    """Advanced data processing and analysis"""
    
    def __init__(self):
        pass
    
    def process_data(self, data: List[Dict[str, Any]], operations: List[str]) -> Dict[str, Any]:
        """Process data with specified operations"""
        df = pd.DataFrame(data)
        results = {"original_shape": df.shape}
        
        for operation in operations:
            if operation == "clean":
                df = self._clean_data(df)
            elif operation == "transform":
                df = self._transform_data(df)
            elif operation == "analyze":
                results["analysis"] = self._analyze_data(df)
        
        results["processed_shape"] = df.shape
        results["processed_data"] = df.to_dict("records")
        
        return results
    
    def _clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean data by handling missing values and outliers"""
        # Handle missing values
        for col in df.columns:
            if df[col].dtype in ['int64', 'float64']:
                df[col].fillna(df[col].median(), inplace=True)
            else:
                df[col].fillna(df[col].mode().iloc[0] if not df[col].mode().empty else 'Unknown', inplace=True)
        
        return df
    
    def _transform_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transform data for analysis"""
        # Encode categorical variables
        for col in df.columns:
            if df[col].dtype == 'object':
                le = LabelEncoder()
                try:
                    df[col] = le.fit_transform(df[col].astype(str))
                except:
                    pass
        
        return df
    
    def _analyze_data(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Generate comprehensive data analysis"""
        analysis = {
            "shape": df.shape,
            "dtypes": df.dtypes.to_dict(),
            "missing_values": df.isnull().sum().to_dict(),
            "statistical_summary": df.describe().to_dict() if not df.empty else {},
            "correlations": {}
        }
        
        # Calculate correlations for numeric columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 1:
            analysis["correlations"] = df[numeric_cols].corr().to_dict()
        
        return analysis

# Initialize services
ml_service = MLService()
code_analyzer = CodeAnalyzer()
data_processor = DataProcessor()

@app.on_event("startup")
async def startup_event():
    """Initialize the ML service"""
    logger.info("Python ML Service starting up...")
    
    # Download NLTK data if needed
    try:
        nltk.download('punkt', quiet=True)
        nltk.download('vader_lexicon', quiet=True)
        nltk.download('stopwords', quiet=True)
    except:
        logger.warning("Could not download NLTK data")

@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "E-Code Python ML Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "code_analysis": "/api/code/analyze",
            "ml_training": "/api/ml/train",
            "text_analysis": "/api/text/analyze",
            "data_processing": "/api/data/process",
            "ai_inference": "/api/ai/inference",
            "health": "/health"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "python-ml",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "active_models": len(models_cache),
        "memory_usage": "N/A"  # Could add psutil for real memory monitoring
    }

@app.post("/api/code/analyze")
async def analyze_code(request: CodeAnalysisRequest):
    """Analyze code for complexity, security, and quality"""
    try:
        if request.language.lower() != "python":
            raise HTTPException(status_code=400, detail="Only Python analysis supported currently")
        
        analysis = code_analyzer.analyze_python_code(request.code)
        
        # Store result for potential future reference
        analysis_id = f"analysis_{int(time.time())}"
        analysis_results[analysis_id] = {
            "analysis": analysis,
            "timestamp": datetime.now().isoformat(),
            "code_length": len(request.code)
        }
        
        return {
            "analysis_id": analysis_id,
            "analysis": analysis,
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Code analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ml/train")
async def train_ml_model(request: MLTrainingRequest, background_tasks: BackgroundTasks):
    """Train machine learning model"""
    try:
        # Validate data
        if not request.data:
            raise HTTPException(status_code=400, detail="No data provided")
        
        df = pd.DataFrame(request.data)
        
        if request.target_column not in df.columns:
            raise HTTPException(status_code=400, detail=f"Target column '{request.target_column}' not found")
        
        # Prepare data
        X = df.drop(columns=[request.target_column])
        y = df[request.target_column]
        
        # Handle categorical variables
        for col in X.columns:
            if X[col].dtype == 'object':
                le = LabelEncoder()
                X[col] = le.fit_transform(X[col].astype(str))
        
        # Start training in background
        job_id = f"training_{int(time.time())}"
        training_jobs[job_id] = {"status": "training", "start_time": datetime.now().isoformat()}
        
        background_tasks.add_task(train_model_background, job_id, X, y, request.model_type)
        
        return {
            "job_id": job_id,
            "status": "training_started",
            "message": "Model training started in background"
        }
    
    except Exception as e:
        logger.error(f"ML training error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def train_model_background(job_id: str, X, y, model_type: str):
    """Background task for model training"""
    try:
        result = ml_service.train_model(X, y, model_type)
        
        # Store model and results
        models_cache[job_id] = result
        training_jobs[job_id] = {
            "status": "completed",
            "start_time": training_jobs[job_id]["start_time"],
            "end_time": datetime.now().isoformat(),
            "metrics": result["metrics"],
            "model_type": result["model_type"]
        }
        
        logger.info(f"Training job {job_id} completed successfully")
        
    except Exception as e:
        training_jobs[job_id] = {
            "status": "failed",
            "start_time": training_jobs[job_id]["start_time"],
            "end_time": datetime.now().isoformat(),
            "error": str(e)
        }
        logger.error(f"Training job {job_id} failed: {str(e)}")

@app.get("/api/ml/training/{job_id}")
async def get_training_status(job_id: str):
    """Get training job status"""
    if job_id not in training_jobs:
        raise HTTPException(status_code=404, detail="Training job not found")
    
    return training_jobs[job_id]

@app.post("/api/text/analyze")
async def analyze_text(request: TextAnalysisRequest):
    """Analyze text for sentiment, keywords, etc."""
    try:
        results = {}
        
        if request.analysis_type in ["sentiment", "all"]:
            blob = TextBlob(request.text)
            results["sentiment"] = {
                "polarity": blob.sentiment.polarity,
                "subjectivity": blob.sentiment.subjectivity,
                "classification": "positive" if blob.sentiment.polarity > 0 else "negative" if blob.sentiment.polarity < 0 else "neutral"
            }
        
        if request.analysis_type in ["keywords", "all"]:
            # Simple keyword extraction
            words = request.text.lower().split()
            word_freq = defaultdict(int)
            for word in words:
                if len(word) > 3:  # Filter short words
                    word_freq[word] += 1
            
            results["keywords"] = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:10]
        
        if request.analysis_type in ["summary", "all"]:
            # Simple extractive summarization (first and last sentences)
            sentences = request.text.split('.')
            if len(sentences) > 2:
                results["summary"] = f"{sentences[0]}.{sentences[-1]}."
            else:
                results["summary"] = request.text
        
        return results
    
    except Exception as e:
        logger.error(f"Text analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/data/process")
async def process_data(request: DataProcessingRequest):
    """Process and analyze data"""
    try:
        result = data_processor.process_data(request.data, request.operations)
        return result
    
    except Exception as e:
        logger.error(f"Data processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/inference")
async def ai_inference(request: AIModelRequest):
    """AI model inference endpoint"""
    try:
        # This would integrate with various AI models
        # For now, return a structured response
        
        inference_result = {
            "model_type": request.model_type,
            "timestamp": datetime.now().isoformat(),
            "result": "Inference completed",
            "confidence": 0.85,
            "processing_time_ms": 150
        }
        
        # Add model-specific logic here
        if request.model_type == "code_completion":
            inference_result["suggestions"] = [
                "def process_data():",
                "for item in data:",
                "if condition:"
            ]
        elif request.model_type == "code_optimization":
            inference_result["optimizations"] = [
                "Use list comprehension instead of loop",
                "Cache function results",
                "Use generator expressions for memory efficiency"
            ]
        
        return inference_result
    
    except Exception as e:
        logger.error(f"AI inference error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/ml")
async def ml_websocket(websocket: WebSocket):
    """WebSocket for real-time ML operations"""
    await websocket.accept()
    
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "training_status":
                job_id = data.get("job_id")
                if job_id in training_jobs:
                    await websocket.send_json({
                        "type": "training_status",
                        "job_id": job_id,
                        "status": training_jobs[job_id]
                    })
            
            elif data.get("type") == "quick_analysis":
                # Quick code analysis
                code = data.get("code", "")
                if code:
                    try:
                        analysis = code_analyzer.analyze_python_code(code)
                        await websocket.send_json({
                            "type": "analysis_result",
                            "analysis": analysis
                        })
                    except Exception as e:
                        await websocket.send_json({
                            "type": "error",
                            "message": str(e)
                        })
    
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
    finally:
        await websocket.close()

if __name__ == "__main__":
    port = int(os.getenv("PYTHON_ML_PORT", "8081"))
    
    logger.info(f"Starting Python ML Service on port {port}")
    logger.info("Available endpoints:")
    logger.info("  POST /api/code/analyze - Code analysis")
    logger.info("  POST /api/ml/train - ML model training")
    logger.info("  GET /api/ml/training/{job_id} - Training status")
    logger.info("  POST /api/text/analyze - Text analysis")
    logger.info("  POST /api/data/process - Data processing")
    logger.info("  POST /api/ai/inference - AI inference")
    logger.info("  WS /ws/ml - WebSocket for real-time operations")
    logger.info("  GET /health - Health check")
    
    uvicorn.run(app, host="0.0.0.0", port=port)