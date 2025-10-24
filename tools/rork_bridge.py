#!/usr/bin/env python3
import os
import sys
import json
import subprocess
import tempfile
import pathlib
from typing import List

BRANCH_NAME = os.getenv("FIX_BRANCH", "fix/ci")

# Archivos/carpeta que puede generar el CI y NO deben contar como “cambios reales”
IGNORE_PATHS: List[str] = [
    "failures.json",
    "pytest-report.json",
    "playwright-report.json",
    "tests/__pycache__",
]

# -------------------- helpers --------------------

def run(cmd, check=False, capture=False):
    """
    Ejecuta un comando. Si capture=True, devuelve CompletedProcess con stdout/err.
    Acepta lista o string (recomendado: lista).
    """
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

def git_status_has_real_changes() -> bool:
    """
    Inspecciona 'git status --porcelain' y devuelve True solo si hay cambios
    que NO están dentro de IGNORE_PATHS.
    """
    res = run(["git", "status", "--porcelain"], capture=True)
    if res.returncode != 0:
        # si falla, mejor no bloquear el flujo
        return False

    for line in (res.stdout or "").splitlines():
        # formato: 'XY path' o 'XY path -> path2'
        # path arranca en columna 3 (index 3, 0-based)
        if not line.strip():
            continue
        # suelen venir dos letras de estado + espacio + path
        path_part = line[3:].strip()
        # si es un rename, toma el destino después de '->'
        if "->" in path_part:
            path_part = path_part.split("->", 1)[1].strip()

        # si el path está bajo algún IGNORE_PATHS, se ignora
        if any(
            path_part == ig
            or path_part.startswith(ig.rstrip("/") + "/")
            for ig in IGNORE_PATHS
        ):
            continue

        # algo real cambió
        return True

    return False

def ensure_repo_branch():
    """
    Asegura que estamos en BRANCH_NAME:
    - si existe local, checkout
    - si existe remoto, crea local trackeando remoto
    - si no existe, crea nueva desde HEAD actual
    """
    # traer refs remotas
    run(["git", "fetch", "origin", "+refs/heads/*:refs/remotes/origin/*"])

    # ¿local?
    res = run(["git", "rev-parse", "--verify", BRANCH_NAME], capture=True)
    if res.returncode == 0:
        run(["git", "checkout", BRANCH_NAME], check=True)
        return

    # ¿remoto?
    res = run(["git", "ls-remote", "--exit-code", "--heads", "origin", BRANCH_NAME])
    if res.returncode == 0:
        run(["git", "checkout", "-b", BRANCH_NAME, "--track", f"origin/{BRANCH_NAME}"], check=True)
    else:
        run(["git", "checkout", "-b", BRANCH_NAME], check=True)

def apply_unified_diff(diff_text: str) -> bool:
    """
    Intenta aplicar un diff unificado. Si está vacío/N/A, no es error.
    """
    diff_text = (diff_text or "").strip()
    if not diff_text or diff_text.upper() == "N/A":
        print("[RorkBridge] No hay diff para aplicar (OK).")
        return True

    with tempfile.NamedTemporaryFile("w+", delete=False, suffix=".patch", encoding="utf-8") as f:
        f.write(diff_text)
        patch_path = f.name

    print(f"[RorkBridge] Aplicando parche: {patch_path}")

    # 3-way ayuda cuando la base no coincide exactamente
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
            # no hay .rej pero falló => reporta salida para diagnóstico
            print(res2.stdout or "")
            print(res2.stderr or "")
            return False

    print("[RorkBridge] ✅ Parche aplicado.")
    return True

def safe_write_file(path: str, content: str) -> bool:
    """
    Escribe el archivo solo si cambia. Devuelve True si hubo cambio real.
    Además hace 'git add' del archivo creado/actualizado.
    """
    p = pathlib.Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)

    before = p.read_text(encoding="utf-8") if p.exists() else None
    if before == content:
        # nada que modificar
        return False

    p.write_text(content, encoding="utf-8")
    run(["git", "add", str(p)])
    print(f"[RorkBridge] ✍️ Escribí/actualicé {path} ({len(content)} bytes).")
    return True

def write_files_fallback(files) -> bool:
    """
    Escribe archivos desde files[] del JSON. Devuelve True si hubo cambios reales.
    """
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
    """
    Hace commit/push SOLO si hay cambios reales (ignorando artefactos).
    """
    # Staging por si el diff dejó archivos listos
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

    # Si los diffs fallan, intenta fallback
    if not (ok_main and ok_tests):
        print("[RorkBridge] ⚠️ Fallback: escribiendo archivos directamente.")
        if write_files_fallback(files):
            ok_main = True
            ok_tests = True

    # Si aún no logramos cambios, verifica si ya estaba aplicado
    if not (ok_main and ok_tests):
        if not git_status_has_real_changes():
            print("[RorkBridge] ✅ Nada por cambiar: ya estaba aplicado.")
            sys.exit(0)

        print("[RorkBridge] ❌ No se pudo aplicar ni el diff ni generar cambios con fallback.")
        sys.exit(3)

    # Commit/push si hay cambios reales
    commit_and_push()
    print("[RorkBridge] ✅ Listo.")

if __name__ == "__main__":
    main()
