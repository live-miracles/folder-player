# vMix Folder Player

Turns a content folder of numbered media files into a vMix preset that AV operators open and play.

## Language

**Key**:
The number at the start of a file or folder name that sets its place in the playlist, such as `3` or `3_1`. `03` and `3` are the same key.
_Avoid_: index, sequence number, prefix

**Config file**:
The `folder-player.txt` file in a content folder that holds the item options for each key.
_Avoid_: config text, settings file, options file

**Playlist item**:
The files sharing one key that play as one vMix input, together with its overlay and layers.
_Avoid_: entry, row, group

**Overlay**:
The image, photo folder or PowerPoint shown on top of the audio or video with the same key, or on top of the camera for an image with the camera on.
_Avoid_: top, visual, helper input

**Layer**:
An input stacked on a playlist item's input: Mic, Cam or its overlay, in that order.
_Avoid_: overlay (for Mic and Cam)

**Base preset**:
The `base.vmix` file a generated preset starts from, found in the content folder or its parent; it provides the Cam and Mic inputs.
_Avoid_: template, base file

**Item options**:
The settings one key has in the config file: its file types, camera, microphone, loop, volume, seconds per slide, and any words the app doesn't recognise.
_Avoid_: config entry, option tokens, flags
