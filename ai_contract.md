La IA debe responder **EXCLUSIVAMENTE** con este JSON:

{
  "summary": "Breve explicación del problema y su causa raíz.",
  "impact": "Qué rompe o a quién afecta.",
  "proposed_fix": "Descripción de la solución.",
  "unified_diff": "PARCHE EN FORMATO UNIFIED DIFF (git apply)",
  "test_updates": "Cambios a pruebas si aplica (unified diff o 'N/A').",
  "risk_notes": "Riesgos / regresiones potenciales.",
  "retry_hint": "Qué verificar tras aplicar el fix."
}
