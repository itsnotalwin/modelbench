"""Clearline Ops - customs clearing & freight forwarding command centre."""
from clearline.web import create_server
import os, sys

def main():
    port = int(os.environ.get("PORT", "8000"))
    host = os.environ.get("HOST", "127.0.0.1")
    db_path = os.path.join(os.path.dirname(__file__), "data", "clearline.db")
    srv = create_server(host, port, db_path)
    print(f"Clearline Ops running at http://{host}:{port}/  (demo: demo@clearline.local / Demo1234!)")
    print("Press Ctrl+C to stop.")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass

if __name__ == "__main__":
    main()
