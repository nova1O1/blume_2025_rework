"""Rebuild lightweight full-length loops and posters. Requires Python 3 and FFmpeg.

Run from any directory: python scripts/optimize-media.py --ffmpeg /path/to/ffmpeg
Original media is preserved. Generated assets are written under assets/previews.
"""
import argparse
import json
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--ffmpeg', default='ffmpeg')
args = parser.parse_args()
repo = Path(__file__).resolve().parents[1]
output = repo / 'assets' / 'previews'
output.mkdir(parents=True, exist_ok=True)
manifest = {}

def run(*options):
    subprocess.run([args.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', *map(str, options)], check=True)

def convert(source, name, width):
    video = output / (name + '.mp4')
    poster = output / (name + '.jpg')
    run('-i', source, '-vf', f"scale='min({width},iw)':-2:flags=lanczos,fps=24",
        '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '26', '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart', '-threads', '4', video)
    run('-i', source, '-vf', f"scale='min({width},iw)':-2", '-frames:v', '1', '-q:v', '3', poster)
    print(f'{source.relative_to(repo)}: {source.stat().st_size:,} -> {video.stat().st_size:,} bytes')
    return {'src': './' + video.relative_to(repo).as_posix(), 'poster': './' + poster.relative_to(repo).as_posix()}

# Read the same project list used by the homepage.
import re
html = (repo / 'index.html').read_text(encoding='utf-8')
data = re.search(r'<script id="artworks-data"[^>]*>(.*?)</script>', html, re.S)
projects = json.loads(data.group(1))['projects']
for folder in projects:
    directory = repo / folder
    meta = json.loads((directory / 'meta.json').read_text(encoding='utf-8-sig'))
    cover = directory / meta['cover']
    if cover.suffix.lower() in {'.mp4', '.webm', '.mov', '.gif'}:
        manifest[folder + meta['cover']] = convert(cover, directory.name, 720)
    for asset in meta.get('assets', []):
        if Path(asset).suffix.lower() == '.gif':
            manifest[folder + asset] = convert(directory / asset, directory.name + '-' + Path(asset).stem, 1280)

convert(repo / 'intro.mp4', 'hero', 1440)
run('-i', repo / 'blume_load_anim.webm', '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '3', output / 'about.jpg')
(repo / 'assets' / 'preview-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
