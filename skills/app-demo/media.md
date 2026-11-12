# Demo media

Build the demo content with ffmpeg from openly licensed films, so screenshots look like real use and can be published.

## Sources

Blender Foundation open movies, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/): free to publish with attribution. Fetch them into their own empty folder in the scratchpad.

| Film                            | URL                                                                    | Letterbox crop       |
| ------------------------------- | ---------------------------------------------------------------------- | -------------------- |
| Sintel trailer (52 s, 7.6 MB)   | `https://download.blender.org/durian/trailer/sintel_trailer-720p.mp4`  | `crop=1280:544:0:88` |
| Tears of Steel (12 min, 365 MB) | `https://download.blender.org/demo/movies/ToS/tears_of_steel_720p.mov` | `crop=1280:528:0:4`  |

For a large file, let ffmpeg seek over HTTP and copy just an excerpt instead of downloading it whole:

```sh
ffmpeg -ss 60 -i https://download.blender.org/demo/movies/ToS/tears_of_steel_720p.mov -t 40 -c copy tos.mov
```

Big Buck Bunny's old `download.blender.org/peach/bigbuckbunny_movies/...` URLs return 404. Confirm crops on a new source with `ffmpeg -ss 20 -i <file> -t 4 -vf cropdetect -f null -`.

Pick frames from a timestamped contact sheet, then read the sheet image:

```sh
ffmpeg -i sintel.mp4 -vf "fps=1/2,scale=240:-1,drawtext=fontfile='C\:/Windows/Fonts/arial.ttf':text='%{pts\:hms}':fontcolor=yellow:fontsize=16:x=4:y=4,tile=6x5" -frames:v 1 sheet.png
```

Trailers fade to black between shots, so check every still you cut; a frame a second off can be black.

## Recipes

Crop the letterbox **first**, then fill 16:9. Otherwise the black bars get baked into every still and thumbnail.

```sh
CROP="crop=1280:544:0:88"
FILL="scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720"
F="fontfile='C\:/Windows/Fonts/seguisb.ttf'"     # Segoe UI Semibold on Windows

# Still
ffmpeg -ss 37 -i sintel.mp4 -frames:v 1 -vf "$CROP,$FILL" "01 Welcome.png"

# Still with a caption bar
ffmpeg -ss 37 -i sintel.mp4 -frames:v 1 -vf "$CROP,$FILL,drawbox=y=ih-200:w=iw:h=200:color=black@0.45:t=fill,drawtext=$F:text='Welcome':fontcolor=white:fontsize=64:x=80:y=h-165" "01 Welcome.png"

# Short video clip, small enough to ship in a demo folder
ffmpeg -ss 12 -i sintel.mp4 -t 24 -vf "$CROP,scale=960:540:force_original_aspect_ratio=increase,crop=960:540" -c:v libx264 -crf 26 -preset fast -c:a aac -b:a 96k "02 Trailer.mp4"

# Audio-only excerpt
ffmpeg -ss 20 -i sintel.mp4 -t 15 -vn -b:a 96k "03 Music.mp3"

# Transparent overlay (lower third). drawbox keeps the canvas's zero alpha unless replace=1
ffmpeg -f lavfi -i "color=c=black@0.0:s=1280x720,format=rgba" -frames:v 1 -vf "drawbox=x=80:y=520:w=560:h=120:color=0x5b4bd6@0.92:t=fill:replace=1,drawtext=$F:text='Alex Rivera':fontcolor=white:fontsize=48:x=115:y=533" "Lower Third.png"
```

In `drawtext`, an apostrophe ends the text; write "Tonight" rather than "Tonight's".

## Credits

Add `assets/CREDITS.md` beside the published GIF and screenshots:

```markdown
# Demo media credits

`<app>-demo.gif` and the `<app>-*.png` screenshots show <App> with demo content built from excerpts and stills of these Blender Foundation open movies, licensed under [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/):

- **Sintel** (trailer): © copyright Blender Foundation / [durian.blender.org](https://durian.blender.org/). [License and attribution](https://durian.blender.org/sharing/); [source download](https://download.blender.org/durian/trailer/sintel_trailer-720p.mp4).
- **Tears of Steel**: © copyright Blender Foundation / [mango.blender.org](https://mango.blender.org/). [License and attribution](https://mango.blender.org/sharing/); [source download](https://download.blender.org/demo/movies/ToS/tears_of_steel_720p.mov).

The excerpts are cropped, resized and, on some stills, captioned. The GIF and screenshots contain no audio. The media creators do not endorse <App>.
```

List only the films actually used, and say what was changed (cropped, captioned, audio altered).
