# database.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# This will load variables from a .env file for local development
load_dotenv()

# This is the key change:
# It looks for a "DATABASE_URL" environment variable (which Render provides).
# If it can't find it, it falls back to the local SQLite database file.
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sql_app.db")


# This logic handles an argument that is specific to SQLite
# and shouldn't be passed when connecting to PostgreSQL.
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Your Base model from models.py will be imported here in your actual file.
# For this example, we define a placeholder. In your project, you'll likely
# import it from your models file.
from sqlalchemy.ext.declarative import declarative_base
Base = declarative_base()