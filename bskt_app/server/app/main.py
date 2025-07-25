from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from datetime import date
from typing import List
import json

# Use relative imports because all files are inside the 'app' package
from . import models, schemas
from .database import SessionLocal
from .utils import hash_password, verify_password
from .auth import create_access_token, verify_access_token

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- AUTH DEPENDENCY (Moved up) ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = verify_access_token(token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(models.User).filter(models.User.id == payload.get("user_id")).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

# --- USER ENDPOINTS ---
@app.post("/signup", response_model=schemas.UserOut)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = hash_password(user.password)
    db_user = models.User(
        full_name=user.full_name,
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
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

@app.get("/userdash", response_model=schemas.UserOut)
def user_dashboard(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.get("/userdash/{user_id}", response_model=schemas.UserOut)
def get_user_dashboard(user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Ensure the user is requesting their own dashboard
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this dashboard")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# --- SESSION ENDPOINTS ---
@app.post("/sessions", response_model=schemas.SessionOut)
def create_session(
    session: schemas.SessionCreate, 
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    db_session = models.Session(
        user_id=current_user.id,
        name=session.name,
        start_date=session.start_date,
        end_date=session.end_date,
        starting_capital=session.starting_capital,
        current_balance=session.starting_capital
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

@app.get("/sessions", response_model=List[schemas.SessionOut])
def get_user_sessions(
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    sessions = db.query(models.Session).filter(
        models.Session.user_id == current_user.id
    ).order_by(models.Session.created_at.desc()).all()
    return sessions

@app.get("/sessions/{session_id}", response_model=schemas.SessionOut)
def get_session(
    session_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(models.Session).filter(
        models.Session.id == session_id,
        models.Session.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@app.put("/sessions/{session_id}/state", response_model=schemas.SessionOut)
def update_session_state(
    session_id: int,
    state: schemas.SessionStateUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(models.Session).filter(
        models.Session.id == session_id,
        models.Session.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.current_candle_index = state.current_candle_index
    session.current_balance = state.current_balance
    session.position_quantity = state.position_quantity
    session.position_avg_price = state.position_avg_price
    session.timeframe = state.timeframe
    
    if state.trades_data is not None:
        session.trades_data = json.dumps(state.trades_data)
    else:
        session.trades_data = None

    db.commit()
    db.refresh(session)
    return session

@app.put("/sessions/{session_id}", response_model=schemas.SessionOut)
def update_session_result(
    session_id: int,
    result: float,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(models.Session).filter(
        models.Session.id == session_id,
        models.Session.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.result = result
    session.is_completed = True
    db.commit()
    db.refresh(session)
    return session

# --- JOURNAL ENTRY ENDPOINTS ---
@app.post("/journal-entries", response_model=schemas.JournalEntryOut, status_code=status.HTTP_201_CREATED)
def create_journal_entry(
    entry: schemas.JournalEntryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_entry = models.JournalEntry(
        **entry.dict(),
        user_id=current_user.id
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@app.get("/journal-entries", response_model=List[schemas.JournalEntryOut])
def get_user_journal_entries(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    entries = db.query(models.JournalEntry).filter(
        models.JournalEntry.user_id == current_user.id
    ).order_by(models.JournalEntry.created_at.desc()).all()
    return entries
