import os
import pandas as pd
from sqlalchemy.orm import Session
from app.models import Client, Brand, Category, Market, KPI, Project, DataMapping

# Typos and Casing Normalizations for Markets
MARKET_NORMALIZATION = {
    "GEMANY": "Germany",
    "USA": "USA",
    "GLOBAL": "Global",
    "BRAZIL": "Brazil",
    "CHINA": "China",
    "ITALY": "Italy",
    "SWEDEN": "Sweden",
    "FRANCE": "France",
    "RUSSIA": "Russia",
    "CANADA": "Canada",
    "AUSTRALIA": "Australia",
    "JAPAN": "Japan",
    "SOUTH KOREA": "South Korea",
    "MEXICO": "Mexico",
    "INDONESIA": "Indonesia",
    "NIGERIA": "Nigeria",
    "SPAIN": "Spain",
    "UK": "United Kingdom",
    "NETHERLANDS": "Netherlands",
    "SWITZERLAND": "Switzerland",
    "POLAND": "Poland",
    "CZECH REPUBLIC": "Czech Republic",
    "BELGIUM": "Belgium",
    "SINGAPORE": "Singapore",
    "MALAYSIA": "Malaysia",
    "THAILAND": "Thailand",
    "VIETNAM": "Vietnam",
    "PHILIPPINES": "Philippines",
    "PHILLIPINES": "Philippines",
    "PHILLIPPINES": "Philippines",
    "KOREA": "South Korea",
    "NEW ZEALAND": "New Zealand",
    "SOUTH AFRICA": "South Africa",
    "ARGENTINA": "Argentina",
    "COLOMBIA": "Colombia",
    "CHILE": "Chile",
    "PERU": "Peru",
    "VENEZUELA": "Venezuela",
    "PORTUGAL": "Portugal",
    "AUSTRIA": "Austria",
    "DENMARK": "Denmark",
    "FINLAND": "Finland",
    "NORWAY": "Norway",
    "GREECE": "Greece",
    "TURKEY": "Turkey",
    "INDIA": "India",
}

# Casing normalizations for Categories
CATEGORY_NORMALIZATION = {
    "personal care": "Personal Care",
    "personal_care": "Personal Care",
    "Personal care": "Personal Care",
}

# Typos, casing, and spelling duplicates for KPIs
KPI_NORMALIZATION = {
    # Power duplicates
    "POWER": "Power",
    "power": "Power",
    "Power": "Power",
    
    # Consideration duplicates
    "CONSIDERATION": "Consideration",
    "consideration": "Consideration",
    
    # Satisfaction duplicates
    "SATISFACTION": "Satisfaction",
    "satisfaction": "Satisfaction",
    
    # Favorable duplicates
    "FAVORABLE": "Favorable",
    "favorable": "Favorable",
    
    # Favourite Brand duplicates
    "FavouriteBrand": "Favourite Brand",
    
    # Phrase casing normalizations
    "consideration TB": "Consideration TB",
    "power in mind": "Power in Mind",
    "Fav 3 brand": "Fav 3 Brand",
    "Most Pref brand": "Most Pref Brand",
    "CTB, Ordered Last 1 week": "CTB, Ordered Last 1 Week",
    "Preference (CT2B)": "Preference (CT2B)",
}

def clean_string(val):
    if pd.isna(val) or val is None:
        return None
    val_str = str(val).strip()
    return val_str if val_str else None

def normalize_market(market_name):
    if pd.isna(market_name) or market_name is None:
        return "Global"
    cleaned = str(market_name).strip().upper()
    if not cleaned:
        return "Global"
    if cleaned in MARKET_NORMALIZATION:
        return MARKET_NORMALIZATION[cleaned]
    return str(market_name).strip().title()

def normalize_category(category_name):
    if pd.isna(category_name) or category_name is None:
        return "Other"
    cleaned = str(category_name).strip()
    if not cleaned:
        return "Other"
    if cleaned in CATEGORY_NORMALIZATION:
        return CATEGORY_NORMALIZATION[cleaned]
    return cleaned.title()

def normalize_client(client_name):
    if pd.isna(client_name) or client_name is None:
        return "Unknown Client"
    cleaned = str(client_name).strip()
    return cleaned if cleaned else "Unknown Client"

def normalize_brand(brand_name):
    if pd.isna(brand_name) or brand_name is None:
        return "Unspecified Brand"
    cleaned = str(brand_name).strip()
    return cleaned if cleaned else "Unspecified Brand"

def normalize_kpi(kpi_name):
    if pd.isna(kpi_name) or kpi_name is None:
        return None
    cleaned = str(kpi_name).strip()
    if not cleaned:
        return None
        
    # Check exact casing match first
    if cleaned in KPI_NORMALIZATION:
        return KPI_NORMALIZATION[cleaned]
        
    # Check uppercase match to capture spelling typos and raw casing variations
    upper_cleaned = cleaned.upper()
    if upper_cleaned in KPI_NORMALIZATION:
        return KPI_NORMALIZATION[upper_cleaned]
        
    return cleaned

