from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Numeric, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base  # <-- FIX: Import Base from database.py

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    full_name = Column(String, nullable=False)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    journal_entries = relationship("JournalEntry", back_populates="user", cascade="all, delete-orphan")

class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=True)
    symbol = Column(String, nullable=False, default='EUR/USD')
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    starting_capital = Column(Numeric, nullable=False)
    result = Column(Numeric, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    current_candle_index = Column(Integer, default=20)
    current_balance = Column(Numeric, nullable=True)
    position_quantity = Column(Numeric, default=0)
    position_avg_price = Column(Numeric, default=0)
    trades_data = Column(Text, nullable=True)
    timeframe = Column(String, default='15min')
    is_completed = Column(Boolean, default=False)
    historical_data_cache = Column(Text, nullable=True)
    user = relationship("User", back_populates="sessions")

class JournalEntry(Base):
    __tablename__ = "journal_entries"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user = relationship("User", back_populates="journal_entries")