from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import (
    ingest_router,
    clauses_router,
    compare_router,
    ask_router,
    nextsteps_router,
)

app = FastAPI(
    title="JurisMind API",
    description="Backend service for AI-powered legal document analysis, clause extraction, comparison, and Q&A.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for local dev servers
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register feature routers
app.include_router(ingest_router)
app.include_router(clauses_router)
app.include_router(compare_router)
app.include_router(ask_router)
app.include_router(nextsteps_router)


@app.get("/")
async def root():
    return {
        "app": "JurisMind API",
        "status": "running",
        "version": "0.1.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
