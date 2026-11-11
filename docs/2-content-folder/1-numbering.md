# Numbering files

The number at the start of a file or folder name sets its place in the playlist. Items
without a number are ignored, so notes and other files can stay in the folder.

```text
Content folder
  |-- 01 Welcome.mp4
  |-- 02 Teaching.mkv
  |-- 03 Meditation.mp3
  |-- 03 Slide.png        <- overlays 03 Meditation.mp3
  |-- 04 Deck.pptx        <- PowerPoint slideshow
  |-- 05 Photos           <- folder slideshow
  |   |-- image-1.jpg
  |   |-- image-2.jpg
  |-- Notes.txt           <- ignored
```

## Same number: overlay

Two items with the same number play together: the image, photo folder or deck becomes an
overlay on the audio or video.

```text
07 Audio.mp3
07 Image.png

Result:
07 Audio.mp3 + Image.png overlay
```

On the config page, overlays are listed indented under the item they belong to.

## `+`: reuse one overlay

Join numbers with `+` to use one overlay for several items, instead of copying the file.

```text
03 Audio.mp3
08 Audio.mp3
03+08 Photos

Result:
03 Audio.mp3 + Photos overlay
08 Audio.mp3 + Photos overlay
```

## `_`: sub-item ordering

Add `_` and a second number to order several items that share a number.

```text
03_1 Intro.mp4
03_2 Teaching.mp4
03_3 Meditation.mp3

Result:
plays 03_1, then 03_2, then 03_3
```

## Subfolders

The app saves the options you set on the config page in a `folder-player.txt` file in the
content folder. Subfolders that have their own `folder-player.txt` get their own presets.
