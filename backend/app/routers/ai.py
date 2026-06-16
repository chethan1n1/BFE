import time
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Client, Brand, Category, Market, KPI, Project
from app.services.ai_service import is_ai_enabled, generate_entity_insights_api, generate_credential_explanation_api, generate_copilot_response_api
from app.routers.auth import get_current_user
from typing import List, Dict, Any, Optional

router = APIRouter(prefix="/ai", tags=["AI Integration"])

# Sliding window rate limiter state
# Maps client_ip -> list of timestamps
_rate_limits: Dict[str, List[float]] = {}
LIMIT_WINDOW = 60.0  # 1 minute
LIMIT_MAX_REQUESTS = 30  # Increase threshold for chat interaction

def check_rate_limit(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    current_time = time.time()
    
    if client_ip not in _rate_limits:
        _rate_limits[client_ip] = []
        
    _rate_limits[client_ip] = [t for t in _rate_limits[client_ip] if current_time - t < LIMIT_WINDOW]
    
    if len(_rate_limits[client_ip]) >= LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too Many Requests. Limit is 30 requests per minute per IP."
        )
        
    _rate_limits[client_ip].append(current_time)

# Pydantic Schemas for AI Router
class CredentialExplanationRequest(BaseModel):
    category: str
    market: str
    kpi: str
    project_details: Dict[str, Any]

class CopilotMessage(BaseModel):
    role: str
    content: str

class CopilotRequest(BaseModel):
    messages: List[CopilotMessage]
    mode: Optional[str] = "analysis"

@router.post("/copilot", dependencies=[Depends(check_rate_limit)])
async def chat_copilot(
    request: CopilotRequest,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    Kantar Capability Copilot chat completion endpoint.
    Retrieves relevant database contexts using intent classification.
    """
    msgs = [{"role": m.role, "content": m.content} for m in request.messages]
    result = await generate_copilot_response_api(msgs, db, mode=request.mode)
    return result

@router.get("/status")
def get_ai_status():
    return {"ai_enabled": is_ai_enabled()}

@router.get("/entity-insights/{entity_type}/{id}", dependencies=[Depends(check_rate_limit)])
async def get_entity_insights(
    entity_type: str,
    id: str,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    Returns AI-generated strengths and relationships insights for a specific entity.
    Fails gracefully if GROQ is unconfigured.
    """
    if not is_ai_enabled():
        return {
            "ai_enabled": False,
            "summary": "AI Insights are unconfigured. Set the GROQ_API_KEY environment variable to enable.",
            "strengths": [],
            "coverage_areas": [],
            "key_relationships": []
        }
        
    # Resolve the entity name and connection details
    upper_type = entity_type.upper()
    entity_name = "Unknown"
    stats = {}
    
    # DB Lookup based on type
    if upper_type == "CLIENT":
        entity = db.query(Client).filter(Client.id == id).first()
        if entity:
            entity_name = entity.name
            stats = {
                "total_projects": len(entity.projects),
                "unique_brands": len(set(p.brand.name for p in entity.projects)),
                "unique_markets": len(set(p.market.name for p in entity.projects)),
                "unique_categories": len(set(p.category.name for p in entity.projects))
            }
    elif upper_type == "BRAND":
        entity = db.query(Brand).filter(Brand.id == id).first()
        if entity:
            entity_name = entity.name
            stats = {
                "total_projects": len(entity.projects),
                "unique_markets": len(set(p.market.name for p in entity.projects)),
                "unique_categories": len(set(p.category.name for p in entity.projects))
            }
    elif upper_type == "CATEGORY":
        entity = db.query(Category).filter(Category.id == id).first()
        if entity:
            entity_name = entity.name
            stats = {
                "total_projects": len(entity.projects),
                "unique_clients": len(set(p.client.name for p in entity.projects)),
                "unique_markets": len(set(p.market.name for p in entity.projects))
            }
    elif upper_type == "MARKET":
        entity = db.query(Market).filter(Market.id == id).first()
        if entity:
            entity_name = entity.name
            stats = {
                "total_projects": len(entity.projects),
                "unique_clients": len(set(p.client.name for p in entity.projects)),
                "unique_categories": len(set(p.category.name for p in entity.projects))
            }
    elif upper_type == "KPI":
        entity = db.query(KPI).filter(KPI.id == id).first()
        if entity:
            entity_name = entity.name
            stats = {
                "total_projects": len(entity.projects),
                "unique_clients": len(set(p.client.name for p in entity.projects)),
                "unique_markets": len(set(p.market.name for p in entity.projects))
            }
            
    if entity_name == "Unknown":
        raise HTTPException(status_code=404, detail="Entity details not found.")
        
    insights = await generate_entity_insights_api(upper_type, entity_name, stats)
    return {
        "ai_enabled": True,
        **insights
    }

@router.post("/credential-explanation", dependencies=[Depends(check_rate_limit)])
async def explain_credential(
    request: CredentialExplanationRequest,
    current_user: str = Depends(get_current_user)
):
    """
    Converts match criteria and project dimensions into a human explainer.
    Fails gracefully if GROQ is unconfigured.
    """
    if not is_ai_enabled():
        return {
            "ai_enabled": False,
            "explanation": "AI analysis is currently unconfigured. Set the GROQ_API_KEY environment variable to enable."
        }
        
    parsed = await generate_credential_explanation_api(
        request.category,
        request.market,
        request.kpi,
        request.project_details
    )
    
    return {
        "ai_enabled": True,
        **parsed
    }
