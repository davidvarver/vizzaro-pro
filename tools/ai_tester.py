import os, json, sys
from textwrap import dedent

MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
API_KEY = os.getenv("LLM_API_KEY")

def call_llm(prompt: str) -> str:
    # IMPORTANTE: no imprimir NADA a stdout aquí
    print("[AI Tester] Simulando respuesta de IA válida...", file=sys.stderr)

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
    failures_json = sys.stdin.read().strip() or "{}"
    try:
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

    # Validación mínima y salida limpia SOLO JSON
    try:
        data = json.loads(result_text)
        assert isinstance(data, dict)
    except Exception as e:
        print(f"[AI Tester] Error generando JSON: {e}", file=sys.stderr)
        data = {
            "summary": "Error generando JSON",
            "impact": "No se pudo procesar la salida de la IA.",
            "proposed_fix": "Sin cambios.",
            "unified_diff": "",
            "test_updates": "N/A",
            "risk_notes": "Sin riesgo.",
            "retry_hint": "Reintentar ejecución."
        }
        result_text = json.dumps(data, indent=2)

    print(result_text)  # <-- ÚNICA impresión a stdout (el JSON)

if __name__ == "__main__":
    main()
