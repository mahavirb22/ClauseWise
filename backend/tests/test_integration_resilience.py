import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Add backend directory to python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.main import app

client = TestClient(app)

def test_integration_resilience():
    print("\n" + "="*80)
    print("RUNNING INTEGRATION RESILIENCE & FAILURE MODES VERIFICATION")
    print("="*80)

    # 1. Test Unsupported File Extension (.exe)
    res_bad_ext = client.post(
        "/api/ingest",
        files={"file": ("malicious_script.exe", b"binary content", "application/octet-stream")}
    )
    assert res_bad_ext.status_code == 400, f"Expected 400 for bad extension, got {res_bad_ext.status_code}"
    print("[PASSED] Unsupported file format (.exe) correctly rejected with HTTP 400!")

    # 2. Test Empty File (0 Bytes)
    res_empty = client.post(
        "/api/ingest",
        files={"file": ("empty_file.pdf", b"", "application/pdf")}
    )
    assert res_empty.status_code == 400, f"Expected 400 for empty file, got {res_empty.status_code}"
    print("[PASSED] Empty file (0 bytes) correctly rejected with HTTP 400!")

    # 3. Test File Size Limit (>15 MB)
    large_dummy_bytes = b"A" * (16 * 1024 * 1024)  # 16 MB
    res_large = client.post(
        "/api/ingest",
        files={"file": ("huge_contract.pdf", large_dummy_bytes, "application/pdf")}
    )
    assert res_large.status_code == 413, f"Expected 413 for >15MB file, got {res_large.status_code}"
    print("[PASSED] Large file (>15MB) correctly rejected with HTTP 413 Payload Too Large!")

    # 4. Test Non-Legal Document Ingest & Clauses Analysis (Chocolate Cake Recipe)
    recipe_text = """
    CHOCOLATE CAKE RECIPE
    Ingredients:
    2 cups all-purpose flour
    2 cups sugar
    3/4 cup unsweetened cocoa powder
    2 teaspoons baking powder
    1 1/2 teaspoons baking soda
    1 teaspoon salt
    1 cup milk
    1/2 cup vegetable oil
    2 large eggs
    2 teaspoons vanilla extract
    1 cup boiling water

    Instructions:
    1. Preheat oven to 350°F (175°C). Grease and flour two 9-inch round baking pans.
    2. In a large bowl, stir together flour, sugar, cocoa, baking powder, baking soda, and salt.
    3. Add milk, oil, eggs, and vanilla; beat on medium speed for 2 minutes.
    4. Stir in boiling water (batter will be thin). Pour into prepared pans.
    5. Bake 30 to 35 minutes or until wooden toothpick inserted in center comes out clean.
    """
    res_recipe_ingest = client.post(
        "/api/ingest",
        files={"file": ("chocolate_cake_recipe.txt", recipe_text.encode("utf-8"), "text/plain")}
    )
    assert res_recipe_ingest.status_code == 200
    recipe_doc_id = res_recipe_ingest.json()["document"]["docId"]

    res_recipe_clauses = client.post(f"/api/clauses/{recipe_doc_id}")
    assert res_recipe_clauses.status_code == 200
    recipe_data = res_recipe_clauses.json()
    
    assert recipe_data.get("isLegalDocument") == False, f"Expected isLegalDocument=False for recipe, got {recipe_data}"
    assert recipe_data.get("nonLegalWarning") is not None, "Expected nonLegalWarning for recipe"
    print(f"[PASSED] Non-legal document upload correctly flagged with warning: '{recipe_data.get('nonLegalWarning')}'")

    # 5. Test Long Document Chunking (>80k chars / ~30+ pages)
    sample_clause_block = """
    SECTION {idx}. OPERATIONAL AND COMPLIANCE REQUIREMENTS
    The Contractor agrees to maintain full operational compliance, provide quarterly service reports,
    adhere to data security standards under Section 43A of the Information Technology Act,
    and indemnify the Client against third-party claims arising from operational negligence.
    Either party may terminate this agreement by providing at least 30 days written notice.
    \n\n
    """
    long_contract_text = "FREELANCE SERVICES AGREEMENT AND MASTER TERMS\n\n" + "".join(
        sample_clause_block.format(idx=i+1) for i in range(250)
    )  # ~85,000 characters

    res_long_ingest = client.post(
        "/api/ingest",
        files={"file": ("30_page_master_contract.txt", long_contract_text.encode("utf-8"), "text/plain")}
    )
    assert res_long_ingest.status_code == 200
    long_doc_id = res_long_ingest.json()["document"]["docId"]

    res_long_clauses = client.post(f"/api/clauses/{long_doc_id}")
    assert res_long_clauses.status_code == 200
    long_clauses_data = res_long_clauses.json()
    assert long_clauses_data.get("isLegalDocument") == True
    assert long_clauses_data.get("total") > 0
    print(f"[PASSED] Long 30+ page document (~85,000 chars) successfully chunked and analyzed into {long_clauses_data.get('total')} legal clauses!")

    print("\n" + "="*80)
    print("ALL INTEGRATION RESILIENCE & FAILURE MODE TESTS PASSED SUCCESSFULLY!")
    print("="*80)

if __name__ == "__main__":
    test_integration_resilience()
