import csv
from io import StringIO
from fastapi import APIRouter, Depends, Query, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from app.database import get_db
from app.models import Project, Client, Brand, Category, Market, KPI
from app.schemas import ProjectResponse, ClientResponse, BrandResponse, CategoryResponse, MarketResponse, KPIResponse, ProjectCreateRequest, ProjectUpdateRequest
from app.routers.auth import get_current_user
from typing import List, Optional
from uuid import UUID
from app.services.ingest import sync_db_to_excel

router = APIRouter(tags=["Projects"])

def get_or_create_entity(db: Session, model, name: str):
    instance = db.query(model).filter(func.lower(model.name) == name.lower().strip()).first()
    if not instance:
        instance = model(name=name.strip())
        db.add(instance)
        db.flush()
    return instance

# Dependency to fetch and apply filters to the Project query
def get_filtered_query(
    request: Request,
    db: Session = Depends(get_db),
    client_ids: Optional[List[str]] = Query(None),
    brand_ids: Optional[List[str]] = Query(None),
    category_ids: Optional[List[str]] = Query(None),
    market_ids: Optional[List[str]] = Query(None),
    kpi_ids: Optional[List[str]] = Query(None),
    q: Optional[str] = Query(None)
):
    query = db.query(Project).join(Client).join(Brand).join(Category).join(Market).outerjoin(KPI)
    
    # Extract query params directly to handle both standard and bracket-suffixed names
    query_params = request.query_params
    
    def extract_list(param_name: str, direct_list: Optional[List[str]]) -> List[str]:
        combined = []
        if direct_list:
            combined.extend(direct_list)
        # Check for bracketed keys (e.g. client_ids[]) which Axios uses by default
        bracketed_key = f"{param_name}[]"
        if bracketed_key in query_params:
            combined.extend(query_params.getlist(bracketed_key))
        return combined

    def parse_uuids(raw_list: List[str]) -> List[UUID]:
        result = []
        for item in raw_list:
            for part in item.split(','):
                part = part.strip()
                if part:
                    try:
                        result.append(UUID(part))
                    except ValueError:
                        pass
        return result

    parsed_clients = parse_uuids(extract_list("client_ids", client_ids))
    parsed_brands = parse_uuids(extract_list("brand_ids", brand_ids))
    parsed_categories = parse_uuids(extract_list("category_ids", category_ids))
    parsed_markets = parse_uuids(extract_list("market_ids", market_ids))
    parsed_kpis = parse_uuids(extract_list("kpi_ids", kpi_ids))
    
    filters = []
    if parsed_clients:
        filters.append(Project.client_id.in_(parsed_clients))
    if parsed_brands:
        filters.append(Project.brand_id.in_(parsed_brands))
    if parsed_categories:
        filters.append(Project.category_id.in_(parsed_categories))
    if parsed_markets:
        filters.append(Project.market_id.in_(parsed_markets))
    if parsed_kpis:
        filters.append(Project.kpi_id.in_(parsed_kpis))
        
    if q and q.strip():
        search_str = f"%{q.strip()}%"
        filters.append(or_(
            Project.job_number.ilike(search_str),
            Client.name.ilike(search_str),
            Brand.name.ilike(search_str),
            Category.name.ilike(search_str),
            Market.name.ilike(search_str),
            KPI.name.ilike(search_str)
        ))
        
    if filters:
        query = query.filter(and_(*filters))
        
    return query

@router.get("/projects", response_model=List[ProjectResponse])
def get_projects(
    limit: int = 50,
    offset: int = 0,
    sort_by: str = "job_number",
    sort_desc: bool = False,
    query = Depends(get_filtered_query),
    current_user: str = Depends(get_current_user)
):
    # Sorting
    if sort_by == "client":
        order_col = Client.name
    elif sort_by == "brand":
        order_col = Brand.name
    elif sort_by == "category":
        order_col = Category.name
    elif sort_by == "market":
        order_col = Market.name
    elif sort_by == "kpi":
        order_col = KPI.name
    else:
        order_col = Project.job_number
        
    if sort_desc:
        query = query.order_by(order_col.desc())
    else:
        query = query.order_by(order_col.asc())
        
    projects = query.offset(offset).limit(limit).all()
    
    return [
        ProjectResponse(
            id=p.id,
            job_number=p.job_number,
            client=p.client.name,
            brand=p.brand.name,
            category=p.category.name,
            market=p.market.name,
            kpi=p.kpi.name if p.kpi else None
        )
        for p in projects
    ]

