import os
import sys

# Ensure backend directory is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, SessionLocal
from app.services.ingest import ingest_excel

def seed_database():
    print("Re-creating data tables (preserving mappings)...")
    # Drop all tables except data_mappings and data_cleansing_audits
    tables_to_drop = [table for name, table in Base.metadata.tables.items() if name not in ('data_mappings', 'data_cleansing_audits')]
    Base.metadata.drop_all(bind=engine, tables=tables_to_drop)
    Base.metadata.create_all(bind=engine)
    
    excel_path = "../data/Master_Data_BSA_Relationship_Explorer.xlsx"
    absolute_excel_path = os.path.abspath(os.path.join(os.path.dirname(__file__), excel_path))
    
    if not os.path.exists(absolute_excel_path):
        print(f"Error: Master Excel file not found at: {absolute_excel_path}")
        sys.exit(1)
        
    db = SessionLocal()
    try:
        report = ingest_excel(db, absolute_excel_path)
        print("\n" + "="*30)
        print("SEEDING COMPLETED SUCCESSFULLY!")
        print("="*30)
        for key, value in report.items():
            print(f"{key}: {value}")
        print("="*30 + "\n")
    except Exception as e:
        print(f"\nSeeding failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
