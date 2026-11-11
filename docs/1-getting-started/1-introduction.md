# Introduction

vMix Folder Player turns a folder of numbered media files into a vMix playlist. You put
the videos, audio, images, photo folders and PowerPoint decks for a session in one folder,
number them in the order they should play, and the app generates a vMix preset from them.

## From a folder to vMix

1. Create a folder and give every file a leading number to set its place in the playlist
   (see [Numbering files](../2-content-folder/1-numbering.md)).

    ![A content folder with numbered files](https://github.com/user-attachments/assets/afef7944-2613-40db-9f27-616060984ef6)

2. Open the folder in the app and click **Open Config**.

    ![The app with a content folder selected](https://github.com/user-attachments/assets/3ebd12c7-bfa5-4463-85c6-ea1f9b1a13b6)

3. Review the playlist config. If needed, turn the microphone on or off, adjust the volume,
   or change the slideshow rotation time (see [Item options](../2-content-folder/2-options.md)).

    ![The playlist config](https://github.com/user-attachments/assets/98aa6354-f919-4bc2-bf57-812133bef00c)

4. Save the config, go back and click **Create vMix Preset**. The app writes a
   `<folder name>.vmix` preset into the content folder, built from your
   [base preset](2-base-preset.md), and shows a report of any errors or warnings. Open
   that preset in vMix.

    ![The generated playlist open in vMix](https://github.com/user-attachments/assets/388d5a8e-7926-4ed0-9c16-cb1ba75a84a1)

## Supported inputs

Images, video files, audio files, folders of photos (played as a slideshow) and PowerPoint
`.pptx` files.
