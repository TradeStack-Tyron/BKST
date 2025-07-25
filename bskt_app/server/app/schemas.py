from pydantic import BaseModel, EmailStr
from datetime import date, datetime
from typing import Optional, List, Any
from decimal import Decimal

class UserCreate(BaseModel):
    full_name: str
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    full_name: str
    username: str
    email: EmailStr

    class Config:
        from_attributes = True # Changed from orm_mode

# Session schemas
class SessionCreate(BaseModel):
    name: str
    start_date: date
    end_date: date
    starting_capital: Decimal

class SessionOut(BaseModel):
    id: int
    name: str
    start_date: date
    end_date: date
    starting_capital: Decimal
    result: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime
    current_candle_index: int
    current_balance: Optional[Decimal]
    position_quantity: Decimal
    position_avg_price: Decimal
    trades_data: Optional[str]
    timeframe: str
    is_completed: bool
    
    class Config:
        from_attributes = True # Changed from orm_mode

# Session state update schema
class SessionStateUpdate(BaseModel):
    current_candle_index: int
    current_balance: Decimal
    position_quantity: Decimal
    position_avg_price: Decimal
    trades_data: Optional[List[Any]]
    timeframe: str

# Session completion schema
class SessionComplete(BaseModel):
    result: Decimal

# Journal schemas
class JournalEntryCreate(BaseModel):
    title: str
    content: str

class JournalEntryOut(BaseModel):
    id: int
    user_id: int
    title: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True # Changed from orm_mode
