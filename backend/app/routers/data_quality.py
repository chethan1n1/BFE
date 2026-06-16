import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Client, Brand, Category, Market, KPI, Project, DataMapping, DataCleansingAudit
from app.schemas import DataQualitySummary, DataQualityWarning, MergeRequest, DataMappingResponse, DataCleansingAuditResponse
from app.routers.auth import get_current_user
from typing import List, Dict, Any, Optional
from uuid import UUID
from app.services.ingest import sync_db_to_excel

router = APIRouter(prefix="/data-quality", tags=["Data Quality"])

def clean_name_simple(name: str) -> str:
    """Strips all non-alphanumeric characters and lowercases the name."""
    if not name:
        return ""
    return re.sub(r'[^a-zA-Z0-9]', '', name).lower()

@router.get("", response_model=DataQualitySummary)
def get_data_quality_report(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    warnings = []
    
    # 1. Fetch all dimensions
    all_brands = db.query(Brand).all()
    all_categories = db.query(Category).all()
    all_markets = db.query(Market).all()
    all_kpis = db.query(KPI).all()
    all_clients = db.query(Client).all()
    
    # Pre-calculate project counts by entity ID to show how many rows are affected
    brand_counts = {str(b_id): count for b_id, count in db.query(Project.brand_id, func.count(Project.id)).group_by(Project.brand_id).all()}
    cat_counts = {str(c_id): count for c_id, count in db.query(Project.category_id, func.count(Project.id)).group_by(Project.category_id).all()}
    market_counts = {str(m_id): count for m_id, count in db.query(Project.market_id, func.count(Project.id)).group_by(Project.market_id).all()}
    kpi_counts = {str(k_id): count for k_id, count in db.query(Project.kpi_id, func.count(Project.id)).group_by(Project.kpi_id).all()}
    client_counts = {str(c_id): count for c_id, count in db.query(Project.client_id, func.count(Project.id)).group_by(Project.client_id).all()}

    # Group lists by dimension name
    dimensions_data = [
        ("brand", all_brands, brand_counts),
        ("category", all_categories, cat_counts),
        ("market", all_markets, market_counts),
        ("kpi", all_kpis, kpi_counts),
        ("client", all_clients, client_counts)
    ]
    
    health_score = 100
    
    for dim_name, entities, counts_map in dimensions_data:
        # Step A: Find Case-insensitive / Formatting Duplicates
        cleaned_groups = {}
        for entity in entities:
            raw_name = entity.name
            cleaned = clean_name_simple(raw_name)
            if not cleaned:
                continue
            if cleaned not in cleaned_groups:
                cleaned_groups[cleaned] = []
            cleaned_groups[cleaned].append(entity)
            
        for cleaned, group in cleaned_groups.items():
            if len(group) > 1:
                # We have a capitalization/whitespace duplicate!
                names = [e.name for e in group]
                total_projects = sum(counts_map.get(str(e.id), 0) for e in group)
                
                # Pick the most populated or shortest name as suggested fix
                sorted_group = sorted(group, key=lambda e: (counts_map.get(str(e.id), 0), -len(e.name)), reverse=True)
                suggested = sorted_group[0].name
                
                warnings.append(
                    DataQualityWarning(
                        id=f"dup-{dim_name}-{cleaned}",
                        type="duplicate",
                        dimension=dim_name,
                        message=f"Duplicate spelling / formatting found for {dim_name}",
                        details=f"The names {', '.join([f'\"{n}\"' for n in names])} are variations of the same name.",
                        count=total_projects,
                        suggested_fix=suggested,
                        entities=names
                    )
                )
                health_score -= 5

        # Step B: Find Substring/Variant duplicates (e.g. "Heineken Nigeria" and "Heineken")
        # Sort entities by length descending
        sorted_entities = sorted(entities, key=lambda e: len(e.name))
        for i in range(len(sorted_entities)):
            name_i = sorted_entities[i].name
            if len(name_i) < 4:
                continue
            for j in range(i + 1, len(sorted_entities)):
                name_j = sorted_entities[j].name
                # If name_i is a full word inside name_j
                pattern = r'\b' + re.escape(name_i.lower()) + r'\b'
                if re.search(pattern, name_j.lower()) and name_i.lower() != name_j.lower():
                    # Check if they have shared words and both have projects
                    proj_i = counts_map.get(str(sorted_entities[i].id), 0)
                    proj_j = counts_map.get(str(sorted_entities[j].id), 0)
                    
                    # Avoid flagging obvious false positives like "S26" and "S26 Gold" unless we want to merge them
                    # Check if they are likely duplicates
                    warnings.append(
                        DataQualityWarning(
                            id=f"variant-{dim_name}-{clean_name_simple(name_i)}-{clean_name_simple(name_j)}",
                            type="duplicate",
                            dimension=dim_name,
                            message=f"Possible brand variant or suffix duplicate",
                            details=f"\"{name_j}\" appears to be a variant or sub-segment of \"{name_i}\".",
                            count=proj_i + proj_j,
                            suggested_fix=name_i,
                            entities=[name_i, name_j]
                        )
                    )
                    health_score -= 3

        # Step C: Dimension mismatches (e.g. brand name contains category keywords)
        if dim_name == "brand":
            for entity in entities:
                raw_name = entity.name
                if "category" in raw_name.lower() or "segment" in raw_name.lower() or raw_name.lower().startswith("category -"):
                    proj_count = counts_map.get(str(entity.id), 0)
                    warnings.append(
                        DataQualityWarning(
                            id=f"mismatch-brand-cat-{clean_name_simple(raw_name)}",
                            type="mismatch",
                            dimension=dim_name,
                            message="Possible category label classified as Brand",
                            details=f"Brand name \"{raw_name}\" contains words indicating it belongs to Categories.",
                            count=proj_count,
                            suggested_fix="Move to Category",
                            entities=[raw_name]
                        )
                    )
                    health_score -= 10
                elif raw_name.lower() in ["india", "china", "germany", "usa", "sweden", "france", "brazil", "uk", "united kingdom"]:
                    proj_count = counts_map.get(str(entity.id), 0)
                    warnings.append(
                        DataQualityWarning(
                            id=f"mismatch-brand-market-{clean_name_simple(raw_name)}",
                            type="mismatch",
                            dimension=dim_name,
                            message="Possible market label classified as Brand",
                            details=f"Brand name \"{raw_name}\" is a geographical country/market name.",
                            count=proj_count,
                            suggested_fix="Move to Market",
                            entities=[raw_name]
                        )
                    )
                    health_score -= 10

        # Step D: Outliers & Placeholders
        for entity in entities:
            raw_name = entity.name
            proj_count = counts_map.get(str(entity.id), 0)
            
            # Placeholder detection
            if raw_name.lower() in ["unknown", "unspecified", "other", "unknown client", "unspecified brand", "ya"]:
                warnings.append(
                    DataQualityWarning(
                        id=f"placeholder-{dim_name}-{clean_name_simple(raw_name)}",
                        type="outlier",
                        dimension=dim_name,
                        message=f"Generic placeholder name in {dim_name}",
                        details=f"\"{raw_name}\" is a generic placeholder rather than a specific {dim_name} entry.",
                        count=proj_count,
                        suggested_fix=None,
                        entities=[raw_name]
                    )
                )
                health_score -= 2
            
            # Frequency outliers (entities with 0 or 1 projects)
            elif proj_count <= 1:
                # Do not spam with too many, only show if name is short or weird
                if len(raw_name) <= 2 or proj_count == 0:
                    warnings.append(
                        DataQualityWarning(
                            id=f"outlier-{dim_name}-{clean_name_simple(raw_name)}",
                            type="outlier",
                            dimension=dim_name,
                            message=f"Low-frequency outlier in {dim_name}",
                            details=f"\"{raw_name}\" has {proj_count} associated projects, which could indicate a typo.",
                            count=proj_count,
                            suggested_fix=None,
                            entities=[raw_name]
                        )
                    )
                    health_score -= 1

    # Keep health score in bounds [10, 100]
    health_score = max(10, min(100, health_score))
    
    return DataQualitySummary(
        health_score=health_score,
        total_warnings=len(warnings),
        warnings=warnings
    )

@router.post("/merge")
def merge_dimensions(
    request: MergeRequest,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    dim = request.dimension.lower()
    raw = request.raw_name.strip()
    canonical = request.canonical_name.strip()
    
    if raw == canonical:
         raise HTTPException(status_code=400, detail="Cannot merge an entity into itself.")
         
    # 1. Resolve DB models
    model_map = {
        "client": Client,
        "brand": Brand,
        "category": Category,
        "market": Market,
        "kpi": KPI
    }
    
    if dim not in model_map:
        raise HTTPException(status_code=400, detail=f"Invalid dimension: {request.dimension}")
        
    model = model_map[dim]
    
    # 2. Query target and source entities exactly (case-sensitive)
    source = db.query(model).filter(model.name == raw).first()
    target = db.query(model).filter(model.name == canonical).first()
    
    if not source:
        raise HTTPException(status_code=404, detail=f"Source entity '{raw}' not found.")
        
    # If target doesn't exist, we rename the source entity
    if not target:
        source.name = canonical
        db.flush()
        # Save mapping override so it's applied on Excel reseeds
        mapping = db.query(DataMapping).filter(
            DataMapping.dimension == dim,
            DataMapping.raw_name == raw
        ).first()
        if not mapping:
            mapping = DataMapping(dimension=dim, raw_name=raw, canonical_name=canonical)
            db.add(mapping)
        else:
            mapping.canonical_name = canonical
            
        # Log Audit Trail for rename
        audit = DataCleansingAudit(
            dimension=dim,
            action_type="rename",
            source_name=raw,
            target_name=canonical,
            affected_project_ids="[]"
        )
        db.add(audit)
        
        db.commit()
        sync_db_to_excel(db)
        return {"status": "success", "message": f"Successfully renamed '{raw}' to '{canonical}'."}
        
    # 3. Merge: Query affected project IDs before updating
    source_id = source.id
    target_id = target.id
    
    if dim == "client":
        affected_projects = db.query(Project).filter(Project.client_id == source_id).all()
    elif dim == "brand":
        affected_projects = db.query(Project).filter(Project.brand_id == source_id).all()
    elif dim == "category":
        affected_projects = db.query(Project).filter(Project.category_id == source_id).all()
    elif dim == "market":
        affected_projects = db.query(Project).filter(Project.market_id == source_id).all()
    elif dim == "kpi":
        affected_projects = db.query(Project).filter(Project.kpi_id == source_id).all()
    else:
        affected_projects = []
        
    import json
    affected_ids = [str(p.id) for p in affected_projects]
    
    # 3b. Update projects pointing to source to point to target
    if dim == "client":
        db.query(Project).filter(Project.client_id == source_id).update({Project.client_id: target_id})
    elif dim == "brand":
        db.query(Project).filter(Project.brand_id == source_id).update({Project.brand_id: target_id})
    elif dim == "category":
        db.query(Project).filter(Project.category_id == source_id).update({Project.category_id: target_id})
    elif dim == "market":
        db.query(Project).filter(Project.market_id == source_id).update({Project.market_id: target_id})
    elif dim == "kpi":
        db.query(Project).filter(Project.kpi_id == source_id).update({Project.kpi_id: target_id})
        
    # 4. Delete source entity
    db.delete(source)
    db.flush()
    
    # 5. Save the mapping rule in data_mappings table
    mapping = db.query(DataMapping).filter(
        DataMapping.dimension == dim,
        DataMapping.raw_name == raw
    ).first()
    if not mapping:
        mapping = DataMapping(dimension=dim, raw_name=raw, canonical_name=canonical)
        db.add(mapping)
    else:
        mapping.canonical_name = canonical
        
    # 6. Log Audit Trail for merge
    audit = DataCleansingAudit(
        dimension=dim,
        action_type="merge",
        source_name=raw,
        target_name=canonical,
        affected_project_ids=json.dumps(affected_ids)
    )
    db.add(audit)
        
    db.commit()
    sync_db_to_excel(db)
    
    return {"status": "success", "message": f"Successfully merged '{raw}' into '{canonical}'."}

@router.get("/mappings", response_model=List[DataMappingResponse])
def get_mappings(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    return db.query(DataMapping).order_by(DataMapping.dimension, DataMapping.raw_name).all()

@router.delete("/mappings/{id}")
def delete_mapping(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    mapping = db.query(DataMapping).filter(DataMapping.id == id).first()
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping rule not found.")
    db.delete(mapping)
    db.commit()
    return {"status": "success", "message": "Mapping rule removed."}

@router.get("/audits", response_model=List[DataCleansingAuditResponse])
def get_cleansing_audits(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    return db.query(DataCleansingAudit).order_by(DataCleansingAudit.timestamp.desc()).all()

@router.post("/undo/{audit_id}")
def undo_cleansing(
    audit_id: UUID,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    audit = db.query(DataCleansingAudit).filter(DataCleansingAudit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit log entry not found.")
    if audit.undone:
        raise HTTPException(status_code=400, detail="This action has already been undone.")
        
    dim = audit.dimension.lower()
    raw = audit.source_name
    canonical = audit.target_name
    
    model_map = {
        "client": Client,
        "brand": Brand,
        "category": Category,
        "market": Market,
        "kpi": KPI
    }
    model = model_map[dim]
    
    if audit.action_type == "rename":
        target = db.query(model).filter(model.name == canonical).first()
        if not target:
            raise HTTPException(status_code=404, detail=f"Target entity '{canonical}' not found to rename back.")
        target.name = raw
        db.flush()
        
    elif audit.action_type == "merge":
        source = db.query(model).filter(model.name == raw).first()
        if not source:
            source = model(name=raw)
            db.add(source)
            db.flush()
            
        source_id = source.id
        
        import json
        try:
            affected_ids = json.loads(audit.affected_project_ids)
        except Exception:
            affected_ids = []
            
        if affected_ids:
            parsed_ids = []
            for i in affected_ids:
                try:
                    parsed_ids.append(UUID(i))
                except ValueError:
                    pass
            if parsed_ids:
                if dim == "client":
                    db.query(Project).filter(Project.id.in_(parsed_ids)).update({Project.client_id: source_id}, synchronize_session=False)
                elif dim == "brand":
                    db.query(Project).filter(Project.id.in_(parsed_ids)).update({Project.brand_id: source_id}, synchronize_session=False)
                elif dim == "category":
                    db.query(Project).filter(Project.id.in_(parsed_ids)).update({Project.category_id: source_id}, synchronize_session=False)
                elif dim == "market":
                    db.query(Project).filter(Project.id.in_(parsed_ids)).update({Project.market_id: source_id}, synchronize_session=False)
                elif dim == "kpi":
                    db.query(Project).filter(Project.id.in_(parsed_ids)).update({Project.kpi_id: source_id}, synchronize_session=False)
                db.flush()
                
    mapping = db.query(DataMapping).filter(
        DataMapping.dimension == dim,
        DataMapping.raw_name == raw,
        DataMapping.canonical_name == canonical
    ).first()
    if mapping:
        db.delete(mapping)
        
    audit.undone = True
    db.commit()
    sync_db_to_excel(db)
    
    return {"status": "success", "message": f"Successfully reverted {audit.action_type} for '{raw}'."}
