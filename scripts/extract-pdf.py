# -*- coding: utf-8 -*-
"""
Extracts text (with position/font/color metadata) and embedded images from
the magazine + coloring-card PDFs in source-material/ into
source-material/extraction/. This is the raw material that
scripts/process-images.mjs later curates and optimizes into src/assets/.

Only needed when the client sends a new/updated PDF — the extraction output
already in source-material/extraction/ from the current edition doesn't need
to be regenerated to just tweak copy or layout.

Usage:
    pip install pymupdf
    python scripts/extract-pdf.py
"""
import json
import os

import pymupdf as fitz

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "source-material")
OUT = os.path.join(SOURCE, "extraction")
IMG_OUT = os.path.join(OUT, "images")
TEXT_OUT = os.path.join(OUT, "text")
GAME_OUT = os.path.join(OUT, "game")

MAGAZINE_PDF = os.path.join(SOURCE, "revista oj vol 2 digital.pdf")
CARD_PDF = os.path.join(SOURCE, "card frente mosaico.pdf")


def extract_magazine():
    for d in (IMG_OUT, TEXT_OUT):
        os.makedirs(d, exist_ok=True)

    doc = fitz.open(MAGAZINE_PDF)
    all_pages = []

    for pno in range(doc.page_count):
        page = doc[pno]
        page_dict = page.get_text("dict")
        blocks_out = []
        for block in page_dict.get("blocks", []):
            if block.get("type") != 0:
                continue
            lines_out = []
            for line in block.get("lines", []):
                spans_out = [
                    {
                        "text": span.get("text", ""),
                        "font": span.get("font", ""),
                        "size": round(span.get("size", 0), 1),
                        "color": span.get("color", 0),
                        "flags": span.get("flags", 0),
                    }
                    for span in line.get("spans", [])
                ]
                if spans_out:
                    lines_out.append(spans_out)
            if lines_out:
                blocks_out.append({"bbox": block.get("bbox"), "lines": lines_out})

        img_files = []
        for idx, img in enumerate(page.get_images(full=True)):
            xref = img[0]
            try:
                base_img = doc.extract_image(xref)
            except Exception:
                continue
            w, h = base_img["width"], base_img["height"]
            if w < 80 or h < 80:
                continue  # skip tiny icons/artifacts
            fname = f"p{pno + 1:02d}_img{idx}_{w}x{h}.{base_img['ext']}"
            with open(os.path.join(IMG_OUT, fname), "wb") as f:
                f.write(base_img["image"])
            img_files.append(fname)

        all_pages.append({"page": pno + 1, "blocks": blocks_out, "images": img_files})

    with open(os.path.join(TEXT_OUT, "pages_raw.json"), "w", encoding="utf-8") as f:
        json.dump(all_pages, f, ensure_ascii=False, indent=2)
    doc.close()
    print(f"Magazine: {len(all_pages)} pages -> {TEXT_OUT}\\pages_raw.json, images -> {IMG_OUT}")


def extract_card():
    os.makedirs(GAME_OUT, exist_ok=True)
    doc = fitz.open(CARD_PDF)
    page = doc[0]
    for idx, img in enumerate(page.get_images(full=True)):
        xref = img[0]
        base_img = doc.extract_image(xref)
        w, h = base_img["width"], base_img["height"]
        fname = f"card_img{idx}_{w}x{h}.{base_img['ext']}"
        with open(os.path.join(GAME_OUT, fname), "wb") as f:
            f.write(base_img["image"])
        print("saved", fname)
    doc.close()


if __name__ == "__main__":
    if not os.path.exists(MAGAZINE_PDF) or not os.path.exists(CARD_PDF):
        raise SystemExit(
            "Put the two source PDFs in source-material/ first (see README.md)."
        )
    extract_magazine()
    extract_card()
    print("Done. Now hand-pick which images matter in scripts/process-images.mjs's "
          "PHOTOS/STRIPS lists, then run `npm run process-images`.")
