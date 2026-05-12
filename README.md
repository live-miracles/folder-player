# vMix Folder Player

Number the files in a folder and this app will automatically generate a vMix playlist, plus a simplified web UI for users who only need the essential controls.

To reuse one image or photos folder for several audio files, join the target numbers with `+`. For example, `03+08 Photos` overlays the same photos folder on both `03 Audio.mp3` and `08 Audio.mp3`.

# Overview

1. Create a folder and order all the files with leading numbers.
   <img width="733" height="201" alt="image" src="https://github.com/user-attachments/assets/afef7944-2613-40db-9f27-616060984ef6" />

2. Open the folder in the app and click "Open Config".
   <img width="1576" height="526" alt="image" src="https://github.com/user-attachments/assets/3ebd12c7-bfa5-4463-85c6-ea1f9b1a13b6" />

3. Review the playlist config. If needed, enable or disable the mic, adjust volume, or change the slideshow rotation time.
   <img width="1557" height="585" alt="image" src="https://github.com/user-attachments/assets/98aa6354-f919-4bc2-bf57-812133bef00c" />

4. Save the config, go back, and click "Setup Folder in vMix". The app will create a `.vmix` preset file and open it in vMix.
   <img width="1920" height="1049" alt="image" src="https://github.com/user-attachments/assets/388d5a8e-7926-4ed0-9c16-cb1ba75a84a1" />

5. The app also opens a simple web UI for users who are new to vMix and only need a "Next" button:
   <img width="1920" height="1044" alt="image" src="https://github.com/user-attachments/assets/a988eecd-7dc0-43b8-bfc5-43d96a6b02e7" />

## Run Dev

```sh
npm run css
npm run dev
```

## Publish

Create a `.env` file in the project root with a GitHub token:

```sh
GH_TOKEN=ghp_***
```

Then run:

```sh
npm run publish
```

This builds the app and publishes the Electron release to GitHub.

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
