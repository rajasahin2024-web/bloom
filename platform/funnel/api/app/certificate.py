"""Certificate of completion — server-generated PDF via reportlab.

Single landscape A4 page: title "Certificate of Completion", buyer name,
course name, issue date, serial. Wording is deliberately completion-only —
never "accredited" / "certification" per the funnel spec.
"""

from __future__ import annotations

from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

INK = HexColor("#1f2937")
MUTED = HexColor("#6b7280")
ACCENT = HexColor("#4f46e5")
RULE = HexColor("#c7d2fe")


def render_certificate(
    *, buyer_name: str, course_name: str, issued_date: str, serial: str,
    out_path: Path,
) -> Path:
    """Write the certificate PDF to out_path. Returns the path."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    w, h = landscape(A4)
    c = canvas.Canvas(str(out_path), pagesize=(w, h))
    c.setTitle("Certificate of Completion")
    c.setAuthor("Bloom Academy")
    c.setSubject(course_name)

    # Frame
    c.setStrokeColor(ACCENT)
    c.setLineWidth(3)
    c.rect(14 * mm, 14 * mm, w - 28 * mm, h - 28 * mm)
    c.setStrokeColor(RULE)
    c.setLineWidth(1)
    c.rect(18 * mm, 18 * mm, w - 36 * mm, h - 36 * mm)

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 13)
    c.drawCentredString(w / 2, h - 34 * mm, "BLOOM ACADEMY")

    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 34)
    c.drawCentredString(w / 2, h - 52 * mm, "Certificate of Completion")

    c.setStrokeColor(RULE)
    c.setLineWidth(1.5)
    c.line(w / 2 - 60 * mm, h - 58 * mm, w / 2 + 60 * mm, h - 58 * mm)

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 12)
    c.drawCentredString(w / 2, h - 72 * mm, "Proudly presented to")

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 28)
    c.drawCentredString(w / 2, h - 86 * mm, buyer_name)

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 12)
    c.drawCentredString(
        w / 2, h - 100 * mm,
        f"for completing the self-paced micro-course",
    )
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(w / 2, h - 112 * mm, course_name)

    # Footer row: date + serial
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 10)
    c.drawString(30 * mm, 26 * mm, f"Date: {issued_date}")
    c.drawRightString(w - 30 * mm, 26 * mm, f"Certificate No: {serial}")
    c.setFont("Helvetica-Oblique", 9)
    c.drawCentredString(
        w / 2, 22 * mm,
        "This document acknowledges completion of the course modules.",
    )

    c.showPage()
    c.save()
    return out_path
