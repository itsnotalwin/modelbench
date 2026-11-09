import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("sort_inbox_under_test", ROOT / "tools" / "sort_inbox.py")
sorter = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(sorter)


class ZipMetadataRoutingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        sorter.RUNS = self.root / "runs"
        sorter.INBOX = self.root / "inbox"
        sorter.RUNS.mkdir()
        sorter.INBOX.mkdir()
        sorter.PROMPTS = {
            "site-editorial": {"no": "02", "title": "Interactive Editorial Investigation", "summary": "Editorial test", "hue": 18},
            "site-brand": {"no": "01", "title": "Flagship Brand Experience", "summary": "Brand test", "hue": 265},
        }
        sorter.CATEGORIES = set(sorter.PROMPTS)

    def tearDown(self):
        self.temp.cleanup()

    def make_zip(self, name="upload-anything.zip", meta=None, wrapped=True, extra_entries=None):
        path = sorter.INBOX / name
        meta = meta or {
            "schema_version": 1,
            "model": "gpt-6",
            "category": "site-editorial",
            "date": "2026-11-09",
            "version": 2,
            "entry": "index.html",
            "prompt": "02",
            "prompt_label": "Interactive Editorial Investigation",
            "notes": "A completed one-shot build.",
            "scores": {"craft": 5},
        }
        prefix = "arbitrary-folder/" if wrapped else ""
        with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            archive.writestr(prefix + "index.html", "<!doctype html><title>Build</title>")
            archive.writestr(prefix + "meta.json", json.dumps(meta))
            for filename, content in (extra_entries or {}).items():
                archive.writestr(filename, content)
        return path

    def test_arbitrary_zip_filename_routes_from_meta(self):
        archive = self.make_zip(name="crouton-alpha.zip")
        slug = sorter.process_zip(archive)
        self.assertEqual(slug, "2026-11-09_gpt-6_site-editorial_v2")
        run_dir = sorter.RUNS / slug
        self.assertTrue((run_dir / "index.html").is_file())
        saved = json.loads((run_dir / "meta.json").read_text(encoding="utf-8"))
        self.assertEqual(saved["model"], "gpt-6")
        self.assertEqual(saved["category"], "site-editorial")
        self.assertEqual(saved["prompt_label"], "Interactive Editorial Investigation")
        self.assertEqual(saved["path"], f"runs/{slug}/index.html")
        self.assertEqual(saved["scores"], {axis: None for axis in sorter.SCORE_AXES})
        self.assertEqual(saved["notes"], "A completed one-shot build.")

    def test_display_name_model_is_safely_slugified(self):
        meta = {
            "model": "GPT 6 Thinking (Preview)",
            "category": "site-editorial",
            "date": "2026-11-09",
            "version": 3,
            "entry": "index.html",
            "notes": "Model display name."
        }
        archive = self.make_zip(name="freeform-name.zip", meta=meta)
        slug = sorter.process_zip(archive)
        self.assertEqual(slug, "2026-11-09_gpt-6-thinking-preview_site-editorial_v3")
        saved = json.loads((sorter.RUNS / slug / "meta.json").read_text(encoding="utf-8"))
        self.assertEqual(saved["model_label"], "GPT 6 Thinking (Preview)")

    def test_metadata_overrides_conflicting_zip_name(self):
        archive = self.make_zip(name="site-brand__wrong-model__2026-01-01__v99.zip")
        self.assertEqual(sorter.process_zip(archive), "2026-11-09_gpt-6_site-editorial_v2")

    def test_root_level_zip_layout_is_supported(self):
        archive = self.make_zip(name="root-layout.zip", wrapped=False)
        slug = sorter.process_zip(archive)
        self.assertTrue((sorter.RUNS / slug / "index.html").is_file())

    def test_missing_meta_is_rejected_without_deleting_upload(self):
        archive = sorter.INBOX / "missing-meta.zip"
        with zipfile.ZipFile(archive, "w") as handle:
            handle.writestr("index.html", "<h1>No metadata</h1>")
        with self.assertRaisesRegex(sorter.IntakeError, "meta.json"):
            sorter.process_zip(archive)
        self.assertTrue(archive.exists())
        self.assertEqual(list(sorter.RUNS.iterdir()), [])

    def test_invalid_json_is_rejected(self):
        archive = sorter.INBOX / "bad-json.zip"
        with zipfile.ZipFile(archive, "w") as handle:
            handle.writestr("index.html", "<h1>Broken metadata</h1>")
            handle.writestr("meta.json", "{not json")
        with self.assertRaisesRegex(sorter.IntakeError, "valid UTF-8 JSON"):
            sorter.process_zip(archive)
        self.assertTrue(archive.exists())

    def test_invalid_category_is_rejected(self):
        meta = {"model":"gpt-6","category":"unknown-category","date":"2026-11-09","version":1,"entry":"index.html"}
        archive = self.make_zip(name="unknown-category.zip", meta=meta, wrapped=False)
        with self.assertRaisesRegex(sorter.IntakeError, "not in prompts/catalog.json"):
            sorter.process_zip(archive)

    def test_invalid_date_and_version_are_rejected(self):
        for field, value in (("date", "2026-02-31"), ("version", 0), ("version", True)):
            meta = {"model":"gpt-6","category":"site-editorial","date":"2026-11-09","version":1,"entry":"index.html"}
            meta[field] = value
            archive = self.make_zip(name=f"invalid-{field}-{value}.zip", meta=meta, wrapped=False)
            with self.assertRaises(sorter.IntakeError):
                sorter.process_zip(archive)

    def test_existing_run_is_never_overwritten(self):
        archive = self.make_zip()
        target = sorter.RUNS / "2026-11-09_gpt-6_site-editorial_v2"
        target.mkdir()
        (target / "keep.txt").write_text("original", encoding="utf-8")
        with self.assertRaisesRegex(sorter.IntakeError, "already exists"):
            sorter.process_zip(archive)
        self.assertEqual((target / "keep.txt").read_text(encoding="utf-8"), "original")
        self.assertTrue(archive.exists())

    def test_zip_path_traversal_is_rejected(self):
        archive = sorter.INBOX / "traversal.zip"
        meta = {"model":"gpt-6","category":"site-editorial","date":"2026-11-09","version":3,"entry":"index.html"}
        with zipfile.ZipFile(archive, "w") as handle:
            handle.writestr("index.html", "<h1>Build</h1>")
            handle.writestr("meta.json", json.dumps(meta))
            handle.writestr("../escaped.txt", "bad")
        with self.assertRaisesRegex(sorter.IntakeError, "unsafe ZIP path"):
            sorter.process_zip(archive)
        self.assertFalse((self.root / "escaped.txt").exists())
        self.assertTrue(archive.exists())


    def test_windows_backslash_paths_are_normalized(self):
        archive = sorter.INBOX / "crouton-alpha.zip"
        meta = {
            "schema_version": 1,
            "model": "gpt-6",
            "category": "site-editorial",
            "date": "2026-11-09",
            "version": 4,
            "entry": "index.html",
            "notes": "Windows-created archive."
        }
        with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as handle:
            handle.writestr("crouton-alpha\\index.html", "<!doctype html><title>Build</title>")
            handle.writestr("crouton-alpha\\meta.json", json.dumps(meta))
            handle.writestr("crouton-alpha\\AUDIT.md", "Optional audit file")
        slug = sorter.process_zip(archive)
        self.assertEqual(slug, "2026-11-09_gpt-6_site-editorial_v4")
        self.assertTrue((sorter.RUNS / slug / "index.html").is_file())
        self.assertTrue((sorter.RUNS / slug / "meta.json").is_file())

    def test_legacy_html_filename_route_remains_available(self):
        self.assertEqual(sorter.parse("site-brand__gpt-6__2026-11-09__v1"), {
            "category": "site-brand", "model": "gpt-6", "date": "2026-11-09", "v": 1
        })


if __name__ == "__main__":
    unittest.main()
