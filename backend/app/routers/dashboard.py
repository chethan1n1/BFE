from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Project, Client, Brand, Category, Market, KPI
from app.schemas import DashboardStats, ChartDataPoint
from app.routers.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    # 1. Totals
    # Unique project count by job_number
    total_projects = db.query(func.count(func.distinct(Project.job_number))).scalar() or 0
    total_clients = db.query(func.count(Client.id)).scalar() or 0
    total_brands = db.query(func.count(Brand.id)).scalar() or 0
    total_markets = db.query(func.count(Market.id)).scalar() or 0
    total_categories = db.query(func.count(Category.id)).scalar() or 0
    total_kpis = db.query(func.count(KPI.id)).scalar() or 0

    # Helper function to convert DB aggregates to ChartDataPoints
    def to_chart_data(query_results, names_dict) -> list:
        return [
            ChartDataPoint(name=names_dict.get(str(item_id), "Unknown"), value=count)
            for item_id, count in query_results if count > 0
        ]

    # Caches for name lookup
    client_names = {str(c.id): c.name for c in db.query(Client.id, Client.name).all()}
    cat_names = {str(c.id): c.name for c in db.query(Category.id, Category.name).all()}
    market_names = {str(m.id): m.name for m in db.query(Market.id, Market.name).all()}
    kpi_names = {str(k.id): k.name for k in db.query(KPI.id, KPI.name).all()}

    # Top Clients (by project row count)
    top_clients_query = db.query(Project.client_id, func.count(Project.id).label("cnt"))\
        .group_by(Project.client_id).order_by(func.count(Project.id).desc()).limit(8).all()
    top_clients = to_chart_data(top_clients_query, client_names)

    # Top Categories
    top_categories_query = db.query(Project.category_id, func.count(Project.id).label("cnt"))\
        .group_by(Project.category_id).order_by(func.count(Project.id).desc()).limit(8).all()
    top_categories = to_chart_data(top_categories_query, cat_names)

    # Top Markets
    top_markets_query = db.query(Project.market_id, func.count(Project.id).label("cnt"))\
        .group_by(Project.market_id).order_by(func.count(Project.id).desc()).limit(8).all()
    top_markets = to_chart_data(top_markets_query, market_names)

    # Top KPIs
    top_kpis_query = db.query(Project.kpi_id, func.count(Project.id).label("cnt"))\
        .filter(Project.kpi_id.isnot(None))\
        .group_by(Project.kpi_id).order_by(func.count(Project.id).desc()).limit(8).all()
    top_kpis = to_chart_data(top_kpis_query, kpi_names)

    # Market Distribution (All)
    market_dist_query = db.query(Project.market_id, func.count(Project.id).label("cnt"))\
        .group_by(Project.market_id).order_by(func.count(Project.id).desc()).all()
    market_distribution = to_chart_data(market_dist_query, market_names)

    # Category Distribution (All)
    cat_dist_query = db.query(Project.category_id, func.count(Project.id).label("cnt"))\
        .group_by(Project.category_id).order_by(func.count(Project.id).desc()).all()
    category_distribution = to_chart_data(cat_dist_query, cat_names)

    return DashboardStats(
        total_projects=total_projects,
        total_clients=total_clients,
        total_brands=total_brands,
        total_markets=total_markets,
        total_categories=total_categories,
        total_kpis=total_kpis,
        top_clients=top_clients,
        top_categories=top_categories,
        top_markets=top_markets,
        top_kpis=top_kpis,
        market_distribution=market_distribution,
        category_distribution=category_distribution
    )