@router.get("/projects/export/csv")
def export_projects_csv(
    query = Depends(get_filtered_query),
    current_user: str = Depends(get_current_user)
):
    projects = query.order_by(Project.job_number).all()
    
    f = StringIO()
    writer = csv.writer(f)
    writer.writerow(["Job Number", "Client", "Brand Modelled", "Category", "Market", "Dependent Variable (KPI)"])
    
    for p in projects:
        writer.writerow([
            p.job_number,
            p.client.name,
            p.brand.name,
            p.category.name,
            p.market.name,
            p.kpi.name if p.kpi else ""
        ])
        
    f.seek(0)
    response = StreamingResponse(iter([f.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=projects_export.csv"
    return response

# Meta routes for filter popups
@router.get("/clients", response_model=List[ClientResponse])
def get_clients(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    return db.query(Client).order_by(Client.name).all()

@router.get("/brands", response_model=List[BrandResponse])
def get_brands(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    return db.query(Brand).order_by(Brand.name).all()

@router.get("/categories", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    return db.query(Category).order_by(Category.name).all()

@router.get("/markets", response_model=List[MarketResponse])
def get_markets(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    return db.query(Market).order_by(Market.name).all()

@router.get("/kpis", response_model=List[KPIResponse])
def get_kpis(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    return db.query(KPI).order_by(KPI.name).all()

@router.post("/projects", response_model=ProjectResponse, status_code=201)
def create_project(
    request: ProjectCreateRequest,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    client = get_or_create_entity(db, Client, request.client)
    brand = get_or_create_entity(db, Brand, request.brand)
    category = get_or_create_entity(db, Category, request.category)
    market = get_or_create_entity(db, Market, request.market)
    kpi = get_or_create_entity(db, KPI, request.kpi) if request.kpi and request.kpi.strip() else None

    project = Project(
        job_number=request.job_number,
        client_id=client.id,
        brand_id=brand.id,
        category_id=category.id,
        market_id=market.id,
        kpi_id=kpi.id if kpi else None
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    sync_db_to_excel(db)
    return ProjectResponse(
        id=project.id,
        job_number=project.job_number,
        client=project.client.name,
        brand=project.brand.name,
        category=project.category.name,
        market=project.market.name,
        kpi=project.kpi.name if project.kpi else None
    )

@router.put("/projects/{id}", response_model=ProjectResponse)
def update_project(
    id: UUID,
    request: ProjectUpdateRequest,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    
    client = get_or_create_entity(db, Client, request.client)
    brand = get_or_create_entity(db, Brand, request.brand)
    category = get_or_create_entity(db, Category, request.category)
    market = get_or_create_entity(db, Market, request.market)
    kpi = get_or_create_entity(db, KPI, request.kpi) if request.kpi and request.kpi.strip() else None
    
    project.job_number = request.job_number
    project.client_id = client.id
    project.brand_id = brand.id
    project.category_id = category.id
    project.market_id = market.id
    project.kpi_id = kpi.id if kpi else None
    
    db.commit()
    db.refresh(project)
    sync_db_to_excel(db)
    return ProjectResponse(
        id=project.id,
        job_number=project.job_number,
        client=project.client.name,
        brand=project.brand.name,
        category=project.category.name,
        market=project.market.name,
        kpi=project.kpi.name if project.kpi else None
    )

@router.delete("/projects/{id}")
def delete_project(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    
    db.delete(project)
    db.commit()
    sync_db_to_excel(db)
    return {"status": "success", "message": "Project record deleted."}

