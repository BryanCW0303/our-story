from datetime import datetime, timedelta
from io import BytesIO

from defusedxml import ElementTree
from defusedxml.common import DefusedXmlException
from django.core.files.base import ContentFile
from django.utils import timezone
from PIL import ExifTags, Image, ImageOps
from pillow_heif import register_heif_opener

register_heif_opener()
DISPLAY_MAX = 2560
THUMB_MAX = 720


def prepare_photo(upload, fallback_date):
    """Return the display JPEG, thumbnail, dimensions and camera-local capture date."""
    source = _read_image(upload)
    taken_on = _exif_date(source) or fallback_date
    source = _upright_rgb(source)

    display, (width, height) = _jpeg(source, DISPLAY_MAX, 90)
    thumb, _ = _jpeg(source, THUMB_MAX, 82)
    return display, thumb, (width, height), taken_on


def _read_image(upload):
    try:
        image = Image.open(upload)
        image.load()
    except Exception as exc:  # Pillow raises many different types here
        raise ValueError("not an image") from exc
    return image


def _upright_rgb(image):
    image = ImageOps.exif_transpose(image)  # respect phone rotation
    return image if image.mode == "RGB" else image.convert("RGB")


def _photo_date(raw, latest):
    """Read the camera-local calendar date, including for timestamps with an offset."""
    if isinstance(raw, bytes):
        raw = raw.decode("ascii", errors="replace")
    if not isinstance(raw, str):
        return None
    prefix = raw.strip()[:10]
    for fmt in ("%Y:%m:%d", "%Y-%m-%d"):
        try:
            day = datetime.strptime(prefix, fmt).date()
        except ValueError:
            continue
        if day <= latest:
            return day
    return None


def _xmp_capture_dates(image):
    packet = image.info.get("xmp") or image.info.get("XML:com.adobe.xmp")
    if not packet or len(packet) > 1024 * 1024:
        return
    try:
        root = ElementTree.fromstring(packet, forbid_dtd=True)
    except (ElementTree.ParseError, DefusedXmlException, ValueError, LookupError):
        return
    for tag in ("{http://ns.adobe.com/exif/1.0/}DateTimeOriginal",
                "{http://ns.adobe.com/photoshop/1.0/}DateCreated",
                "{http://ns.adobe.com/xap/1.0/}CreateDate"):
        for node in root.iter():
            if tag in node.attrib:
                yield node.attrib[tag]
            if node.tag == tag:
                yield node.text


def _exif_date(image):
    latest = timezone.localdate() + timedelta(days=1)
    try:
        exif = image.getexif()
    except Exception:  # A damaged EXIF block can coexist with usable XMP.
        exif = {}
    try:
        details = exif.get_ifd(ExifTags.IFD.Exif)
    except Exception:
        details = {}
    tag = ExifTags.Base
    for raw in (details.get(tag.DateTimeOriginal), exif.get(tag.DateTimeOriginal)):
        if day := _photo_date(raw, latest):
            return day
    for raw in _xmp_capture_dates(image):
        if day := _photo_date(raw, latest):
            return day
    for raw in (details.get(tag.DateTimeDigitized), exif.get(tag.DateTimeDigitized), exif.get(tag.DateTime)):
        if day := _photo_date(raw, latest):
            return day
    return None


def _jpeg(image, max_edge, quality):
    """Return (file, (width, height)) for a copy no larger than max_edge."""
    copy = image.copy()
    copy.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
    buffer = BytesIO()
    copy.save(buffer, "JPEG", quality=quality, optimize=True, progressive=True)
    return ContentFile(buffer.getvalue()), copy.size
