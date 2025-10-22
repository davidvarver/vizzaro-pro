import os
import json
import sys
from textwrap import dedent

MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
API_KEY = os.getenv("LLM_API_KEY")


def call_llm(prompt: str) -> str:
    """
    Modo demo: devuelve SIEMPRE un JSON válido.
    Incluye:
      - unified_diff (puede fallar su aplicación)
      - files[] como fallback para escribir archivos directamente
    """
    # Logs SOLO a stderr para no romper stdout
    print("[AI Tester] Simulando respuesta de IA válida...", file=sys.stderr)

    # Intento de unified diff (no importa si luego falla; tenemos fallback)
    unified_diff = """diff --git a/app/health/route.ts b/app/health/route.ts
new file mode 100644
index 0000000000000000000000000000000000000000..e69de29bb2d1d6434b8b29ae775ad8c2e48c5391
--- /dev/null
+++ b/app/health/route.ts
@@ -0,0 +1,6 @@
+import { NextResponse } from 'next/server';
+
+export async function GET() {
+  return NextResponse.json({ status: 'ok' }, { status: 200 });
+}
"""

    # Contenido real por si el diff falla (fallback)
    file_content = """import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
"""

    resp = {
        "summary": "No existe el endpoint /health.",
        "impact": "Las pruebas fallan al no responder /health.",
        "proposed_fix": "Crear app/health/route.ts devolviendo {status:'ok'}.",
        "unified_diff": unified_diff,
        "test_updates": "N/A",
        "risk_notes": "Cambio seguro y aislado.",
        "retry_hint": "Re-ejecutar pytest; debería pasar el healthcheck.",
        # 👇 Fallback explícito
        "files": [
            {
                "path": "app/health/route.ts",
                "content": file_content
            }
        ]
    }
    return json.dumps(resp, ensure_ascii=False, indent=2)


def main():
    failures_json = sys.stdin.read().strip() or "{}"
    try:
        failures = json.loads(failures_json)
    except Exception:
        failures = {"raw": failures_json}

    _prompt = dedent(f"""
    Contexto:
    - Proyecto Next.js (App Router)
    - Prueba GET /health espera status 200 y {{status:'ok'}}

    Fallos detectados:
    {json.dumps(failures, ensure_ascii=False, indent=2)}
    """)

    result_text = call_llm(_prompt)

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
            "retry_hint": "Reintentar ejecución.",
            "files": []
        }

    # ¡ÚNICA impresión a stdout!
    print(json.dumps(data, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
