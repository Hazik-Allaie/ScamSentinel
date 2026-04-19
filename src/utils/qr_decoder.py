"""
ScamSentinel MY — QR Code Decoder

Decodes QR codes from uploaded image bytes using Pillow + pyzbar.
Supports standard QR codes and DuitNow QR format (used by Malaysian
e-wallets: TnG, GrabPay, MAE).

Used by the scan pipeline when input_type is "qr_code".
"""

from dataclasses import dataclass
from typing import Optional
from io import BytesIO

from PIL import Image
from pyzbar.pyzbar import decode as pyzbar_decode


@dataclass
class DecodedQR:
    """Result of QR code decoding."""
    raw_data: str                          # Raw decoded string
    qr_type: str                           # "url", "duitnow", "text", "unknown"
    destination_url: Optional[str] = None  # If QR points to a URL
    payment_payload: Optional[dict] = None # If DuitNow QR — parsed fields
    error: Optional[str] = None


def decode_qr_image(image_bytes: bytes) -> DecodedQR:
    """
    Decodes a QR code from raw image bytes.

    Supports:
    - Standard QR codes containing URLs
    - DuitNow QR codes (EMVCo format used in Malaysia)
    - Plain text QR codes

    Args:
        image_bytes: Raw bytes of the uploaded QR image (PNG, JPEG, etc.)

    Returns:
        DecodedQR with raw data and parsed type-specific fields
    """
    try:
        # Open image from bytes
        image = Image.open(BytesIO(image_bytes))

        # Decode QR code(s) from the image
        decoded_objects = pyzbar_decode(image)

        if not decoded_objects:
            return DecodedQR(
                raw_data="",
                qr_type="unknown",
                error="No QR code found in the uploaded image.",
            )

        # Use the first QR code found
        qr_data = decoded_objects[0].data.decode("utf-8", errors="replace")

        # Classify the QR content
        if _is_url(qr_data):
            return DecodedQR(
                raw_data=qr_data,
                qr_type="url",
                destination_url=qr_data,
            )
        elif _is_duitnow_qr(qr_data):
            payload = _parse_duitnow_payload(qr_data)
            return DecodedQR(
                raw_data=qr_data,
                qr_type="duitnow",
                payment_payload=payload,
            )
        else:
            return DecodedQR(
                raw_data=qr_data,
                qr_type="text",
            )

    except Exception as e:
        return DecodedQR(
            raw_data="",
            qr_type="unknown",
            error=f"Failed to decode QR code: {str(e)}",
        )


def _is_url(data: str) -> bool:
    """Check if the decoded data is a URL."""
    return data.lower().startswith(("http://", "https://", "www."))


def _is_duitnow_qr(data: str) -> bool:
    """
    Check if the decoded data is a DuitNow QR (EMVCo format).
    DuitNow QR codes start with "00" (payload format indicator)
    and contain "A000000615" (DuitNow AID) or "my.com.paynet"
    as the payment network identifier.
    """
    return (
        data.startswith("00") and
        ("A000000615" in data or "paynet" in data.lower())
    )


def _parse_duitnow_payload(data: str) -> dict:
    """
    Parses a DuitNow EMVCo QR payload into structured fields.

    EMVCo QR format: TLV (Tag-Length-Value) encoding.
    Key tags:
        00 = Payload Format Indicator
        01 = Point of Initiation Method
        26-51 = Merchant Account Information
        52 = Merchant Category Code
        53 = Transaction Currency (458 = MYR)
        54 = Transaction Amount
        58 = Country Code (MY)
        59 = Merchant Name
        60 = Merchant City
        62 = Additional Data
    """
    parsed = {
        "format": "DuitNow EMVCo",
        "raw_payload": data[:200],  # Truncate for safety
    }

    try:
        # Simple TLV parser for key fields
        pos = 0
        while pos < len(data) - 4:
            tag = data[pos:pos + 2]
            length = int(data[pos + 2:pos + 4])
            value = data[pos + 4:pos + 4 + length]

            if tag == "53":
                parsed["currency"] = "MYR" if value == "458" else value
            elif tag == "54":
                parsed["amount"] = value
            elif tag == "58":
                parsed["country"] = value
            elif tag == "59":
                parsed["merchant_name"] = value
            elif tag == "60":
                parsed["merchant_city"] = value

            pos += 4 + length

    except (ValueError, IndexError):
        # If TLV parsing fails, return what we have
        parsed["parse_error"] = "Partial parse — some fields may be missing"

    return parsed
