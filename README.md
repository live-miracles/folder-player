# vMix Folder Player

Number the files in a folder and this app generates a ready-to-open vMix preset (`.vmix`) with the playlist, overlays, camera and mic layers already set up.

Full documentation: https://live-miracles.github.io/projects/folder-player/docs/

## Base vMix Preset

Create a `base.vmix` preset in the content folder or its parent folder. The closest matching preset is used.

```text
Content folder
  |-- base.vmix        <- used first, when present
  |-- 01 Video.mp4
  |-- 02 Audio.mp3

Parent folder
  |-- base.vmix        <- fallback for child folders
  |-- Session A
      |-- 01 Video.mp4
```

For overlays, title base inputs exactly:

```text
Cam  -> camera input
Mic  -> microphone input
```

In the folder configuration, the `cam` and `mic` options are independent. Selected layers are ordered `Mic` (when selected), then `Cam` (when selected), then any visual overlay. If an image has the `cam` option enabled, the generator creates a colour input so the camera and image can be layered. Audio, video, photo-folder slideshows, and PowerPoint slides receive the selected camera input directly as a layer.

## Content Folder

Number files to set playlist order. Unnumbered items are ignored.

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

Same number = overlay:

```text
07 Audio.mp3
07 Image.png

Result:
07 Audio.mp3 + Image.png overlay
```

`+` = reuse one overlay:

```text
03 Audio.mp3
08 Audio.mp3
03+08 Photos

Result:
03 Audio.mp3 + Photos overlay
08 Audio.mp3 + Photos overlay
```

`_` = sub-item ordering:

```text
06_1 Slide.png
06_2 Slide.png
```

Supported inputs include images, video files, audio files, photo folders, and PowerPoint `.pptx` files.

## Overview

1. Create a folder and order all the files with leading numbers.
   <img width="733" height="201" alt="image" src="https://github.com/user-attachments/assets/afef7944-2613-40db-9f27-616060984ef6" />

2. Open the folder in the app and click "Open Config".
   <img width="1576" height="526" alt="image" src="https://github.com/user-attachments/assets/3ebd12c7-bfa5-4463-85c6-ea1f9b1a13b6" />

3. Review the playlist config. If needed, enable or disable the `mic`, adjust volume, or change the slideshow rotation time.
   <img width="1557" height="585" alt="image" src="https://github.com/user-attachments/assets/98aa6354-f919-4bc2-bf57-812133bef00c" />

4. Save the config, go back, and click "Create vMix Preset". The app writes a `<folder name>.vmix` preset into the content folder and shows a report of any errors or warnings. Open that preset in vMix.
   <img width="1920" height="1049" alt="image" src="https://github.com/user-attachments/assets/388d5a8e-7926-4ed0-9c16-cb1ba75a84a1" />

## Run Dev

```sh
npm run css
npm run dev
```

## Publish

Publishing uses Electron Builder's GitHub publisher configuration from
`package.json`. Releases are published automatically when a version tag is
pushed to GitHub.

```sh
npm version x.x.x
git push origin master --tags
```

The tag push starts the release workflow, builds the Windows installer, and
publishes a GitHub release for that tag.

## Format

```sh
npm run format
```

## Test

```sh
npm run format:check
npm test
```

GitHub Actions runs the same checks on every push and pull request.

## Links

- [vMix Docs](https://www.vmix.com/help29/DeveloperAPI.html)
