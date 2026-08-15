"""
Tests de /predict/image/url

Le nouvel endpoint télécharge une image côté serveur : il constitue donc une
seconde surface SSRF, au même titre que /predict/video/url. Ces tests
vérifient que les mêmes cibles internes y sont bloquées, et qu'aucune
connexion sortante n'est ouverte avant le rejet.
"""

import socket
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


# ── Cibles internes : identiques à celles couvertes pour la vidéo ───────────

BLOCKED_URLS = [
    # Loopback
    "http://127.0.0.1/photo.jpg",
    "http://127.0.0.1:7860/health.jpg",
    "http://localhost:7860/photo.jpg",
    "http://[::1]:7860/photo.jpg",
    # Link-local / métadonnées cloud
    "http://169.254.169.254/latest/meta-data/iam/security-credentials/x.jpg",
    "http://169.254.169.254/photo.jpg",
    # Réseaux privés
    "http://10.0.0.5/internal.jpg",
    "http://172.16.0.1/internal.jpg",
    "http://192.168.1.1/internal.jpg",
    # Non spécifié
    "http://0.0.0.0/photo.jpg",
]

BLOCKED_SCHEMES = [
    "file:///etc/passwd.jpg",
    "gopher://127.0.0.1:7860/_photo.jpg",
    "ftp://192.168.1.1/photo.jpg",
    "data:image/png;base64,iVBORw0KGgo=",
]


class SocketGuard:
    """
    Détecte toute tentative de connexion sortante pendant un test.

    On instrumente la couche HTTP sortante (httpx.AsyncClient.send) plutôt que
    socket.socket : TestClient utilise lui-même des sockets en interne pour
    piloter l'application, et les remplacer globalement casserait le harnais
    de test au lieu de mesurer ce qui nous intéresse.

    Toute requête sortante réellement émise par l'endpoint passe par
    httpx.AsyncClient.send ; si la validation SSRF fait son travail, cette
    méthode n'est jamais atteinte.
    """

    def __init__(self):
        self.connection_attempts = []

    def __enter__(self):
        import httpx

        guard = self
        self._real_send = httpx.AsyncClient.send

        async def _tracking_send(client_self, request, *args, **kwargs):
            guard.connection_attempts.append(str(request.url))
            raise AssertionError(
                f"Outbound request attempted to {request.url} — "
                "validation should have blocked it first"
            )

        httpx.AsyncClient.send = _tracking_send
        self._patched = httpx.AsyncClient
        return self

    def __exit__(self, *exc):
        import httpx

        httpx.AsyncClient.send = self._real_send
        return False


@pytest.fixture(scope="module")
def client():
    """TestClient avec le modèle stubbé (aucun checkpoint chargé)."""
    from fastapi.testclient import TestClient

    with patch("huggingface_hub.hf_hub_download"):
        import src.api.main as main

        with patch.object(main, "get_predictor"):
            yield TestClient(main.app, raise_server_exceptions=False)


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """
    Réinitialise le compteur slowapi entre les tests : sans cela, les
    requêtes s'accumulent et les derniers tests reçoivent des 429.
    """
    import src.api.main as main

    try:
        main.limiter.reset()
    except Exception:
        storage = getattr(main.limiter, "_storage", None)
        if storage is not None and hasattr(storage, "storage"):
            storage.storage.clear()
    yield


# ── SSRF ───────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("url", BLOCKED_URLS)
def test_internal_addresses_are_rejected(client, url):
    """Les adresses loopback/privées/link-local sont rejetées en 400."""
    r = client.post("/predict/image/url", json={"url": url})
    assert r.status_code == 400
    assert r.json()["detail"] == "The provided URL is not allowed."


@pytest.mark.parametrize("url", BLOCKED_URLS)
def test_internal_addresses_blocked_before_any_connection(client, url):
    """Le rejet intervient avant toute connexion sortante."""
    with SocketGuard() as guard:
        r = client.post("/predict/image/url", json={"url": url})
        assert r.status_code == 400
        assert guard.connection_attempts == [], (
            f"Connection attempted before validation for {url}"
        )


