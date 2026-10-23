#!/usr/bin/env bash
# Build both .docx versions, convert to PDF and make contact sheets for review.
set -e
OUT=$1
rm -rf "$OUT" && mkdir -p "$OUT"
npx tsx --tsconfig tsconfig.json scripts/build-docx.mts "$OUT"
(cd "$OUT" && soffice --headless --convert-to pdf *.docx >/dev/null 2>&1)
python3 - "$OUT" <<'PY'
import glob, sys, subprocess
import pymupdf
from PIL import Image
out = sys.argv[1]
for v in ["v1", "v2"]:
    pdf = f"{out}/Arbeitsblatt-Fotosynthese-{v}.pdf"
    doc = pymupdf.open(pdf)
    print(v, "pages:", doc.page_count)
    ims = []
    for p in doc:
        pix = p.get_pixmap(dpi=70)
        ims.append(Image.frombytes("RGB", (pix.width, pix.height), pix.samples))
    w = sum(i.width for i in ims) + 10 * (len(ims) - 1)
    sheet = Image.new("RGB", (w, ims[0].height), "#888")
    x = 0
    for im in ims:
        sheet.paste(im, (x, 0)); x += im.width + 10
    sheet.save(f"{out}/sheet-{v}.jpg")
PY
