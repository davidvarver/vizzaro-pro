#!/usr/bin/env python3
import json, os, sys

def safe_json(path, default):
    try:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return default

def main():
    out = {
        "pytest": [],
        "playwright": [],
        "build": {"exit_code": 0, "log_tail": ""},
    }

    # Pytest (si usas pytest-json-report)
    py = safe_json("pytest-report.json", {})
    # El plugin suele guardar cosas útiles en 'tests' y 'summary'
    if py:
        out["pytest"] = py.get("tests", []) or py.get("collectors", []) or py.get("summary", [])

    # Playwright (si lo corres)
    pw = safe_json("playwright-report.json", {})
    if pw:
        out["playwright"] = pw.get("suites", []) or pw.get("results", []) or []

    # Build
    br = safe_json("build_report.json", {})
    out["build"]["exit_code"] = int(br.get("exit_code", 0) or 0)
    out["build"]["log_tail"]  = br.get("log_tail", "")

    print(json.dumps(out, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
