import os
import sys
import json
import subprocess
import tempfile
import pathlib

RORK_CMD = os.getenv("RORK_CMD", "rork")  # placeholder


def run(cmd, check=False):
    res = subprocess.run(cmd, capture_output=True, text=True)
    if check and res.returncode != 0:
        raise RuntimeError(
            f"Command failed: {' '.join(cmd)}\nSTDOUT:\n{res.stdout}\nSTDERR:\n{res.stderr}"
        )
    return res


def apply_unified_diff(diff_text: str) -> bool:
    diff_text = (diff_text or "").strip()
    if not diff_text or diff_text.upper() == "N/A":
        print("[RorkBridge] No hay diff para aplicar (OK).")
        return True

    with tempfile.NamedTemporaryFile("w+", delete=False, suffix=".patch", encoding="utf-8") as f:
        f.write(diff_text)
        patch_path = f.name

    print(f"[RorkBridge] Aplicando parche: {patch_path}")
    res = run(["git", "apply", "--whitespace=fix", patch_path])
    if res.returncode != 0:
        print("[RorkBridge] ❌ git apply falló. Intentando con --reject para ver hunks:")
        res2 = run(["git", "apply", "--reject", "--whitespace=fix", patch_path])
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


def write_files_fallback(files):
    """
    Crea/actualiza archivos directamente si el parche no aplicó.
    files: lista de { "path": "...", "content": "..." }
    """
    if not files:
        return False

    print("[RorkBridge] ⚠️ Usando fallback: escritura directa de archivos.")
    changed = False
    for f in files:
        path = f.get("path")
        content = f.get("content", "")
        if not path:
            continue
        p = pathlib.Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        before = p.read_text(encoding="utf-8") if p.exists() else None
        p.write_text(content, encoding="utf-8")
        after = p.read_text(encoding="utf-8")
        if before != after:
            print(f"[RorkBridge] Escribí {path} ({len(after)} bytes).")
            changed = True

    return changed


def ensure_repo_branch():
    run(["git", "checkout", "-B", "fix/ci"], check=False)


def commit_and_push():
    run(["git", "add", "-A"], check=False)
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
    files   = data.get("files", [])

    ensure_repo_branch()

    ok_main  = apply_unified_diff(unified)
    ok_tests = apply_unified_diff(tests)

    # Fallback si el diff (código o tests) falló
    if not (ok_main and ok_tests) and files:
        print("[RorkBridge] Parche falló; intento fallback con 'files'.")
        wrote = write_files_fallback(files)
        if wrote:
            ok_main = True
            ok_tests = True

    if not (ok_main and ok_tests):
        print("[RorkBridge] ❌ El parche no se aplicó limpio. Pide reemisión a la IA (ver .rej arriba).")
        sys.exit(3)

    commit_and_push()
    print("[RorkBridge] ✅ Listo.")


if __name__ == "__main__":
    main()
