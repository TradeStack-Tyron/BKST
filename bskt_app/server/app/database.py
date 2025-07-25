from dotenv import load_dotenv
import os
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
print("DATABASE_URL:", DATABASE_URL)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
# Use a relative import because this file is in the same 'app' package as models.py
from .models import Base

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
