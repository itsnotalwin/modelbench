"""Safely sort inbox uploads into runs/ and rebuild the dashboard manifest.

ZIP packages are routed exclusively from their root meta.json. The ZIP filename
and internal folder name are intentionally ignored. Legacy standalone HTML
uploads retain their historical filename-based route.
"""
import json
import re
import shutil
import stat
import sys
import tempfile
import zipfile
from datetime import date, datetime
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
INBOX = ROOT / "inbox"
RUNS = ROOT / "runs"
CATALOG = json.loads((ROOT / "prompts" / "catalog.json").read_text(encoding="utf-8"))
PROMPTS = {p["slug"]: p for p in CATALOG["prompts"]}
CATEGORIES = set(PROMPTS)

MODEL_ALIASES = {"glm-5-3-flash": "glm-5.3-flash"}
SCORE_AXES = ["completeness", "robustness", "craft", "depth", "originality", "performance"]
PATTERN = re.compile(
    r"^(?P<category>[a-z0-9][a-z0-9\-]*)__(?P<model>[a-z0-9][a-z0-9\-.]*?)__(?P<date>\d{4}-\d{2}-\d{2})__v(?P<n>\d+)$",
    re.IGNORECASE,
)
MODEL_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$")
MAX_ARCHIVE_BYTES = 30 * 1024 * 1024
MAX_MEMBERS = 500
MAX_UNPACKED_BYTES = 80 * 1024 * 1024
MAX_MEMBER_BYTES = 25 * 1024 * 1024
MAX_COMPRESSION_RATIO = 250


class IntakeError(ValueError):
    """An invalid upload that should remain in inbox for correction."""


def normalise_model(model: str) -> str:
    """Turn a display label into a slug, preferring a canonical provider/model suffix."""
    label = model.strip().lower()
    provider_slug = re.search(r"\((?:[^)]*/)([a-z0-9][a-z0-9.-]*)\)\s*$", label)
    if provider_slug:
        label = provider_slug.group(1)
    else:
        label = re.sub(r"[^a-z0-9.-]+", "-", label)
    label = re.sub(r"-{2,}", "-", label).strip(".-")
    return MODEL_ALIASES.get(label, label)


def parse(stem: str):
    """Parse the legacy standalone-HTML filename contract."""
    match = PATTERN.match(stem.strip())
    if not match:
        return None
    category = match.group("category").lower()
    if category not in CATEGORIES:
        return None
    return {
        "category": category,
        "model": normalise_model(match.group("model")),
        "date": match.group("date"),
        "v": int(match.group("n")),
    }


def slug_for(info) -> str:
    return f"{info['date']}_{info['model']}_{info['category']}_v{info['v']}"


def infer_from_matching_legacy_artifact(project_root: Path, model: str, run_date: str):
    """Infer challenge/version only when the ZIP entry exactly matches a named legacy artifact."""
    entry_path = project_root / "index.html"
    if not entry_path.is_file():
        return None
    try:
        entry_bytes = entry_path.read_bytes()
    except OSError:
        return None

    matches = []
    for candidate in ROOT.glob("*.html"):
        info = parse(candidate.stem)
        if not info or info["model"] != model or info["date"] != run_date:
            continue
        try:
            if candidate.read_bytes() == entry_bytes:
                matches.append((info, candidate.name))
        except OSError:
            continue

    unique = {(item["category"], item["v"]) for item, _ in matches}
    if len(unique) != 1:
        return None
    info, filename = matches[0]
    return {**info, "matched_file": filename}


