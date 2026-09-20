import os
import json
import logging
import math
from typing import List, Dict, Any, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

STATUTES_DATA_PATH = Path(__file__).parent.parent / "data" / "indian_statutes.json"


class VectorStore:
    """
    ChromaDB Vector Store service for Indian Legal Statutory Grounding RAG layer.
    """

    def __init__(self, host: Optional[str] = None, port: Optional[int] = None):
        self.host = host or os.getenv("CHROMA_HOST", "localhost")
        self.port = port or int(os.getenv("CHROMA_PORT", 8001))
        self.collection_name = "indian_legal_statutes"
        self._chroma_client = None
        self._collection = None
        self._genai_client = None
        self._statutes_cache: List[Dict[str, Any]] = []

        self._init_statutes_cache()
        self._init_chroma()
        self._init_genai()
        self.seed_statutes()

    def _init_statutes_cache(self):
        if STATUTES_DATA_PATH.exists():
            try:
                with open(STATUTES_DATA_PATH, "r", encoding="utf-8") as f:
                    self._statutes_cache = json.load(f)
            except Exception as e:
                logger.error(f"Error loading indian_statutes.json: {e}")

    def _init_genai(self):
        api_key = os.getenv("GEMINI_API_KEY", "")
        if api_key and api_key != "your_gemini_api_key_here":
            try:
                from google import genai
                self._genai_client = genai.Client(api_key=api_key)
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini Client for embeddings: {e}")

    def _init_chroma(self):
        try:
            import chromadb
            self._chroma_client = chromadb.Client()
            self._collection = self._chroma_client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}
            )
        except Exception as e:
            logger.warning(f"ChromaDB initialization fallback to memory: {e}")

    def _get_embedding(self, text: str) -> List[float]:
        """
        Embed text using Gemini's text-embedding-004 model or fallback vector representation.
        """
        if self._genai_client:
            try:
                res = self._genai_client.models.embed_content(
                    model="text-embedding-004",
                    contents=text
                )
                if res and res.embedding and res.embedding.values:
                    return list(res.embedding.values)
            except Exception as e:
                logger.warning(f"Gemini embedding call failed: {e}")

        # TF-IDF / Legal Term Hash Embedding vector
        legal_vocabulary = [
            "terminate", "termination", "breach", "refusal", "cancel", "rescind", "notice",
            "penalty", "liquidated", "damages", "compensation", "loss", "unreasonable",
            "restraint", "trade", "compete", "profession", "court", "proceedings", "limitation",
            "unfair", "consumer", "deposit", "unilateral", "defect", "product",
            "data", "privacy", "protection", "security", "negligence", "fiduciary", "consent"
        ]
        text_lower = text.lower()
        vector = [0.0] * (len(legal_vocabulary) + 64)
        
        for i, word in enumerate(legal_vocabulary):
            if word in text_lower:
                vector[i] += 2.0
                
        import hashlib
        for word in text_lower.split():
            h = int(hashlib.md5(word.encode()).hexdigest(), 16)
            idx = len(legal_vocabulary) + (h % 64)
            vector[idx] += 0.5
            
        norm = math.sqrt(sum(v * v for v in vector)) or 1.0
        return [v / norm for v in vector]

    def seed_statutes(self):
        """
        Index Indian statutory chunks into ChromaDB.
        """
        if not self._statutes_cache or not self._collection:
            return

        try:
            if self._collection.count() >= len(self._statutes_cache):
                return

            ids = []
            documents = []
            embeddings = []
            metadatas = []

            for item in self._statutes_cache:
                chunk_id = item["id"]
                topics_str = " ".join(item.get("topics", []))
                full_text = f"{item['statute']} {item['section']} {item['title']} {topics_str}: {item['text']}"
                citation = f"{item['section']} of the {item['statute']}"

                emb = self._get_embedding(full_text)

                ids.append(chunk_id)
                documents.append(full_text)
                embeddings.append(emb)
                metadatas.append({
                    "statute": item["statute"],
                    "section": item["section"],
                    "title": item["title"],
                    "citation": citation,
                    "text": item["text"],
                    "topics": ",".join(item.get("topics", []))
                })

            self._collection.upsert(
                ids=ids,
                documents=documents,
                embeddings=embeddings,
                metadatas=metadatas
            )
            logger.info(f"Indexed {len(ids)} Indian statutory sections into ChromaDB")
        except Exception as e:
            logger.error(f"Error seeding ChromaDB statutes: {e}")

    def retrieve_relevant_law(self, clause_text: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Retrieves the top_k matching Indian legal statutory chunks for a clause using vector similarity search.
        """
        if not clause_text or not clause_text.strip():
            return []

        if self._collection and self._collection.count() > 0:
            try:
                query_emb = self._get_embedding(clause_text)
                results = self._collection.query(
                    query_embeddings=[query_emb],
                    n_results=top_k
                )

                matches = []
                if results and results.get("metadatas") and len(results["metadatas"]) > 0:
                    metas = results["metadatas"][0]
                    distances = results.get("distances", [[0.0]*len(metas)])[0]
                    
                    for meta, dist in zip(metas, distances):
                        similarity = max(0.0, 1.0 - dist)
                        matches.append({
                            "statute": meta["statute"],
                            "section": meta["section"],
                            "title": meta["title"],
                            "citation": meta["citation"],
                            "text": meta["text"],
                            "relevance_score": round(similarity, 4)
                        })
                return matches
            except Exception as e:
                logger.error(f"ChromaDB query error: {e}")

        # Fallback keyword & topic scoring
        clause_lower = clause_text.lower()
        scored_items = []
        for item in self._statutes_cache:
            score = 0.0
            topics = item.get("topics", [])
            item_text = (item["text"] + " " + item["title"] + " " + item["section"]).lower()
            
            for topic in topics:
                if topic.lower() in clause_lower:
                    score += 5.0

            words = set(clause_lower.split())
            for word in words:
                if len(word) > 3 and word in item_text:
                    score += 1.0

            if score > 0:
                scored_items.append((score, item))

        scored_items.sort(key=lambda x: x[0], reverse=True)
        return [
            {
                "statute": item["statute"],
                "section": item["section"],
                "title": item["title"],
                "citation": f"{item['section']} of the {item['statute']}",
                "text": item["text"],
                "relevance_score": min(0.95, 0.5 + (score * 0.05))
            }
            for score, item in scored_items[:top_k]
        ]


# Global singleton instance
vector_store = VectorStore()
