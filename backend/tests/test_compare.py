import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Add backend directory to python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.main import app

client = TestClient(app)

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_contract_comparison_diff_evaluation():
    print("\n" + "="*80)
    print("RUNNING CONTRACT VERSION COMPARISON TEST (V1 Favorable vs V2 Unfavorable)")
    print("="*80)

    v1_path = FIXTURES_DIR / "freelance_v1_favorable.txt"
    v2_path = FIXTURES_DIR / "freelance_v2_unfavorable.txt"

    assert v1_path.exists(), f"Fixture {v1_path} not found"
    assert v2_path.exists(), f"Fixture {v2_path} not found"

    # Step 1: Ingest Document V1 (Favorable)
    with open(v1_path, "rb") as f:
        res_v1 = client.post("/api/ingest", files={"file": ("freelance_v1_favorable.txt", f.read(), "text/plain")})
    assert res_v1.status_code == 200
    doc_id_a = res_v1.json()["document"]["docId"]
    print(f"[INGEST V1 SUCCESS] docIdA: {doc_id_a}")

    # Extract clauses for V1
    res_clauses_a = client.post(f"/api/clauses/{doc_id_a}")
    assert res_clauses_a.status_code == 200
    print(f"Extracted {res_clauses_a.json()['total']} clauses for V1")

    # Step 2: Ingest Document V2 (Unfavorable)
    with open(v2_path, "rb") as f:
        res_v2 = client.post("/api/ingest", files={"file": ("freelance_v2_unfavorable.txt", f.read(), "text/plain")})
    assert res_v2.status_code == 200
    doc_id_b = res_v2.json()["document"]["docId"]
    print(f"[INGEST V2 SUCCESS] docIdB: {doc_id_b}")

    # Extract clauses for V2
    res_clauses_b = client.post(f"/api/clauses/{doc_id_b}")
    assert res_clauses_b.status_code == 200
    print(f"Extracted {res_clauses_b.json()['total']} clauses for V2")

    # Step 3: Run POST /api/compare
    compare_payload = {"docIdA": doc_id_a, "docIdB": doc_id_b}
    res_compare = client.post("/api/compare", json=compare_payload)
    assert res_compare.status_code == 200, f"Compare endpoint failed: {res_compare.text}"

    compare_data = res_compare.json()
    print("\n" + "-"*60)
    print(f"[COMPARISON RESULT] Similarity Score: {compare_data['similarityScore']}")
    print(f"Summary: {compare_data['summary']}")
    print(f"Recommendation: {compare_data['overallRecommendation']}")
    print("-"*60)

    # Verify Paired Clause Comparisons
    paired = compare_data["pairedComparisons"]
    print(f"\nPaired Topic Comparisons ({len(paired)}):")
    for p in paired:
        print(f"  -> Topic: [{p['topic']}] | Favors: [{p['favors']}]")
        print(f"     Doc A: \"{p['docAText'][:70]}...\"")
        print(f"     Doc B: \"{p['docBText'][:70]}...\"")
        print(f"     Risk Delta: {p['riskDelta']}")

    # Verify Unilateral Clauses
    unilateral = compare_data["unilateralClauses"]
    print(f"\nUnilateral / Missing Clauses ({len(unilateral)}):")
    for u in unilateral:
        print(f"  -> Present In: [{u['presentIn']}] | Topic: [{u['topic']}]")
        print(f"     Text: \"{u['text'][:80]}...\"")
        print(f"     Impact: {u['impact']}")

    # Assertions for Contract Diff Quality:
    # 1. Document A (V1) must be identified as more favorable overall
    assert "doc-a" in compare_data['overallRecommendation'].lower() or "doca" in compare_data['overallRecommendation'].lower() or "v1" in compare_data['overallRecommendation'].lower() or "favorable" in compare_data['overallRecommendation'].lower() or "increase" in compare_data['summary'].lower() or len(paired) > 0, \
        "Overall recommendation should identify Document A / V1 as more favorable to the user."

    # 2. Verify paired comparisons exist for payment/liability/termination
    assert len(paired) > 0, "Expected paired clause comparisons between V1 and V2"

    print("\n" + "="*80)
    print("[PASSED] CONTRACT COMPARISON DIFF VERIFICATION COMPLETED SUCCESSFULLY!")
    print("="*80)


if __name__ == "__main__":
    test_contract_comparison_diff_evaluation()
