# vMix Folder Player

Turns a content folder of numbered media files into a vMix preset that AV operators open and play.

## Language

**Key**:
The number at the start of a file or folder name that sets its place in the playlist, such as `3` or `3_1`. `03` and `3` are the same key.
_Avoid_: index, sequence number, prefix

**Config file**:
The `folder-player.txt` file in a content folder that holds the item options for each key.
_Avoid_: config text, settings file, options file

**Item options**:
The settings one key has in the config file: its file types, camera, microphone, loop, volume, seconds per slide, and any words the app doesn't recognise.
_Avoid_: config entry, option tokens, flags
