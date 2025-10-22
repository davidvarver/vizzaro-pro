import os
import json
import sys
from textwrap import dedent

MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
API_KEY = os.getenv("LLM_API_KEY")

def call_llm(prompt: str) -> str:
    """
    Demo: siempre devuelve JSON válido con:
      - unified_diff (formato mínimo que git apply entiende)
      - files (fallback) para escribir directamente si el diff falla
    """
    print("[AI Tester] Generando respuesta demo...", file=sys.stderr)

    # Diff mínimo para archivo nuevo (sin línea 'index')
    unified_diff = """diff --git a/app/health/route.ts b/app/health/route.ts
new file mode 100644
--- /dev/null
+++ b/app/health/route.ts
@@ -0,0 +1,6 @@
+import { NextResponse } from 'next/server';
+
+export async function GET() {
+  return NextResponse.json({ status: 'ok' }, { status: 200 });
+}
"""

    file_content = """import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
"""

    return json.dumps(
        {
            "summary": "Falta /health",
            "impact": "El test GET /health falla.",
            "proposed_fix": "Crear route handler en app/health/route.ts.",
            "unified_diff": unified_diff,
            "test_updates": "N/A",
            "risk_notes": "Cambio pequeño y seguro.",
            "retry_hint": "Volver a correr pytest.",
            # Fallback explícito
            "files": [
                {"path": "app/health/route.ts", "content": file_content}
            ],
        },
        ensure_ascii=False,
        indent=2,
    )

def main():
    failures_json = sys.stdin.read().strip() or "{}"
    try:
        _ = json.loads(failures_json)
    except Exception:
        pass  # no importa; es demo

    prompt = dedent("""
    Contexto: Next.js (App Router). Crea /health que devuelva 200 y {status:'ok'}.
    """).strip()

    result = call_llm(prompt)

    # Asegura que salimos con JSON limpio SOLO por stdout
    try:
        json.loads(result)
    except Exception as e:
        print(f"[AI Tester] JSON inválido: {e}", file=sys.stderr)
        result = json.dumps(
            {
                "summary": "Error generando JSON",
                "impact": "—",
                "proposed_fix": "—",
                "unified_diff": "",
                "test_updates": "N/A",
                "risk_notes": "—",
                "retry_hint": "Reintentar",
                "files": [],
            },
            indent=2,
        )
    print(result)

if __name__ == "__main__":
    main()
