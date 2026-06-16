from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Project, Client, Brand, Category, Market, KPI
from typing import Dict, List, Any

# Relationship Strength Formula helper
def compute_strength(project_count: int, market_diversity: int, kpi_diversity: int) -> float:
    return round((project_count * 0.6) + (market_diversity * 0.2) + (kpi_diversity * 0.2), 2)

# Normalization Helper
def normalize_scores(raw_scores: Dict[Any, float]) -> Dict[Any, float]:
    if not raw_scores:
        return {}
    max_val = max(raw_scores.values())
    if max_val == 0:
        return {k: 0.0 for k in raw_scores.keys()}
    return {k: round((v / max_val) * 100, 1) for k, v in raw_scores.items()}

# 1. Market Expertise Scores
def calculate_market_expertise(db: Session) -> Dict[str, float]:
    # Query: market_id, count(projects), count(distinct client_id), count(distinct category_id), count(distinct kpi_id)
    results = db.query(
        Project.market_id,
        func.count(Project.id).label("proj_cnt"),
        func.count(func.distinct(Project.client_id)).label("client_cnt"),
        func.count(func.distinct(Project.category_id)).label("cat_cnt"),
        func.count(func.distinct(Project.kpi_id)).label("kpi_cnt")
    ).group_by(Project.market_id).all()
    
    raw = {}
    for market_id, proj_cnt, client_cnt, cat_cnt, kpi_cnt in results:
        raw[str(market_id)] = proj_cnt + client_cnt + cat_cnt + kpi_cnt
        
    return normalize_scores(raw)

# 2. Category Expertise Scores
def calculate_category_expertise(db: Session) -> Dict[str, float]:
    results = db.query(
        Project.category_id,
        func.count(Project.id).label("proj_cnt"),
        func.count(func.distinct(Project.client_id)).label("client_cnt"),
        func.count(func.distinct(Project.market_id)).label("market_cnt"),
        func.count(func.distinct(Project.kpi_id)).label("kpi_cnt")
    ).group_by(Project.category_id).all()
    
    raw = {}
    for category_id, proj_cnt, client_cnt, market_cnt, kpi_cnt in results:
        raw[str(category_id)] = proj_cnt + client_cnt + market_cnt + kpi_cnt
        
    return normalize_scores(raw)

# 3. Client Strength Scores
def calculate_client_strength(db: Session) -> Dict[str, float]:
    results = db.query(
        Project.client_id,
        func.count(Project.id).label("proj_cnt"),
        func.count(func.distinct(Project.brand_id)).label("brand_cnt"),
        func.count(func.distinct(Project.market_id)).label("market_cnt"),
        func.count(func.distinct(Project.kpi_id)).label("kpi_cnt")
    ).group_by(Project.client_id).all()
    
    raw = {}
    for client_id, proj_cnt, brand_cnt, market_cnt, kpi_cnt in results:
        raw[str(client_id)] = proj_cnt + brand_cnt + market_cnt + kpi_cnt
        
    return normalize_scores(raw)

# 4. Brand Strength Scores
def calculate_brand_strength(db: Session) -> Dict[str, float]:
    results = db.query(
        Project.brand_id,
        func.count(Project.id).label("proj_cnt"),
        func.count(func.distinct(Project.client_id)).label("client_cnt"),
        func.count(func.distinct(Project.market_id)).label("market_cnt"),
        func.count(func.distinct(Project.kpi_id)).label("kpi_cnt")
    ).group_by(Project.brand_id).all()
    
    raw = {}
    for brand_id, proj_cnt, client_cnt, market_cnt, kpi_cnt in results:
        raw[str(brand_id)] = proj_cnt + client_cnt + market_cnt + kpi_cnt
        
    return normalize_scores(raw)

# 5. KPI Coverage Scores
def calculate_kpi_coverage(db: Session) -> Dict[str, float]:
    results = db.query(
        Project.kpi_id,
        func.count(Project.id).label("proj_cnt"),
        func.count(func.distinct(Project.client_id)).label("client_cnt"),
        func.count(func.distinct(Project.market_id)).label("market_cnt"),
        func.count(func.distinct(Project.category_id)).label("cat_cnt")
    ).filter(Project.kpi_id.isnot(None)).group_by(Project.kpi_id).all()
    
    raw = {}
    for kpi_id, proj_cnt, client_cnt, market_cnt, cat_cnt in results:
        raw[str(kpi_id)] = proj_cnt + client_cnt + market_cnt + cat_cnt
        
    return normalize_scores(raw)

# Helper to load names for caching
def get_entity_names(db: Session) -> Dict[str, Dict[str, str]]:
    names = {"CLIENT": {}, "BRAND": {}, "CATEGORY": {}, "MARKET": {}, "KPI": {}}
    for c in db.query(Client).all():
        names["CLIENT"][str(c.id)] = c.name
    for b in db.query(Brand).all():
        names["BRAND"][str(b.id)] = b.name
    for cat in db.query(Category).all():
        names["CATEGORY"][str(cat.id)] = cat.name
    for m in db.query(Market).all():
        names["MARKET"][str(m.id)] = m.name
    for k in db.query(KPI).all():
        names["KPI"][str(k.id)] = k.name
    return names

