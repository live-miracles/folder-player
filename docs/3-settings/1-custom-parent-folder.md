# Custom parent folder

The generated preset stores the full path of every media file. When vMix will read the
files from a different place than the app (another drive letter, or another machine with a
copy of the folders), fill in **Custom Parent Folder** on the home page.

It replaces only the part of the path before the playlist's source folder. The name of the
folder that holds the nearby base preset is kept:

```text
Base preset: C:\a\b\base file.vmix
Media file:  C:\a\b\content\video.mp4
Custom:      C:\custom\path
Generated:   C:\custom\path\b\content\video.mp4
```

Leave it empty to keep the paths as they are on this computer.
