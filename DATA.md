# Content and import workflow

All dictionary content lives in `content/`. The app never reads it directly:
`scripts/build-data.mjs` validates it and compiles it into `src/data/generated/`
(git-ignored). That runs automatically before `npm run dev` and `npm run build`.

```
content/
  entries.csv        one row per headword
  senses.csv         numbered senses with the modern Tamil definition
  translations.csv   one row per sense × language
  citations.csv      links from a sense to an exact line of a poem
  notes.csv          grammar / etymology / usage notes, each with a source
  poems/*.json       poem text, one file per work
  works.json         literary works (listed even when no poems are loaded)
  sources.json       editions and editorial sources, with licence and notes
  languages.json     meaning languages (exactly one has "base": true)
  topics.json        topic categories for browsing
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run data` | Validate `content/` and regenerate `src/data/generated/`. |
| `npm run data:check` | Validate only; exits 1 on any error (use in CI). |
| `npm run data:import -- <dir> [--dry-run] [--replace]` | Merge a batch of new rows into `content/`, validating the combined result first. Nothing is written if anything fails. |
| `node scripts/extract-wikisource.mjs <kuruntokai\|purananuru> <out.json> <raw.txt…>` | Turn Tamil Wikisource wikitext (`?action=raw`) into poem JSON. Takes only verse and metadata, not the commentary. |

## Stable IDs

IDs are lowercase ASCII with hyphens, and they appear in public URLs, so never change
one after publishing.

- entry: `nenjam`, homographs `ma-horse` / `ma-mango` → `/entry/nenjam`
- sense: `nenjam-1` → `/entry/nenjam#nenjam-1`. A sense keeps its ID if it is renumbered.
- poem: `<workId>-<number>`, e.g. `kuruntokai-40` → `/works/kuruntokai/40`
- citation: any unique ID, e.g. `c-nenjam-kt40`

## File formats

CSV files are UTF-8 with a header row. Quote fields that contain commas. Use `|` to
separate list values inside a field.

**entries.csv**: `id, headword, homograph, transliteration, pos, roman_aliases, spelling_variants, inflected_forms, related, topics, tinai, audio, status, source_id`
- `homograph` is required (1, 2, …) when two entries share a spelling.
- `related` lists entry IDs. `topics` lists IDs from topics.json.
- `tinai` is one of the five akam tiṇai. Set it only when the word is a conventional marker of that landscape.
- `audio` is a URL to a recording (modern pronunciation). Leave it empty when there is none.
- `status` is `draft`, `reviewed` or `demo`.

**senses.csv**: `id, entry_id, number, definition_ta, source_id`

**translations.csv**: `sense_id, lang, text, explanatory, review_status, source_id`
- `explanatory` = `y` for a short explanatory gloss of a cultural concept, rather than a one-word equivalent.
- `review_status` = `reviewed` only after a fluent reviewer has checked it.
- A missing row is fine. Readers see "இந்த மொழியில் பொருள் இன்னும் சேர்க்கப்படவில்லை" and the Tamil definition.

**citations.csv**: `id, entry_id, sense_id, poem_id, line, form, featured, review_status, source_id`
- `line` is 1-based and follows the line breaks in the poem JSON.
- `form` is the word **exactly as printed in that line**, including sandhi (e.g. `மூரன்` for ஊரன், `றோழி` for தோழி).
- `featured` = `y` shows the citation as the quotation under its sense. All other citations are listed under "பிற பாடல்களில்".

