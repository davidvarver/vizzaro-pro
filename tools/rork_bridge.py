import os
import sys
import json
import subprocess
import tempfile
import pathlib

BRANCH_NAME = "fix/ci"

def run(cmd, check=False):
    res = subprocess.run(cmd, capture_output=True, text=True)
    if check and res.returncode != 0:
        raise RuntimeError(
            f"Command failed: {' '.join(cmd)}\nSTDOUT:\n{res.stdout}\nSTDERR:\n{res.stderr}"
        )
    return res

def repo_has_staged_or_unstaged_changes() -> bool:
    # ¿Hay cambios staged?
    if run(["git", "diff", "--cached", "--quiet"]).returncode != 0:
        return True
    # ¿Hay cambios unstaged?
    if run(["git", "diff", "--quiet"]).returncode != 0:
        return True
    # ¿Archivos sin trackear?
    if run(["git", "ls-files", "--others", "--exclude-standard"]).stdout.strip():
        return True
    return False

def apply_unified_diff(diff_text: str) -> bool:
    diff_text = (diff_text or "").strip()
    if not diff_text or diff_text.upper() == "N/A":
        print("[RorkBridge] No hay diff para aplicar (OK).")
        return True

    with tempfile.NamedTemporaryFile("w+", delete=False, suffix=".patch", encoding="utf-8") as f:
        f.write(diff_text)
        patch_path = f.name

    print(f"[RorkBridge] Aplicando parche: {patch_path}")
    # 1) Intento 3-way
    r1 = run(["git", "apply", "--3way", "--whitespace=fix", patch_path])
    if r1.returncode == 0:
        print("[RorkBridge] ✅ Parche aplicado con --3way.")
        return True

    # 2) Intento con --reject para ver hunks
    print("[RorkBridge] ❌ git apply falló. Intentando con --reject para ver hunks:")
    r2 = run(["git", "apply", "--reject", "--whitespace=fix", patch_path])
    if r2.returncode == 0:
        print("[RorkBridge] ✅ Parche aplicado con --reject.")
        return True

    # Mostrar .rej si existen
    rejs = list(pathlib.Path(".").rglob("*.rej"))
    if rejs:
        print("[RorkBridge] Archivos .rej generados (necesitan reemisión de diff):")
        for r in rejs:
            print(f"\n----- {r} -----")
            try:
                print(r.read_text(encoding="utf-8"))
            except Exception:
                print("(no se pudo leer)")
    else:
        print("[RorkBridge] No se generaron .rej, pero git apply falló:")
        print(r1.stdout or r2.stdout)
        print(r1.stderr or r2.stderr)

    return False

def write_files_fallback(files):
    if not files:
        return False
    print("[RorkBridge] ⚠️ Fallback: escribiendo archivos directamente.")
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
    # Asegura rama de trabajo
    run(["git", "fetch", "origin", BRANCH_NAME], check=False)
    # Crea o mueve a BRANCH_NAME desde HEAD actual
    run(["git", "checkout", "-B", BRANCH_NAME], check=False)
    run(["git", "branch", "--set-upstream-to", f"origin/{BRANCH_NAME}", BRANCH_NAME], check=False)

def commit_and_push():
    run(["git", "add", "-A"], check=False)
    if run(["git", "diff", "--cached", "--quiet"]).returncode == 0:
        print("[RorkBridge] No hay cambios para commitear.")
        return False
    run(["git", "commit", "-m", "fix: auto-patch from AI analysis"], check=False)
    run(["git", "push", "-u", "origin", BRANCH_NAME], check=False)
    print(f"[RorkBridge] 🚀 Cambios enviados a rama '{BRANCH_NAME}'.")
    return True

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

    changed_by_fallback = False
    if not (ok_main and ok_tests):
        changed_by_fallback = write_files_fallback(files)

    # Si a esta altura no hay cambios (diff limpio), trátalo como NO-OP y éxito
    if not repo_has_staged_or_unstaged_changes():
        print("[RorkBridge] ℹ️ No hay cambios que aplicar. Considero NO-OP (éxito).")
        sys.exit(0)

    # Intentar commitear / pushear si hay cambios
    if not commit_and_push():
        # No hay cambios staged (de nuevo), considerar éxito NO-OP
        print("[RorkBridge] ℹ️ No hay cambios para subir. NO-OP (éxito).")
        sys.exit(0)

    print("[RorkBridge] ✅ Listo.")
    sys.exit(0)

if __name__ == "__main__":
    main()
