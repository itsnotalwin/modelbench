import unittest, sys, threading, time, urllib.request, urllib.parse, http.cookiejar, tempfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from clearline.web import create_server

class WebTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp()
        cls.srv = create_server("127.0.0.1", 0, str(Path(cls.tmp)/"t.db"))
        cls.port = cls.srv.server_address[1]
        cls.thread = threading.Thread(target=cls.srv.serve_forever, daemon=True); cls.thread.start()
        time.sleep(0.5)
        cls.cj = http.cookiejar.CookieJar(); cls.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cls.cj))
    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()
    def get(self, p): return self.op.open(f"http://127.0.0.1:{self.port}{p}", timeout=5).read().decode()
    def post(self, p, d): return self.op.open(f"http://127.0.0.1:{self.port}{p}", data=urllib.parse.urlencode(d).encode(), timeout=5)
    def test_full_flow(self):
        self.assertIn("Sign in", self.get("/login"))
        self.post("/login", {"email":"demo@clearline.local","pw":"Demo1234!","name":""})
        self.assertIn("Dashboard", self.get("/"))
        self.assertIn("CL-2026-001", self.get("/shipments"))
        self.assertIn("Cost breakdown", self.get("/shipments/1"))
        self.assertIn("0901.21", self.get("/hs"))
        self.assertIn("CL-2026-001", self.get("/export.csv"))

if __name__ == "__main__":
    unittest.main()
