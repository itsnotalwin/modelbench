"""Browser checks for dashboard rating and core interactions.

Run with the dashboard served at http://127.0.0.1:8765/:
    python -m unittest tests.test_dashboard_ui
"""
import json
import unittest
from pathlib import Path
from playwright.sync_api import sync_playwright

MANIFEST = json.loads((Path(__file__).resolve().parents[1] / 'manifest.json').read_text(encoding='utf-8'))

BASE = 'http://127.0.0.1:8765/'

class DashboardUI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.p = sync_playwright().start()
        cls.browser = cls.p.chromium.launch(headless=True, channel='chrome')

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.p.stop()

    def test_search_filter_compare_and_cleanup(self):
        context = self.browser.new_context()
        page = context.new_page()
        page.add_init_script("window.__dashboardErrors=[]; window.addEventListener('error', e => window.__dashboardErrors.push(e.message));")
        page.goto(BASE, wait_until='networkidle')
        self.assertEqual(page.locator('.card').count(), len(MANIFEST['runs']))
        self.assertEqual(page.locator('iframe').count(), 0)
        page.locator('#q').fill('editorial')
        self.assertEqual(page.locator('.card').count(), sum(r['category'] == 'site-editorial' for r in MANIFEST['runs']))
        page.locator('#q').fill('')
        page.locator('.filter-details summary').click()
        page.locator('[data-test="site-brand"]').click()
        self.assertEqual(page.locator('.card').count(), sum(r['category'] == 'site-brand' for r in MANIFEST['runs']))
        page.locator('[data-test="all"]').click()
        page.locator('input[data-pick]').nth(0).check()
        page.locator('input[data-pick]').nth(1).check()
        page.locator('input[data-pick]').nth(2).check()
        self.assertFalse(page.locator('input[data-pick]').nth(0).is_checked())
        self.assertTrue(page.get_by_role('button', name='Compare', exact=False).is_enabled())
        page.locator('#compare').click()
        self.assertEqual(page.locator('#cmp-body iframe').count(), 2)
        page.locator('#c-close').click()
        self.assertEqual(page.locator('#cmp-body iframe').count(), 0)
        page.locator('[data-open]').first.click()
        self.assertEqual(page.locator('#v-frame iframe').count(), 1)
        page.locator('#v-close').click()
        self.assertEqual(page.locator('#v-frame iframe').count(), 0)
        self.assertEqual(page.evaluate('window.__dashboardErrors'), [])
        context.close()

    def test_no_horizontal_overflow_at_supported_widths(self):
        context = self.browser.new_context()
        page = context.new_page()
        for width in (360, 390, 768, 1024, 1440):
            page.set_viewport_size({'width': width, 'height': 800})
            page.goto(BASE, wait_until='networkidle')
            overflow = page.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            self.assertEqual(overflow, 0, f'overflow at {width}px')
        context.close()

    def test_secondary_views_are_built_only_when_opened(self):
        context = self.browser.new_context()
        page = context.new_page()
        page.goto(BASE, wait_until='networkidle')
        self.assertEqual(page.locator('#board-table').inner_html(), '')
        self.assertEqual(page.locator('#tests-grid').inner_html(), '')
        page.get_by_role('link', name='Leaderboard').click()
        self.assertGreater(page.locator('#board-table tbody tr').count(), 0)
        page.get_by_role('link', name='The fifteen tests').click()
        page.locator('#tests-grid .test').first.wait_for()
        self.assertEqual(page.locator('#tests-grid .test').count(), len(MANIFEST['catalog']))
        context.close()

    def test_offline_after_first_visit_keeps_rating_controls(self):
        context = self.browser.new_context()
        page = context.new_page()
        page.goto(BASE, wait_until='networkidle')
        page.wait_for_function("navigator.serviceWorker.controller !== null", timeout=10000)
        context.set_offline(True)
        page.reload(wait_until='load')
        page.locator('[data-open]').first.click()
        self.assertTrue(page.get_by_label('Craft', exact=True).is_visible())
        page.get_by_label('Craft', exact=True).select_option('4')
        page.get_by_role('button', name='Save rating').click()
        self.assertIn('Saved on this device', page.locator('.rating-message').inner_text())
        context.close()

    def test_export_import_round_trip(self):
        context = self.browser.new_context(accept_downloads=True)
        page = context.new_page()
        page.goto(BASE, wait_until='networkidle')
        page.locator('[data-open]').first.click()
        page.get_by_label('Craft', exact=True).select_option('3.5')
        page.get_by_role('button', name='Save rating').click()
        page.get_by_role('button', name='Close', exact=True).click()
        with page.expect_download(timeout=3000) as received:
            page.get_by_role('button', name='Export ratings').click()
        download = received.value
        saved = download.path()
        page.evaluate("localStorage.removeItem('modelbench.ratings.v1')")
        page.reload(wait_until='networkidle')
        page.locator('#import-ratings').set_input_files(saved)
        page.locator('[data-open]').first.click()
        self.assertEqual(page.get_by_label('Craft', exact=True).input_value(), '3.5')
        context.close()

    def test_rating_persists_and_updates_cards(self):
        context = self.browser.new_context()
        page = context.new_page()
        page.goto(BASE, wait_until='networkidle')
        page.locator('[data-open]').first.click()
        self.assertTrue(page.get_by_role('heading', name='Your rating').is_visible())
        for label in ('Completeness', 'Robustness', 'Craft', 'Depth', 'Originality', 'Performance'):
            page.get_by_label(label, exact=True).select_option('4')
        page.get_by_role('button', name='Save rating').click()
        self.assertIn('4.0', page.locator('.card').first.inner_text())
        page.reload(wait_until='networkidle')
        self.assertEqual(page.get_by_label('Craft', exact=True).input_value(), '4')
        context.close()

if __name__ == '__main__':
    unittest.main()
