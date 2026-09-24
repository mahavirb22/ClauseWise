# JurisMind - Legal Document Assistant

**JurisMind** is an AI-powered legal-document assistant monorepo built with **FastAPI (Python 3.11)** for the backend, **React (Vite) + TypeScript + TailwindCSS** for the frontend, and **ChromaDB** for vector storage and retrieval.

---

## 🏗 Repository Structure

```
JurisMind/
├── backend/                  # FastAPI Python 3.11 Server
│   ├── app/
│   │   ├── routes/           # Feature endpoints (ingest, clauses, compare, ask, nextsteps)
│   │   ├── services/         # Services (gemini_client, vector_store, pdf_parser)
│   │   └── models/           # Pydantic schemas (Clause, DocumentSummary, Route DTOs)
│   ├── .env.example          # API Key configuration placeholder
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                 # React + TypeScript + TailwindCSS App
│   ├── src/
│   │   ├── api/              # Typed fetch API wrappers
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Feature page views (Ingest, Clauses, Compare, Ask, NextSteps)
│   │   └── types/            # Shared TypeScript interfaces matching Pydantic schemas
│   ├── Dockerfile
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── docker-compose.yml        # Orchestration for Backend + Frontend + ChromaDB
└── README.md
```

---

## 🔑 Shared Data Models

The shared domain entities are mapped symmetrically across backend Pydantic models and frontend TypeScript interfaces:

### `Clause`
```typescript
interface Clause {
  id: string;
  text: string;
  category: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskReason: string;
  conflictsWith: string[];
}
```

### `DocumentSummary`
```typescript
interface DocumentSummary {
  docId: string;
  fileName: string;
  plainSummary: string;
  clauses: Clause[];
}
```

---

## ⚡ Quickstart: Local Development

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** & **npm**

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env

# Run FastAPI dev server with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend server will run at `http://localhost:8000` (Swagger docs available at `http://localhost:8000/docs`).

---

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run Vite dev server
npm run dev
```

The frontend will run at `http://localhost:5173`.

---

## 🐳 Running with Docker Compose

To launch all three services (**Backend**, **Frontend**, and **ChromaDB**) in containers:

```bash
# Set your GEMINI_API_KEY in backend/.env or export it in shell:
export GEMINI_API_KEY="your_actual_key_here"

# Start services
docker-compose up --build
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **ChromaDB**: http://localhost:8001

---

## 🔌 API Endpoints Summary

| Feature | Method | Endpoint | Description |
|---|---|---|---|
| **Ingest** | `POST` | `/api/ingest` | Upload PDF or text document; returns `DocumentSummary` |
| **Clauses** | `GET` | `/api/clauses` | Retrieve list of parsed clauses, with optional risk filter |
| **Clauses Detail** | `GET` | `/api/clauses/{id}` | Get single clause analysis |
| **Compare** | `POST` | `/api/compare` | Compare document versions or clauses for conflicts |
| **Ask Q&A** | `POST` | `/api/ask` | Legal context Q&A with clause citation metadata |
| **Next Steps** | `POST` | `/api/nextsteps` | Generates prioritized risk mitigation recommendations |
