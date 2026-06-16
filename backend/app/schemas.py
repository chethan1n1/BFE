from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime

# Auth Schemas
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    username: str
    role: str = "admin"

# Dimension Schemas
class ClientResponse(BaseModel):
    id: UUID
    name: str
    class Config:
        from_attributes = True

class BrandResponse(BaseModel):
    id: UUID
    name: str
    class Config:
        from_attributes = True

class CategoryResponse(BaseModel):
    id: UUID
    name: str
    class Config:
        from_attributes = True

class MarketResponse(BaseModel):
    id: UUID
    name: str
    class Config:
        from_attributes = True

class KPIResponse(BaseModel):
    id: UUID
    name: str
    class Config:
        from_attributes = True

# Project / Row Schemas
class ProjectResponse(BaseModel):
    id: UUID
    job_number: str
    client: str
    brand: str
    category: str
    market: str
    kpi: Optional[str] = None
    class Config:
        from_attributes = True

# Dashboard Schemas
class ChartDataPoint(BaseModel):
    name: str
    value: int

class DashboardStats(BaseModel):
    total_projects: int
    total_clients: int
    total_brands: int
    total_markets: int
    total_categories: int
    total_kpis: int
    
    top_clients: List[ChartDataPoint]
    top_categories: List[ChartDataPoint]
    top_markets: List[ChartDataPoint]
    top_kpis: List[ChartDataPoint]
    market_distribution: List[ChartDataPoint]
    category_distribution: List[ChartDataPoint]

# Graph Schemas
class GraphNode(BaseModel):
    id: str
    type: str  # CLIENT, BRAND, CATEGORY, MARKET, KPI
    label: str
    size: int = 10
    score: float = 0.0

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    weight: float = 1.0

class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

# Node Detail Side Drawer Schema
class EntityRecommendation(BaseModel):
    id: str
    type: str
    name: str
    reason: str

class NodeDetailResponse(BaseModel):
    id: str
    name: str
    type: str
    project_count: int
    score: float
    
    # Linked lists for profile display
    top_clients: List[str] = []
    top_brands: List[str] = []
    top_categories: List[str] = []
    top_markets: List[str] = []
    top_kpis: List[str] = []
    
    # Strengths
    network_strength: float = 0.0
    recent_projects: List[ProjectResponse] = []
    recommendations: List[EntityRecommendation] = []

# Global Network Metrics
class GraphMetricsResponse(BaseModel):
    total_nodes: int
    total_edges: int
    density: float
    most_connected_clients: List[ChartDataPoint]
    most_connected_brands: List[ChartDataPoint]
    most_connected_markets: List[ChartDataPoint]
    most_connected_categories: List[ChartDataPoint]
    most_connected_kpis: List[ChartDataPoint]

# Capability Matrix Schemas
class MatrixCell(BaseModel):
    row_name: str
    col_name: str
    project_count: int
    coverage_score: float
    expertise_score: float

class CapabilityMatrixResponse(BaseModel):
    rows: List[str]
    cols: List[str]
    cells: List[MatrixCell]

# Credential Finder Schemas
class CredentialFinderRequest(BaseModel):
    category_id: Optional[UUID] = None
    market_id: Optional[UUID] = None
    kpi_id: Optional[UUID] = None

class CredentialFinderResult(BaseModel):
    id: UUID
    job_number: str
    client: str
    brand: str
    category: str
    market: str
    kpi: Optional[str] = None
    match_score: float
    reasoning: List[str]
    class Config:
        from_attributes = True

class CredentialFinderResponse(BaseModel):
    results: List[CredentialFinderResult]

# Data Quality Schemas
class DataMappingResponse(BaseModel):
    id: UUID
    dimension: str
    raw_name: str
    canonical_name: str
    class Config:
        from_attributes = True

class MergeRequest(BaseModel):
    dimension: str
    raw_name: str
    canonical_name: str

class DataQualityWarning(BaseModel):
    id: str
    type: str  # 'duplicate', 'mismatch', 'outlier'
    dimension: str  # 'client', 'brand', 'category', 'market', 'kpi'
    message: str
    details: str
    count: int  # Number of affected entities / projects
    suggested_fix: Optional[str] = None
    entities: List[str]

class DataQualitySummary(BaseModel):
    health_score: int
    total_warnings: int
    warnings: List[DataQualityWarning]

class ProjectCreateRequest(BaseModel):
    job_number: str
    client: str
    brand: str
    category: str
    market: str
    kpi: Optional[str] = None

class ProjectUpdateRequest(BaseModel):
    job_number: str
    client: str
    brand: str
    category: str
    market: str
    kpi: Optional[str] = None

class DataCleansingAuditResponse(BaseModel):
    id: UUID
    timestamp: datetime
    dimension: str
    action_type: str
    source_name: str
    target_name: str
    affected_project_ids: str
    undone: bool

    class Config:
        from_attributes = True
