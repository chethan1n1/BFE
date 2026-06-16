from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, dashboard, projects, graph, insights, credentials, ai, data_quality
from app.database import engine, Base
from app.models import DataCleansingAudit  # Import to register model metadata

# Ensure database tables exist (e.g. data_cleansing_audits)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Capability Explorer API",
    description="Intelligence and knowledge graph platform for organizational credentials.",
    version="4.0.0"
)

# Configure CORS for local development (Vite port 5173) and deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers under /api
app.include_router(auth.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(graph.router, prefix="/api")
app.include_router(insights.router, prefix="/api")
app.include_router(credentials.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(data_quality.router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Welcome to the Capability Explorer API",
        "documentation": "/docs"
    }
