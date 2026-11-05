"""HTTP layer: routing, rendering, forms. Stdlib only, monochrome CSS."""
from __future__ import annotations
import csv, html, io, re
from http import cookies
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
from . import db
from .domain import *

CSS = """
:root{--ink:#111;--mut:#555;--line:#d9d9d9;--bg:#fff;--panel:#f7f7f7;--dark:#111}
*{box-sizing:border-box}body{margin:0;font:14px/1.45 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:var(--bg)}
a{color:var(--ink);text-decoration:underline;text-underline-offset:2px}a:hover{color:#000}
button,.btn{background:var(--dark);color:#fff;border:1px solid var(--dark);padding:8px 14px;font:inherit;cursor:pointer;border-radius:4px}
.btn2{background:#fff;color:var(--ink)}button:hover,.btn:hover{background:#333;color:#fff}.btn2:hover{background:#eee;color:#000}
input,select,textarea{font:inherit;padding:8px;border:1px solid #bbb;border-radius:4px;width:100%;background:#fff;color:var(--ink)}
label{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--mut)}
:focus-visible{outline:3px solid #111;outline-offset:2px}
.top{display:flex;justify-content:space-between;align-items:center;padding:12px 20px;border-bottom:2px solid var(--dark);position:sticky;top:0;background:#fff;z-index:5}
.logo{font-weight:800;font-size:20px;letter-spacing:-.02em}.logo span{color:var(--mut);font-weight:400}
.nav{display:flex;gap:16px;flex-wrap:wrap}.nav a{text-decoration:none;font-weight:600}.nav a:hover{text-decoration:underline}
.wrap{max-width:1180px;margin:0 auto;padding:20px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:17px;margin:22px 0 8px}.sub{color:var(--mut);margin:0 0 18px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}.card{border:1px solid var(--line);border-radius:6px;padding:14px;background:var(--panel)}
.card b{font-size:26px;display:block}.card span{color:var(--mut);font-size:12px;text-transform:uppercase;letter-spacing:.05em}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:8px;border-bottom:1px solid var(--line);vertical-align:top}th{background:var(--panel);text-transform:uppercase;font-size:11px;letter-spacing:.05em}
.badge{display:inline-block;border:1px solid #111;padding:1px 7px;border-radius:20px;font-size:11px;font-weight:700;background:#fff}.badge.solid{background:#111;color:#fff}.badge.grey{background:#eee;color:#333}
.form{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.err{background:#111;color:#fff;padding:10px 14px;border-radius:4px;margin:12px 0}.err li{margin:2px 0}
.notice{border:1px solid #111;padding:10px 14px;border-radius:4px;margin:12px 0;background:var(--panel)}
.toolbar{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}.toolbar input,.toolbar select{width:auto;min-width:160px}
.empty{border:1px dashed #999;padding:28px;text-align:center;color:var(--mut);border-radius:6px}
.auth{max-width:420px;margin:60px auto;border:1px solid var(--line);padding:26px;border-radius:8px}.auth h1{font-size:22px}
.print{border:1px solid #111;padding:22px}.print h1{font-size:20px;border-bottom:2px solid #111;padding-bottom:8px}
@media(max-width:700px){.top{flex-direction:column;align-items:flex-start;gap:8px}.wrap{padding:14px}table{font-size:12px}}
@media print{.top,.actions,.noprint{display:none}body{font-size:12px}}
"""
def esc(v): return html.escape(str(v if v is not None else ""))
def layout(title, body, user=None):
    nav = '<a href="/">Dashboard</a><a href="/shipments">Shipments</a><a href="/clients">Clients</a><a href="/calculator">Duty Calculator</a><a href="/hs">HS Codes</a><a href="/export.csv">Export CSV</a>' if user else ''
    who = f'<span>{esc(user["name"])} · {esc(user["email"])}</span> <form class="noprint" method="post" action="/logout" style="display:inline"><button class="btn2">Sign out</button></form>' if user else ''
    return f"<!doctype html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>{esc(title)} · Clearline Ops</title><style>{CSS}</style></head><body><header class='top'><div class='logo'>Clearline<span> Ops</span></div><nav class='nav' aria-label='Main'>{nav}</nav><div>{who}</div></header><main class='wrap'>{body}</main><script>document.addEventListener('keydown',e=>{{if(e.key==='/'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){{e.preventDefault();document.querySelector('[name=q]')?.focus()}}}})</script></body></html>"

