import pytesseract
from PIL import Image, ImageFilter, ImageEnhance
import io
import os
import uuid
from datetime import datetime
from app.config import get_settings

settings = get_settings()


def save_image(image_data: bytes, filename: str | None = None) -> str:
    """Guarda a imagem do talão e retorna o caminho."""
    os.makedirs(settings.images_path, exist_ok=True)
    if not filename:
        filename = f"{uuid.uuid4().hex}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
    path = os.path.join(settings.images_path, filename)
    with open(path, "wb") as f:
        f.write(image_data)
    return path


def preprocess_image(image: Image.Image) -> Image.Image:
    """Pré-processa a imagem para melhorar o OCR."""
    # Converter para escala de cinzas
    image = image.convert("L")
    # Aumentar contraste
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(2.0)
    # Aumentar nitidez
    image = image.filter(ImageFilter.SHARPEN)
    # Redimensionar se muito pequena (mínimo 1000px de largura)
    if image.width < 1000:
        ratio = 1000 / image.width
        image = image.resize(
            (int(image.width * ratio), int(image.height * ratio)),
            Image.LANCZOS
        )
    return image


def extract_text(image_data: bytes) -> str:
    """Extrai texto de uma imagem usando Tesseract OCR."""
    image = Image.open(io.BytesIO(image_data))
    image = preprocess_image(image)
    # Configuração Tesseract: PSM 6 = bloco uniforme de texto
    config = "--psm 6 --oem 3"
    text = pytesseract.image_to_string(image, lang="por+eng", config=config)
    return text.strip()


def get_tesseract_version() -> str:
    """Retorna a versão do Tesseract instalada."""
    try:
        return pytesseract.get_tesseract_version().vstring
    except Exception:
        return "desconhecida"
