# Location Sense — notes

## How to run
1. Open a terminal in this folder.
2. Run: `node server.js`
3. Open http://localhost:3000 in a browser.

The model used is `gpt-5.6-luna`. The server reads the OpenAI key only from `.env`; the key is never sent to the page. `.env` is ignored by Git.

After each save point, push it to GitHub.

## Done in Version 1
- Saved the project brief in `BRIEF.md` and send it as the AI's system instructions with every request.
- Added one main flow: enter a place, wait while the AI checks it, and read the possible difficulties.
- Added online fact lookup through the AI request, clear AI safety language, and a friendly error when the key or internet is unavailable.
- Added a few example place prompts and a visual explanation of how this differs from tools that focus mainly on relevant directions.
- Added browser `localStorage` saves in one small file: `public/app.js`. No real people or database are used.
- Saves on this computer only for now.

## Maybe Later
- Add a map and exact route information.
- Add voice input and text-to-speech.
- Let a trusted accessibility reviewer test the wording.
- Add a real database after the Version 1 demo is proven.
- Add a way to cite and review the online sources used by the AI.
