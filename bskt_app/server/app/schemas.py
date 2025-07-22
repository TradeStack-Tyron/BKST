from pydantic import BaseModel, EmailStr
from datetime import date, datetime
from typing import Optional
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
        orm_mode = True

# Add these new session schemas
class SessionCreate(BaseModel):
    name: str
    start_date: date
    end_date: date
    starting_capital: float

class SessionOut(BaseModel):
    id: int
    name: str
    start_date: date
    end_date: date
    starting_capital: float
    result: Optional[float] = None
    created_at: datetime
    
    class Config:
        orm_mode = True
        json_encoders = {
            Decimal: float
        }