@pytest.mark.parametrize("url", BLOCKED_SCHEMES)
def test_non_http_schemes_are_rejected(client, url):
    """file://, gopher://, ftp://, data: sont rejetés sans connexion."""
    with SocketGuard() as guard:
        r = client.post("/predict/image/url", json={"url": url})
        assert r.status_code == 400
        assert r.json()["detail"] == "The provided URL is not allowed."
        assert guard.connection_attempts == []


def test_redirect_to_private_ip_is_blocked(client):
    """
    Une redirection vers une IP privée est rejetée avant d'être suivie.

    Le domaine de départ résout vers une IP publique, puis renvoie un 302
    vers une adresse interne : c'est le contournement classique d'une simple
    allowlist de domaines.
    """
    import httpx

    redirect_targets = [
        "http://169.254.169.254/latest/meta-data/",
        "http://127.0.0.1:7860/internal.jpg",
        "http://10.0.0.5/internal.jpg",
    ]

    for target in redirect_targets:
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(302, headers={"location": target})

        transport = httpx.MockTransport(handler)
        real_client = httpx.AsyncClient

        def fake_client(*args, **kwargs):
            kwargs["transport"] = transport
            return real_client(*args, **kwargs)

        with patch("src.api.main.validate_public_url", side_effect=lambda u: u):
            with patch("httpx.AsyncClient", fake_client):
                r = client.post(
                    "/predict/image/url",
                    json={"url": "https://public.example.com/photo.jpg"},
                )

        assert r.status_code == 400, f"redirect to {target} was not rejected"
        assert r.json()["detail"] == "The provided URL is not allowed."


def test_missing_url_field_is_rejected(client):
    r = client.post("/predict/image/url", json={})
    assert r.status_code == 422


def test_empty_url_is_rejected(client):
    r = client.post("/predict/image/url", json={"url": ""})
    assert r.status_code == 400


# ── Comportement fonctionnel ───────────────────────────────────────────────

def test_oversized_image_is_rejected_by_declared_length(client):
    """Une taille annoncée au-delà de 10 Mo est rejetée sans téléchargement."""
    import httpx

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            headers={"content-type": "image/jpeg", "content-length": str(50 * 1024 * 1024)},
            content=b"x" * 10,
        )

    transport = httpx.MockTransport(handler)
    real_client = httpx.AsyncClient

    def fake_client(*args, **kwargs):
        kwargs["transport"] = transport
        return real_client(*args, **kwargs)

    with patch("src.api.main.validate_public_url", side_effect=lambda u: u):
        with patch("httpx.AsyncClient", fake_client):
            r = client.post(
                "/predict/image/url",
                json={"url": "https://public.example.com/big.jpg"},
            )

    assert r.status_code == 400
    assert "too large" in r.json()["detail"].lower()


def test_non_image_content_is_rejected(client):
    """Un contenu qui n'est pas une image est rejeté même si l'URL finit .jpg."""
    import httpx

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            headers={"content-type": "image/jpeg"},
            content=b"<!DOCTYPE html><html>not an image</html>",
        )

    transport = httpx.MockTransport(handler)
    real_client = httpx.AsyncClient

    def fake_client(*args, **kwargs):
        kwargs["transport"] = transport
        return real_client(*args, **kwargs)

    with patch("src.api.main.validate_public_url", side_effect=lambda u: u):
        with patch("httpx.AsyncClient", fake_client):
            r = client.post(
                "/predict/image/url",
                json={"url": "https://public.example.com/fake.jpg"},
            )

    assert r.status_code == 400
    assert "image" in r.json()["detail"].lower()


def test_remote_error_status_is_reported(client):
    """Un 404 distant est signalé en 400 sans détail interne."""
    import httpx

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404)

    transport = httpx.MockTransport(handler)
    real_client = httpx.AsyncClient

    def fake_client(*args, **kwargs):
        kwargs["transport"] = transport
        return real_client(*args, **kwargs)

    with patch("src.api.main.validate_public_url", side_effect=lambda u: u):
        with patch("httpx.AsyncClient", fake_client):
            r = client.post(
                "/predict/image/url",
                json={"url": "https://public.example.com/missing.jpg"},
            )

    assert r.status_code == 400
    assert "404" in r.json()["detail"]
