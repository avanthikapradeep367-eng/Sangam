# சங்கச் சொல் — Sangam Tamil dictionary and reading companion

A Tamil-first dictionary for Sangam literature. Readers can find a word, read its meaning
in modern Tamil, English, Hindi, Malayalam or Telugu, open the poem where it occurs,
and save or cite what they find. Built with React, TypeScript and Vite. There is no
backend: saved words and preferences stay in the reader's browser.

```bash
npm install
npm run dev      # validates content/, then serves http://localhost:5173
npm run build    # validates content/, type-checks, builds dist/
```

Production hosting must serve `index.html` for unknown paths (SPA fallback), because
entry, poem and search URLs are client-side routes.

## Features

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
src/styles/main.css design tokens and all styles
```
