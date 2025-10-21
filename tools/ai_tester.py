import os, json, sys
from textwrap import dedent

MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
API_KEY = os.getenv("LLM_API_KEY")

def call_llm(prompt: str) -> str:
    """
    Modo demo: devuelve un parche válido en formato JSON para git apply.
    Crea app/health/route.ts en Next.js (App Router).
    """
    print("[AI Tester] Simulando respuesta de IA válida...")

    fake_patch = """diff --git a/app/health/route.ts b/app/health/route.ts
new file mode 100644
index 0000000..1111111
--- /dev/null
+++ b/app/health/route.ts
@@ -0,0 +1,7 @@
+import { NextResponse } from 'next/server';
+
+export async function GET() {
+  return NextResponse.json({ status: 'ok' }, { status: 200 });
+}
"""

    fake_response = {
        "summary": "No existe el endpoint /health.",
        "impact": "Las pruebas fallan al no responder /health.",
        "proposed_fix": "Crear app/health/route.ts devolviendo {status:'ok'}.",
        "unified_diff": fake_patch,
        "test_updates": "N/A",
        "risk_notes": "Cambio seguro y aislado.",
        "retry_hint": "Re-ejecutar pytest; debería pasar el healthcheck."
    }

    return json.dumps(fake_response, ensure_ascii=False, indent=2)

def main():
    try:
        failures_json = sys.stdin.read().strip()
        if not failures_json:
            failures_json = "{}"
        failures = json.loads(failures_json)
    except Exception:
        failures = {"raw": failures_json}

    prompt = dedent(f"""
    Contexto:
    - Proyecto Next.js (App Router)
    - Prueba GET /health espera status 200 y {{status:'ok'}}

    Fallos detectados:
    {json.dumps(failures, ensure_ascii=False, indent=2)}
    """)

    result_text = call_llm(prompt)

    # Verificamos que sea JSON válido
    try:
        data = json.loads(result_text)
        assert isinstance(data, dict)
    except Exception as e:
        print(f"[AI Tester] ❌ Error generando JSON: {e}")
        fallback = {
            "summary": "Error generando JSON",
            "impact": "No se pudo procesar la salida de la IA.",
            "proposed_fix": "Sin cambios.",
            "unified_diff": "",
            "test_updates": "N/A",
            "risk_notes": "Sin riesgo.",
            "retry_hint": "Reintentar ejecución."
        }
        result_text = json.dumps(fallback, indent=2)

    # Siempre imprimir JSON válido al stdout
    print(result_text)

if __name__ == "__main__":
    main()
