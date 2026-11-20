# Verkleint foto's voor Geef les: hooguit 1280 pixels breed of hoog, JPEG progressief zonder metadata,
# kwaliteit 80; wordt het groter dan 250 kB (fijne schilderijen), dan lager tot hooguit kwaliteit 60.
# Aangeroepen door tools/koppel-lesfotos.js met een JSON-lijst van [bron, doel]. Een doel dat nieuwer is dan de bron blijft staan.
import json, os, sys
from PIL import Image, ImageOps

MAX = 1280
taak = json.load(open(sys.argv[1], encoding='utf-8'))
nieuw = 0
for bron, doel in taak:
    if os.path.exists(doel) and os.path.getmtime(doel) >= os.path.getmtime(bron):
        continue
    im = ImageOps.exif_transpose(Image.open(bron))
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        wit = Image.new('RGB', im.size, (255, 255, 255))
        wit.paste(im, mask=im.split()[-1])
        im = wit
    else:
        im = im.convert('RGB')
    im.thumbnail((MAX, MAX), Image.LANCZOS)
    for q in (80, 72, 65, 60):
        im.save(doel, 'JPEG', quality=q, optimize=True, progressive=True)
        if os.path.getsize(doel) <= 250_000:
            break
    nieuw += 1
print(f'{nieuw} foto\'s verkleind, {len(taak) - nieuw} al klaar')