**poems/*.json**: an array of
`{ id, workId, number, tinai, turai, speaker, poet, lines[], readings[{line, note}], sourceId, reviewStatus, provenance }`.
Keep the original text and line breaks. Put alternate readings in `readings`, not in the line.

## What the validator rejects

- Duplicate IDs (entries, senses, citations, notes, poems, works, sources), duplicate sense numbers within an entry, duplicate poem numbers within a work, duplicate sense × language translations.
- References to things that do not exist: entry, sense, poem, work, source, topic, language, or related entry. It also rejects a sense cited under the wrong entry.
- **Broken entry-to-poem links**: a line number outside the poem, or a `form` that does not occur in the cited line.
- Two entries with the same headword without homograph numbers, non-Tamil headwords, entries with no senses, and unknown status values.

Warnings (non-fatal): translations that contain Tamil script, and how many sense × language pairs are still missing.

## Adding a language

1. Add `{ "code": "kn", "label": "ಕನ್ನಡ", "englishName": "Kannada" }` to `languages.json`.
2. Add `translations.csv` rows with `lang` = `kn`.
3. Add a font rule for the script in `src/styles/main.css` (e.g. `:lang(kn) { font-family: 'Noto Sans Kannada', … }`) and the font to the Google Fonts import.

No other code changes are needed. The selector, entry pages, CSV export and sources page all read `languages.json`.

## Adding a work or poems

1. Add the work to `works.json`, with a `sourceId` that points at a new entry in `sources.json`. Record the licence and what was checked.
2. Add `content/poems/<workId>.json`, or put it in an import batch under `poems/`.
3. Add citations linking dictionary senses to lines. Run `npm run data:check` until it passes.

Only use text whose reuse terms permit publication, and never type verses from memory.
Mark text `"reviewStatus": "unreviewed"` until it has been compared against a named print edition.

## Example import batch

```
batch/
  translations.csv   sense_id,lang,text,explanatory,review_status,source_id
                     manra-1,hi,"निश्चय ही; अवश्य",,unreviewed,editorial-draft
```
```
npm run data:import -- batch --dry-run   # check
npm run data:import -- batch             # write into content/
npm run data                             # regenerate app data
```

## Imported reference vocabulary (optional, kept locally)

A second dictionary layer of modern-Tamil core words, kept apart from the Sangam entries and shown with a
**நவீனத் தமிழ்** tag. Its data, its source record and the book-specific scripts live only on the
maintainer's machine and are git-ignored:

| Local path | Contents |
|---|---|
| `content/sources/vocab/source.json` | the source record (title, licence, notes) |
| `content/sources/vocab/extracted/` | stage 1: text layer of the PDF, per page |
| `content/sources/vocab/transcription/` | stage 2: Tamil, Roman and English read from the page images |
| `content/sources/vocab/review.json`, `links.csv`, `topics.json` | editor decisions, checked links, topic headings |
| `content/sources/vocab/import/` | stage 3 output, merged into the site by `npm run data` |
| `scripts/vocab/extract.py`, `scripts/vocab/import.mjs` | extraction and import for this book |
| `public/source-pages/vocab/` | page images for the editor |

If the folder is absent the site builds normally with the Sangam dictionary alone.

**Commands** (when the local files are present): `npm run vocab:import` (validate and merge; also runs
before `dev`/`build`), `npm run vocab:status` (counts only), `npm run dev` then `/editor` to review.

**Records and review.** Record ids are `mc-<reference number>`. Every stage is keyed by that number, so
re-running replaces records instead of duplicating them. Tamil was transcribed from page images with AI
assistance; each record stays *pending* until an editor compares it with the page in `/editor` and approves
it. The editor stores corrections, split meanings, and a modern Tamil explanation and Hindi/Malayalam/Telugu
translations per meaning, each with its origin (`editor` or `machine`; machine translations are labelled
on the site). English comes from the source.

**The editor** exists only in the dev server: the route is compiled out of production builds, and its write
API (`scripts/vocab/editor-plugin.mjs`) answers only loopback, same-origin requests carrying a per-session
token. A deployed static site has no way to edit data.

**Links to the Sangam dictionary** (`links.csv`: `ref,entry_id,sense_id,relation,note`) are added only after
checking headword, part of speech and sense; words merely spelled alike stay separate. Linked entries point
to each other.

**Publishing.** The site never names the source book: its records appear as "நவீனத் தமிழ்", the public source
id is neutral, and builds drop the page images. Nothing from this layer is presented as evidence of Sangam
usage; that needs a citation in `citations.csv`.
