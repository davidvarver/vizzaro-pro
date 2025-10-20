import os, json, sys
from textwrap import dedent

MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
API_KEY = os.getenv("LLM_API_KEY")

def call_llm(prompt: str) -> str:
    """
    Modo demo: devolvemos un parche que crea /health en Next.js (App Router).
    Cuando quieras, cambiamos esto por la llamada real a OpenAI/Claude.
    """
    print("[AI Tester] Simulando llamada a la IA para Next.js...")

    # Parche: crea app/health/route.ts
    fake_patch = """*** Begin Patch
*** Add File: app/health/route.ts
+import { NextResponse } from 'next/server';
+
+export async function GET() {
+  return NextResponse.json({ status: 'ok' }, { status: 200 });
+}
+
*** End Patch
"""

    fake_response = {
        "summary": "No existe el endpoint /health.",
        "impact": "La prueba test_health.py falla al no poder hacer GET /health.",
        "proposed_fix": "Crear un route handler en app/health/route.ts que devuelva {status:'ok'}.",
        "unified_diff": fake_patch,
        "test_updates": "N/A",
        "risk_notes": "Cambio seguro; endpoint informativo.",
        "retry_hint": "Re-ejecutar pytest y comprobar 200 en /health."
    }
    return json.dumps(fake_response, ensure_ascii=False, indent=2)

def main():
    failures_json = sys.stdin.read().strip() or "{}"
    try:
        failures = json.loads(failures_json)
    except Exception:
        failures = {"raw": failures_json}

    system = dedent("""
    You are a senior software engineer & test triager.
    Always answer EXACTLY using the JSON schema defined in ai_contract.md.
    Provide a precise unified diff that applies cleanly to the current repo state.
    """).strip()

    user = dedent(f"""
    Context:
    - Next.js (App Router) app.
    - Pruebas: pytest llama GET /health.
    - Genera un parche mínimo para que /health devuelva 200 y {{status:"ok"}}.
    Failures JSON:
    {json.dumps(failures, ensure_ascii=False, indent=2)}
    """).strip()

    _ = f"{system}\n\n{user}"  # (En modo real, se mandaría al LLM)
    result_text = call_llm(_)

    try:
        data = json.loads(result_text)
        required = ["summary","impact","proposed_fix","unified_diff","test_updates","risk_notes","retry_hint"]
        assert all(k in data for k in required)
    except Exception as e:
        print(f"[AI Tester] ❌ Respuesta inválida del modelo: {e}")
        print(result_text)
        sys.exit(2)

    print(result_text)

if __name__ == "__main__":
    main()
