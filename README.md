# சங்கச் சொல் — Sangam Literature Tamil Dictionary

A modern, Tamil-first digital dictionary for Sangam literature (சங்க இலக்கியம்), built with React, TypeScript, and Vite.

## Features

- **Full Tamil Unicode search** — exact, prefix, alias, and transliteration matching
- **Keyboard-accessible** suggestions dropdown
- **Letter browse index** — expandable on mobile
- **Entry pages** — headword, part of speech, numbered Tamil definitions, English glosses, transliterations, and verified quotations with citation info
- **Works browser** — browse by literary work (குறுந்தொகை, நற்றிணை, அகநானூறு, etc.)
- **Responsive** — optimised for mobile Tamil rendering
- **Accessible** — ARIA roles, skip links, focus management

## Design

- Background: warm ivory (`#faf8f4`)
- Text: charcoal (`#2a2a2a`)
- Accent: deep maroon (`#7a1c2e`)
- Typography: Noto Serif Tamil (headwords, quotations) + Noto Sans Tamil (UI)

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── Header.tsx
│   ├── SearchBar.tsx
│   ├── LetterIndex.tsx
│   ├── EntryRow.tsx
│   └── QuotationBlock.tsx
├── data/             # JSON dataset (separate from UI)
│   ├── dictionary.json
│   └── works.json
├── pages/            # Route-level page components
│   ├── HomePage.tsx
│   ├── SearchResultsPage.tsx
│   ├── EntryPage.tsx
│   ├── WorksPage.tsx
│   ├── WorkDetailPage.tsx
│   └── AboutPage.tsx
├── styles/
│   └── main.css      # All styles (design tokens, components, responsive)
├── types/
│   └── index.ts      # TypeScript interfaces
└── utils/
    └── search.ts     # Search engine (exact/prefix/alias/transliteration)
```

## Data Structure

Each dictionary entry has:
- `id` — stable URL slug
- `headword` — Tamil headword
- `transliteration` — ISO romanisation
- `partOfSpeech` — Tamil part-of-speech label
- `aliases` — spelling variants and transliterations
- `senses` — numbered senses, each with definition, English gloss, and quotations
- `quotations` — text, work, poem number, source edition, verification status
- `relatedWords` — semantically related headwords
- `work` — primary literary work

## Getting Started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # Production build to dist/
```

## Data & Sources

Definitions and quotations are drawn from:
- **கழக வெளியீடுகள்** (Saiva Siddhanta Book Publishing Society, Chennai)
- **University of Madras Tamil Lexicon** (1924–1936)
- **தொல்காப்பியம்**, கழக வெளியீடு

Quotations marked ✓ have been verified against published editions.  
Quotations marked ⚠ are unverified — always check the primary source.

**Do not add invented Sangam verses or poem numbers** — use the `verified: false` flag and clear attribution for any uncertain material.
