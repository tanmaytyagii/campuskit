"""CSRF protection, escaping, security headers and error pages."""

from conftest import csrf_from, make_app, post_form


def test_post_without_a_csrf_token_is_refused(client):
    response = client.post("/students/new", data={"roll_number": "25CS300"})
    assert response.status_code == 400
    assert "The form expired" in response.get_data(as_text=True)


def test_post_with_a_wrong_csrf_token_is_refused(client):
    csrf_from(client, "/students/new")
    response = client.post("/students/1/delete", data={"csrf_token": "guessed"})
    assert response.status_code == 400
    assert client.get("/students/1").status_code == 200


def test_names_are_escaped_not_run_as_html(client):
    post_form(
        client,
        "/students/new",
        {
            "roll_number": "25CS301",
            "first_name": "<script>alert(1)</script>",
            "last_name": "Test",
            "class_name": "BCA 1-C",
            "admission_date": "2025-07-15",
            "status": "active",
        },
    )
    page = client.get("/students/?q=25CS301").get_data(as_text=True)
    assert "<script>alert(1)</script>" not in page
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in page


def test_security_headers(client):
    response = client.get("/")
    assert "script-src 'none'" in response.headers["Content-Security-Policy"]
    assert "frame-ancestors 'none'" in response.headers["Content-Security-Policy"]
    assert response.headers["X-Content-Type-Options"] == "nosniff"


def test_session_cookie_settings(app):
    assert app.config["SESSION_COOKIE_HTTPONLY"] is True
    assert app.config["SESSION_COOKIE_SAMESITE"] == "Lax"
    assert app.config["DEBUG"] is False


def test_unknown_pages_and_methods(client):
    assert client.get("/students/99999").status_code == 404
    assert "This page doesn’t exist" in client.get("/no-such-page").get_data(as_text=True)
    assert client.delete("/students/1").status_code == 405


def test_get_never_deletes(client):
    client.get("/students/1/delete")
    assert client.get("/students/1").status_code == 200


def test_requests_must_name_this_computer(tmp_path, monkeypatch):
    # DNS rebinding: a website points a name it controls at 127.0.0.1 to reach the app.
    monkeypatch.setenv("HOST", "127.0.0.1")
    client = make_app(tmp_path).test_client()
    assert client.get("/", headers={"Host": "127.0.0.1:5000"}).status_code == 200
    assert client.get("/", headers={"Host": "localhost:5000"}).status_code == 200
    refused = client.get("/students/", headers={"Host": "rebind.example:5000"})
    assert refused.status_code == 400
    assert refused.get_data(as_text=True) == "Open this app with 127.0.0.1 or localhost in the address."
    assert "script-src 'none'" in refused.headers["Content-Security-Policy"]
    deleting = client.post("/students/1/delete", headers={"Host": "rebind.example:5000"})
    assert deleting.status_code == 400
    assert client.get("/nowhere", headers={"Host": "rebind.example"}).status_code == 400
    assert client.get("/students/1").status_code == 200


def test_any_name_is_accepted_when_listening_on_the_network(tmp_path, monkeypatch):
    monkeypatch.setenv("HOST", "0.0.0.0")
    client = make_app(tmp_path).test_client()
    assert client.get("/", headers={"Host": "192.168.1.20:5000"}).status_code == 200
