# Contributing to Quizasaurus

Thanks for wanting to help! Quizasaurus is used by families and teachers with young children, so every change has to keep it **simple, safe and offline**. This guide explains how to set up the project, check your work and propose it.

- [Rules that never break](#rules-that-never-break)
- [Set up the project](#set-up-the-project)
- [Run the tests and the audit](#run-the-tests-and-the-audit)
- [Propose a change](#propose-a-change)
- [Add a language](#add-a-language)
- [Add a skin](#add-a-skin)
- [Share a pack](#share-a-pack)
- [Ideas open to the community](#ideas-open-to-the-community)

## Rules that never break

A pull request that breaks one of these is not merged, however good the rest is.

1. **No copyrighted material.** Never commit textbook scans, photos of pages, or packs made from copyrighted books. Keep them in `private/` (ignored by git). Example packs must use your own text, like [`examples/ciclo-del-agua.pack.json`](examples/ciclo-del-agua.pack.json).
2. **No data about children.** No names, photos, voices or answers of real children in code, examples, screenshots, tests or commit messages. Use made-up names.
3. **No keys.** API keys live only in your `.env` file (ignored by git) or in the app on your device. Only [`.env.example`](.env.example), with empty values, is committed. If you push a key by mistake, revoke it at once at your provider.
4. **No trademarks.** Skins, names and graphics are original: no Minecraft, Roblox, Pokémon or similar names or looks.
5. **Touch, don't type.** Players are 6 to 12 years old: games are played by tapping and dragging, never by typing answers. The right answer never sits in a fixed position.
6. **The AI only writes content.** It fills packs that are checked against the [pack format](docs/pack-format.md); it never writes game code. An adult reviews every pack before a child plays it.

## Set up the project

You need [Node.js](https://nodejs.org) 22 or later and git.

```bash
git clone https://github.com/marcelopereagarcia-sys/Quizasaurus.git
cd Quizasaurus
npm install
npm run dev
```

`npm run dev` opens the app at `http://localhost:5173`. It works without any AI: load [`examples/ciclo-del-agua.pack.json`](examples/ciclo-del-agua.pack.json) with **Load a pack** and play.

To make packs with an AI, either use the web app's generator with your own key (it stays in your browser), or copy `.env.example` to `.env` for the command-line tools:

| Command | What it does |
| --- | --- |
| `npm run check-ai` | Checks your `.env` and lists the models your key can use |
| `npm run extract -- unit.pdf --out unit.txt` | Reads a unit (PDF or photos) into text |
| `npm run generate -- unit.txt --out my.pack.json` | Makes a pack from that text |
| `npm run validate -- my.pack.json` | Checks a pack against the [pack format](docs/pack-format.md) |

[Ollama](https://ollama.com) runs models on your own computer, for free and without sending anything out.

### Where things are

| Folder | What is inside |
| --- | --- |
| `src/pack/` | The pack format (`schema.ts`) and its validation |
| `src/extract/`, `src/generate/`, `src/ai/` | Reading units, writing packs, and the AI providers |
| `app/src/` | The web app: games, review, generator, languages (`i18n.ts`), skins |
| `test/` | Unit tests (Vitest) |
| `scripts/audit.mts` | The automatic audit |
| `docs/adr/` | Architecture decisions: read them before changing how things work |
| `docs/gestion/` | Project management (charter, status reports), mostly in Spanish |

## Run the tests and the audit

Before proposing a change, all of these must pass:

```bash
npm run typecheck
npm test
npm run audit
```

- `npm test` runs the unit tests without network or AI.
- `npm run audit` builds the app and plays it in a headless browser like a child would: every level of three packs, always right and at random, at 375, 768 and 1440 px, in the three languages, the generator, the review and offline. It fails on any layout problem or JavaScript error and writes its report to `docs/gestion/auditoria-o2.md` (screenshots go to `audit-output/`, which is not committed). The first time, install the browser it uses: `npx playwright install chromium --only-shell`.
- Optional, with your own setup: `npm run test:ollama` (a local vision model) and `npm run test:live` (calls the AI providers in your `.env`; it may cost money).

The same typecheck, tests and audit run on GitHub before every deploy of the app, and a failed audit stops the deploy.

## Propose a change

1. **Fork** the repository and create a branch for your change.
2. **Keep it small:** one improvement per pull request is easier to review and to accept.
3. **Add or update tests** for what you change. If you touch the pack format, update [`docs/pack-format.md`](docs/pack-format.md) too (a test checks that they match).
4. **Check it at 375, 768 and 1440 px** if it changes what people see, and write texts that a family with no technical knowledge understands.
5. **Open a pull request** in English (or Spanish or Catalan) that explains what changes and why, with screenshots for anything visible, and says that typecheck, tests and audit pass.

The project manager reviews and accepts every change. Not every good idea fits: the project stays small on purpose, so new features that need accounts, servers or tracking are out of scope.

## Add a language

The interface speaks Catalan, Spanish and English. A new language (say Galician, `gl`) needs:

1. **The texts:** in [`app/src/i18n.ts`](app/src/i18n.ts), copy the `en` object to a new `const gl: Dict = { … }` and translate every text. `es` defines the keys and every other language is declared as `Dict`, so the compiler tells you if a text is missing. Texts with variables are functions, so each language can order the sentence its own way.
2. **Register it:** add it to `UI_LANGS` and `UI_LANG_NAMES` (its name in its own language), and add its name to `langNames` in every language.
3. **The generator:** add the code to the list of unit languages in [`app/src/generator/Generator.tsx`](app/src/generator/Generator.tsx) and its English name to `LANGUAGE_NAMES` in [`src/generate/prompt.ts`](src/generate/prompt.ts), so the AI writes packs in it.
4. **Check it:** run the tests and the audit, and play a whole unit in the new language at 375 px: long words must not break the layout.

Inside a unit, the app speaks the pack's language when it knows it, so a child never sees two languages on the same screen.

## Add a skin

A skin only changes colours (the look is a blocky world with dinosaurs). To add one, say `ocean`:

1. **Colours:** in [`app/src/styles.css`](app/src/styles.css), add a `[data-skin="ocean"] { … }` block that sets **every** token the `blocks` skin sets. A test checks that all skins define the same tokens and that text keeps a contrast of at least 4.5:1 (WCAG AA).
2. **Register it** in [`app/src/skins.ts`](app/src/skins.ts): add it to `SKINS`, give it an emoji in `SKIN_EMOJI`, and set `SKIN_THEME_COLOR` to its `--grass-dk` colour (a test keeps them equal).
3. **Name it** in `skinNames` in every language in `app/src/i18n.ts`.
4. **Check it** with the tests and the audit, and look at it next to the other skins: it must be original (no trademarks) and easy to read.

## Share a pack

Packs are JSON files that follow the [pack format](docs/pack-format.md).

- **With a family or a class:** in the app, open the unit and choose **Share**, then send the link (the pack travels inside it, no server involved) or save the file and open it with **Load a pack** on the other device.
- **In this repository:** example packs are welcome in `examples/` if you wrote the text yourself or it has an open license, they contain no data about children, they pass `npm run validate`, and an adult has reviewed every question. Packs made from copyrighted textbooks cannot be accepted.

## Ideas open to the community

Improvements that came out of testing with families and that the project would like to have. Pick one, and say in your pull request which one it is:

- **Several worlds per unit.** Today a unit is one world; the original prototype split a unit into three sessions with different content, so a child does not repeat the same questions.
- **A final summary of the unit.** A last screen with the key ideas, to read before the exam.
- **The pack's language in the content, for screen readers.** Set `lang` on the questions and answers so a screen reader pronounces them in the pack's language even when the interface is in another one.
- **Show the pack's instructions.** Games may have `instructions` in the pack, but the player does not show them yet: show them at the start of each game.
- **Limit repeated categories.** In classify games the categories stay in place, so the right one can be the same several items in a row. Order the items so a child cannot win by tapping the same category again, as the other games already do with the position of the right answer.
- **An even shorter review.** Questions are already read at a glance and only the wrong ones are opened. Going further: show first only the questions most likely to be wrong, so a busy parent checks those.

## License

By contributing, you agree that your contribution is released under the [MIT License](LICENSE) of the project.
