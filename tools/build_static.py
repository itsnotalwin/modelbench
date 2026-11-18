"""Build the static GitHub Pages export of the lab.

Next.js refuses to export a project that contains route handlers, so the build
runs in a scratch copy of the project without `src/app/api`; the working tree is
never touched. Runs are copied verbatim into the export so artifact previews
keep working.

Usage: python tools/build_static.py [base-path]     (default /modelbench)
"""
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "out"
COPY = ("package.json", "package-lock.json", "next.config.ts", "tsconfig.json",
        "postcss.config.mjs", "eslint.config.mjs", "drizzle.config.json",
        "next-env.d.ts")


def link_or_copy(src: str, dst: str, **_kwargs) -> str:
    """Hardlink when possible: node_modules is big and the build only reads it."""
    try:
        os.link(src, dst)
    except OSError:
        shutil.copy2(src, dst)
    return dst


def prepare(work: Path) -> None:
    for name in COPY:
        source = ROOT / name
        if source.exists():
            shutil.copy2(source, work / name)
    shutil.copytree(ROOT / "src", work / "src",
                    ignore=shutil.ignore_patterns("api", "__pycache__"))
    shutil.copytree(ROOT / "public", work / "public")

    modules = ROOT / "node_modules"
    if modules.is_dir():
        shutil.copytree(modules, work / "node_modules", symlinks=True,
                        copy_function=link_or_copy)


def main() -> int:
    base_path = (sys.argv[1] if len(sys.argv) > 1 else "/modelbench").rstrip("/")
    env = {
        **os.environ,
        "STATIC_EXPORT": "1",
        "NEXT_PUBLIC_STATIC": "1",
        "NEXT_PUBLIC_BASE_PATH": base_path,
        "NODE_ENV": "production",
        "NEXT_TELEMETRY_DISABLED": "1",
    }

    work = Path(tempfile.mkdtemp(prefix="modelbench-export-"))
    try:
        prepare(work)
        print(f"+ next build  (basePath={base_path or '/'})")
        for attempt in range(1, 4):
            result = subprocess.run("npx next build", cwd=work, env=env, shell=True,
                                    capture_output=True, text=True)
            if result.returncode == 0:
                print(result.stdout[-1500:])
                break
            combined = (result.stdout or "") + (result.stderr or "")
            print(combined[-1500:])
            if "known security vulnerability" in combined and attempt < 3:
                print(f"! Next.js stopped to show its security advisory; retrying ({attempt}/3)")
                continue
            raise subprocess.CalledProcessError(result.returncode, "npx next build")

        exported = work / "out"
        if not (exported / "index.html").is_file():
            raise SystemExit("export failed: out/index.html is missing")
        if OUT.exists():
            shutil.rmtree(OUT)
        shutil.copytree(exported, OUT)
    finally:
        shutil.rmtree(work, ignore_errors=True)

    # GitHub Pages must serve the export verbatim.
    (OUT / ".nojekyll").write_text("")

    # Artifact previews point at https://<user>.github.io/modelbench/runs/...
    runs_source = ROOT / "runs"
    if runs_source.is_dir():
        shutil.copytree(runs_source, OUT / "runs", dirs_exist_ok=True)

    total = sum(1 for path in OUT.rglob("*") if path.is_file())
    size = sum(path.stat().st_size for path in OUT.rglob("*") if path.is_file())
    print(f"static export ready: out/ ({total:,} files, {size / 1024 / 1024:.1f} MB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
