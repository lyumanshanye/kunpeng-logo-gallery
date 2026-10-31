"""Assemble this session's original artwork and small gallery previews."""
from pathlib import Path
from PIL import Image, ImageChops, ImageOps
from concurrent.futures import ThreadPoolExecutor
import json, shutil

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parent / 'animal'
DIST = ROOT / 'dist'
SETS = [
    ('v5', 'kunpeng-reference-v5', '逐张参考 · 三种变体', '参考变体', '22 张参考，每张延展 A / B / C 三个方案。'),
    ('v4', 'kunpeng-color-v4', '白底彩色探索', '彩色探索', '从零生成的彩色鲲鹏，尝试柔和的体态与表情。'),
    ('v3', 'kunpeng-original-v3', '自由形态探索', '自由形态', '从轮廓、姿态与留白出发的二十种结构。'),
    ('v2', 'kunpeng-bird-v2', '鸟类轮廓探索', '鸟类轮廓', '以鸟的头部、羽翼和飞行姿态为主的十个方向。'),
    ('v1', 'kunpeng-cute-v1', '最初的鲲鹏', '最初探索', '本次会话第一轮，蓝白配色的鲲鹏形态。'),
]
for part in ['assets/originals', 'assets/previews', 'assets/references']:
    (DIST / part).mkdir(parents=True, exist_ok=True)

def prepare(job):
    batch, directory, row = job
    sid = batch + '-' + row['id']
    src = SOURCE / directory / row['file']
    original = 'assets/originals/' + sid + '.png'
    preview = 'assets/previews/' + sid + '.webp'
    shutil.copy2(src, DIST / original)
    with Image.open(src) as raw:
        im = raw.convert('RGB')
        mask = ImageChops.difference(im, Image.new('RGB', im.size, 'white')).convert('L').point(lambda v: 255 if v > 24 else 0)
        box = mask.getbbox()
        if box:
            im = im.crop(box)
        pad = max(24, round(max(im.size) * .085))
        im = ImageOps.expand(im, border=pad, fill='white')
        im.thumbnail((800, 900), Image.Resampling.LANCZOS)
        width, height = im.size
        im.save(DIST / preview, 'WEBP', quality=91, method=6)
    return {
        'id': sid, 'number': row['id'], 'name': row['name'], 'batch': batch,
        'original': original, 'preview': preview, 'width': width, 'height': height,
        'prompt': row['prompt'], 'reference': row.get('reference_id'),
    }

jobs, batches, references = [], [], {}
for batch, directory, title, short, description in SETS:
    rows = json.loads((SOURCE / directory / 'prompts.json').read_text())['variants']
    batches.append({'id': batch, 'title': title, 'short': short, 'description': description, 'count': len(rows)})
    jobs.extend((batch, directory, row) for row in rows)
    if batch == 'v5':
        for row in rows:
            rid = row['reference_id']
            if rid in references:
                continue
            filename = 'assets/references/ref-' + rid + '.jpg'
            with Image.open(SOURCE / row['reference']) as ref:
                ref = ref.convert('RGB')
                ref.thumbnail((900, 900), Image.Resampling.LANCZOS)
                ref.save(DIST / filename, quality=92)
            references[rid] = {'id': rid, 'name': row['name'], 'image': filename}
with ThreadPoolExecutor(max_workers=8) as pool:
    items = list(pool.map(prepare, jobs))
assert len(items) == 126
# Keep curated additions first when rebuilding the original session catalog.
for extra_path in [ROOT / 'reference-studies-v7.json', ROOT / 'conceptual-studies-v8.json', ROOT / 'additions.json']:
    if not extra_path.exists():
        continue
    extra = json.loads(extra_path.read_text())
    for item in extra['items']:
        assert (DIST / item['original']).is_file()
        assert (DIST / item['preview']).is_file()
    items = extra['items'] + items
    batches.insert(0, extra['batch'])
    references.update(extra.get('references', {}))
data = {'title': '鲲鹏 · 形态档案', 'total': len(items), 'batches': batches, 'references': references, 'items': items}
(DIST / 'gallery.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
(DIST / '.nojekyll').touch()
print(f'Prepared {len(items)} originals, {len(items)} WebP previews and {len(references)} references.')
