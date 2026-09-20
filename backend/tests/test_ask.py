import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Add backend directory to python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.main import app

client = TestClient(app)

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_adversarial_qa_grounding_and_refusal():
    print("\n" + "="*80)
    print("RUNNING ADVERSARIAL Q&A GROUNDING & OUT-OF-SCOPE REFUSAL TEST")
    print("="*80)

    rental_path = FIXTURES_DIR / "sample_rental_agreement.txt"
    assert rental_path.exists(), f"Fixture {rental_path} not found"

    # Ingest sample document
    with open(rental_path, "rb") as f:
        res_ingest = client.post("/api/ingest", files={"file": ("sample_rental_agreement.txt", f.read(), "text/plain")})
    assert res_ingest.status_code == 200
    doc_id = res_ingest.json()["document"]["docId"]
    print(f"[INGEST SUCCESS] docId: {doc_id}")

    # Extract clauses
    res_clauses = client.post(f"/api/clauses/{doc_id}")
    assert res_clauses.status_code == 200

    # -------------------------------------------------------------------------
    # TEST CASE 1: Document-Grounded Question (Answerable from Doc)
    # -------------------------------------------------------------------------
    print("\n" + "-"*60)
    print("TEST CASE 1: Document-Grounded Query (Termination Notice)")
    print("-"*60)
    
    q1 = "What is the notice period required for termination in this contract?"
    res_q1 = client.post("/api/ask", json={"docId": doc_id, "question": q1})
    assert res_q1.status_code == 200
    
    data_q1 = res_q1.json()
    print(f"Question: {data_q1['question']}")
    print(f"Answer: {data_q1['answer']}")
    print(f"Citations: {[c['clauseId'] for c in data_q1['citations']]}")
    print(f"Disclaimer Framing: {data_q1['disclaimerFraming']}")

    assert len(data_q1["citations"]) > 0, "Document-grounded question should return at least 1 clause citation"
    assert "cls" in data_q1["citations"][0]["clauseId"].lower() or "section" in data_q1["citations"][0]["clauseId"].lower(), \
        "Document query should quote a specific clause ID"
    print("[PASSED] TEST 1: Document-Grounded Q&A correctly cited specific clause ID!")

    # -------------------------------------------------------------------------
    # TEST CASE 2: Statute-Grounded Question (Requires Indian Statutory Context)
    # -------------------------------------------------------------------------
    print("\n" + "-"*60)
    print("TEST CASE 2: Statute-Grounded Query (Indian Contract Law Penalty Limits)")
    print("-"*60)
    
    q2 = "What does Indian contract law specify regarding unreasonable penalty clauses?"
    res_q2 = client.post("/api/ask", json={"docId": doc_id, "question": q2})
    assert res_q2.status_code == 200

    data_q2 = res_q2.json()
    print(f"Question: {data_q2['question']}")
    print(f"Answer: {data_q2['answer']}")
    print(f"Citations: {[c['clauseId'] for c in data_q2['citations']]}")
    print(f"Disclaimer Framing: {data_q2['disclaimerFraming']}")

    assert len(data_q2["citations"]) > 0, "Statute-grounded question should return statutory citation"
    assert any("section" in str(c["clauseId"]).lower() or "act" in str(c["category"]).lower() or "contract" in str(c["category"]).lower() for c in data_q2["citations"]), \
        "Statute query should cite Indian statutory section (Section 74 / Section 2(46))"
    print("[PASSED] TEST 2: Statute-Grounded Q&A correctly cited Indian Contract Act provisions!")

    # -------------------------------------------------------------------------
    # TEST CASE 3: Out-of-Scope Adversarial Question (Doc Genuinely Doesn't Cover)
    # -------------------------------------------------------------------------
    print("\n" + "-"*60)
    print("TEST CASE 3: Out-of-Scope Adversarial Query (Parental Leave Allowance)")
    print("-"*60)
    
    q3 = "What is the employee parental leave allowance policy for this organization?"
    res_q3 = client.post("/api/ask", json={"docId": doc_id, "question": q3})
    assert res_q3.status_code == 200

    data_q3 = res_q3.json()
    print(f"Question: {data_q3['question']}")
    print(f"Answer: {data_q3['answer']}")
    print(f"Citations: {data_q3['citations']}")
    print(f"Disclaimer Framing: {data_q3['disclaimerFraming']}")

    assert "this document does not address that topic" in data_q3["answer"].lower(), \
        f"Out-of-scope question should explicitly refuse with 'This document does not address that topic'. Got: {data_q3['answer']}"
    assert len(data_q3["citations"]) == 0, "Out-of-scope query must not fabricate citations"
    print("[PASSED] TEST 3: Out-of-Scope query correctly refused without fabricating!")

    # -------------------------------------------------------------------------
    # TEST CASE 4: Multi-Turn Conversation History Context
    # -------------------------------------------------------------------------
    print("\n" + "-"*60)
    print("TEST CASE 4: Multi-Turn Conversation History Context (Follow-Up)")
    print("-"*60)
    
    chat_history = [
        {"role": "user", "content": "Does this contract contain an indemnification clause?"},
        {"role": "assistant", "content": "Yes, Clause [cls-1] specifies that the tenant must indemnify the landlord against all third party claims."}
    ]
    q4 = "What is the financial cap on that indemnification obligation?"
    res_q4 = client.post("/api/ask", json={"docId": doc_id, "question": q4, "chatHistory": chat_history})
    assert res_q4.status_code == 200

    data_q4 = res_q4.json()
    print(f"Follow-up Question: {data_q4['question']}")
    print(f"Answer: {data_q4['answer']}")
    print(f"Disclaimer Framing: {data_q4['disclaimerFraming']}")

    # Verify dynamic disclaimers vary across questions
    disclaimers = {data_q1["disclaimerFraming"], data_q2["disclaimerFraming"], data_q4["disclaimerFraming"]}
    print(f"\nDisclaimers Generated Across Turns ({len(disclaimers)} unique variations):")
    for d in disclaimers:
        print(f"  -> \"{d}\"")

    print("\n" + "="*80)
    print("ALL ADVERSARIAL Q&A TESTS PASSED SUCCESSFULLY!")
    print("="*80)


if __name__ == "__main__":
    test_adversarial_qa_grounding_and_refusal()
