"""
Utilities pour l'API DeepGuard
"""

from fastapi import HTTPException
from PIL import Image
import io


# Extensions d'images supportées
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


class ValidationError(Exception):
    """Erreur de validation personnalisée"""
    pass


def validate_image_file(filename: str, content_type: str) -> None:
    """
    Valide qu'un fichier est une image acceptable

    IMPORTANT:
    - Avant: l'extension était obligatoire.
    - Maintenant: si content_type est image/*, on accepte même si pas d'extension
      (car les URLs/CDN renvoient parfois un filename sans .jpg/.png).
    """
    if not content_type or not content_type.startswith('image/'):
        raise HTTPException(
            status_code=400,
            detail=f"Type de fichier non supporté. Attendu: image/*, reçu: {content_type}"
        )

    from pathlib import Path
    ext = Path(filename).suffix.lower()

    # ✅ Si pas d'extension : on accepte (le contenu sera vérifié via PIL ensuite)
    if ext == '':
        return

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Extension non supportée: {ext}. Extensions autorisées: {', '.join(ALLOWED_EXTENSIONS)}"
        )


def validate_image_content(content: bytes) -> Image.Image:
    """
    Valide et charge le contenu d'une image
    """
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Fichier trop volumineux. Maximum: {MAX_FILE_SIZE / (1024*1024):.0f} MB"
        )

    try:
        image = Image.open(io.BytesIO(content))
        image.verify()

        image = Image.open(io.BytesIO(content))
        return image

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Image corrompue ou invalide: {str(e)}"
        )


def validate_image_dimensions(image: Image.Image) -> None:
    """
    Valide les dimensions d'une image
    """
    width, height = image.size

    if width < 50 or height < 50:
        raise HTTPException(
            status_code=400,
            detail=f"Image trop petite: {width}x{height}. Minimum: 50x50 pixels"
        )

    if width > 4096 or height > 4096:
        raise HTTPException(
            status_code=400,
            detail=f"Image trop grande: {width}x{height}. Maximum: 4096x4096 pixels"
        )


def format_error_response(error: Exception, detail: str = None) -> dict:
    """
    Formate une réponse d'erreur
    """
    return {
        "error": error.__class__.__name__,
        "message": str(error),
        "detail": detail
    }