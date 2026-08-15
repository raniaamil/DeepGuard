"""
Utilities pour l'API DeepGuard
"""

from fastapi import HTTPException, UploadFile
from PIL import Image
import io


# Extensions d'images supportées
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# Taille des blocs lus lors de la lecture en flux
CHUNK_SIZE = 1024 * 1024  # 1 MB


async def read_upload_limited(file: UploadFile, max_bytes: int) -> bytes:
    """
    Lit un UploadFile en flux en s'arrêtant dès que la limite est dépassée.

    `await file.read()` sans argument charge l'intégralité du fichier en
    mémoire avant tout contrôle de taille : un upload volumineux est donc
    absorbé en RAM avant d'être rejeté. Cette fonction lit par blocs et
    abandonne dès le dépassement, sans jamais conserver plus de
    max_bytes + CHUNK_SIZE octets.

    Le Content-Length déclaré est vérifié en amont quand il est disponible,
    ce qui évite de lire quoi que ce soit dans le cas courant.

    Args:
        file: fichier uploadé
        max_bytes: taille maximale autorisée

    Returns:
        Le contenu du fichier.

    Raises:
        HTTPException 413: si le fichier dépasse la limite.
    """
    limit_mb = max_bytes / (1024 * 1024)

    # Rejet immédiat si le client annonce une taille excessive
    declared = getattr(file, "size", None)
    if declared is not None and declared > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large: {declared / (1024 * 1024):.1f}MB. Maximum: {limit_mb:.0f}MB"
        )

    chunks = []
    total = 0

    while True:
        chunk = await file.read(CHUNK_SIZE)
        if not chunk:
            break

        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum: {limit_mb:.0f}MB"
            )

        chunks.append(chunk)

    return b"".join(chunks)


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

    # Si pas d'extension : on accepte (le contenu sera vérifié via PIL)
    if ext == '':
        return

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported extension: {ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
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

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Corrupted or invalid image file."
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


def validate_video_content(content: bytes) -> str:
    """
    Valide qu'un contenu est réellement un conteneur vidéo supporté.

    L'extension et le Content-Type sont fournis par le client et ne prouvent
    rien : un fichier arbitraire renommé en .mp4 atteignait jusqu'ici
    directement OpenCV/FFmpeg. Cette fonction inspecte les magic bytes du
    conteneur avant que le fichier ne soit écrit sur disque et décodé.

    Conteneurs reconnus :
      - ISO-BMFF (MP4, MOV, M4V) : boîte 'ftyp' à l'offset 4
      - Matroska / WebM          : EBML 0x1A45DFA3
      - AVI                      : RIFF....AVI␣
      - Ogg                      : OggS

    Args:
        content: premiers octets du fichier (au moins 12)

    Returns:
        Le nom du conteneur détecté.

    Raises:
        HTTPException 400: si aucun conteneur vidéo connu n'est reconnu.
    """
    if len(content) < 12:
        raise HTTPException(
            status_code=400,
            detail="Invalid or corrupted video file."
        )

    header = content[:12]

    # ISO Base Media File Format : taille (4o) + 'ftyp'
    if header[4:8] == b'ftyp':
        return 'mp4'

    # Matroska / WebM : signature EBML
    if header[:4] == b'\x1a\x45\xdf\xa3':
        return 'matroska'

    # AVI : 'RIFF' + taille (4o) + 'AVI '
    if header[:4] == b'RIFF' and header[8:12] == b'AVI ':
        return 'avi'

    # Ogg / Ogv
    if header[:4] == b'OggS':
        return 'ogg'

    raise HTTPException(
        status_code=400,
        detail="File content is not a supported video format "
               "(expected MP4/MOV, WebM/MKV, AVI or Ogg)."
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
