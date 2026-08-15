"""
Tests de la protection SSRF sur /predict/video/url

Objectif : vérifier que les URLs internes sont rejetées AVANT toute connexion
sortante. Les tests ne se contentent donc pas de constater un rejet — ils
instrumentent la couche socket pour prouver qu'aucune connexion n'a été
tentée.
"""

import socket
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.api.url_guard import (  # noqa: E402
    BlockedURLError,
    validate_public_url,
    validate_redirect_target,
)


# ── Cibles internes qui doivent toutes être rejetées ────────────────────────

BLOCKED_URLS = [
    # Loopback
    "http://127.0.0.1/video.mp4",
    "http://127.0.0.1:7860/health.mp4",
    "http://localhost:7860/video.mp4",
    "http://[::1]:7860/admin.mp4",
    # Link-local / métadonnées cloud
    "http://169.254.169.254/latest/meta-data/iam/security-credentials/x.mp4",
    "http://169.254.169.254/video.mp4",
    # Réseaux privés
    "http://10.0.0.5/internal.mp4",
    "http://172.16.0.1/internal.mp4",
    "http://192.168.1.1/internal.mp4",
    # Non spécifié
    "http://0.0.0.0/video.mp4",
]

BLOCKED_SCHEMES = [
    "file:///etc/passwd.mp4",
    "gopher://127.0.0.1:7860/_video.mp4",
    "ftp://192.168.1.1/video.mp4",
    "data:video/mp4;base64,AAAA",
]


class SocketGuard:
    """
    Remplace socket.socket et socket.getaddrinfo pour détecter toute
    tentative de connexion sortante réelle pendant un test.
    """

    def __init__(self):
        self.connection_attempts = []
        self._real_socket = socket.socket

    def __enter__(self):
        guard = self

        class _TrackingSocket(guard._real_socket):
            def connect(self, address):
                guard.connection_attempts.append(address)
                raise AssertionError(
                    f"Outbound connection attempted to {address} — "
                    "validation should have blocked it first"
                )

            def connect_ex(self, address):
                guard.connection_attempts.append(address)
                raise AssertionError(
                    f"Outbound connection attempted to {address} — "
                    "validation should have blocked it first"
                )

        socket.socket = _TrackingSocket
        return self

    def __exit__(self, *exc):
        socket.socket = self._real_socket
        return False


@pytest.mark.parametrize("url", BLOCKED_URLS)
def test_internal_addresses_are_blocked(url):
    """Les adresses loopback/privées/link-local sont rejetées."""
    with pytest.raises(BlockedURLError):
        validate_public_url(url)


@pytest.mark.parametrize("url", BLOCKED_URLS)
def test_internal_addresses_blocked_before_any_connection(url):
    """
    Le rejet intervient avant toute connexion sortante.

    SocketGuard fait échouer bruyamment le test si une connexion est tentée.
    """
    with SocketGuard() as guard:
        with pytest.raises(BlockedURLError):
            validate_public_url(url)
        assert guard.connection_attempts == [], (
            f"Connection attempted before validation for {url}"
        )


@pytest.mark.parametrize("url", BLOCKED_SCHEMES)
def test_non_http_schemes_are_blocked(url):
    """file://, gopher://, ftp://, data: sont rejetés."""
    with SocketGuard() as guard:
        with pytest.raises(BlockedURLError):
            validate_public_url(url)
        assert guard.connection_attempts == []


def test_redirect_to_private_ip_is_blocked():
    """
    Une redirection vers une IP privée est rejetée avant d'être suivie.

    C'est le contournement classique : un domaine public renvoie un 302 vers
    169.254.169.254 ou 127.0.0.1.
    """
    for target in (
        "http://169.254.169.254/latest/meta-data/",
        "http://127.0.0.1:7860/internal",
        "http://10.0.0.5/internal.mp4",
    ):
        with SocketGuard() as guard:
            with pytest.raises(BlockedURLError):
                validate_redirect_target(target)
            assert guard.connection_attempts == []


def test_url_without_host_is_blocked():
    with pytest.raises(BlockedURLError):
        validate_public_url("http:///video.mp4")


def test_empty_url_is_blocked():
    for bad in ("", None, 12345):
        with pytest.raises(BlockedURLError):
            validate_public_url(bad)


def test_hostname_resolving_to_loopback_is_blocked(monkeypatch):
    """
    Un domaine d'apparence publique dont le DNS pointe vers une IP interne
    est rejeté (DNS rebinding simple).
    """

    def fake_getaddrinfo(host, *args, **kwargs):
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 0))]

    monkeypatch.setattr(socket, "getaddrinfo", fake_getaddrinfo)

    with pytest.raises(BlockedURLError, match="non-public address"):
        validate_public_url("http://evil.example.com/video.mp4")


def test_public_url_is_allowed(monkeypatch):
    """Une URL publique légitime passe la validation."""

    def fake_getaddrinfo(host, *args, **kwargs):
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 0))]

    monkeypatch.setattr(socket, "getaddrinfo", fake_getaddrinfo)

    url = "https://example.com/video.mp4"
    assert validate_public_url(url) == url


def test_mixed_resolution_is_blocked(monkeypatch):
    """
    Si un hôte résout vers une IP publique ET une IP interne, il est rejeté.
    """

    def fake_getaddrinfo(host, *args, **kwargs):
        return [
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 0)),
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("169.254.169.254", 0)),
        ]

    monkeypatch.setattr(socket, "getaddrinfo", fake_getaddrinfo)

    with pytest.raises(BlockedURLError):
        validate_public_url("http://sneaky.example.com/video.mp4")
