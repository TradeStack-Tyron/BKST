from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from datetime import date
from typing import List
import json

from . import models, schemas
from .database import SessionLocal, engine
from .utils import hash_password, verify_password
from .auth import create_access_token, verify_access_token

# Create all tables
models.Base.metadata.create_all(bind=engine)

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

# --- User Endpoints (Signup, Login, etc.) ---
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
def get_user_dashboard(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# --- Session Endpoints ---
@app.post("/sessions", response_model=schemas.SessionOut)
def create_session(session: schemas.SessionCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_session = models.Session(user_id=current_user.id, **session.dict())
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

@app.get("/sessions", response_model=List[schemas.SessionOut])
def get_user_sessions(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Session).filter(models.Session.user_id == current_user.id).order_by(models.Session.created_at.desc()).all()

@app.get("/sessions/{session_id}", response_model=schemas.SessionOut)
def get_session(session_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(models.Session).filter(models.Session.id == session_id, models.Session.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@app.put("/sessions/{session_id}/state", response_model=schemas.SessionOut)
def update_session_state(session_id: int, state: schemas.SessionStateUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(models.Session).filter(models.Session.id == session_id, models.Session.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    update_data = state.dict(exclude_unset=True)
    if 'trades_data' in update_data and update_data['trades_data'] is not None:
        update_data['trades_data'] = json.dumps(update_data['trades_data'])

    for key, value in update_data.items():
        setattr(session, key, value)
        
    db.commit()
    db.refresh(session)
    return session

# --- NEW: Journal Entry Endpoints ---

@app.post("/journal-entries", response_model=schemas.JournalEntryOut, status_code=status.HTTP_201_CREATED)
def create_journal_entry(
    entry: schemas.JournalEntryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a new journal entry for the current user."""
    db_entry = models.JournalEntry(
        user_id=current_user.id,
        title=entry.title,
        content=entry.content
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
    """Get all journal entries for the current user."""
    return db.query(models.JournalEntry).filter(models.JournalEntry.user_id == current_user.id).order_by(models.JournalEntry.created_at.desc()).all()

@app.get("/journal-entries/{entry_id}", response_model=schemas.JournalEntryOut)
def get_journal_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific journal entry by its ID."""
    entry = db.query(models.JournalEntry).filter(
        models.JournalEntry.id == entry_id,
        models.JournalEntry.user_id == current_user.id
    ).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")
    return entry

@app.put("/journal-entries/{entry_id}", response_model=schemas.JournalEntryOut)
def update_journal_entry(
    entry_id: int,
    entry_update: schemas.JournalEntryUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update a journal entry's title or content."""
    db_entry = db.query(models.JournalEntry).filter(
        models.JournalEntry.id == entry_id,
        models.JournalEntry.user_id == current_user.id
    ).first()

    if not db_entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")

    update_data = entry_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_entry, key, value)
    
    db.commit()
    db.refresh(db_entry)
    return db_entry

@app.delete("/journal-entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_journal_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete a journal entry."""
    db_entry = db.query(models.JournalEntry).filter(
        models.JournalEntry.id == entry_id,
        models.JournalEntry.user_id == current_user.id
    ).first()

    if not db_entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")
    
    db.delete(db_entry)
    db.commit()
    return {"detail": "Journal entry deleted successfully"}