# Recommendations engine based on shared projects / categories
def get_entity_recommendations(db: Session, entity_id: str, entity_type: str, names_cache: Dict[str, Dict[str, str]]) -> List[Dict[str, Any]]:
    recommendations = []
    
    if entity_type == "CLIENT":
        # Find clients with high category overlap
        # Get categories of current client
        client_cats = [r[0] for r in db.query(Project.category_id).filter(Project.client_id == entity_id).distinct().all()]
        if client_cats:
            other_clients = db.query(
                Project.client_id,
                func.count(Project.id).label("cnt")
            ).filter(
                Project.client_id != entity_id,
                Project.category_id.in_(client_cats)
            ).group_by(Project.client_id).order_by(func.count(Project.id).desc()).limit(5).all()
            
            for cid, cnt in other_clients:
                cid_str = str(cid)
                name = names_cache["CLIENT"].get(cid_str, "Client")
                recommendations.append({
                    "id": cid_str,
                    "type": "CLIENT",
                    "name": name,
                    "reason": f"High category overlap ({cnt} projects in shared categories)"
                })
                
    elif entity_type == "BRAND":
        # Find brands with similar market overlap
        brand_markets = [r[0] for r in db.query(Project.market_id).filter(Project.brand_id == entity_id).distinct().all()]
        if brand_markets:
            other_brands = db.query(
                Project.brand_id,
                func.count(Project.id).label("cnt")
            ).filter(
                Project.brand_id != entity_id,
                Project.market_id.in_(brand_markets)
            ).group_by(Project.brand_id).order_by(func.count(Project.id).desc()).limit(5).all()
            
            for bid, cnt in other_brands:
                bid_str = str(bid)
                name = names_cache["BRAND"].get(bid_str, "Brand")
                recommendations.append({
                    "id": bid_str,
                    "type": "BRAND",
                    "name": name,
                    "reason": f"Active in same markets ({cnt} projects in overlapping regions)"
                })
                
    elif entity_type == "MARKET":
        # Find markets with similar category strengths
        market_cats = [r[0] for r in db.query(Project.category_id).filter(Project.market_id == entity_id).distinct().all()]
        if market_cats:
            other_markets = db.query(
                Project.market_id,
                func.count(Project.id).label("cnt")
            ).filter(
                Project.market_id != entity_id,
                Project.category_id.in_(market_cats)
            ).group_by(Project.market_id).order_by(func.count(Project.id).desc()).limit(5).all()
            
            for mid, cnt in other_markets:
                mid_str = str(mid)
                name = names_cache["MARKET"].get(mid_str, "Market")
                recommendations.append({
                    "id": mid_str,
                    "type": "MARKET",
                    "name": name,
                    "reason": f"Shares category profiles ({cnt} projects in same categories)"
                })
                
    elif entity_type == "CATEGORY":
        # Find categories with similar KPI sets
        cat_kpis = [r[0] for r in db.query(Project.kpi_id).filter(Project.category_id == entity_id).filter(Project.kpi_id.isnot(None)).distinct().all()]
        if cat_kpis:
            other_cats = db.query(
                Project.category_id,
                func.count(Project.id).label("cnt")
            ).filter(
                Project.category_id != entity_id,
                Project.kpi_id.in_(cat_kpis)
            ).group_by(Project.category_id).order_by(func.count(Project.id).desc()).limit(5).all()
            
            for cid, cnt in other_cats:
                cid_str = str(cid)
                name = names_cache["CATEGORY"].get(cid_str, "Category")
                recommendations.append({
                    "id": cid_str,
                    "type": "CATEGORY",
                    "name": name,
                    "reason": f"Models similar business metrics ({cnt} overlapping KPIs)"
                })
                
    elif entity_type == "KPI":
        # Find KPIs modelled in similar categories
        kpi_cats = [r[0] for r in db.query(Project.category_id).filter(Project.kpi_id == entity_id).distinct().all()]
        if kpi_cats:
            other_kpis = db.query(
                Project.kpi_id,
                func.count(Project.id).label("cnt")
            ).filter(
                Project.kpi_id != entity_id,
                Project.kpi_id.isnot(None),
                Project.category_id.in_(kpi_cats)
            ).group_by(Project.kpi_id).order_by(func.count(Project.id).desc()).limit(5).all()
            
            for kid, cnt in other_kpis:
                kid_str = str(kid)
                name = names_cache["KPI"].get(kid_str, "KPI")
                recommendations.append({
                    "id": kid_str,
                    "type": "KPI",
                    "name": name,
                    "reason": f"Tracked in same categories ({cnt} overlapping project categories)"
                })
                
    return recommendations
