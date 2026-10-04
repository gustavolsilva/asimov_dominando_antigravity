"""Servidor da landing page FIZZ — Python puro (stdlib) + SQLite."""
import json
import re
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

BASE = Path(__file__).parent
STATIC = BASE / "static"
DB = BASE / "reservas.db"
TYPES = {".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript"}


def init_db():
    with sqlite3.connect(DB) as con:
        con.execute(
            """CREATE TABLE IF NOT EXISTS reservas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                celular TEXT NOT NULL,
                criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )"""
        )


class Handler(BaseHTTPRequestHandler):
    def _json(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/":
            path = "/index.html"
        f = (STATIC / path.lstrip("/")).resolve()
        if STATIC.resolve() not in f.parents or not f.is_file():
            return self._json(404, {"erro": "Não encontrado"})
        body = f.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", TYPES.get(f.suffix, "application/octet-stream"))
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != "/api/reservar":
            return self._json(404, {"erro": "Não encontrado"})
        try:
            size = int(self.headers.get("Content-Length", 0))
            d = json.loads(self.rfile.read(min(size, 10_000)))
        except (ValueError, json.JSONDecodeError):
            return self._json(400, {"erro": "Requisição inválida"})

        nome = str(d.get("nome", "")).strip()
        email = str(d.get("email", "")).strip().lower()
        celular = re.sub(r"\D", "", str(d.get("celular", "")))

        if len(nome.split()) < 2:
            return self._json(400, {"erro": "Informe o nome completo."})
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
            return self._json(400, {"erro": "E-mail inválido."})
        if not 10 <= len(celular) <= 11:
            return self._json(400, {"erro": "Celular inválido (use DDD + número)."})

        try:
            with sqlite3.connect(DB) as con:
                con.execute(
                    "INSERT INTO reservas (nome, email, celular) VALUES (?, ?, ?)",
                    (nome, email, celular),
                )
        except sqlite3.IntegrityError:
            return self._json(409, {"erro": "Este e-mail já está na lista!"})
        self._json(201, {"ok": True})


if __name__ == "__main__":
    init_db()
    print("FIZZ rodando em http://localhost:8000")
    ThreadingHTTPServer(("0.0.0.0", 8000), Handler).serve_forever()
