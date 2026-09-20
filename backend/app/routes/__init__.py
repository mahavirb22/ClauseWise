from app.routes.ingest import router as ingest_router
from app.routes.clauses import router as clauses_router
from app.routes.compare import router as compare_router
from app.routes.ask import router as ask_router
from app.routes.nextsteps import router as nextsteps_router

__all__ = [
    "ingest_router",
    "clauses_router",
    "compare_router",
    "ask_router",
    "nextsteps_router",
]
