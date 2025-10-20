import os, json, sys
from textwrap import dedent

# ============================================
# 🔧 Configuración básica
# ============================================
MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")  # Modelo por defecto
API_KEY = os.getenv("LLM_API_KEY")  # Tu clave de API (desde Secrets en GitHub)

# ============================================
# 🧠 Función para llamar a la IA
# ============================================
def call_llm(prompt: str) -> str:
    """
    🔸 Aquí es donde se conectará con tu IA (OpenAI, Claude, etc.)
    Por ahora lo dejamos en modo demostración hasta conectar tu modelo real.
    """
    print("[AI Tester] Simulando llamada a la IA (aún no conectada)...")

    # 🧩 Respuesta simulada (sirve para probar el flujo)
    fake_patch = """--- app/api_dummy.py
+++ app/api_dummy.py
@@ -0,0 +1,7 @@
+from fastapi import FastAPI
+
+app = FastAPI()
+
+@app.get("/health")
+def health():
+    return {"status": "ok"}
"""
    fake_response = {
        "summary": "Falta un endpoint /health en la aplicación.",
        "impact": "Las pruebas de salud fallan al no existir el endpoint.",
        "proposed_fix": "Agregar un endpoint /health que devuelva {'status':'ok'}.",
        "unified_diff": fake_patch,
        "test_updates": "N/A",
        "risk_notes": "Sin riesgo. Endpoint simple.",
        "retry_hint": "Volver a correr pytest tras aplicar el fix."
    }

    return json.dumps(fake_response, ensure_ascii=False, indent=2)

# ============================================
# 🚀 Función principal
# ============================================
def main():
    # Lee los fallos que vienen por stdin (desde collect_failures.py)
    failures_json = sys.stdin.read().strip()
    if not failures_json:
        failures_json = "{}"

    try:
        failures = json.loads(failures_json)
    except Exception:
        failures = {"raw": failures_json}

    # Prompt base para el modelo
    system = dedent("""
    You are a senior software engineer & test triager.
    Always answer EXACTLY using the JSON schema defined in ai_contract.md.
    Provide a precise unified diff that applies cleanly to the current repo state.
    """).strip()

    user = dedent(f"""
    Context:
    - Repo: aplicación web con API.
    - Pruebas: pytest (API) y Playwright (E2E).
    - Objetivo: generar un parche que solucione los fallos de pruebas.

    Failures JSON:
    {json.dumps(failures, ensure_ascii=False, indent=2)}
    """).strip()

    # 🔹 Combina system + user (para el LLM)
    full_prompt = f"{system}\n\n{user}"

    # Llama a la IA (por ahora, usa el modo simulado)
    result_text = call_llm(full_prompt)

    # Validación del formato del JSON
    try:
        data = json.loads(result_text)
        required = [
            "summary", "impact", "proposed_fix",
            "unified_diff", "test_updates", "risk_notes", "retry_hint"
        ]
        assert all(k in data for k in required)
    except Exception as e:
        print(f"[AI Tester] ❌ Respuesta inválida del modelo: {e}")
        print(result_text)
        sys.exit(2)

    # Imprime el JSON final (lo usará rork_bridge.py)
    print(result_text)

# ============================================
# 🏁 Punto de entrada
# ============================================
if __name__ == "__main__":
    main()
