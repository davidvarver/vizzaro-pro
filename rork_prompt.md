Objetivo:
- Recibir un parche (unified diff) validado por IA y aplicarlo exactamente.

Instrucciones:
1) Aplica el unified diff recibido sin cambios.
2) Si no aplica:
   - sincroniza contra rama 'fix/ci', reintenta con `git apply --reject`.
   - si hay .rej, reporta el contenido para que la IA reemita el diff.
3) No borres pruebas salvo instrucción explícita en 'test_updates'.
