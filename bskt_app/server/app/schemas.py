from pydantic import BaseModel, EmailStr
from datetime import date, datetime
from typing import Optional, List, Any
from decimal import Decimal

# --- User Schemas ---
class UserCreate(BaseModel):
    full_name: str
    username: str
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    full_name: str
    username: str
    email: EmailStr
    class Config:
        from_attributes = True
        # FIX: Add a JSON encoder to handle Decimal types
        json_encoders = {Decimal: float}

# --- Session Schemas ---
class SessionCreate(BaseModel):
    name: str
    symbol: str
    timeframe: str
    start_date: date
    end_date: date
    starting_capital: Decimal

class SessionOut(BaseModel):
    id: int
    name: str
    symbol: str
    start_date: date
    end_date: date
    starting_capital: Decimal
    result: Optional[Decimal] = None
    created_at: datetime
    updated_at: Optional[datetime]
    current_candle_index: int
    current_balance: Optional[Decimal]
    position_quantity: Decimal
    position_avg_price: Decimal
    trades_data: Optional[str]
    timeframe: str
    is_completed: bool
    class Config:
        from_attributes = True
        # FIX: Add a JSON encoder to handle Decimal types
        json_encoders = {Decimal: float}

class SessionStateUpdate(BaseModel):
    current_candle_index: int
    current_balance: Decimal
    position_quantity: Decimal
    position_avg_price: Decimal
    trades_data: Optional[List[Any]]
    timeframe: str

# --- Journal Schemas ---
class JournalEntryCreate(BaseModel):
    title: str
    content: str

class JournalEntryUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class JournalEntryOut(BaseModel):
    id: int
    user_id: int
    title: str
    content: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True
        # FIX: Add a JSON encoder to handle Decimal types
        json_encoders = {Decimal: float}

# --- Historical data response schema ---
class HistoricalDataPoint(BaseModel):
    time: int
    open: float
    high: float
    low: float
    close: float

class HistoricalDataResponse(BaseModel):
    data: List[HistoricalDataPoint]