import re
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ParsedItem:
    raw_text: str
    parsed_name: Optional[str] = None
    parsed_quantity: Optional[float] = None
    unit_guess: Optional[str] = None
    original_price: Optional[float] = None
    discount_amount: Optional[float] = None
    effective_price: Optional[float] = None
    is_discount_line: bool = False
    confidence: int = 0


# Padrões de preço portugueses (ex: 1,29 ou 12,99)
PRICE_PATTERN = re.compile(r'(\d{1,4}[.,]\d{2})\s*[A-F]?\s*$')
NEGATIVE_PRICE = re.compile(r'-\s*(\d{1,3}[.,]\d{2})')

# Palavras que indicam linha de desconto/promoção
DISCOUNT_KEYWORDS = [
    'desconto', 'poupança', 'dto', 'poupa', 'oferta',
    'promocao', 'promoção', 'cartao', 'cartão', 'voucher',
    'cashback', 'fidelidade', 'saldo', 'bonus', 'bónus',
]

# Palavras a ignorar (cabeçalho/rodapé do talão)
IGNORE_KEYWORDS = [
    'total', 'subtotal', 'iva', 'troco', 'numerario',
    'multibanco', 'visa', 'mastercard', 'mbway', 'pagamento',
    'obrigado', 'contribuinte', 'nif', 'factura', 'fatura',
    'data', 'hora', 'operador', 'caixa', 'talao', 'talão',
    'www.', 'http', 'tel:', 'nº', 'ref:', 'doc.',
    'deposito', 'depósito', 'saco de papel', 'embalagem',
]

# Unidades comuns em talões portugueses
UNIT_PATTERNS = {
    'kg':  re.compile(r'\b(\d+[.,]?\d*)\s*kg\b', re.IGNORECASE),
    'g':   re.compile(r'\b(\d+[.,]?\d*)\s*g\b', re.IGNORECASE),
    'L':   re.compile(r'\b(\d+[.,]?\d*)\s*[lL]\b'),
    'ml':  re.compile(r'\b(\d+[.,]?\d*)\s*ml\b', re.IGNORECASE),
    'un':  re.compile(r'\b(\d+)\s*[xX×]\b'),
}


def _parse_price(text: str) -> Optional[float]:
    """Extrai o preço de uma linha de texto."""
    match = PRICE_PATTERN.search(text)
    if match:
        return float(match.group(1).replace(',', '.'))
    return None


def _parse_discount(text: str) -> Optional[float]:
    """Extrai o valor de desconto de uma linha."""
    match = NEGATIVE_PRICE.search(text)
    if match:
        return float(match.group(1).replace(',', '.'))
    return None


def _is_discount_line(text: str) -> bool:
    """Verifica se a linha é de desconto/promoção."""
    lower = text.lower()
    return any(kw in lower for kw in DISCOUNT_KEYWORDS)


def _should_ignore(text: str) -> bool:
    """Verifica se a linha deve ser ignorada."""
    lower = text.lower().strip()
    if len(lower) < 3:
        return True
    return any(kw in lower for kw in IGNORE_KEYWORDS)


def _extract_unit(text: str) -> tuple[Optional[float], Optional[str]]:
    """Extrai quantidade e unidade do nome do produto."""
    for unit, pattern in UNIT_PATTERNS.items():
        match = pattern.search(text)
        if match:
            qty_str = match.group(1).replace(',', '.')
            return float(qty_str), unit
    return None, None


def _clean_name(text: str, price_str: str = "") -> str:
    """Limpa o nome do produto removendo preços e caracteres especiais."""
    name = text
    # Remover preço do final
    name = PRICE_PATTERN.sub('', name)
    # Remover quantidade com x (ex: "2x ")
    name = re.sub(r'^\d+\s*[xX×]\s*', '', name)
    # Remover caracteres especiais mantendo letras, números e espaços
    name = re.sub(r'[^\w\s\-\.€%]', ' ', name)
    # Normalizar espaços
    name = re.sub(r'\s+', ' ', name).strip()
    return name.title()


def parse_receipt_text(raw_text: str) -> list[ParsedItem]:
    """Processa o texto OCR de um talão e retorna lista de itens parseados."""
    lines = [line.strip() for line in raw_text.splitlines()]
    items: list[ParsedItem] = []

    for line in lines:
        if not line or _should_ignore(line):
            continue

        item = ParsedItem(raw_text=line)

        # Verificar se é linha de desconto
        if _is_discount_line(line):
            item.is_discount_line = True
            item.discount_amount = _parse_discount(line) or _parse_price(line)
            item.confidence = 70
            items.append(item)
            continue

        # Tentar extrair preço
        price = _parse_price(line)
        if price is None:
            # Linha sem preço — provavelmente continuação de nome ou cabeçalho
            continue

        item.original_price = price
        item.effective_price = price

        # Extrair quantidade e unidade
        qty, unit = _extract_unit(line)
        item.parsed_quantity = qty
        item.unit_guess = unit

        # Limpar nome
        item.parsed_name = _clean_name(line)

        # Calcular confiança
        confidence = 50
        if item.parsed_name and len(item.parsed_name) > 3:
            confidence += 20
        if item.original_price:
            confidence += 20
        if item.unit_guess:
            confidence += 10
        item.confidence = min(confidence, 100)

        if item.parsed_name:
            items.append(item)

    return items


def detect_store(raw_text: str) -> Optional[str]:
    """Tenta detetar a loja pelo texto do talão."""
    stores = {
        'continente': 'Continente',
        'pingo doce': 'Pingo Doce',
        'lidl': 'Lidl',
        'aldi': 'Aldi',
        'intermarché': 'Intermarché',
        'mercadona': 'Mercadona',
        'minipreço': 'Minipreço',
        'froiz': 'Froiz',
    }
    lower = raw_text.lower()
    for keyword, name in stores.items():
        if keyword in lower:
            return name
    return None
