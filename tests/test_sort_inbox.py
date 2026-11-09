import importlib.util
import json
import tempfile
import unittest
import zipfile
from types import SimpleNamespace
from unittest.mock import patch
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT
SPEC = importlib.util.spec_from_file_location("sort_inbox_under_test", ROOT / "tools" / "sort_inbox.py")
sorter = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(sorter)


class ZipMetadataRoutingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        sorter.RUNS = self.root / "runs"
        sorter.INBOX = self.root / "inbox"
        sorter.ROOT = self.root
        sorter.RUNS.mkdir()
        sorter.INBOX.mkdir()
        sorter.PROMPTS = {
            "site-editorial": {"no": "02", "title": "Interactive Editorial Feature", "summary": "Editorial test", "hue": 18},
            "site-brand": {"no": "01", "title": "Original Brand Website", "summary": "Brand test", "hue": 265},
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
            "prompt_label": "Interactive Editorial Feature",
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
        self.assertEqual(saved["prompt_label"], "Interactive Editorial Feature")
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

    def test_model_metadata_with_provider_slug_is_normalized(self):
        self.assertEqual(
            sorter.normalise_model("Crouton Alpha (stealth/crouton-alpha)"),
            "crouton-alpha"
        )

    def test_missing_category_is_inferred_only_from_exact_legacy_artifact_match(self):
        html = "<!doctype html><title>Halcyon Field</title>"
        matching = sorter.ROOT / "site-editorial__crouton-alpha__2026-11-09__v4.html"
        matching.write_text(html, encoding="utf-8")
        meta = {
            "model": "Crouton Alpha (stealth/crouton-alpha)",
            "slug": "crouton-alpha",
            "title": "Halcyon Field",
            "submittedAt": "2026-11-09T15:45:43+02:00",
            "entry": "index.html"
        }
        archive = sorter.INBOX / "crouton-alpha.zip"
        with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as handle:
            handle.writestr("crouton-alpha/index.html", html)
            handle.writestr("crouton-alpha/meta.json", json.dumps(meta))
        slug = sorter.process_zip(archive)
        self.assertEqual(slug, "2026-11-09_crouton-alpha_site-editorial_v4")
        saved = json.loads((sorter.RUNS / slug / "meta.json").read_text(encoding="utf-8"))
        self.assertEqual(saved["model_label"], "Crouton Alpha (stealth/crouton-alpha)")
        self.assertEqual(saved["routing_inference"], "exact_match_to_existing_artifact")
        self.assertEqual(saved["matched_artifact"], matching.name)
        self.assertEqual(saved["date_source"], "submittedAt")

    def test_prompt_number_resolves_legacy_category_metadata(self):
        meta = {
            "model": "gpt-6",
            "prompt": "02",
            "date": "2026-11-09",
            "version": 1,
            "entry": "index.html",
            "notes": "Legacy metadata with prompt number only."
        }
        archive = self.make_zip(name="older-metadata.zip", meta=meta, wrapped=False)
        slug = sorter.process_zip(archive)
        self.assertEqual(slug, "2026-11-09_gpt-6_site-editorial_v1")

    def test_conflicting_category_and_prompt_are_rejected(self):
        meta = {
            "model": "gpt-6",
            "category": "site-brand",
            "prompt": "02",
            "date": "2026-11-09",
            "version": 1,
            "entry": "index.html"
        }
        archive = self.make_zip(name="conflicting-metadata.zip", meta=meta, wrapped=False)
        with self.assertRaisesRegex(sorter.IntakeError, "identify different challenges"):
            sorter.process_zip(archive)

    def test_invalid_category_is_rejected(self):
        meta = {"model":"gpt-6","category":"unknown-category","date":"2026-11-09","version":1,"entry":"index.html"}
        archive = self.make_zip(name="unknown-category.zip", meta=meta, wrapped=False)
        with self.assertRaisesRegex(sorter.IntakeError, "does not identify a ModelBench challenge"):
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

    def test_main_imports_valid_uploads_and_reports_rejected_uploads(self):
        valid = self.make_zip(name="valid.zip")
        rejected = sorter.INBOX / "rejected.zip"
        with zipfile.ZipFile(rejected, "w") as archive:
            archive.writestr("index.html", "<h1>Missing metadata</h1>")

        pwa_stub = SimpleNamespace(
            ensure_root=lambda root: None,
            ensure_run=lambda *args: {"manifest_linked": False, "sw_registered": False},
        )
        manifest_stub = SimpleNamespace(main=lambda: None)
        with patch.dict("sys.modules", {"pwa": pwa_stub, "build_manifest": manifest_stub}):
            exit_code = sorter.main()

        self.assertEqual(exit_code, 1)
        self.assertFalse(valid.exists(), "accepted ZIP should be removed after import")
        self.assertTrue(rejected.exists(), "rejected ZIP must remain available for correction")
        run_dir = sorter.RUNS / "2026-11-09_gpt-6_site-editorial_v2"
        self.assertTrue((run_dir / "index.html").is_file())
        self.assertTrue((run_dir / "meta.json").is_file())

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


class PromptCatalogIntegrityTests(unittest.TestCase):

    def test_dashboard_describes_one_artifact_per_prompt(self):
        dashboard = (REPO_ROOT / "index.html").read_text(encoding="utf-8")
        self.assertNotIn("three separate outputs", dashboard)
        self.assertIn("one complete project folder", dashboard)
        self.assertIn("One run, one ZIP", dashboard)


    def test_game_prompts_leave_creative_direction_open(self):
        catalog = json.loads((REPO_ROOT / "prompts" / "catalog.json").read_text(encoding="utf-8"))
        prompts = {p["no"]: p for p in catalog["prompts"]}
        game_categories = {
            "06": "game-2d",
            "07": "game-3d",
            "11": "game-colony",
            "12": "game-voxel",
            "13": "game-brawler",
            "14": "game-racer",
            "15": "game-roguelite",
        }
        for number, slug in game_categories.items():
            challenge = prompts[number]
            self.assertEqual(challenge["slug"], slug)
            matches = list((REPO_ROOT / "prompts").glob(f"{number}-*.md"))
            self.assertEqual(len(matches), 1, f"expected one prompt file for challenge {number}")
            relative_path = matches[0].relative_to(REPO_ROOT).as_posix()
            body = matches[0].read_text(encoding="utf-8")
            self.assertTrue(
                any(term in body.lower() for term in ("you choose", "you decide", "invent", "your choice")),
                f"{relative_path} should leave creative decisions to the model",
            )
            self.assertIn("exactly one folder", body.lower())
            self.assertIn("meta.json", body)
            self.assertIn(f'"category": "{slug}"', body)
            self.assertIn(f'"prompt": "{number}"', body)
            self.assertIn(f'"prompt_label": "{challenge["title"]}"', body)

    def test_numbered_prompts_match_the_catalog(self):
        catalog = json.loads((REPO_ROOT / "prompts" / "catalog.json").read_text(encoding="utf-8"))
        prompts = catalog["prompts"]
        self.assertIsInstance(catalog["version"], int)
        self.assertNotIsInstance(catalog["version"], bool)
        self.assertGreaterEqual(catalog["version"], 1)
        self.assertEqual(catalog["outputs_per_prompt"], 1)
        self.assertGreater(len(prompts), 0)
        self.assertEqual([p["no"] for p in prompts], [f"{n:02d}" for n in range(1, len(prompts) + 1)])
        self.assertEqual(len({p["slug"] for p in prompts}), len(prompts))
        self.assertTrue(all(p["min_outputs"] == 1 for p in prompts))

        numbered_files = sorted((REPO_ROOT / "prompts").glob("[0-9][0-9]-*.md"))
        file_numbers = [path.name[:2] for path in numbered_files]
        self.assertEqual(sorted(file_numbers), [p["no"] for p in prompts])
        self.assertEqual(len(file_numbers), len(set(file_numbers)))

        for challenge in prompts:
            number = challenge["no"]
            matches = list((REPO_ROOT / "prompts").glob(f"{number}-*.md"))
            self.assertEqual(len(matches), 1, f"expected one prompt file for challenge {number}")
            body = matches[0].read_text(encoding="utf-8")
            relative_path = matches[0].relative_to(REPO_ROOT).as_posix()
            self.assertIn("exactly one folder", body.lower(), relative_path)
            self.assertIn("index.html", body, relative_path)
            self.assertIn("meta.json", body, relative_path)
            self.assertIn(f'"category": "{challenge["slug"]}"', body, relative_path)
            self.assertIn(f'"prompt": "{number}"', body, relative_path)
            self.assertIn(f'"prompt_label": "{challenge["title"]}"', body, relative_path)

    def test_generated_manifest_catalog_matches_source_catalog(self):
        source = json.loads((REPO_ROOT / "prompts" / "catalog.json").read_text(encoding="utf-8"))
        manifest = json.loads((REPO_ROOT / "manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest.get("catalog"), source["prompts"])



if __name__ == "__main__":
    unittest.main()
