import os
import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Add backend directory to python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.main import app

client = TestClient(app)

FIXTURES_DIR = Path(__file__).parent / "fixtures"

def test_ingest_and_clause_extraction():
    sample_files = [
        "sample_rental_agreement.txt",
        "sample_freelance_nda.txt",
        "sample_loan_agreement.txt"
    ]

    print("\n" + "="*80)
    print("RUNNING INGEST & CLAUSE EXTRACTION VERIFICATION ON TEST FIXTURES")
    print("="*80)

    for file_name in sample_files:
        file_path = FIXTURES_DIR / file_name
        assert file_path.exists(), f"Fixture {file_name} not found at {file_path}"
        
        with open(file_path, "rb") as f:
            file_bytes = f.read()

        # Step 1: Test /api/ingest
        files = {"file": (file_name, file_bytes, "text/plain")}
        res_ingest = client.post("/api/ingest", files=files)
        assert res_ingest.status_code == 200, f"Ingest failed for {file_name}: {res_ingest.text}"
        
        ingest_data = res_ingest.json()
        doc_id = ingest_data["document"]["docId"]
        print(f"\n[INGEST SUCCESS] File: {file_name} -> docId: {doc_id}")

        # Step 2: Test /api/clauses/{docId}
        res_clauses = client.post(f"/api/clauses/{doc_id}")
        assert res_clauses.status_code == 200, f"Clauses extraction failed for {doc_id}: {res_clauses.text}"

        clauses_data = res_clauses.json()
        total_clauses = clauses_data["total"]
        clauses = clauses_data["clauses"]

        print(f"[CLAUSES EXTRACTION SUCCESS] Extracted {total_clauses} clauses for {doc_id}")
        
        # Verify Quality Expectations
        for clause in clauses:
            print(f"  - [{clause['id']}] [{clause['category'].upper()}] [{clause['riskLevel'].upper()}]")
            print(f"    Verbatim: \"{clause['text'][:90]}...\"")
            print(f"    Plain Language: {clause['plainLanguage']}")
            print(f"    Risk Reason: {clause['riskReason']}")
            
            # Assertion checks
            assert clause["riskReason"].lower().startswith("may warrant review"), \
                f"Risk reason does not start with expected legal hedging: {clause['riskReason']}"
            
            if clause.get("conflictsWith"):
                print(f"    [INTRA-DOCUMENT CONFLICT DETECTED] Conflicts with: {clause['conflictsWith']}")

    print("\n" + "="*80)
    print("ALL SAMPLE CONTRACT FIXTURES VERIFIED SUCCESSFULLY!")
    print("="*80)

if __name__ == "__main__":
    test_ingest_and_clause_extraction()
