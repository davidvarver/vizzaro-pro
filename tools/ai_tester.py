import os, json, sys
from textwrap import dedent

MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
API_KEY = os.getenv("LLM_API_KEY")

def call_llm(prompt: str) -> str:
    """
    Modo demo: devolvemos un parche en **unified diff** válido para git.
    Crea app/health/route.ts (Next.js App Router) con /health -> {status:'ok'}.
    """
    print("[AI Tester] Simulando llamada a la IA (unified diff válido)...")

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
        "impact": "El test GET /health falla al no encontrar el endpoint.",
        "proposed_fix": "Crear app/health/route.ts que responda 200 con {status:'ok'}.",
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

    system = dedent("""
    You are a senior software engineer & test triager.
    Always answer EXACTLY using the JSON schema defined in ai_contract.md.
    Provide a precise unified diff that applies cleanly to the current repo state.
    """).strip()

    user = dedent(f"""
    Context:
    - Next.js (App Router).
    - Pruebas: pytest llama GET /health y espera 200 con {{status:'ok'}}.

    Failures JSON:
    {json.dumps(failures, ensure_ascii=False, indent=2)}
    """).strip()

    _ = f"{system}\n\n{user}"  # en modo real se mandaría al modelo
    result_text = call_llm(_)

    # Validación de contrato
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
