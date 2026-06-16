from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Project, Client, Brand, Category, Market, KPI
from app.schemas import CapabilityMatrixResponse, MatrixCell
from app.routers.auth import get_current_user
from typing import Optional

router = APIRouter(prefix="/insights", tags=["Insights Matrices"])

@router.get("/matrix", response_model=CapabilityMatrixResponse)
def get_capability_matrix(
    row_dim: str = Query("market", description="Dimension for rows: client, category, market"),
    col_dim: str = Query("category", description="Dimension for columns: category, kpi, market"),
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    Computes a dynamic capability matrix (heatmap) for any two dimensions (e.g. Market x Category).
    Returns rows, columns, and list of matrix cells with counts, coverage, and expertise scores.
    """
    # 1. Resolve columns and grouping fields
    dim_map = {
        "client": (Client, Project.client_id, Client.name),
        "brand": (Brand, Project.brand_id, Brand.name),
        "category": (Category, Project.category_id, Category.name),
        "market": (Market, Project.market_id, Market.name),
        "kpi": (KPI, Project.kpi_id, KPI.name)
    }
    
    if row_dim not in dim_map or col_dim not in dim_map:
        return CapabilityMatrixResponse(rows=[], cols=[], cells=[])
        
    row_model, row_fk, row_name_field = dim_map[row_dim]
    col_model, col_fk, col_name_field = dim_map[col_dim]
    
    # 2. Get list of unique row names & column names for headers
    rows = [r[0] for r in db.query(row_name_field).order_by(row_name_field).all()]
    cols = [c[0] for c in db.query(col_name_field).order_by(col_name_field).all()]
    
    # Cache names
    row_names = {str(r.id): r.name for r in db.query(row_model.id, row_name_field).all()}
    col_names = {str(c.id): c.name for c in db.query(col_model.id, col_name_field).all()}
    
    # 3. Query combinations
    # We select row_fk, col_fk, project_count, and client diversity (unique clients)
    query = db.query(
        row_fk,
        col_fk,
        func.count(Project.id).label("proj_cnt"),
        func.count(func.distinct(Project.client_id)).label("client_div")
    )
    
    # KPI field is nullable, filter out Nulls if KPI is selected
    if row_dim == "kpi":
        query = query.filter(Project.kpi_id.isnot(None))
    if col_dim == "kpi":
        query = query.filter(Project.kpi_id.isnot(None))
        
    results = query.group_by(row_fk, col_fk).all()
    
    # Calculate scores & prepare cells
    cells = []
    
    # Find max raw scores for normalization
    raw_cells = []
    max_raw_exp = 0.0
    
    for r_id, c_id, proj_cnt, client_div in results:
        r_name = row_names.get(str(r_id))
        c_name = col_names.get(str(c_id))
        if not r_name or not c_name:
            continue
            
        # Expertise formula: project_count + 3 * client_diversity
        raw_exp = float(proj_cnt) + (float(client_div) * 3.0)
        if raw_exp > max_raw_exp:
            max_raw_exp = raw_exp
            
        raw_cells.append({
            "row_name": r_name,
            "col_name": c_name,
            "project_count": proj_cnt,
            "raw_expertise": raw_exp,
            "client_div": client_div
        })
        
    total_clients = max(db.query(func.count(Client.id)).scalar() or 1, 1)
    
    for cell in raw_cells:
        # Coverage = client diversity / total clients in DB (percent)
        coverage_score = round((cell["client_div"] / total_clients) * 100, 1)
        
        # Expertise normalized to 0-100
        expertise_score = 0.0
        if max_raw_exp > 0:
            expertise_score = round((cell["raw_expertise"] / max_raw_exp) * 100, 1)
            
        cells.append(MatrixCell(
            row_name=cell["row_name"],
            col_name=cell["col_name"],
            project_count=cell["project_count"],
            coverage_score=coverage_score,
            expertise_score=expertise_score
        ))
        
    return CapabilityMatrixResponse(rows=rows, cols=cols, cells=cells)
