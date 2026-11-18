# சொல்வளம் — Tamil Lexicon & Sangam Literary Archive

(Formerly சங்கச் சொல்.) The site is designed as an antique Tamil dictionary lying open on a walnut
reading desk. The home page (`/`) is the title opening; the explorer (`/entry/<id>`; the அகராதி and Browse links open it at today's word)
is a two-page spread, with search, alphabet and sections on the left and the word on the right.
Every other page is set on a single parchment leaf. On tablets and phones the spread becomes one
leaf at a time, with a switch between தேடல் (search) and the word.

A Tamil-first dictionary for Sangam literature. Readers can find a word, read its meaning
in modern Tamil, English, Hindi, Malayalam or Telugu, open the poem where it occurs,
and save or cite what they find. Built with React, TypeScript and Vite. There is no
backend: saved words and preferences stay in the reader's browser.

```bash
npm install
npm run dev      # validates content/, then serves http://localhost:5173
npm run build    # validates content/, type-checks, builds dist/
npm start        # production: serves dist/ and the /api routes (see "Languages, translation and speech")
```

Production hosting must serve `index.html` for unknown paths (SPA fallback), because
entry, poem and search URLs are client-side routes.

## Features

- **Home:** search in three directions (Tamil → English, English → Tamil, Tamil → Tamil), plus Browse Words, Word of the Day, Recent Searches (`/history`) and Favorites (`/saved`).
- **Explorer:** search by Tamil word, English meaning or transliteration; an alphabet index that opens உயிர்மெய் syllables and their words in place; numbered definitions; etymology, synonyms, antonyms and literary usage; a Sangam citation panel; related words; meanings in every configured language; pronunciation (a recording if present, otherwise the device's Tamil speech voice); save, share, text size, previous and next entry.
- **Interface language:** the தமிழ் / English switch in the masthead changes navigation and labels. Headwords, definitions and verses stay in Tamil.
- Search results are paginated (`?page=`). Recent searches are kept in this browser only.
- **No invented content.** Sections without a sourced record show a labelled placeholder instead of filler.

- **Search** in three scopes, all shareable by URL (`/search?q=…&scope=word|meaning|poem&work=…&tinai=…&pos=…&topic=…&letter=…`):
  - **Words:** headwords, spelling variants, inflected forms, sandhi forms attested in the poems, and romanized aliases. Exact headword matches rank first.
  - **Meanings:** reverse lookup through translations in any language. Shows the sense that matched.
  - **Poems:** verse text, ignoring word breaks and sandhi joins. Shows a snippet and its reference.
  - Also: Tamil Unicode normalization, keyboard autocomplete (ARIA combobox), IME-safe input, a clear button, spelling suggestions, and empty-result recovery.
- **Browse** by Tamil letter, work, part of speech, tiṇai and topic.
- **Entry pages** (`/entry/<id>`, senses at `#<sense-id>`):
  - Numbered senses, each showing the modern Tamil definition and the chosen translation, plus an "எல்லா மொழிகளிலும்" comparison.
  - The Sangam quotation for each sense, with the attested form highlighted.
  - Occurrences in other indexed poems, filterable by work.
  - Forms, related words, notes with sources, separate homographs, and pronunciation audio when a recording exists.
  - Save, copy link, copy citation, and report an error.
- **Works index → work page → poem page** (`/works/<work>/<n>?line=…`):
  - Linked words open a compact definition panel showing the sense recorded for that line. It works with touch and keyboard and returns focus on close.
- **Saved words** (`/saved`): local storage, search, removal, and CSV export.
- **Sources page** (`/sources`): editions, licences, and coverage counts generated from the data.

## Languages, translation and speech (Azure)

- **Language selector** (header and home bar): Tamil by default, remembered in the browser. Tamil and English have interface strings (`src/context/UiLanguage.tsx`); every other language in Azure Translator's list shows menus in English, and the selector says so.
- **Content translation**: on a word page, each definition gets a line in the chosen language. The dictionary's own stored meaning is used when it has one; otherwise Azure AI Translator translates the Tamil. Notes and the Sangam quotation are translated too, with the translation shown next to the original verse. Machine translations are labelled. If translation fails, the original stays and a notice says why. The headword, transliteration, quotations and source citations are never replaced.
- **Pronunciation**: the speaker next to a headword sends the Tamil headword to Azure AI Speech with the voice `ta-IN-PallaviNeural`, whatever the display language.
- **Read this page**: Play / Pause / Resume / Stop in the header. It reads the visible main content in order, using the Tamil voice for Tamil text and a matching Azure voice for each other language. Languages without a voice are skipped, with a message. It stops when you change page or press a word's speaker, and it never starts by itself.

The browser only talks to this site's own `/api` routes (`server/api.mjs`). Azure keys stay on the server.

| Route | Purpose |
| --- | --- |
| `GET /api/status` | Which Azure services are configured |
| `GET /api/languages` | Azure Translator languages (cached 24 h) |
| `GET /api/voices` | One neural voice per language, from the Azure Speech voice list (cached 24 h) |
| `POST /api/translate` | `{ texts, to, from? }` — up to 50 texts, 1,000 characters each, 5,000 in total; cached |
| `POST /api/speak` | `{ text, lang?, voice? }` → MP3; up to 1,000 characters; cached |

Each client IP may make 60 translate and 60 speak requests per minute.

### Setup

```bash
cp .env.example .env      # then fill in the keys (never commit .env)
npm run dev               # site + /api on http://localhost:5173
```

| Variable | Required | Notes |
| --- | --- | --- |
| `AZURE_TRANSLATOR_KEY` | for translation | Translator resource key |
| `AZURE_TRANSLATOR_REGION` | for regional / multi-service resources | e.g. `centralindia`; leave empty for a global Translator resource |
| `AZURE_TRANSLATOR_ENDPOINT` | no | defaults to `https://api.cognitive.microsofttranslator.com` |
| `AZURE_SPEECH_KEY` | for audio | Speech resource key |
| `AZURE_SPEECH_REGION` | for audio | e.g. `centralindia`; the region must offer `ta-IN-PallaviNeural` |
| `PORT` | no | production server port (default 8787) |

Without keys the site still works: stored meanings show, and translation and audio controls explain that the service is not configured.

### Deploying

There was no hosting configuration in this repository, and `/api` needs a server, so a static host alone (GitHub Pages, plain Netlify/Vercel static) will not run it. Deploy as a Node app (Node 22.9+):

```bash
npm ci
npm run build
npm start                 # serves dist/ and /api on $PORT, with SPA fallback for client routes
```

On Azure App Service (Linux, Node 22), set the startup command to `npm start` and add the variables above as Application settings. The same works on any Node host (Render, Railway, a VM). If you later move to Vercel or Netlify, `createApi` in `server/api.mjs` is a plain `(req, res)` handler that can be wrapped in a serverless function.

## Modern-Tamil vocabulary

An optional second layer of about 1,000 modern-Tamil core words (literary and colloquial forms, Roman transcription, English meanings, verb classes, topics), imported from a reference book. Its data is kept outside this repository in `content/sources/vocab/`; without it the site builds with the Sangam dictionary only. Browse by letter at `/letters`, by topic at `/topics`; review in the dev-only editor at `/editor`. See DATA.md.

## Content

See [DATA.md](DATA.md) for the data model, stable IDs, the CSV/JSON import workflow, and
the validator.

Current corpus: Kuṟuntokai 1–40 and Puṟanāṉūṟu 191–200, from Tamil Wikisource (CC BY-SA 4.0).
All definitions and translations are unreviewed drafts and are labelled as such in the UI.

## Structure

```
content/            editable source data (CSV + JSON)  → see DATA.md
scripts/            build-data, import, extract-wikisource, lib/content (validator)
src/data/           typed access to the compiled data (generated/ is git-ignored)
src/utils/          search, Tamil normalization, languages, storage, citation/CSV
src/components/     header, search bar, letter index, entry rows, report dialog, …
src/pages/          home, search, entry, works, work, poem, tiṇai, saved, about, sources
src/components/book/ the book shell (Book, Leaf) and all SVG artwork (engravings, desk objects, ornaments, icons)
src/styles/main.css tokens, type and in-page components
src/styles/book.css desk, book, masthead, home and explorer spreads, responsive and motion
```
