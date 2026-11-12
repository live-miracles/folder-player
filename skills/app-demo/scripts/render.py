"""Turn frames recorded by record.mjs into a GIF and/or MP4 at real-time speed.

Usage:
  python render.py <out-dir> [--gif demo.gif] [--mp4 demo.mp4] [--sheet sheet.png]
                   [--width 960] [--fps 12] [--colors 192] [--end-hold 1.5]
                   [--trim-start 0] [--trim-end 0]

Frame timing comes from <out-dir>/frames/times.txt, so slow captures still play
at the speed the scenario ran. --sheet writes a contact sheet for reviewing the
result without opening the GIF.
"""

import argparse
import os
import subprocess
import sys


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"ffmpeg failed:\n{' '.join(cmd)}\n{r.stderr[-2000:]}")


def duration(path):
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
        capture_output=True,
        text=True,
    )
    try:
        return float(r.stdout.strip())
    except ValueError:
        return 0.0


def main():
    p = argparse.ArgumentParser()
    p.add_argument("out")
    p.add_argument("--gif")
    p.add_argument("--mp4")
    p.add_argument("--sheet")
    p.add_argument("--width", type=int, default=960)
    p.add_argument("--fps", type=int, default=12)
    p.add_argument("--colors", type=int, default=192)
    p.add_argument("--end-hold", type=float, default=1.5, help="seconds to hold the last frame")
    p.add_argument("--trim-start", type=float, default=0, help="seconds to drop from the start")
    p.add_argument("--trim-end", type=float, default=0, help="seconds to drop before the last frame")
    a = p.parse_args()

    frames = os.path.join(a.out, "frames")
    rows = [l.split() for l in open(os.path.join(frames, "times.txt")) if l.strip()]
    if len(rows) < 2:
        sys.exit("Fewer than 2 frames: did the scenario call d.record.start()?")
    t0 = int(rows[0][1]) + a.trim_start * 1000
    t_end = int(rows[-1][1]) - a.trim_end * 1000
    rows = [r for r in rows if t0 <= int(r[1]) <= t_end] or rows[-1:]

    lines = []
    for i, (name, t) in enumerate(rows):
        d = (int(rows[i + 1][1]) - int(t)) / 1000 if i + 1 < len(rows) else a.end_hold
        lines += [f"file '{name}'", f"duration {d:.3f}"]
    lines.append(f"file '{rows[-1][0]}'")  # concat demuxer ignores the last duration otherwise
    concat = os.path.join(frames, "concat.txt")
    with open(concat, "w") as f:
        f.write("\n".join(lines) + "\n")

    src = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", concat]
    scale = f"fps={a.fps},scale={a.width}:-2:flags=lanczos"

    if a.gif:
        run(src + ["-vf", f"{scale},split[a][b];[a]palettegen=max_colors={a.colors}:stats_mode=diff[p];"
                          "[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle", a.gif])
    if a.mp4:
        run(src + ["-vf", f"{scale},format=yuv420p", "-c:v", "libx264", "-crf", "20",
                   "-preset", "slow", "-movflags", "+faststart", a.mp4])

    for path in filter(None, [a.gif, a.mp4]):
        size = os.path.getsize(path) / 1e6
        warn = "  <- over 5 MB, consider --width 800, --colors 128 or trimming" if size > 5 and path == a.gif else ""
        print(f"{path}: {duration(path):.1f}s, {size:.2f} MB{warn}")

    if a.sheet:
        target = a.gif or a.mp4
        if not target:
            sys.exit("--sheet needs --gif or --mp4")
        step = max(duration(target) / 12, 0.5)
        run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", target,
             "-vf", f"fps=1/{step:.2f},scale=480:-1,tile=4x3", "-frames:v", "1", a.sheet])
        print(f"{a.sheet}: contact sheet, one tile every {step:.1f}s")


if __name__ == "__main__":
    main()
