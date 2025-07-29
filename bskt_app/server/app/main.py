import os
import httpx
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from datetime import date
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

# --- User & Auth Endpoints ---
# (Signup, Login, get_current_user... these remain the same)
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

# --- Session Endpoints ---
@app.post("/sessions", response_model=schemas.SessionOut)
def create_session(session: schemas.SessionCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # The symbol is now included in the session request body
    db_session = models.Session(user_id=current_user.id, **session.dict())
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

# (Other session endpoints remain the same)
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

# --- Journal Endpoints ---
# (These remain the same)
@app.post("/journal-entries", response_model=schemas.JournalEntryOut, status_code=status.HTTP_201_CREATED)
def create_journal_entry(entry: schemas.JournalEntryCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_entry = models.JournalEntry(user_id=current_user.id, title=entry.title, content=entry.content)
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@app.get("/journal-entries", response_model=List[schemas.JournalEntryOut])
def get_user_journal_entries(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.JournalEntry).filter(models.JournalEntry.user_id == current_user.id).order_by(models.JournalEntry.created_at.desc()).all()

# --- NEW: Endpoint to fetch historical data ---
@app.get("/api/historical-data/{session_id}")
async def get_historical_data(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Fetches historical data for a given session from the Twelve Data API.
    """
    session = db.query(models.Session).filter(
        models.Session.id == session_id,
        models.Session.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    api_key = os.getenv("TWELVE_DATA_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="API key is not configured on the server.")

    # Format dates for the API call
    start_date_str = session.start_date.strftime('%Y-%m-%d')
    end_date_str = session.end_date.strftime('%Y-%m-%d')

    api_url = (
        f"https://api.twelvedata.com/time_series?"
        f"symbol={session.symbol}&"
        f"interval={session.timeframe}&"
        f"start_date={start_date_str}&"
        f"end_date={end_date_str}&"
        f"apikey={api_key}&"
        f"outputsize=5000" # Max output size
    )

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(api_url)
            response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
            api_data = response.json()

            if api_data.get("status") != "ok":
                raise HTTPException(status_code=400, detail=f"Error from Twelve Data API: {api_data.get('message', 'Unknown error')}")

            # Transform the data into the format Lightweight Charts expects
            chart_data = [
                {
                    "time": int(d["timestamp"]),
                    "open": float(d["open"]),
                    "high": float(d["high"]),
                    "low": float(d["low"]),
                    "close": float(d["close"]),
                }
                for d in api_data.get("values", [])
            ]
            # The API returns data in ascending order, so we reverse it to have the latest data first for our replay
            chart_data.reverse()
            
            return {"data": chart_data}

        except httpx.RequestError as exc:
            raise HTTPException(status_code=503, detail=f"An error occurred while requesting from Twelve Data: {exc}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")