def validate_metadata(project_root: Path):
    """Read meta.json and return canonical routing info plus its parsed object."""
    meta_path = project_root / "meta.json"
    if not meta_path.is_file():
        raise IntakeError("ZIP must contain meta.json at the project root; the ZIP filename is not used for routing")
    try:
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise IntakeError(f"meta.json is not valid UTF-8 JSON: {exc}") from exc
    if not isinstance(meta, dict):
        raise IntakeError("meta.json must contain a JSON object")
    if meta.get("schema_version", 1) != 1:
        raise IntakeError("meta.json schema_version must be 1")

    raw_model = meta.get("model")
    if not isinstance(raw_model, str):
        raise IntakeError("meta.json field 'model' must be a model name or slug")
    model = normalise_model(raw_model)
    if not MODEL_PATTERN.fullmatch(model):
        raise IntakeError("meta.json model could not be converted into a safe model slug")

    raw_date = meta.get("date")
    date_source = "date"
    if raw_date is None and isinstance(meta.get("submittedAt"), str):
        try:
            submitted = meta["submittedAt"].strip().replace("Z", "+00:00")
            raw_date = datetime.fromisoformat(submitted).date().isoformat()
            date_source = "submittedAt"
        except ValueError:
            raw_date = None
    if not isinstance(raw_date, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw_date):
        raise IntakeError("meta.json date must use YYYY-MM-DD or include a valid submittedAt timestamp")
    try:
        parsed_date = date.fromisoformat(raw_date)
    except ValueError as exc:
        raise IntakeError("meta.json date is not a real calendar date") from exc
    if parsed_date.isoformat() != raw_date:
        raise IntakeError("meta.json date must use canonical YYYY-MM-DD format")

    def resolve_category(value):
        if isinstance(value, bool) or value is None:
            return None
        if isinstance(value, int):
            prompt_no = str(value).zfill(2)
            return next((slug for slug, prompt in PROMPTS.items() if prompt.get("no") == prompt_no), None)
        if isinstance(value, str):
            label = value.strip()
            folded = label.casefold()
            if folded in CATEGORIES:
                return folded
            by_title = next(
                (slug for slug, prompt in PROMPTS.items()
                 if str(prompt.get("title", "")).casefold() == folded),
                None,
            )
            if by_title:
                return by_title
            if label.isdigit():
                prompt_no = label.zfill(2)
                return next((slug for slug, prompt in PROMPTS.items() if prompt.get("no") == prompt_no), None)
        return None

    category_from_field = resolve_category(meta.get("category"))
    category_from_prompt = resolve_category(meta.get("prompt"))
    category_from_label = resolve_category(meta.get("prompt_label"))
    resolved = [value for value in (category_from_field, category_from_prompt, category_from_label) if value]
    if resolved and any(value != resolved[0] for value in resolved[1:]):
        raise IntakeError("meta.json category, prompt and prompt_label identify different challenges")

    category = category_from_field or category_from_prompt or category_from_label
    routing_source = "meta.json"
    matched_artifact = None
    if category is None:
        matched = infer_from_matching_legacy_artifact(project_root, model, raw_date)
        if matched:
            category = matched["category"]
            matched_artifact = matched["matched_file"]
            routing_source = "exact_match_to_existing_artifact"

    if category is None:
        hints = {
            key: meta.get(key)
            for key in ("challenge", "challenge_slug", "category_slug", "test", "test_id",
                        "prompt_id", "prompt_name", "prompt_title", "task", "suite")
            if key in meta
        }
        project_identity = {
            key: meta.get(key)
            for key in ("slug", "title", "model", "entry", "submittedAt")
            if key in meta
        }
        raise IntakeError(
            "meta.json does not identify a ModelBench challenge; include category or prompt "
            f"(category={meta.get('category')!r}, prompt={meta.get('prompt')!r}, "
            f"prompt_label={meta.get('prompt_label')!r}, other_identity_fields={hints!r}, "
            f"project_identity={project_identity!r})"
        )

    version = meta.get("version")
    if version is None and matched_artifact:
        version = matched["v"]
    if version is None:
        version = 1
    if isinstance(version, bool) or not isinstance(version, int) or version < 1:
        raise IntakeError("meta.json version must be a positive integer")

    if meta.get("entry", "index.html") != "index.html":
        raise IntakeError("meta.json entry must be index.html at the project root")
    if not (project_root / "index.html").is_file():
        raise IntakeError("ZIP must contain index.html beside meta.json at the project root")

    info = {
        "category": category,
        "model": model,
        "date": raw_date,
        "v": version,
        "routing_source": routing_source,
    }
    if date_source != "date":
        info["date_source"] = date_source
    if matched_artifact:
        info["matched_artifact"] = matched_artifact
    return info, meta

