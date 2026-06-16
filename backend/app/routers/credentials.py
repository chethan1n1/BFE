from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Project, Client, Brand, Category, Market, KPI
from app.schemas import CredentialFinderRequest, CredentialFinderResponse, CredentialFinderResult
from app.routers.auth import get_current_user
from typing import List

router = APIRouter(prefix="/credential-finder", tags=["Credentials Discovery"])

@router.post("", response_model=CredentialFinderResponse)
def find_credentials(
    request: CredentialFinderRequest,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    Ranks projects based on match criteria:
    Category Match = 50%
    Market Match = 30%
    KPI Match = 20%
    Returns results with reasoning strings.
    """
    # Fetch names for reasoning
    req_category_name = ""
    req_market_name = ""
    req_kpi_name = ""
    
    if request.category_id:
        cat = db.query(Category).filter(Category.id == request.category_id).first()
        if cat:
            req_category_name = cat.name
    if request.market_id:
        mkt = db.query(Market).filter(Market.id == request.market_id).first()
        if mkt:
            req_market_name = mkt.name
    if request.kpi_id:
        kp = db.query(KPI).filter(KPI.id == request.kpi_id).first()
        if kp:
            req_kpi_name = kp.name

    projects = db.query(Project).all()
    results = []
    
    for p in projects:
        score = 0.0
        reasoning = []
        
        # 1. Category Match (50%)
        if request.category_id:
            if p.category_id == request.category_id:
                score += 50.0
                reasoning.append(f"✓ Same Category ({req_category_name})")
            else:
                reasoning.append(f"✗ Category Mismatch (Project is in {p.category.name})")
        else:
            reasoning.append("• Category filter not selected")
            
        # 2. Market Match (30%)
        if request.market_id:
            if p.market_id == request.market_id:
                score += 30.0
                reasoning.append(f"✓ Same Market ({req_market_name})")
            else:
                reasoning.append(f"✗ Market Mismatch (Project is in {p.market.name})")
        else:
            reasoning.append("• Market filter not selected")
            
        # 3. KPI Match (20%)
        if request.kpi_id:
            if p.kpi_id == request.kpi_id:
                score += 20.0
                reasoning.append(f"✓ Same KPI ({req_kpi_name})")
            else:
                p_kpi_name = p.kpi.name if p.kpi else "None"
                reasoning.append(f"✗ KPI Mismatch (Project is modeling {p_kpi_name})")
        else:
            reasoning.append("• KPI filter not selected")
            
        # Only return items that match at least one of the selected criteria (score > 0)
        # or return all items if no criteria are selected.
        has_criteria = request.category_id or request.market_id or request.kpi_id
        if not has_criteria or score > 0:
            results.append(CredentialFinderResult(
                id=p.id,
                job_number=p.job_number,
                client=p.client.name,
                brand=p.brand.name,
                category=p.category.name,
                market=p.market.name,
                kpi=p.kpi.name if p.kpi else None,
                match_score=score,
                reasoning=reasoning
            ))
            
    # Sort results by match score (descending) and then job number
    results.sort(key=lambda x: (-x.match_score, x.job_number))
    
    # Return top 30 ranked matches to avoid page overloading
    return CredentialFinderResponse(results=results[:30])