def badge(st): return f"<span class='badge {'solid' if st in ('RELEASED','DELIVERED') else ''}'>{esc(STATUS_LABELS.get(st,st))}</span>"

class Handler(BaseHTTPRequestHandler):
    conn = None; db_path = None
    def log_message(self, *a): pass
    # helpers
    def send_html(self, body, code=200, headers=None):
        b = body.encode(); self.send_response(code); self.send_header("Content-Type", "text/html; charset=utf-8"); self.send_header("Content-Length", str(len(b)))
        for k, v in (headers or {}).items(): self.send_header(k, v)
        self.end_headers(); self.wfile.write(b)
    def redirect(self, loc, headers=None):
        self.send_response(303); self.send_header("Location", loc)
        for k, v in (headers or {}).items(): self.send_header(k, v)
        self.end_headers()
    def form(self):
        n = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(n).decode() if n else ""
        return {k: v[0] for k, v in parse_qs(raw).items()}
    def user(self):
        c = cookies.SimpleCookie(self.headers.get("Cookie", ""))
        m = c.get("session")
        return db.user_for_token(self.conn, m.value) if m else None
    def require(self):
        u = self.user()
        if not u: self.redirect("/login"); return None
        return u
    def do_GET(self):
        u_parsed = urlparse(self.path); path = u_parsed.path; q = {k: v[0] for k, v in parse_qs(u_parsed.query).items()}
        if path in ("/login", "/signup"):
            if self.user(): return self.redirect("/")
            mode = "Sign in" if path == "/login" else "Create account"
            body = f"<div class='auth'><h1>Clearline Ops</h1><p class='sub'>Customs clearing &amp; freight forwarding — {mode.lower()}.</p><form method='post' action='{path}' class='form' style='grid-template-columns:1fr'><div><label for='name'>Full name</label><input id='name' name='name' required={'required' if path=='/signup' else ''} autocomplete='name'></div><div><label for='email'>Email</label><input id='email' name='email' type='email' required autocomplete='email'></div><div><label for='pw'>Password (8+ chars)</label><input id='pw' name='pw' type='password' required minlength='8' autocomplete='current-password'></div><div class='actions'><button type='submit'>{mode}</button></div></form><p class='sub'><a href='/signup'>Create account</a> · <a href='/login'>Sign in</a></p><p class='sub'>Demo: demo@clearline.local / Demo1234!</p></div>"
            return self.send_html(layout(mode, body))
        user = self.require()
        if not user: return
        if path == "/": return self.dashboard(user)
        if path == "/shipments": return self.shipments(user, q)
        if path == "/shipments/new": return self.shipment_form(user, {})
        if path.startswith("/shipments/") and path.endswith("/edit"): return self.shipment_form(user, self.get_shipment(int(path.split("/")[2])) or {})
        if path.startswith("/shipments/"): return self.detail(user, int(path.split("/")[2]))
        if path == "/clients": return self.clients(user)
        if path == "/calculator": return self.calculator(user, q)
        if path == "/hs": return self.hs(user)
        if path == "/export.csv": return self.export_csv(user)
        if path.startswith("/documents/"):
            parts = path.split("/"); return self.document(user, int(parts[2]), parts[3] if len(parts) > 3 else "estimate")
        return self.send_html(layout("Not found", "<h1>404</h1><p>Page not found.</p>"), 404)

    def do_POST(self):
        path = urlparse(self.path).path; data = self.form()
        if path in ("/login", "/signup"):
            email, pw = data.get("email", ""), data.get("pw", "")
            if path == "/signup":
                if len(pw) < 8: return self.send_html(layout("Sign up", "<div class='auth'><div class='err'>Password must be at least 8 characters.</div></div>"), 400)
                try: db.create_user(self.conn, email, data.get("name", "Agent"), pw)
                except Exception as e: return self.send_html(layout("Sign up", f"<div class='auth'><div class='err'>Cannot create account: {esc(e)}</div></div>"), 400)
            user = db.authenticate(self.conn, email, pw)
            if not user: return self.send_html(layout("Sign in", "<div class='auth'><div class='err'>Invalid email or password.</div></div>"), 401)
            tok = db.new_session(self.conn, user["id"])
            return self.redirect("/", {"Set-Cookie": f"session={tok}; HttpOnly; Path=/; SameSite=Lax"})
        if path == "/logout":
            c = cookies.SimpleCookie(self.headers.get("Cookie", "")); m = c.get("session")
            if m: self.conn.execute("DELETE FROM sessions WHERE token_hash=?", (__import__("hashlib").sha256(m.value.encode()).hexdigest(),)); self.conn.commit()
            return self.redirect("/login", {"Set-Cookie": "session=; HttpOnly; Path=/; Max-Age=0"})
        user = self.require()
        if not user: return
        if path == "/shipments":
            errs = validate_shipment(data)
            if data.get("client_id"):
                if not self.conn.execute("SELECT 1 FROM clients WHERE id=?", (data["client_id"],)).fetchone(): errs.append("Client not found.")
            if errs: return self.shipment_form(user, data, errs)
            cols = ["reference","client_id","direction","mode","origin","destination","port","hs_code","description","gross_weight_kg","value","freight","insurance","duty_rate","currency","fx_rate","clearing_fee","disbursement","port_charge","arrival_date","status","priority","notes"] + [k for k, _ in DOC_FIELDS]
            vals = []
            for c in cols:
                v = data.get(c, "0" if c in ("gross_weight_kg","value","freight","insurance","duty_rate","fx_rate","clearing_fee","disbursement","port_charge") else "")
                if c == "client_id": v = int(v)
                if c.startswith("doc_"): v = 1 if data.get(c) else 0
                if c in ("gross_weight_kg","value","freight","insurance","duty_rate","fx_rate","clearing_fee","disbursement","port_charge"): v = float(v or 0)
                vals.append(v)
            cur = self.conn.execute(f"INSERT INTO shipments({','.join(cols)}) VALUES({','.join('?'*len(cols))})", vals); sid = cur.lastrowid
            db.audit(self.conn, user["id"], sid, "create", data.get("reference")); self.conn.commit()
            return self.redirect(f"/shipments/{sid}")
        if path.startswith("/shipments/") and path.endswith("/edit"):
            sid = int(path.split("/")[2]); old = self.get_shipment(sid)
            if not old: return self.send_html(layout("404", "<h1>Not found</h1>"), 404)
            errs = validate_shipment(data)
            if data.get("status") != old["status"] and not can_transition(old["status"], data.get("status", "")): errs.append(f"Invalid status change: {old['status']} → {data.get('status')}. Allowed: {', '.join(TRANSITIONS.get(old['status'],[])) or 'none (terminal)'}")
            if errs: return self.shipment_form(user, data, errs, sid)
            cols = ["reference","client_id","direction","mode","origin","destination","port","hs_code","description","gross_weight_kg","value","freight","insurance","duty_rate","currency","fx_rate","clearing_fee","disbursement","port_charge","arrival_date","status","priority","notes"] + [k for k, _ in DOC_FIELDS]
            vals = []
            for c in cols:
                v = data.get(c, "0" if "weight" in c or c in ("value","freight","insurance","duty_rate","fx_rate","clearing_fee","disbursement","port_charge") else "")
                if c == "client_id": v = int(v)
                if c.startswith("doc_"): v = 1 if data.get(c) else 0
                if c in ("gross_weight_kg","value","freight","insurance","duty_rate","fx_rate","clearing_fee","disbursement","port_charge"): v = float(v or 0)
                vals.append(v)
            vals.append(sid)
            self.conn.execute(f"UPDATE shipments SET {','.join(c+'=?' for c in cols)}, updated=date('now') WHERE id=?", vals)
            db.audit(self.conn, user["id"], sid, "update", f"status {old['status']}->{data.get('status')}"); self.conn.commit()
            return self.redirect(f"/shipments/{sid}")
        if path.startswith("/shipments/") and path.endswith("/status"):
            sid = int(path.split("/")[2]); s = self.get_shipment(sid); new = data.get("status", "")
            if not s: return self.send_html(layout("404", "<h1>Not found</h1>"), 404)
            if not can_transition(s["status"], new): return self.send_html(layout("Error", f"<div class='err'>Cannot move {esc(s['status'])} → {esc(new)}. Allowed: {esc(', '.join(TRANSITIONS.get(s['status'],[])) or 'none')}</div><p><a href='/shipments/{sid}'>Back</a></p>"), 400)
            self.conn.execute("UPDATE shipments SET status=?, updated=date('now') WHERE id=?", (new, sid)); db.audit(self.conn, user["id"], sid, "status", f"{s['status']}->{new}"); self.conn.commit()
            return self.redirect(f"/shipments/{sid}")
        if path.startswith("/shipments/") and path.endswith("/delete"):
            sid = int(path.split("/")[2]); s = self.get_shipment(sid)
            if s: db.audit(self.conn, user["id"], sid, "delete", s["reference"]); self.conn.execute("DELETE FROM shipments WHERE id=?", (sid,)); self.conn.commit()
            return self.redirect("/shipments")
        if path == "/clients":
            if not data.get("name", "").strip(): return self.send_html(layout("Clients", "<div class='err'>Client name is required.</div>"), 400)
            try: self.conn.execute("INSERT INTO clients(name,contact,email,vat_no,address) VALUES(?,?,?,?,?)", (data["name"].strip(), data.get("contact",""), data.get("email",""), data.get("vat_no",""), data.get("address",""))); self.conn.commit()
            except Exception as e: return self.send_html(layout("Clients", f"<div class='err'>{esc(e)}</div>"), 400)
            return self.redirect("/clients")
        return self.send_html(layout("404", "<h1>404</h1>"), 404)

    # pages
    def get_shipment(self, sid):
        r = self.conn.execute("SELECT s.*, c.name client_name FROM shipments s JOIN clients c ON c.id=s.client_id WHERE s.id=?", (sid,)).fetchone()
        return dict(r) if r else None
    def costs_for(self, s):
        hs = self.conn.execute("SELECT * FROM hs_codes WHERE code=?", (s.get("hs_code",""),)).fetchone()
        vat = hs["vat_rate"] if hs else 15
        try: return calculate_costs(value=s["value"], freight=s["freight"], insurance=s["insurance"], duty_rate=s["duty_rate"], vat_rate=vat, clearing_fee=s["clearing_fee"], disbursement=s["disbursement"], port_charge=s["port_charge"], fx_rate=s["fx_rate"])
        except Exception: return None
    def dashboard(self, user):
        rows = [dict(r) for r in self.conn.execute("SELECT s.*, c.name client_name FROM shipments s JOIN clients c ON c.id=s.client_id").fetchall()]
        active = [r for r in rows if r["status"] not in ("DELIVERED", "CANCELLED")]
        overdue = [r for r in rows if is_overdue(r)]
        docs_pending = [r for r in active if not docs_complete(r)]
        total_payable = sum(float(self.costs_for(r)["total_payable_local"]) if self.costs_for(r) else 0 for r in active)
        by_status = {s: sum(1 for r in rows if r["status"] == s) for s in STATUSES}
        cards = "".join(f"<div class='card'><b>{by_status[s]}</b><span>{STATUS_LABELS[s]}</span></div>" for s in STATUSES if by_status[s])
        def mini(lst, title):
            if not lst: return f"<h2>{title}</h2><div class='empty'>None — all clear.</div>"
            lis = "".join(f"<tr><td><a href='/shipments/{r['id']}'>{esc(r['reference'])}</a></td><td>{esc(r['client_name'])}</td><td>{badge(r['status'])}</td><td>{esc(r['arrival_date'])}</td></tr>" for r in lst[:8])
            return f"<h2>{title}</h2><table><tr><th>Ref</th><th>Client</th><th>Status</th><th>Arrival</th></tr>{lis}</table>"
        body = f"<h1>Dashboard</h1><p class='sub'>Welcome, {esc(user['name'])}. Clearance pipeline at a glance. Press <b>/</b> to search.</p><div class='grid'>{cards}<div class='card'><b>{len(rows)}</b><span>Total shipments</span></div><div class='card'><b>{len(overdue)}</b><span>Overdue (&gt;7d)</span></div><div class='card'><b>R{total_payable:,.2f}</b><span>Payable, active (local)</span></div></div>{mini(overdue,'Overdue — needs attention')}{mini(docs_pending,'Documents pending')}<div class='actions'><a class='btn' href='/shipments/new'>New shipment</a><a class='btn btn2' href='/shipments'>All shipments</a></div>"
        self.send_html(layout("Dashboard", body, user))
    def shipments(self, user, q):
        where, args = [], []
        if q.get("q"): where.append("(s.reference LIKE ? OR s.description LIKE ? OR c.name LIKE ?)"); args += [f"%{q['q']}%"]*3
        if q.get("status"): where.append("s.status=?"); args.append(q["status"])
        if q.get("client"): where.append("s.client_id=?"); args.append(q["client"])
        if q.get("mode"): where.append("s.mode=?"); args.append(q["mode"])
        if q.get("direction"): where.append("s.direction=?"); args.append(q["direction"])
        if q.get("overdue") == "1":
            from datetime import date, timedelta
            where.append("s.status IN ('ARRIVED','LODGED','ASSESSED','QUERY') AND s.arrival_date < ?"); args.append((date.today()-timedelta(days=8)).isoformat())
        sql = "SELECT s.*, c.name client_name FROM shipments s JOIN clients c ON c.id=s.client_id" + (f" WHERE {' AND '.join(where)}" if where else "") + " ORDER BY s.arrival_date DESC, s.id DESC"
        rows = [dict(r) for r in self.conn.execute(sql, args).fetchall()]
        clients = self.conn.execute("SELECT * FROM clients ORDER BY name").fetchall()
        def opts(items, cur, val, label): return "".join(f"<option value='{esc(i[val])}' {'selected' if str(i[val])==str(cur) else ''}>{esc(i[label])}</option>" for i in items)
        trs = ""
        for r in rows:
            c = self.costs_for(r); od = " <span class='badge'>OVERDUE</span>" if is_overdue(r) else ""
            trs += f"<tr><td><a href='/shipments/{r['id']}'>{esc(r['reference'])}</a>{od}</td><td>{esc(r['client_name'])}</td><td>{esc(r['direction'])} / {esc(r['mode'])}</td><td>{esc(r['hs_code'])}<br><small>{esc(r['description'][:50])}</small></td><td>{esc(r['arrival_date'])}</td><td>{badge(r['status'])}</td><td>{esc(r['priority'])}</td><td>{c['total_to_client_local'] if c else ''} {esc(r['currency'])}</td></tr>"
        status_opts = ''.join("<option %s value='%s'>%s</option>" % (("selected" if q.get('status')==s else ""), s, STATUS_LABELS[s]) for s in STATUSES)
        mode_opts = ''.join("<option %s>%s</option>" % (("selected" if q.get('mode')==m else ""), m) for m in MODES)
        dir_opts = ''.join("<option %s>%s</option>" % (("selected" if q.get('direction')==m else ""), m) for m in DIRECTIONS)
        body = f"<h1>Shipments <span class='sub'>({len(rows)})</span></h1><form class='toolbar' method='get'><input name='q' placeholder='Search ref / goods / client...' value=\"{esc(q.get('q',''))}\" aria-label='Search'><select name='status' aria-label='Status'><option value=''>All statuses</option>{status_opts}</select><select name='client' aria-label='Client'><option value=''>All clients</option>{opts(clients, q.get('client',''), 'id', 'name')}</select><select name='mode' aria-label='Mode'><option value=''>All modes</option>{mode_opts}</select><select name='direction' aria-label='Direction'><option value=''>All directions</option>{dir_opts}</select><label style='text-transform:none'><input type='checkbox' name='overdue' value='1' {'checked' if q.get('overdue')=='1' else ''} style='width:auto'> Overdue only</label><button>Filter</button><a class='btn btn2' href='/shipments'>Clear</a><a class='btn' href='/shipments/new'>+ New</a></form>"
        body += f"<table><tr><th>Ref</th><th>Client</th><th>Dir / Mode</th><th>HS / Goods</th><th>Arrival</th><th>Status</th><th>Priority</th><th>Total (local)</th></tr>{trs or '<tr><td colspan=8><div class=\"empty\">No shipments match. <a href=\"/shipments/new\">Create one</a>.</div></td></tr>'}</table>"
        self.send_html(layout("Shipments", body, user))
    def shipment_form(self, user, data, errs=None, sid=None):
        clients = self.conn.execute("SELECT * FROM clients ORDER BY name").fetchall()
        hs = self.conn.execute("SELECT * FROM hs_codes ORDER BY code").fetchall()
        if not clients: return self.send_html(layout("New shipment", "<h1>New shipment</h1><div class='err'>Add a client first on the Clients page.</div>"), 400)
        def f(name, label, typ="text", val=None):
            v = data.get(name, val if val is not None else "")
            return f"<div><label for='{name}'>{label}</label><input id='{name}' name='{name}' type='{typ}' value=\"{esc(v)}\"></div>"
        def sel(name, label, options, cur):
            opts_html = ''.join("<option %s>%s</option>" % (("selected" if str(o)==str(cur or '') else ""), esc(o)) for o in options)
            return f"<div><label for='{name}'>{label}</label><select id='{name}' name='{name}'>{opts_html}</select></div>"
        err_html = f"<div class='err'><ul>{''.join(f'<li>{esc(e)}</li>' for e in errs)}</ul></div>" if errs else ""
        docs = "".join(f"<label style='text-transform:none;font-weight:400'><input type='checkbox' name='{k}' {'checked' if data.get(k) else ''} style='width:auto'> {esc(label)}</label><br>" for k, label in DOC_FIELDS)
        mode_label = 'Edit' if sid else 'New'
        action_url = '/shipments/'+str(sid)+'/edit' if sid else '/shipments'
        client_map = ', '.join(str(c['id'])+'='+esc(c['name']) for c in clients)
        hs_map = ', '.join(esc(h['code']) for h in hs)
        today_iso = __import__('datetime').date.today().isoformat()
        body = f"<h1>{mode_label} shipment</h1>{err_html}<form method='post' action=\"{action_url}\" class='form'>{f('reference','Reference *')}{sel('client_id','Client *',[c['id'] for c in clients], data.get('client_id'))}{sel('direction','Direction *',DIRECTIONS, data.get('direction','Import'))}{sel('mode','Mode *',MODES, data.get('mode','Sea'))}{f('origin','Origin')}{f('destination','Destination')}{f('port','Port / Border post')}{f('hs_code','HS Code *')}{f('description','Goods description *')}{f('gross_weight_kg','Gross weight (kg)','number',0)}{f('value','Goods value','number',0)}{f('freight','Freight','number',0)}{f('insurance','Insurance','number',0)}{f('duty_rate','Duty rate (%)','number',0)}{f('currency','Currency','text',data.get('currency','USD'))}{f('fx_rate','FX to local','number',1)}{f('clearing_fee','Clearing fee','number',0)}{f('disbursement','Disbursement','number',0)}{f('port_charge','Port charge','number',0)}{f('arrival_date','Arrival date','date',today_iso)}{sel('status','Status',STATUSES, data.get('status','PRE_ARRIVAL'))}{sel('priority','Priority',['Low','Normal','High'], data.get('priority','Normal'))}<div><label>Documents checklist</label>{docs}</div><div><label for='notes'>Notes</label><textarea id='notes' name='notes'>{esc(data.get('notes',''))}</textarea></div><div class='actions'><button type='submit'>Save shipment</button><a class='btn btn2' href='/shipments'>Cancel</a></div></form><p class='sub'>Client IDs: {client_map} · HS codes: {hs_map}</p>"
        self.send_html(layout("Shipment form", body, user), 400 if errs else 200)
    def detail(self, user, sid):
        s = self.get_shipment(sid)
        if not s: return self.send_html(layout("404", "<h1>Not found</h1>"), 404)
        c = self.costs_for(s)
        docs = "".join(f"<tr><td>{esc(label)}</td><td>{'✓ Received' if s[k] else '— Missing'}</td></tr>" for k, label in DOC_FIELDS)
        nxt = TRANSITIONS.get(s["status"], [])
        nxt_btns = "".join(f"<form method='post' action='/shipments/{sid}/status' style='display:inline'><input type='hidden' name='status' value='{n}'><button type='submit'>→ {STATUS_LABELS[n]}</button></form>" for n in nxt)
        cost_rows = f"<tr><td>CIF (Value+Freight+Insurance)</td><td>{money(c['cif'])} {esc(s['currency'])}</td><td>{money(c['cif_local'])}</td></tr><tr><td>Duty</td><td>{money(c['duty'])}</td><td></td></tr><tr><td>VAT</td><td>{money(c['vat'])}</td><td></td></tr><tr><td>Port / Storage</td><td>{money(s['port_charge']+float(c['storage']))}</td><td></td></tr><tr><td><b>Total payable (customs/port)</b></td><td><b>{money(c['total_payable'])}</b></td><td><b>{money(c['total_payable_local'])}</b></td></tr><tr><td>Agent fees (clearing + disbursement)</td><td>{money(c['agent_fees'])}</td><td></td></tr><tr><td><b>Total to client</b></td><td><b>{money(c['total_to_client'])}</b></td><td><b>{money(c['total_to_client_local'])}</b></td></tr>"
        audits = self.conn.execute("SELECT * FROM audit WHERE shipment_id=? ORDER BY id DESC LIMIT 10", (sid,)).fetchall()
        audit_html = "".join(f"<tr><td>{esc(a['at'])}</td><td>{esc(a['action'])}</td><td>{esc(a['detail'])}</td></tr>" for a in audits) or "<tr><td colspan=3>No audit entries.</td></tr>"
        body = f"<h1>{esc(s['reference'])} {badge(s['status'])}</h1><p class='sub'>{esc(s['client_name'])} · {esc(s['direction'])} · {esc(s['mode'])} · {esc(s['origin'])} → {esc(s['destination'])} ({esc(s['port'])})</p><div class='grid'><div class='card'><b>{esc(s['hs_code'])}</b><span>HS code</span></div><div class='card'><b>{esc(s['arrival_date'] or '—')}</b><span>Arrival</span></div><div class='card'><b>{esc(s['priority'])}</b><span>Priority</span></div><div class='card'><b>{money(s['value'])}</b><span>Goods value {esc(s['currency'])}</span></div></div><h2>Goods</h2><p>{esc(s['description'])} — {money(s['gross_weight_kg'])} kg. {esc(s['notes'])}</p><h2>Cost breakdown</h2><table><tr><th>Item</th><th>{esc(s['currency'])}</th><th>Local (R)</th></tr>{cost_rows}</table><h2>Documents</h2><table>{docs}</table><h2>Move status</h2><div class='actions'>{nxt_btns or '<span class=\"sub\">Terminal status — no further moves.</span>'}</div><h2>Audit trail</h2><table><tr><th>When</th><th>Action</th><th>Detail</th></tr>{audit_html}</table><div class='actions'><a class='btn' href=\"/shipments/{sid}/edit\">Edit</a><a class='btn btn2' href=\"/documents/{sid}/estimate\">Cost estimate (print)</a><a class='btn btn2' href=\"/documents/{sid}/instruction\">Clearing instruction (print)</a><form method='post' action='/shipments/{sid}/delete' onsubmit=\"return confirm('Delete this shipment?')\"><button class='btn2'>Delete</button></form></div>"
        self.send_html(layout(s["reference"], body, user))
    def clients(self, user):
        rows = self.conn.execute("SELECT c.*, COUNT(s.id) n FROM clients c LEFT JOIN shipments s ON s.client_id=c.id GROUP BY c.id ORDER BY c.name").fetchall()
        trs = "".join(f"<tr><td>{esc(r['name'])}</td><td>{esc(r['contact'])}</td><td>{esc(r['email'])}</td><td>{esc(r['vat_no'])}</td><td>{r['n']}</td></tr>" for r in rows)
        client_fields = ''.join("<div><label for='%s'>%s</label><input id='%s' name='%s' %s></div>" % (n, n.replace('_',' ').title(), n, n, ('required' if n=='name' else '')) for n in ('name','contact','email','vat_no','address'))
        empty_clients = '<tr><td colspan=5><div class="empty">No clients yet.</div></td></tr>'
        body = f"<h1>Clients</h1><form method='post' action='/clients' class='form'>{client_fields}<div class='actions'><button>Add client</button></div></form><h2>Existing</h2><table><tr><th>Name</th><th>Contact</th><th>Email</th><th>VAT No</th><th>Shipments</th></tr>{trs or empty_clients}</table>"
        self.send_html(layout("Clients", body, user))
    def calculator(self, user, q):
        result = ""
        if q.get("value"):
            try:
                c = calculate_costs(value=q.get("value",0), freight=q.get("freight",0), insurance=q.get("insurance",0), duty_rate=q.get("duty_rate",0), vat_rate=q.get("vat_rate",15), clearing_fee=q.get("clearing_fee",0), disbursement=q.get("disbursement",0), port_charge=q.get("port_charge",0), fx_rate=q.get("fx_rate",1))
                result = f"<h2>Result</h2><table><tr><td>CIF</td><td>{money(c['cif'])}</td></tr><tr><td>Duty</td><td>{money(c['duty'])}</td></tr><tr><td>VAT</td><td>{money(c['vat'])}</td></tr><tr><td>Total payable</td><td><b>{money(c['total_payable'])}</b></td></tr><tr><td>Total to client</td><td><b>{money(c['total_to_client'])}</b></td></tr><tr><td>Total payable (local)</td><td><b>{money(c['total_payable_local'])}</b></td></tr></table>"
            except Exception as e: result = f"<div class='err'>{esc(e)}</div>"
        fields = ["value","freight","insurance","duty_rate","vat_rate","clearing_fee","disbursement","port_charge","fx_rate"]
        fields = ["value","freight","insurance","duty_rate","vat_rate","clearing_fee","disbursement","port_charge","fx_rate"]
        calc_inputs = ''.join("<div><label for='%s'>%s</label><input id='%s' name='%s' type='number' step='0.01' value=\"%s\"></div>" % (n, n.replace('_',' ').title(), n, n, esc(q.get(n,''))) for n in fields)
        hs_rows = ''.join("<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>" % (esc(r['code']), esc(r['description']), r['duty_rate'], r['vat_rate']) for r in self.conn.execute('SELECT * FROM hs_codes ORDER BY code').fetchall())
        body = f"<h1>Duty &amp; VAT Calculator</h1><p class='sub'>CIF = Value+Freight+Insurance · Duty = CIF×rate · VAT = (CIF+Duty+Port)×VAT%</p><form class='form' method='get'>{calc_inputs}<div class='actions'><button>Calculate</button></div></form>{result}<h2>HS rates</h2><table><tr><th>Code</th><th>Description</th><th>Duty %</th><th>VAT %</th></tr>{hs_rows}</table>"
        self.send_html(layout("Calculator", body, user))
    def hs(self, user):
        rows = self.conn.execute("SELECT * FROM hs_codes ORDER BY code").fetchall()
        hs_rows2 = ''.join("<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>" % (esc(r['code']), esc(r['description']), r['duty_rate'], r['vat_rate'], r['levy']) for r in rows)
        body = f"<h1>HS Code Tariff</h1><table><tr><th>Code</th><th>Description</th><th>Duty %</th><th>VAT %</th><th>Levy</th></tr>{hs_rows2}</table>"
        self.send_html(layout("HS Codes", body, user))
    def export_csv(self, user):
        rows = self.conn.execute("SELECT s.*, c.name client FROM shipments s JOIN clients c ON c.id=s.client_id ORDER BY s.id").fetchall()
        out = io.StringIO(); w = csv.writer(out); w.writerow(["reference","client","direction","mode","status","hs_code","description","value","currency","arrival_date"])
        for r in rows: w.writerow([r["reference"], r["client"], r["direction"], r["mode"], r["status"], r["hs_code"], r["description"], r["value"], r["currency"], r["arrival_date"]])
        b = out.getvalue().encode(); self.send_response(200); self.send_header("Content-Type","text/csv"); self.send_header("Content-Disposition","attachment; filename=shipments.csv"); self.send_header("Content-Length",str(len(b))); self.end_headers(); self.wfile.write(b)
    def document(self, user, sid, kind):
        s = self.get_shipment(sid)
        if not s: return self.send_html(layout("404","<h1>Not found</h1>"),404)
        c = self.costs_for(s)
        title = "COST ESTIMATE" if kind == "estimate" else "CLEARING INSTRUCTION"
        rows = f"<tr><td>Client</td><td>{esc(s['client_name'])}</td></tr><tr><td>Reference</td><td>{esc(s['reference'])}</td></tr><tr><td>Route</td><td>{esc(s['origin'])} → {esc(s['destination'])} via {esc(s['port'])}</td></tr><tr><td>HS / Goods</td><td>{esc(s['hs_code'])} — {esc(s['description'])}</td></tr><tr><td>Weight / Value</td><td>{money(s['gross_weight_kg'])} kg / {money(s['value'])} {esc(s['currency'])}</td></tr><tr><td>CIF</td><td>{money(c['cif'])} {esc(s['currency'])}</td></tr><tr><td>Duty</td><td>{money(c['duty'])}</td></tr><tr><td>VAT</td><td>{money(c['vat'])}</td></tr><tr><td>Total payable</td><td><b>{money(c['total_payable'])} {esc(s['currency'])} (R{money(c['total_payable_local'])})</b></td></tr><tr><td>Total to client</td><td><b>{money(c['total_to_client'])} {esc(s['currency'])} (R{money(c['total_to_client_local'])})</b></td></tr><tr><td>Status</td><td>{STATUS_LABELS.get(s['status'])}</td></tr>"
        docs = ", ".join(label for k, label in DOC_FIELDS if s[k]) or "None received"
        body = f"<div class='print'><h1>Clearline Ops — {title}</h1><p>Generated {__import__('datetime').date.today().isoformat()} · Ref {esc(s['reference'])}</p><table>{rows}</table><p><b>Documents received:</b> {esc(docs)}</p><p><b>Notes:</b> {esc(s['notes'])}</p><p>Signature: ______________________ &nbsp; Date: ____________</p><div class='actions noprint'><button onclick='window.print()'>Print / Save as PDF</button><a class='btn btn2' href='/shipments/{sid}'>Back</a></div></div>"
        self.send_html(layout(title, body, user))

def create_server(host="127.0.0.1", port=8000, db_path="data/clearline.db"):
    from http.server import ThreadingHTTPServer
    conn = db.connect(db_path); db.seed(conn)
    Handler.conn = conn; Handler.db_path = db_path
    return ThreadingHTTPServer((host, port), Handler)
