import sys
from pathlib import Path

# Add backend directory to sys.path so app modules are resolvable by Vercel Serverless
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.main import app
