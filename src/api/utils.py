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
    """Custom validation error"""
    pass


def validate_image_file(filename: str, content_type: str) -> None:
    """
    Validate that a file is an acceptable image
    """
    if not content_type or not content_type.startswith('image/'):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Expected: image/*, received: {content_type}"
        )

    from pathlib import Path
    ext = Path(filename).suffix.lower()

    # ✅ Si pas d'extension : on accepte (le contenu sera vérifié via PIL ensuite)
    if ext == '':
        return

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported extension: {ext}. Allowed extensions: {', '.join(ALLOWED_EXTENSIONS)}"
        )


def validate_image_content(content: bytes) -> Image.Image:
    """
    Validate and load image content
    """
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum: {MAX_FILE_SIZE / (1024*1024):.0f} MB"
        )

    try:
        image = Image.open(io.BytesIO(content))
        image.verify()

        image = Image.open(io.BytesIO(content))
        return image

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Corrupted or invalid image: {str(e)}"
        )


def validate_image_dimensions(image: Image.Image) -> None:
    """
    Validate image dimensions
    """
    width, height = image.size

    if width < 50 or height < 50:
        raise HTTPException(
            status_code=400,
            detail=f"Image too small: {width}x{height}. Minimum: 50x50 pixels"
        )

    if width > 4096 or height > 4096:
        raise HTTPException(
            status_code=400,
            detail=f"Image too large: {width}x{height}. Maximum: 4096x4096 pixels"
        )


def format_error_response(error: Exception, detail: str = None) -> dict:
    """
    Format an error response
    """
    return {
        "error": error.__class__.__name__,
        "message": str(error),
        "detail": detail
    }