def safe_extract(zf: zipfile.ZipFile, dest: Path) -> None:
    """Validate and extract entries, normalising safe Windows ZIP separators."""
    members = zf.infolist()
    if not members:
        raise IntakeError("ZIP is empty")
    if len(members) > MAX_MEMBERS:
        raise IntakeError(f"ZIP contains too many entries (limit {MAX_MEMBERS})")

    dest_resolved = dest.resolve()
    seen = set()
    total_size = 0
    validated = []

    for member in members:
        name = member.filename
        if not name or "\x00" in name:
            raise IntakeError(f"unsafe ZIP path: {name!r}")
        # Windows ZIP creators often use backslashes as directory separators.
        # Normalise first, then validate and extract using the same safe path.
        normalised_name = name.replace("\\", "/")
        relative = PurePosixPath(normalised_name)
        if relative.is_absolute() or any(part in {"", ".", ".."} for part in relative.parts):
            raise IntakeError(f"unsafe ZIP path: {name}")
        if relative.parts and ":" in relative.parts[0]:
            raise IntakeError(f"unsafe ZIP path: {name}")

        target = (dest / Path(*relative.parts)).resolve()
        if target != dest_resolved and dest_resolved not in target.parents:
            raise IntakeError(f"unsafe ZIP entry: {name}")

        key = relative.as_posix().rstrip("/")
        if not key or key in seen:
            raise IntakeError(f"duplicate or empty ZIP path: {name}")
        seen.add(key)

        if member.flag_bits & 0x1:
            raise IntakeError(f"encrypted ZIP entries are not accepted: {name}")
        mode = (member.external_attr >> 16) & 0xFFFF
        if stat.S_ISLNK(mode):
            raise IntakeError(f"symbolic links are not accepted: {name}")
        file_kind = stat.S_IFMT(mode)
        if file_kind not in (0, stat.S_IFREG, stat.S_IFDIR):
            raise IntakeError(f"special filesystem entries are not accepted: {name}")
        if member.file_size > MAX_MEMBER_BYTES:
            raise IntakeError(f"ZIP entry is too large (limit {MAX_MEMBER_BYTES // (1024 * 1024)} MB): {name}")
        total_size += member.file_size
        if total_size > MAX_UNPACKED_BYTES:
            raise IntakeError(f"unpacked ZIP is too large (limit {MAX_UNPACKED_BYTES // (1024 * 1024)} MB)")
        if member.file_size and not member.compress_size:
            raise IntakeError(f"invalid compressed size: {name}")
        if member.compress_size and member.file_size / member.compress_size > MAX_COMPRESSION_RATIO:
            raise IntakeError(f"suspicious compression ratio: {name}")
        validated.append((member, relative, target))

    # Extract manually so the validated, normalised paths are exactly the ones written.
    for member, relative, target in validated:
        if member.is_dir() or member.filename.endswith(("/", "\\")):
            target.mkdir(parents=True, exist_ok=True)
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        with zf.open(member, "r") as source, target.open("wb") as output:
            shutil.copyfileobj(source, output)

def find_project_root(extract_dir: Path) -> Path:
    """Accept files at ZIP root or exactly one visible top-level project folder."""
    children = [
        path for path in extract_dir.iterdir()
        if path.name not in {"__MACOSX", ".DS_Store"}
    ]
    if len(children) == 1 and children[0].is_dir():
        return children[0]
    return extract_dir


def canonicalise_metadata(meta: dict, info: dict, run_dir: Path, source_name: str) -> dict:
    """Preserve notes; overwrite derived and organizer-owned fields."""
    prompt = PROMPTS[info["category"]]
    result = dict(meta)
    original_model = meta.get("model")
    if isinstance(original_model, str) and original_model.strip() != info["model"]:
        result["model_label"] = original_model.strip()
    result.update({
        "schema_version": 1,
        "slug": run_dir.name,
        "model": info["model"],
        "category": info["category"],
        "prompt": prompt["no"],
        "prompt_label": prompt["title"],
        "date": info["date"],
        "version": info["v"],
        "entry": "index.html",
        "path": f"runs/{run_dir.name}/index.html",
        "source_file": source_name,
        "scores": {axis: None for axis in SCORE_AXES},
        "log": {"ran_first_try": None, "console_errors": None, "fps": None, "file_size_kb": None},
    })
    if info.get("routing_source") != "meta.json":
        result["routing_inference"] = info["routing_source"]
    if info.get("matched_artifact"):
        result["matched_artifact"] = info["matched_artifact"]
    if info.get("date_source"):
        result["date_source"] = info["date_source"]
    if not isinstance(result.get("notes"), str):
        result["notes"] = ""
    for key in ("rating", "evaluation", "self_score"):
        result.pop(key, None)
    return result


