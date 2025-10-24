#!/usr/bin/env python3
import os
import sys
import json
import subprocess
import tempfile
import pathlib
import shutil
from typing import List

BRANCH_NAME = os.getenv("FIX_BRANCH", "fix/ci")

# Archivos/carpeta que genera el CI y que NO deben bloquear checkout/commit
CI_TEMP_PATHS: List[str] = [
    "ai_patch.json",
    "failures.json",
    "pytest-report.json",
    "playwright-report.json",
    "tests/__pycache__",
]

# Artefactos que NO deben contar como cambios reales
IGNORE_PATHS: List[str] = [
    "failures.json",
    "pytest-report.json",
    "playwright-report.json",
    "tests/__pycache__",
]

# -------------------- helpers --------------------

def run(cmd, check=False, capture=False):
    res = subprocess.run(
        cmd,
        text=True,
        capture_output=capture,
        shell=isinstance(cmd, str),
    )
    if check and res.returncode != 0:
        raise RuntimeError(
            f"Command failed: {cmd if isinstance(cmd,str) else ' '.join(cmd)}\n"
            f"STDOUT:\n{res.stdout}\nSTDERR:\n{res.stderr}"
        )
    return res

def clean_ci_artifacts():
    """
    Elimina archivos temporales del CI que bloquean 'git checkout'.
    Es seguro: no los necesitamos para aplicar el parche (leemos el JSON por stdin).
    """
    for p in CI_TEMP_PATHS:
        path = pathlib.Path(p)
        try:
            if path.is_dir():
                shutil.rmtree(path, ignore_errors=True)
            elif path.exists():
                path.unlink(missing_ok=True)
        except Exception as e:
            print(f"[RorkBridge] (warn) No pude eliminar {p}: {e}")

def git_status_has_real_changes() -> bool:
    """
    Devuelve True solo si hay cambios que NO están bajo IGNORE_PATHS.
    """
    res = run(["git", "status", "--porcelain"], capture=True)
    if res.returncode != 0:
        return False

    for line in (res.stdout or "").splitlines():
        if not line.strip():
            continue
        path_part = line[3:].strip()
        if "->" in path_part:
            path_part = path_part.split("->", 1)[1].strip()

        if any(
            path_part == ig
            or path_part.startswith(ig.rstrip("/") + "/")
            for ig in IGNORE_PATHS
        ):
            continue

        return True
    return False

def ensure_repo_branch():
    """
    Asegura que estamos en BRANCH_NAME. Limpia artefactos que bloquean checkout.
    """
    # Trae refs remotas
    run(["git", "fetch", "origin", "+refs/heads/*:refs/remotes/origin/*"])

    # Limpia archivos sin trackear que podrían bloquear el checkout
    clean_ci_artifacts()

    # Si existe local, checkout directo
    res = run(["git", "rev-parse", "--verify", BRANCH_NAME], capture=True)
    if res.returncode == 0:
        run(["git", "checkout", BRANCH_NAME], check=True)
        return

    # Si existe en remoto, crea local trackeando
    res = run(["git", "ls-remote", "--exit-code", "--heads", "origin", BRANCH_NAME])
    if res.returncode == 0:
        run(["git", "checkout", "-b", BRANCH_NAME, "--track", f"origin/{BRANCH_NAME}"], check=True)
    else:
        run(["git", "checkout", "-b", BRANCH_NAME], check=True)

def apply_unified_diff(diff_text: str) -> bool:
    diff_text = (diff_text or "").strip()
    if not diff_text or diff_text.upper() == "N/A":
        print("[RorkBridge] No hay diff para aplicar (OK).")
        return True

    with tempfile.NamedTemporaryFile("w+", delete=False, suffix=".patch", encoding="utf-8") as f:
        f.write(diff_text)
        patch_path = f.name

    print(f"[RorkBridge] Aplicando parche: {patch_path}")
    res = run(["git", "apply", "--3way", "--whitespace=fix", patch_path])
    if res.returncode != 0:
        print("[RorkBridge] ❌ git apply falló. Intentando con --reject para ver hunks:")
        res2 = run(["git", "apply", "--reject", "--whitespace=fix", patch_path], capture=True)
        rejs = list(pathlib.Path(".").rglob("*.rej"))
        if rejs:
            print("[RorkBridge] Archivos .rej generados (necesitan reemisión de diff):")
            for r in rejs:
                print(f"\n----- {r} -----")
                try:
                    print(r.read_text(encoding="utf-8"))
                except Exception:
                    print("(no se pudo leer)")
            return False
        else:
            print(res2.stdout or "")
            print(res2.stderr or "")
            return False

    print("[RorkBridge] ✅ Parche aplicado.")
    return True

def safe_write_file(path: str, content: str) -> bool:
    p = pathlib.Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)

    before = p.read_text(encoding="utf-8") if p.exists() else None
    if before == content:
        return False

    p.write_text(content, encoding="utf-8")
    run(["git", "add", str(p)])
    print(f"[RorkBridge] ✍️ Escribí/actualicé {path} ({len(content)} bytes).")
    return True

def write_files_fallback(files) -> bool:
    if not files:
        print("[RorkBridge] ⚠️ Fallback solicitado pero files[] está vacío.")
        return False

    changed = False
    for f in files:
        path = (f.get("path") or "").strip()
        content = f.get("content", "")
        if not path:
            continue
        try:
            if safe_write_file(path, content):
                changed = True
        except Exception as e:
            print(f"[RorkBridge] ⚠️ No pude escribir {path}: {e}")
    return changed

def commit_and_push():
    run(["git", "add", "-A"])

    if not git_status_has_real_changes():
        print("[RorkBridge] ℹ️ Nada por commitear (o solo artefactos ignorados).")
        return

    run(["git", "commit", "-m", "fix: auto-patch from AI analysis"], check=True)
    run(["git", "push", "-u", "origin", BRANCH_NAME], check=True)
    print(f"[RorkBridge] 🚀 Cambios enviados a rama '{BRANCH_NAME}'.")

# -------------------- main --------------------

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

    if not (ok_main and ok_tests):
        print("[RorkBridge] ⚠️ Fallback: escribiendo archivos directamente.")
        if write_files_fallback(files):
            ok_main = True
            ok_tests = True

    if not (ok_main and ok_tests):
        if not git_status_has_real_changes():
            print("[RorkBridge] ✅ Nada por cambiar: ya estaba aplicado.")
            sys.exit(0)

        print("[RorkBridge] ❌ No se pudo aplicar ni el diff ni generar cambios con fallback.")
        sys.exit(3)

    commit_and_push()
    print("[RorkBridge] ✅ Listo.")

if __name__ == "__main__":
    main()
