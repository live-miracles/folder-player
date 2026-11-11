# Item options

**Open Config** lists every playlist item with its type and options. Change them, then
save: the options are stored in `folder-player.txt` in the content folder and used the
next time you create the vMix preset.

| Option  | Items                        | What it does                                                                       |
| ------- | ---------------------------- | ---------------------------------------------------------------------------------- |
| Camera  | all                          | Layers the `Cam` input of the [base preset](../1-getting-started/2-base-preset.md) |
| Mic     | all                          | Layers the `Mic` input of the base preset                                          |
| Loop    | audio and video              | Loops the file                                                                     |
| Volume  | audio and video              | The item's volume in percent: 0 to 1000, 100 by default                            |
| Seconds | photo folders and PowerPoint | How long each slide stays up, in seconds: 1 to 1000, 10 by default                 |

The camera and microphone are independent: an item can use either, both or neither. See
[how layers are stacked](../1-getting-started/2-base-preset.md#how-layers-are-stacked).

## Report

Above the list, a report shows problems the app found in the folder, for example an item
that uses the camera when the base preset has no `Cam` input, an audio file with no image,
slideshow or camera to show, or a video covered by an image overlay.
