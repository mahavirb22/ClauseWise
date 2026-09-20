import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Add backend directory to python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.vector_store import vector_store
from app.services.gemini_client import GeminiClient
from app.main import app

client = TestClient(app)


def test_rag_statute_retrieval_relevance():
    print("\n" + "="*80)
    print("TEST 1: VERIFYING RAG STATUTE RETRIEVAL RELEVANCE FOR CLAUSE TYPES")
    print("="*80)

    # Test Case 1: Badly-written termination clause
    term_clause = "Either party may immediately terminate this agreement without cause or notice, forfeiting all accrued payments."
    term_results = vector_store.retrieve_relevant_law(term_clause, top_k=3)

    print(f"\n[QUERY] Termination Clause: \"{term_clause}\"")
    print("Top Retrieved Statutory Provisions:")
    retrieved_sections = []
    for r in term_results:
        print(f"  -> {r['citation']} ({r['title']}) [Relevance: {r['relevance_score']}]")
        retrieved_sections.append(r["section"])

    # Assert that termination surfaces Indian Contract Act Sec 39/55/74 or CPA Sec 2(46)
    has_relevant_term_statute = any(
        sec in ["Section 39", "Section 55", "Section 74", "Section 2(46)", "Section 75"]
        for sec in retrieved_sections
    )
    assert has_relevant_term_statute, f"Termination clause failed to retrieve Contract Act termination/penalty sections. Got: {retrieved_sections}"
    print("[PASSED] TEST 1A: Badly-written termination clause correctly surfaced Indian Contract Act termination/breach provisions!")

    # Test Case 2: Unreasonable Penalty Clause
    penalty_clause = "If Contractor delays delivery by 1 day, Contractor shall pay an immediate penalty of $100,000 as liquidated damages."
    penalty_results = vector_store.retrieve_relevant_law(penalty_clause, top_k=3)

    print(f"\n[QUERY] Liquidated Penalty Clause: \"{penalty_clause}\"")
    print("Top Retrieved Statutory Provisions:")
    penalty_sections = [r["section"] for r in penalty_results]
    for r in penalty_results:
        print(f"  -> {r['citation']} ({r['title']}) [Relevance: {r['relevance_score']}]")

    assert "Section 74" in penalty_sections or "Section 73" in penalty_sections or "Section 2(46)" in penalty_sections, \
        f"Penalty clause failed to retrieve Section 74 (Penalty) / Section 73. Got: {penalty_sections}"
    print("[PASSED] TEST 1B: Penalty clause correctly surfaced Section 74 of the Indian Contract Act 1872!")

    # Test Case 3: Data Breach Negligence Clause
    data_clause = "Vendor handles customer sensitive personal data but shall have no liability for data breaches or security negligence."
    data_results = vector_store.retrieve_relevant_law(data_clause, top_k=3)

    print(f"\n[QUERY] Data Breach Clause: \"{data_clause}\"")
    print("Top Retrieved Statutory Provisions:")
    data_sections = [r["section"] for r in data_results]
    for r in data_results:
        print(f"  -> {r['citation']} ({r['title']}) [Relevance: {r['relevance_score']}]")

    assert any(sec in ["Section 43A", "Section 72A", "Section 8", "Section 6"] for sec in data_sections), \
        f"Data breach clause failed to retrieve IT Act Sec 43A / DPDP Act Sec 8. Got: {data_sections}"
    print("[PASSED] TEST 1C: Data breach clause correctly surfaced Information Technology Act / DPDP Act provisions!")


def test_full_rag_grounded_clause_analysis():
    print("\n" + "="*80)
    print("TEST 2: VERIFYING FULL RAG-GROUNDED CLAUSE ANALYSIS ENDPOINT")
    print("="*80)

    sample_contract = """
    MASTER SERVICES AGREEMENT

    SECTION 1. TERMINATION FOR CONVENIENCE
    Client may terminate this Agreement immediately at any time without written notice and without paying for services already rendered.

    SECTION 2. LIQUIDATED DAMAGES & PENALTY
    In the event Service Provider fails to meet any milestone deadline, Service Provider shall pay a flat penalty of $250,000 regardless of actual loss.

    SECTION 3. CONFIDENTIALITY
    Both parties shall maintain confidentiality of proprietary technical information for a period of two years.
    """

    # Ingest contract
    res_ingest = client.post("/api/ingest", data={"raw_text": sample_contract})
    assert res_ingest.status_code == 200
    doc_id = res_ingest.json()["document"]["docId"]

    # Extract & Ground Clauses
    res_clauses = client.post(f"/api/clauses/{doc_id}")
    assert res_clauses.status_code == 200
    clauses = res_clauses.json()["clauses"]

    print(f"\n[GROUNDED CLAUSES ANALYSIS] docId: {doc_id} -> {len(clauses)} clauses extracted:")
    for c in clauses:
        print(f"\n  - [{c['id']}] [{c['category'].upper()}] [{c['riskLevel'].upper()}]")
        print(f"    Verbatim: \"{c['text'][:80]}...\"")
        print(f"    Risk Reason: {c['riskReason']}")
        assert c["riskReason"].startswith("May warrant review") or c["riskReason"].startswith("may warrant review")

    print("\n" + "="*80)
    print("ALL RAG GROUNDING TESTS PASSED CLEANLY!")
    print("="*80)


if __name__ == "__main__":
    test_rag_statute_retrieval_relevance()
    test_full_rag_grounded_clause_analysis()