def process_zip(src: Path) -> str:
    """Route a ZIP from its metadata; never use its filename or folder name as identity."""
    RUNS.mkdir(parents=True, exist_ok=True)
    if src.stat().st_size > MAX_ARCHIVE_BYTES:
        raise IntakeError(f"ZIP file is too large (limit {MAX_ARCHIVE_BYTES // (1024 * 1024)} MB)")

    with tempfile.TemporaryDirectory(prefix=".modelbench-intake-", dir=RUNS) as temporary:
        extract_dir = Path(temporary) / "unpacked"
        extract_dir.mkdir()
        try:
            with zipfile.ZipFile(src) as zf:
                safe_extract(zf, extract_dir)
        except zipfile.BadZipFile as exc:
            raise IntakeError("file is not a valid ZIP archive") from exc

        project_root = find_project_root(extract_dir)
        info, model_meta = validate_metadata(project_root)
        run_slug = slug_for(info)
        run_dir = RUNS / run_slug
        if run_dir.exists():
            raise IntakeError(f"destination already exists: {run_slug}; increment meta.json version for a retest")

        for noise in ("__MACOSX",):
            noise_path = project_root / noise
            if noise_path.is_dir():
                shutil.rmtree(noise_path)
        ds_store = project_root / ".DS_Store"
        if ds_store.is_file():
            ds_store.unlink()

        canonical_meta = canonicalise_metadata(model_meta, info, run_dir, src.name)
        (project_root / "meta.json").write_text(
            json.dumps(canonical_meta, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        project_root.rename(run_dir)
        print(
            f"ZIP metadata routed: {src.name} -> {run_slug} "
            f"(category={info['category']}, model={info['model']}, date={info['date']}, v{info['v']})"
        )
        return run_slug


def write_meta(run_dir: Path, info, source_name: str, entry: str = "index.html") -> None:
    """Create organizer metadata for legacy standalone HTML upload."""
    prompt = PROMPTS[info["category"]]
    meta = {
        "schema_version": 1,
        "slug": run_dir.name,
        "model": info["model"],
        "category": info["category"],
        "prompt": prompt["no"],
        "prompt_label": prompt["title"],
        "date": info["date"],
        "version": info["v"],
        "entry": entry,
        "path": f"runs/{run_dir.name}/{entry}",
        "source_file": source_name,
        "scores": {axis: None for axis in SCORE_AXES},
        "log": {"ran_first_try": None, "console_errors": None, "fps": None, "file_size_kb": None},
        "notes": "",
    }
    (run_dir / "meta.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    moved, skipped = [], []
    RUNS.mkdir(parents=True, exist_ok=True)
    if not INBOX.exists():
        print("no inbox/")
        return 0

    for item in sorted(INBOX.iterdir()):
        if item.is_dir() or item.name.startswith(".") or item.suffix.lower() == ".md":
            continue
        if item.suffix.lower() not in {".html", ".htm", ".zip"}:
            skipped.append(item.name)
            print(f"SKIP (unsupported extension, use .zip or legacy .html/.htm): {item.name}")
            continue

        if item.suffix.lower() == ".zip":
            try:
                slug = process_zip(item)
            except Exception as exc:
                skipped.append(item.name)
                print(f"ERROR {item.name}: {exc}")
                continue
            item.unlink()
            moved.append(slug)
            print(f"MOVED {item.name} -> runs/{slug}/")
            continue

        info = parse(item.stem)
        if not info:
            skipped.append(item.name)
            print(f"SKIP (legacy HTML needs category__model__YYYY-MM-DD__vN with a catalog category): {item.name}")
            continue
        run_slug = slug_for(info)
        run_dir = RUNS / run_slug
        if run_dir.exists():
            skipped.append(item.name)
            print(f"SKIP (destination already exists, increment version): {run_slug}")
            continue
        try:
            run_dir.mkdir(parents=True, exist_ok=False)
            shutil.copy2(item, run_dir / "index.html")
            write_meta(run_dir, info, item.name)
        except Exception as exc:
            shutil.rmtree(run_dir, ignore_errors=True)
            skipped.append(item.name)
            print(f"ERROR {item.name}: {exc}")
            continue
        item.unlink()
        moved.append(run_slug)
        print(f"MOVED {item.name} -> runs/{run_slug}/")

    sys.path.insert(0, str(ROOT / "tools"))
    import pwa
    pwa.ensure_root(ROOT)
    for run_dir in sorted(RUNS.iterdir()):
        meta_path = run_dir / "meta.json"
        if not run_dir.is_dir() or run_dir.name.startswith(".") or not meta_path.exists():
            continue
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
        except Exception:
            continue
        category = PROMPTS.get(meta.get("category"))
        if not category:
            continue
        title = f"{meta.get('model')} · {category['title']} v{meta.get('version', 1)}"
        status = pwa.ensure_run(
            run_dir,
            title,
            f"{category['summary']} Run by {meta.get('model')}.",
            category.get("hue", 210),
        )
        if meta.get("pwa") != status:
            meta["pwa"] = status
            meta_path.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")

    import build_manifest
    build_manifest.main()
    print(f"done: moved={moved} skipped={skipped}")
    # Leave the workflow red when any upload was skipped or rejected, while preserving the ZIP.
    return 1 if skipped else 0


if __name__ == "__main__":
    raise SystemExit(main())
