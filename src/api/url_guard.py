"""
Validation des URLs distantes (protection SSRF)

Utilisé par /predict/video/url : toute URL fournie par un client doit être
validée AVANT qu'une connexion sortante ne soit ouverte. La validation porte
sur le schéma puis sur les adresses IP réellement résolues par le DNS, afin de
bloquer les cibles internes (loopback, réseaux privés, link-local/métadonnées
cloud).
"""

import ipaddress
import socket
from typing import List
from urllib.parse import urlparse

from .logger import logger


ALLOWED_SCHEMES = {"http", "https"}

# Nombre maximum de redirections suivies (chacune est revalidée)
MAX_REDIRECTS = 3


class BlockedURLError(Exception):
    """URL rejetée par la validation SSRF."""

    def __init__(self, reason: str):
        self.reason = reason
        super().__init__(reason)


def _is_blocked_ip(ip: ipaddress._BaseAddress) -> bool:
    """
    Vrai si l'IP appartient à une plage non routable publiquement.

    Couvre 127.0.0.0/8, ::1 (loopback), 10/8, 172.16/12, 192.168/16 (privé),
    169.254.0.0/16 et fe80::/10 (link-local, dont 169.254.169.254 utilisé par
    les services de métadonnées cloud), ainsi que les plages réservées,
    multicast et non spécifiées.
    """
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
    )


def _resolve_host(host: str) -> List[ipaddress._BaseAddress]:
    """
    Résout un nom d'hôte en toutes ses adresses IP (A et AAAA).

    Si l'hôte est déjà une IP littérale, elle est renvoyée telle quelle sans
    passer par le résolveur.
    """
    try:
        return [ipaddress.ip_address(host)]
    except ValueError:
        pass

    try:
        infos = socket.getaddrinfo(host, None, proto=socket.IPPROTO_TCP)
    except socket.gaierror as exc:
        raise BlockedURLError(f"DNS resolution failed for host: {host}") from exc

    resolved = []
    for info in infos:
        try:
            resolved.append(ipaddress.ip_address(info[4][0]))
        except ValueError:
            continue

    if not resolved:
        raise BlockedURLError(f"No usable IP address for host: {host}")

    return resolved


def validate_public_url(url: str) -> str:
    """
    Valide une URL avant toute requête sortante.

    Rejette :
      - les schémas autres que http/https (file://, gopher://, ftp://, ...)
      - les URLs sans hôte
      - les hôtes dont *au moins une* IP résolue est privée/loopback/link-local

    Toutes les IP résolues sont vérifiées : un hôte qui répond à la fois une
    IP publique et une IP interne est rejeté (protection contre le DNS
    rebinding le plus simple).

    Returns:
        L'URL validée.

    Raises:
        BlockedURLError: si l'URL est refusée.
    """
    if not url or not isinstance(url, str):
        raise BlockedURLError("Missing or invalid URL")

    parsed = urlparse(url.strip())

    if parsed.scheme.lower() not in ALLOWED_SCHEMES:
        raise BlockedURLError(
            f"Unsupported URL scheme: {parsed.scheme or '(none)'}. "
            f"Allowed: {', '.join(sorted(ALLOWED_SCHEMES))}"
        )

    host = parsed.hostname
    if not host:
        raise BlockedURLError("URL has no host")

    for ip in _resolve_host(host):
        if _is_blocked_ip(ip):
            raise BlockedURLError(
                f"URL resolves to a non-public address ({ip}) and was blocked"
            )

    return url


def validate_redirect_target(url: str) -> str:
    """
    Valide la cible d'une redirection.

    Identique à validate_public_url : chaque saut est revalidé pour empêcher
    qu'un domaine public ne redirige vers une adresse interne.
    """
    validated = validate_public_url(url)
    logger.info(f"Redirect target validated: {url}")
    return validated
