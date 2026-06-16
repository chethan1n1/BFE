import uuid
from sqlalchemy import Column, String, ForeignKey, Table, DateTime, Boolean, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeDecorator, CHAR
from app.database import Base

# A database-agnostic GUID type.
# Uses CHAR(36) on SQLite/others, UUID on PostgreSQL.
class GUID(TypeDecorator):
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return value
        else:
            if isinstance(value, uuid.UUID):
                return str(value)
            return value

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, str):
            return uuid.UUID(value)
        return value

class Client(Base):
    __tablename__ = "clients"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False, index=True)
    
    projects = relationship("Project", back_populates="client", cascade="all, delete-orphan")

class Brand(Base):
    __tablename__ = "brands"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False, index=True)
    
    projects = relationship("Project", back_populates="brand", cascade="all, delete-orphan")

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False, index=True)
    
    projects = relationship("Project", back_populates="category", cascade="all, delete-orphan")

class Market(Base):
    __tablename__ = "markets"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False, index=True)
    
    projects = relationship("Project", back_populates="market", cascade="all, delete-orphan")

class KPI(Base):
    __tablename__ = "kpis"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False, index=True)
    
    projects = relationship("Project", back_populates="kpi", cascade="all, delete-orphan")

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    job_number = Column(String(100), nullable=False, index=True)
    
    client_id = Column(GUID(), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    brand_id = Column(GUID(), ForeignKey("brands.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(GUID(), ForeignKey("categories.id", ondelete="CASCADE"), nullable=False, index=True)
    market_id = Column(GUID(), ForeignKey("markets.id", ondelete="CASCADE"), nullable=False, index=True)
    kpi_id = Column(GUID(), ForeignKey("kpis.id", ondelete="SET NULL"), nullable=True, index=True)
    
    client = relationship("Client", back_populates="projects")
    brand = relationship("Brand", back_populates="projects")
    category = relationship("Category", back_populates="projects")
    market = relationship("Market", back_populates="projects")
    kpi = relationship("KPI", back_populates="projects")

class DataMapping(Base):
    __tablename__ = "data_mappings"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    dimension = Column(String(50), nullable=False, index=True)  # 'client', 'brand', 'category', 'market', 'kpi'
    raw_name = Column(String(255), unique=True, nullable=False, index=True)
    canonical_name = Column(String(255), nullable=False)

class DataCleansingAudit(Base):
    __tablename__ = "data_cleansing_audits"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    timestamp = Column(DateTime, default=func.now(), nullable=False)
    dimension = Column(String(50), nullable=False)  # 'client', 'brand', 'category', 'market', 'kpi'
    action_type = Column(String(50), nullable=False)  # 'merge' or 'rename'
    source_name = Column(String(255), nullable=False)
    target_name = Column(String(255), nullable=False)
    affected_project_ids = Column(String, nullable=False)  # JSON-serialized list of project UUID strings
    undone = Column(Boolean, default=False, nullable=False)
