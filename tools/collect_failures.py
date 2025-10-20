import json, pathlib

def main():
    out = {"pytest": [], "playwright": []}
    # pytest
    p_py = pathlib.Path("pytest-report.json")
    if p_py.exists() and p_py.read_text(encoding="utf-8").strip():
        try:
            data = json.loads(p_py.read_text(encoding="utf-8"))
            # El plugin pytest-json-report suele guardar en 'tests' / 'summary'
            tests = data.get("tests", [])
            out["pytest"] = tests
        except Exception:
            out["pytest"] = []
    # playwright
    p_pw = pathlib.Path("playwright-report.json")
    if p_pw.exists() and p_pw.read_text(encoding="utf-8").strip():
        try:
            data = json.loads(p_pw.read_text(encoding="utf-8"))
            # Reporter json de Playwright: lista de suites/specs
            out["playwright"] = data.get("suites", [])
        except Exception:
            out["playwright"] = []
    print(json.dumps(out, ensure_ascii=False))

if __name__ == "__main__":
    main()
