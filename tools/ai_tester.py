#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import json
import difflib
from pathlib import Path

TARGET_PATH = Path("app/health/route.ts")

BASE_CONTENT_NEWFILE = """import { NextResponse } from 'next/server';

/**
 * Auto-created by CI-Healing demo.
 * Returns { status: 'ok' } with HTTP 200.
 */
export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
"""

HEADER_COMMENT = "/** patched-by: CI-Healing demo */\n"

def read_text(path: Path) -> str:
    if not path.exists():
        return ""
    try:
        return path.read_text(encoding="utf-8")
    except Exception:
        return path.read_text(errors="ignore")

def git_unified_diff(old_text: str, new_text: str, rel_path: str) -> str:
    """
    Genera un unified diff “git-like” aceptado por `git apply`.
    - Encabezados a/... y b/...
    - Sin timestamps ruidosos
    """
    a_path = f"a/{rel_path}"
    b_path = f"b/{rel_path}"
    old_lines = old_text.splitlines(keepends=True)
    new_lines = new_text.splitlines(keepends=True)

    # Usamos difflib.unified_diff y luego ajustamos headers a/ b/
    diff = list(difflib.unified_diff(
        old_lines,
        new_lines,
        fromfile=a_path,
        tofile=b_path,
        lineterm=""
    ))

    # Asegurar “--- a/...” y “+++ b/...” (difflib ya lo pone así con fromfile/tofile)
    # Unir con "\n" y agregar newline final (git apply es quisquilloso)
    return "\n".join(diff) + "\n"

def build_patch() -> dict:
    """
    Construye un parche que SIEMPRE haga un cambio real:
      - Si app/health/route.ts existe, antepone un comentario.
      - Si no existe, lo crea con un handler /health.
    Devuelve dict con:
      - summary, impact, proposed_fix
      - unified_diff (git-like)
      - files (fallback) -> para escribir si git apply fallara
    """
    rel = str(TARGET_PATH).replace("\\", "/")
    old = read_text(TARGET_PATH)

    if old.strip() == "":
        # No existe o vacío -> crear archivo
        new = BASE_CONTENT_NEWFILE
        summary = f"Crear {rel} para endpoint /health."
        impact = "Falta endpoint de salud; tests de salud podrían fallar."
        proposed = f"Crear {rel} que responda 200 y {{status:'ok'}}."
    else:
        # Existe -> anteponer un comentario para forzar cambio real
        if old.startswith(HEADER_COMMENT):
            # Ya lo tenía → agregamos una segunda línea para asegurar cambio
            new = HEADER_COMMENT + old
        else:
            new = HEADER_COMMENT + old
        summary = f"Añadir encabezado de comentario a {rel}."
        impact = "Cambio inofensivo para verificar flujo de autocuración."
        proposed = "Anteponer comentario para demostrar que el parche aplica."

    patch = git_unified_diff(old, new, rel)

    return {
        "summary": summary,
        "impact": impact,
        "proposed_fix": proposed,
        "unified_diff": patch,
        "test_updates": "N/A",
        "risk_notes": "Cambio seguro (comentario o archivo nuevo).",
        "retry_hint": "Re-ejecutar el workflow si fuera necesario.",
        # Fallback: escribir archivo final directamente
        "files": [
            {"path": rel, "content": new}
        ],
    }

def main():
    # Leemos stdin (failures.json). No lo usamos estrictamente en el demo,
    # pero lo aceptamos para mantener el contrato del workflow.
    _ = sys.stdin.read()

    result = build_patch()

    # Emitimos SIEMPRE JSON válido por stdout
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
