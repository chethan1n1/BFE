export interface ClientResponse {
  id: string;
  name: string;
}

export interface BrandResponse {
  id: string;
  name: string;
}

export interface CategoryResponse {
  id: string;
  name: string;
}

export interface MarketResponse {
  id: string;
  name: string;
}

export interface KPIResponse {
  id: string;
  name: string;
}

export interface ProjectResponse {
  id: string;
  job_number: string;
  client: string;
  brand: string;
  category: string;
  market: string;
  kpi: string | null;
}

export interface ChartDataPoint {
  name: string;
  value: number;
}

export interface DashboardStats {
  total_projects: number;
  total_clients: number;
  total_brands: number;
  total_markets: number;
  total_categories: number;
  total_kpis: number;
  top_clients: ChartDataPoint[];
  top_categories: ChartDataPoint[];
  top_markets: ChartDataPoint[];
  top_kpis: ChartDataPoint[];
  market_distribution: ChartDataPoint[];
  category_distribution: ChartDataPoint[];
}

export interface GraphNode {
  id: string;
  type: 'CLIENT' | 'BRAND' | 'CATEGORY' | 'MARKET' | 'KPI';
  label: string;
  size?: number;
  score?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface EntityRecommendation {
  id: string;
  type: string;
  name: string;
  reason: string;
}

export interface NodeDetailResponse {
  id: string;
  name: string;
  type: string;
  project_count: number;
  score: number;
  top_clients: string[];
  top_brands: string[];
  top_categories: string[];
  top_markets: string[];
  top_kpis: string[];
  network_strength: number;
  recent_projects: ProjectResponse[];
  recommendations: EntityRecommendation[];
}

export interface GraphMetricsResponse {
  total_nodes: number;
  total_edges: number;
  density: number;
  most_connected_clients: ChartDataPoint[];
  most_connected_brands: ChartDataPoint[];
  most_connected_markets: ChartDataPoint[];
  most_connected_categories: ChartDataPoint[];
  most_connected_kpis: ChartDataPoint[];
}

export interface MatrixCell {
  row_name: string;
  col_name: string;
  project_count: number;
  coverage_score: number;
  expertise_score: number;
}

export interface CapabilityMatrixResponse {
  rows: string[];
  cols: string[];
  cells: MatrixCell[];
}

export interface CredentialFinderResult {
  id: string;
  job_number: string;
  client: string;
  brand: string;
  category: string;
  market: string;
  kpi: string | null;
  match_score: number;
  reasoning: string[];
}

export interface CredentialFinderResponse {
  results: CredentialFinderResult[];
}
