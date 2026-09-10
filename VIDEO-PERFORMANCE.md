# Video playback

The homepage uses full-length, silent H.264 previews at up to 720px wide / 24fps.
The hero uses a 1440px preview. Project pages retain original video covers; GIFs
use MP4 conversions (1280px for project assets). Original files are preserved.

`assets/preview-manifest.json` maps original media paths to previews and posters.
Rebuild after changing media with Python 3 and FFmpeg:

```sh
python scripts/optimize-media.py --ffmpeg /path/to/ffmpeg
```

The shared `assets/video-manager.js` attaches sources only to visible videos.
It pauses offscreen videos and all videos in hidden tabs, releasing idle sources
after 12 seconds. Newly visible tiles restart their loop after a release.
Posters remain visible while loading. Reduced-motion and data-saving preferences
disable automatic playback; project-page native controls allow manual playback.

Gallery duplication preserves the scrolling effect without loading every video.
Grid coordinates and measured duplicate offsets determine the loop distance,
including after viewport resizing. Gallery motion pauses outside the viewport.
The two logo rows, gallery drag gestures, and tile hover spotlight are retained.
The gallery's JavaScript ticker stops while offscreen, in a hidden tab, or with
reduced motion enabled. Dragging does not trigger project navigation; a regular
click still opens the project. Generated posters replace runtime canvas capture.

Serve the site over HTTP(S), including its new assets and manifest. Support byte
range requests and correct video MIME types. Changing a UI framework is not
required. Test visual quality and smoothness on target phones before deployment;
desktop browser checks do not establish performance on every GPU or network.
