from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Project, Client, Brand, Category, Market, KPI
from app.schemas import GraphResponse, GraphNode, GraphEdge, NodeDetailResponse, GraphMetricsResponse, EntityRecommendation, ProjectResponse
from app.services.analytics import (
    calculate_market_expertise,
    calculate_category_expertise,
    calculate_client_strength,
    calculate_brand_strength,
    calculate_kpi_coverage,
    get_entity_names,
    get_entity_recommendations,
    compute_strength
)
from app.routers.auth import get_current_user
from typing import List, Dict, Any, Optional

router = APIRouter(prefix="/graph", tags=["Graph Network"])

# Helper to parse prefix and UUID
def parse_node_id(node_id: str):
    try:
        parts = node_id.split("_", 1)
        if len(parts) == 2:
            return parts[0], parts[1]
    except Exception:
        pass
    raise HTTPException(status_code=400, detail=f"Invalid node ID format: {node_id}")

@router.get("", response_model=GraphResponse)
def get_graph(
    db: Session = Depends(get_db),
    limit_nodes: int = 150,
    current_user: str = Depends(get_current_user)
):
    """
    Returns a core subset of nodes and edges (Client <-> Brand <-> Category/Market <-> KPI)
    to prevent canvas crowding on initial load.
    """
    names = get_entity_names(db)
    
    # Load expertise scores
    market_scores = calculate_market_expertise(db)
    cat_scores = calculate_category_expertise(db)
    client_scores = calculate_client_strength(db)
    brand_scores = calculate_brand_strength(db)
    kpi_scores = calculate_kpi_coverage(db)
    
    nodes_dict = {}
    edges_list = []
    
    # Let's load the client-brand relations
    # We will limit initial loading to top projects/clients to keep layout clean
    cb_relations = db.query(
        Project.client_id,
        Project.brand_id,
        func.count(Project.id).label("p_cnt"),
        func.count(func.distinct(Project.market_id)).label("m_div"),
        func.count(func.distinct(Project.kpi_id)).label("k_div")
    ).group_by(Project.client_id, Project.brand_id)\
     .order_by(func.count(Project.id).desc())\
     .limit(limit_nodes // 2).all()
     
    for cid, bid, p_cnt, m_div, k_div in cb_relations:
        cid_str = f"CLIENT_{cid}"
        bid_str = f"BRAND_{bid}"
        
        # Add Client Node
        if cid_str not in nodes_dict:
            nodes_dict[cid_str] = GraphNode(
                id=cid_str,
                type="CLIENT",
                label=names["CLIENT"].get(str(cid), "Client"),
                score=client_scores.get(str(cid), 0.0)
            )
            
        # Add Brand Node
        if bid_str not in nodes_dict:
            nodes_dict[bid_str] = GraphNode(
                id=bid_str,
                type="BRAND",
                label=names["BRAND"].get(str(bid), "Brand"),
                score=brand_scores.get(str(bid), 0.0)
            )
            
        # Add Client-Brand Edge
        edges_list.append(GraphEdge(
            id=f"{cid_str}-{bid_str}",
            source=cid_str,
            target=bid_str,
            weight=compute_strength(p_cnt, m_div, k_div)
        ))
        
    # Load brand-category relations
    bc_relations = db.query(
        Project.brand_id,
        Project.category_id,
        func.count(Project.id).label("p_cnt"),
        func.count(func.distinct(Project.market_id)).label("m_div"),
        func.count(func.distinct(Project.kpi_id)).label("k_div")
    ).group_by(Project.brand_id, Project.category_id)\
     .order_by(func.count(Project.id).desc())\
     .limit(limit_nodes // 3).all()
     
    for bid, cat_id, p_cnt, m_div, k_div in bc_relations:
        bid_str = f"BRAND_{bid}"
        cat_str = f"CATEGORY_{cat_id}"
        
        # Add nodes if they aren't already included
        if bid_str not in nodes_dict:
            # Only add if client is in nodes or keep isolated
            nodes_dict[bid_str] = GraphNode(
                id=bid_str,
                type="BRAND",
                label=names["BRAND"].get(str(bid), "Brand"),
                score=brand_scores.get(str(bid), 0.0)
            )
        if cat_str not in nodes_dict:
            nodes_dict[cat_str] = GraphNode(
                id=cat_str,
                type="CATEGORY",
                label=names["CATEGORY"].get(str(cat_id), "Category"),
                score=cat_scores.get(str(cat_id), 0.0)
            )
            
        edges_list.append(GraphEdge(
            id=f"{bid_str}-{cat_str}",
            source=bid_str,
            target=cat_str,
            weight=compute_strength(p_cnt, m_div, k_div)
        ))
        
    # Load brand-market relations
    bm_relations = db.query(
        Project.brand_id,
        Project.market_id,
        func.count(Project.id).label("p_cnt"),
        func.count(func.distinct(Project.client_id)).label("c_div"),
        func.count(func.distinct(Project.kpi_id)).label("k_div")
    ).group_by(Project.brand_id, Project.market_id)\
     .order_by(func.count(Project.id).desc())\
     .limit(limit_nodes // 3).all()
     
    for bid, mid, p_cnt, c_div, k_div in bm_relations:
        bid_str = f"BRAND_{bid}"
        mid_str = f"MARKET_{mid}"
        
        if bid_str not in nodes_dict:
            nodes_dict[bid_str] = GraphNode(
                id=bid_str,
                type="BRAND",
                label=names["BRAND"].get(str(bid), "Brand"),
                score=brand_scores.get(str(bid), 0.0)
            )
        if mid_str not in nodes_dict:
            nodes_dict[mid_str] = GraphNode(
                id=mid_str,
                type="MARKET",
                label=names["MARKET"].get(str(mid), "Market"),
                score=market_scores.get(str(mid), 0.0)
            )
            
        edges_list.append(GraphEdge(
            id=f"{bid_str}-{mid_str}",
            source=bid_str,
            target=mid_str,
            weight=compute_strength(p_cnt, c_div, k_div)
        ))
        
    # Load market-kpi relations
    mk_relations = db.query(
        Project.market_id,
        Project.kpi_id,
        func.count(Project.id).label("p_cnt"),
        func.count(func.distinct(Project.client_id)).label("c_div"),
        func.count(func.distinct(Project.brand_id)).label("b_div")
    ).filter(Project.kpi_id.isnot(None))\
     .group_by(Project.market_id, Project.kpi_id)\
     .order_by(func.count(Project.id).desc())\
     .limit(limit_nodes // 4).all()
     
    for mid, kid, p_cnt, c_div, b_div in mk_relations:
        mid_str = f"MARKET_{mid}"
        kid_str = f"KPI_{kid}"
        
        if mid_str not in nodes_dict:
            nodes_dict[mid_str] = GraphNode(
                id=mid_str,
                type="MARKET",
                label=names["MARKET"].get(str(mid), "Market"),
                score=market_scores.get(str(mid), 0.0)
            )
        if kid_str not in nodes_dict:
            nodes_dict[kid_str] = GraphNode(
                id=kid_str,
                type="KPI",
                label=names["KPI"].get(str(kid), "KPI"),
                score=kpi_scores.get(str(kid), 0.0)
            )
            
        edges_list.append(GraphEdge(
            id=f"{mid_str}-{kid_str}",
            source=mid_str,
            target=kid_str,
            weight=compute_strength(p_cnt, c_div, b_div)
        ))
        
    return GraphResponse(nodes=list(nodes_dict.values()), edges=edges_list)

@router.get("/related/{id}", response_model=GraphResponse)
def get_related_nodes(id: str, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    """
    Progressive Node Expansion: Returns 1st degree neighbors and connecting edges
    for a clicked node, allowing lazy loading.
    """
    names = get_entity_names(db)
    node_type, entity_id = parse_node_id(id)
    
    # Load expertise scores
    market_scores = calculate_market_expertise(db)
    cat_scores = calculate_category_expertise(db)
    client_scores = calculate_client_strength(db)
    brand_scores = calculate_brand_strength(db)
    kpi_scores = calculate_kpi_coverage(db)
    
    nodes_dict = {}
    edges_list = []
    
    # Let's add the target node itself
    scores_dict = {
        "CLIENT": client_scores,
        "BRAND": brand_scores,
        "CATEGORY": cat_scores,
        "MARKET": market_scores,
        "KPI": kpi_scores
    }
    nodes_dict[id] = GraphNode(
        id=id,
        type=node_type,
        label=names[node_type].get(entity_id, "Node"),
        score=scores_dict[node_type].get(entity_id, 0.0)
    )
    
    # Filter projects containing this entity and fetch direct links
    filter_col = {
        "CLIENT": Project.client_id,
        "BRAND": Project.brand_id,
        "CATEGORY": Project.category_id,
        "MARKET": Project.market_id,
        "KPI": Project.kpi_id
    }[node_type]
    
    projects = db.query(Project).filter(filter_col == entity_id).all()
    
    # Aggregate connection counts
    for p in projects:
        connected_entities = [
            ("CLIENT", str(p.client_id)),
            ("BRAND", str(p.brand_id)),
            ("CATEGORY", str(p.category_id)),
            ("MARKET", str(p.market_id)),
            ("KPI", str(p.kpi_id) if p.kpi_id else None)
        ]
        
        for t_type, t_id in connected_entities:
            if not t_id or t_id == entity_id:
                continue
            
            t_node_id = f"{t_type}_{t_id}"
            
            # Add neighbor node
            if t_node_id not in nodes_dict:
                nodes_dict[t_node_id] = GraphNode(
                    id=t_node_id,
                    type=t_type,
                    label=names[t_type].get(t_id, "Node"),
                    score=scores_dict[t_type].get(t_id, 0.0)
                )
                
            # Create Edge ID (always in standard sorted source-target order)
            edge_id = "-".join(sorted([id, t_node_id]))
            
            # Add edge (we can calculate basic weight = 1.0 or compute strength)
            if not any(e.id == edge_id for e in edges_list):
                edges_list.append(GraphEdge(
                    id=edge_id,
                    source=id if id < t_node_id else t_node_id,
                    target=t_node_id if id < t_node_id else id,
                    weight=1.5 # default strength factor for progressive neighbors
                ))
                
    return GraphResponse(nodes=list(nodes_dict.values()), edges=edges_list)

@router.get("/node/{id}", response_model=NodeDetailResponse)
def get_node_details(id: str, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    """
    Entity Intelligence Profile details for the drawer and profile pages.
    """
    names = get_entity_names(db)
    node_type, entity_id = parse_node_id(id)
    
    # Load expertise scores
    scores_dict = {
        "CLIENT": calculate_client_strength(db),
        "BRAND": calculate_brand_strength(db),
        "CATEGORY": calculate_category_expertise(db),
        "MARKET": calculate_market_expertise(db),
        "KPI": calculate_kpi_coverage(db)
    }
    
    # Get all projects matching this entity
    filter_col = {
        "CLIENT": Project.client_id,
        "BRAND": Project.brand_id,
        "CATEGORY": Project.category_id,
        "MARKET": Project.market_id,
        "KPI": Project.kpi_id
    }[node_type]
    
    projects = db.query(Project).filter(filter_col == entity_id).all()
    project_count = len(projects)
    score = scores_dict[node_type].get(entity_id, 0.0)
    
    # Unique links lists
    linked_clients = set()
    linked_brands = set()
    linked_categories = set()
    linked_markets = set()
    linked_kpis = set()
    
    recent_projects_resp = []
    
    for p in projects:
        linked_clients.add(p.client.name)
        linked_brands.add(p.brand.name)
        linked_categories.add(p.category.name)
        linked_markets.add(p.market.name)
        if p.kpi:
            linked_kpis.add(p.kpi.name)
            
        if len(recent_projects_resp) < 5:
            recent_projects_resp.append(ProjectResponse(
                id=p.id,
                job_number=p.job_number,
                client=p.client.name,
                brand=p.brand.name,
                category=p.category.name,
                market=p.market.name,
                kpi=p.kpi.name if p.kpi else None
            ))
            
    # Calculate relationship network strength (average weights of connected items)
    network_strength = score * 0.8  # relative base network strength
    
    # Generate Entity Recommendations
    recs = get_entity_recommendations(db, entity_id, node_type, names)
    
    return NodeDetailResponse(
        id=id,
        name=names[node_type].get(entity_id, "Unknown"),
        type=node_type,
        project_count=project_count,
        score=score,
        top_clients=list(linked_clients)[:6],
        top_brands=list(linked_brands)[:6],
        top_categories=list(linked_categories)[:6],
        top_markets=list(linked_markets)[:6],
        top_kpis=list(linked_kpis)[:6],
        network_strength=network_strength,
        recent_projects=recent_projects_resp,
        recommendations=[EntityRecommendation(**r) for r in recs]
    )

@router.get("/metrics", response_model=GraphMetricsResponse)
def get_graph_metrics(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    """
    Returns high-level graph metrics and ranking lists of most connected nodes.
    """
    # High-level metrics
    total_nodes = db.query(func.count(Client.id)).scalar() + \
                  db.query(func.count(Brand.id)).scalar() + \
                  db.query(func.count(Category.id)).scalar() + \
                  db.query(func.count(Market.id)).scalar() + \
                  db.query(func.count(KPI.id)).scalar()
                  
    # Project rows represent edges between combinations
    total_edges = db.query(func.count(Project.id)).scalar()
    
    # Calculate density (simplified approximation)
    density = round(total_edges / (total_nodes * (total_nodes - 1) / 2), 4) if total_nodes > 1 else 0.0
    
    # Top connected rankings helper
    def get_most_connected(model, fk_field):
        names_dict = {str(m.id): m.name for m in db.query(model.id, model.name).all()}
        counts = db.query(fk_field, func.count(Project.id)).group_by(fk_field).order_by(func.count(Project.id).desc()).limit(5).all()
        return [
            {"name": names_dict.get(str(item_id), "Unknown"), "value": count}
            for item_id, count in counts
        ]
        
    return GraphMetricsResponse(
        total_nodes=total_nodes,
        total_edges=total_edges,
        density=density,
        most_connected_clients=get_most_connected(Client, Project.client_id),
        most_connected_brands=get_most_connected(Brand, Project.brand_id),
        most_connected_markets=get_most_connected(Market, Project.market_id),
        most_connected_categories=get_most_connected(Category, Project.category_id),
        most_connected_kpis=get_most_connected(KPI, Project.kpi_id)
    )