def ingest_excel(db: Session, file_path: str):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Excel file not found at {file_path}")
        
    print(f"Reading excel sheet from {file_path}...")
    df = pd.read_excel(file_path, sheet_name=0)
    
    # Check sheet schema
    required_cols = ['CoE_Job_number', 'Category', 'Client', 'Brand_Modelled', 'Market_for_Brand', 'Dependent_var']
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Missing required column in Excel sheet: {col}")
            
    # Drop rows that are entirely empty
    df = df.dropna(how='all')
    
    # Deduplicate exact duplicate rows to clean the raw data
    before_dedup = len(df)
    df = df.drop_duplicates()
    after_dedup = len(df)
    print(f"Deduplicated sheet: went from {before_dedup} rows to {after_dedup} rows.")
    
    # Load all custom mapping rules from DB
    mappings = db.query(DataMapping).all()
    mapping_dict = {
        "client": {},
        "brand": {},
        "category": {},
        "market": {},
        "kpi": {}
    }
    for m in mappings:
        mapping_dict[m.dimension.lower()][m.raw_name.strip().lower()] = m.canonical_name
    
    # In-memory caches to speed up inserts
    client_cache = {}
    brand_cache = {}
    category_cache = {}
    market_cache = {}
    kpi_cache = {}
    
    # Preload existing records in DB if any
    for client in db.query(Client).all():
        client_cache[client.name] = client.id
    for brand in db.query(Brand).all():
        brand_cache[brand.name] = brand.id
    for category in db.query(Category).all():
        category_cache[category.name] = category.id
    for market in db.query(Market).all():
        market_cache[market.name] = market.id
    for kpi in db.query(KPI).all():
        kpi_cache[kpi.name] = kpi.id
        
    projects_imported = 0
    
    # Process each row
    for index, row in df.iterrows():
        # Job number
        job_number_raw = row['CoE_Job_number']
        if pd.isna(job_number_raw):
            continue
        job_number = str(job_number_raw).strip()
        
        # Dimensions normalizations
        client_name = normalize_client(row['Client'])
        if client_name.strip().lower() in mapping_dict["client"]:
            client_name = mapping_dict["client"][client_name.strip().lower()]
            
        brand_name = normalize_brand(row['Brand_Modelled'])
        if brand_name.strip().lower() in mapping_dict["brand"]:
            brand_name = mapping_dict["brand"][brand_name.strip().lower()]
            
        category_name = normalize_category(row['Category'])
        if category_name.strip().lower() in mapping_dict["category"]:
            category_name = mapping_dict["category"][category_name.strip().lower()]
            
        market_name = normalize_market(row['Market_for_Brand'])
        if market_name.strip().lower() in mapping_dict["market"]:
            market_name = mapping_dict["market"][market_name.strip().lower()]
            
        kpi_name = normalize_kpi(row['Dependent_var'])
        if kpi_name and kpi_name.strip().lower() in mapping_dict["kpi"]:
            kpi_name = mapping_dict["kpi"][kpi_name.strip().lower()]
        
        # 1. Resolve Client
        if client_name not in client_cache:
            client_obj = Client(name=client_name)
            db.add(client_obj)
            db.flush()
            client_cache[client_name] = client_obj.id
        client_id = client_cache[client_name]
        
        # 2. Resolve Brand
        if brand_name not in brand_cache:
            brand_obj = Brand(name=brand_name)
            db.add(brand_obj)
            db.flush()
            brand_cache[brand_name] = brand_obj.id
        brand_id = brand_cache[brand_name]
        
        # 3. Resolve Category
        if category_name not in category_cache:
            category_obj = Category(name=category_name)
            db.add(category_obj)
            db.flush()
            category_cache[category_name] = category_obj.id
        category_id = category_cache[category_name]
        
        # 4. Resolve Market
        if market_name not in market_cache:
            market_obj = Market(name=market_name)
            db.add(market_obj)
            db.flush()
            market_cache[market_name] = market_obj.id
        market_id = market_cache[market_name]
        
        # 5. Resolve KPI (Nullable)
        kpi_id = None
        if kpi_name:
            if kpi_name not in kpi_cache:
                kpi_obj = KPI(name=kpi_name)
                db.add(kpi_obj)
                db.flush()
                kpi_cache[kpi_name] = kpi_obj.id
            kpi_id = kpi_cache[kpi_name]
            
        # Check if project row already exists in database
        project_exists = db.query(Project).filter(
            Project.job_number == job_number,
            Project.client_id == client_id,
            Project.brand_id == brand_id,
            Project.category_id == category_id,
            Project.market_id == market_id,
            Project.kpi_id == kpi_id
        ).first()
        
        if not project_exists:
            project_obj = Project(
                job_number=job_number,
                client_id=client_id,
                brand_id=brand_id,
                category_id=category_id,
                market_id=market_id,
                kpi_id=kpi_id
            )
            db.add(project_obj)
            projects_imported += 1
            
    db.commit()
    
    # Return Ingestion Report Counts
    return {
        "Projects Imported": projects_imported,
        "Clients Imported": len(client_cache),
        "Brands Imported": len(brand_cache),
        "Markets Imported": len(market_cache),
        "Categories Imported": len(category_cache),
        "KPIs Imported": len(kpi_cache)
    }

def sync_db_to_excel(db: Session):
    import pandas as pd
    import os
    from app.models import Project
    
    projects = db.query(Project).all()
    rows = []
    for p in projects:
        rows.append({
            'CoE_Job_number': p.job_number,
            'Category': p.category.name if p.category else '',
            'Client': p.client.name if p.client else '',
            'Brand_Modelled': p.brand.name if p.brand else '',
            'Market_for_Brand': p.market.name if p.market else '',
            'Dependent_var': p.kpi.name if p.kpi else ''
        })
        
    df = pd.DataFrame(rows)
    excel_path = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../data/Master_Data_BSA_Relationship_Explorer.xlsx"))
    df.to_excel(excel_path, index=False)

