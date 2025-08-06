import os
import httpx
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from datetime import date, datetime
from typing import List
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from . import models, schemas
from .database import SessionLocal, engine
from .utils import hash_password, verify_password
from .auth import create_access_token, verify_access_token

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# --- FINAL, MORE ROBUST CORS CONFIGURATION ---
# This uses a Regular Expression to flexibly match allowed origins.
app.add_middleware(
    CORSMiddleware,
    # This regex allows your specific live frontend URL AND localhost for development.
    allow_origin_regex=r"https://bkst-frontend\.onrender\.com|http://localhost:5173",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --- END OF NEW CONFIGURATION ---


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- User & Auth Endpoints ---
@app.post("/signup", response_model=schemas.UserOut)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = hash_password(user.password)
    db_user = models.User(full_name=user.full_name, username=user.username, email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access_token = create_access_token(data={"user_id": user.id})
    return {"access_token": access_token, "token_type": "bearer", "user_id": user.id}

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = verify_access_token(token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(models.User).filter(models.User.id == payload.get("user_id")).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

@app.get("/userdash/{user_id}", response_model=schemas.UserOut)
def get_user_dashboard(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user

# ... (The rest of your endpoints remain the same)