import unittest, sys, tempfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from clearline import db

class DbTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.conn = db.connect(Path(self.tmp)/"t.db"); db.seed(self.conn)
    def test_seed(self):
        self.assertGreater(self.conn.execute("SELECT COUNT(*) c FROM shipments").fetchone()["c"], 5)
        self.assertGreater(self.conn.execute("SELECT COUNT(*) c FROM hs_codes").fetchone()["c"], 5)
    def test_auth_and_session(self):
        u = db.authenticate(self.conn, "demo@clearline.local", "Demo1234!")
        self.assertIsNotNone(u)
        self.assertIsNone(db.authenticate(self.conn, "demo@clearline.local", "wrong"))
        tok = db.new_session(self.conn, u["id"])
        self.assertEqual(db.user_for_token(self.conn, tok)["email"], "demo@clearline.local")
    def test_duplicate_reference(self):
        with self.assertRaises(Exception):
            self.conn.execute("INSERT INTO shipments(reference,client_id) VALUES('CL-2026-001',1)"); self.conn.commit()
    def test_password_not_plaintext(self):
        r = self.conn.execute("SELECT pw FROM users LIMIT 1").fetchone()
        self.assertNotIn("Demo1234", r["pw"])

if __name__ == "__main__":
    unittest.main()
