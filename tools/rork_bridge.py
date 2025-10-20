import os, sys, json, subprocess, tempfile, pathlib

# Si luego usas CLI/SDK de Rork, cambia aquí:
RORK_CMD = os.getenv("RORK_CMD", "rork")  # no usado aún; placeholder

def run(cmd, check=False):
    res = subprocess.run(cmd, capture_output=True, text=True)
    if check and res.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(cmd)}\nSTDOUT:\n{res.stdout}\nSTDERR:\n{res.stderr}")
    return res

def apply_unified_diff(diff_text: str) -> bool:
    diff_text = (diff_text or "").strip()
    if not diff_text or diff_text.upper() == "N/A":
        print("[RorkBridge] No hay diff para aplicar (OK).")
        return True

    # Guarda el parche temporalmente
    with tempfile.NamedTemporaryFile("w+", delete=False, suffix=".patch", encoding="utf-8") as f:
        f.write(diff_text)
        patch_path = f.name

    print(f"[RorkBridge] Aplicando parche: {patch_path}")
    res = run(["git", "apply", "--whitespace=fix", patch_path])
    if res.returncode != 0:
        print("[RorkBridge] ❌ git apply falló. Intentando con --reject para ver hunks:")
        res2 = run(["git", "apply", "--reject", "--whitespace=fix", patch_path])
        # Muestra .rej si existen
        rejs = list(pathlib.Path(".").rglob("*.rej"))
        if rejs:
            print("[RorkBridge] Archivos .rej generados (necesitan reemisión de diff por IA):")
            for r in rejs:
                print(f"\n----- {r} -----")
                try:
                    print(r.read_text(encoding="utf-8"))
                except Exception:
                    print("(no se pudo leer)")
        else:
            print("[RorkBridge] No se generaron .rej, pero git apply falló:")
            print(res.stdout or res2.stdout)
            print(res.stderr or res2.stderr)
        return False

    print("[RorkBridge] ✅ Parche aplicado.")
    return True

def ensure_repo_branch():
    # Crea/actualiza rama fix/ci para los commits del auto-fix
    run(["git", "checkout", "-B", "fix/ci"], check=False)

def commit_and_push():
    run(["git", "add", "-A"], check=False)
    # Si no hay cambios, no falles
    res = run(["git", "diff", "--cached", "--quiet"])
    if res.returncode == 0:
        print("[RorkBridge] No hay cambios para commitear (quizá el parche no modificaba nada).")
        return
    run(["git", "commit", "-m", "fix: auto-patch from AI analysis"], check=False)
    run(["git", "push", "-f", "origin", "fix/ci"], check=False)
    print("[RorkBridge] 🚀 Cambios enviados a rama 'fix/ci'.")

def main():
    raw = sys.stdin.read().strip()
    if not raw:
        print("[RorkBridge] ❌ No se recibió JSON de la IA por stdin.")
        sys.exit(2)

    try:
        data = json.loads(raw)
    except Exception as e:
        print(f"[RorkBridge] ❌ JSON inválido: {e}")
        sys.exit(2)

    unified = data.get("unified_diff", "")
    tests   = data.get("test_updates", "")

    ensure_repo_branch()

    ok_main  = apply_unified_diff(unified)
    ok_tests = apply_unified_diff(tests)

    if not (ok_main and ok_tests):
        print("[RorkBridge] ❌ El parche no se aplicó limpio. Pide reemisión a la IA (ver .rej arriba).")
        sys.exit(3)

    commit_and_push()
    print("[RorkBridge] ✅ Listo.")

if __name__ == "__main__":
    main()
