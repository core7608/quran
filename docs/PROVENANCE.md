# Data, Font & Asset Provenance

This app bundles a small, fixed set of Quranic data and fonts so that reading,
search and the madani Mushaf layout work fully offline. This document records
exactly where each bundled asset came from and under what terms, so the
provenance can be audited and reproduced.

Everything else — recitations, translations and non-bundled tafsir — is fetched
at runtime from public, key-less APIs and is **not** redistributed with the app.

---

## 1. Quran text — `assets/data/quran.json`

| | |
| --- | --- |
| Content | Complete Uthmani text, 114 surahs / 6236 ayat |
| Source | AlQuran Cloud — `quran-uthmani` edition (`https://api.alquran.cloud/v1/quran/quran-uthmani`) |
| Provider | AlQuran Cloud (https://alquran.cloud) |
| Upstream script | Uthmani (« النص العثماني ») as distributed by the Tanzil project |
| Bundled fields | `surah`, `ayah`, `globalNumber`, `juz`, `page`, `sajda` |
| `source` field | `"AlQuran Cloud — Quran Uthmani"` |

The bundled file is a reduction of the AlQuran Cloud `quran-uthmani` payload to
the fields the app needs (text + canonical numbering). It contains no
translations or transliterations.

## 2. Bundled tafsir — `assets/data/tafsir.json`

The app ships **exactly one** tafsir.

| | |
| --- | --- |
| Work | التفسير الميسّر (Tafsir al-Muyassar) |
| Author / publisher | مجمع الملك فهد لطباعة المصحف الشريف (King Fahd Complex for the Printing of the Holy Quran) |
| Edition id | `ar.muyassar` |
| Source | AlQuran Cloud — `ar.muyassar` edition (`https://api.alquran.cloud/v1/quran/ar.muyassar`) |
| Coverage | 100% of ayat (6236 entries), indexed `surahs[surah-1][ayah-1]` |
| `source` field | `"AlQuran Cloud — Tafsir al-Muyassar"` |

Licensing note: the tafsir text is published by the King Fahd Complex and is
distributed through the AlQuran Cloud and the Quranic Universal Library (QUL).
Its inclusion here relies on the publishers' terms for free electronic
distribution of the Mushaf and its tafsir; verify current terms at
https://qul.tarteel.ai/ before redistributing the bundle.

## 3. Mushaf page layout — `assets/data/mushaf-layout.json`

This drives the QCF Madani page renderer (per-word, RTL, 604 pages).

| | |
| --- | --- |
| Content | 604-page line/word layout of the Madani Mushaf (1405 AH print) |
| Package | `madani_package.zip` (v1.0) |
| Release | `SakinaDevGroup/al_quran_madani` |
| Layout & metrics | King Fahd Complex Mushaf layout, distributed via the Quranic Universal Library (QUL) |
| Archive SHA-256 | `5f2241819796d17025b1b5d8d2ac2bcccd7151c518b1e263c8cfdaa471450e88` |
| `source` field | `"Madani 1405 / QCF layout — SakinaDevGroup release v1.0; fonts via QUL/KFGQPC"` |

The JSON is a normalised projection of the package's page/line/word data:
line kinds are `s` (surah header), `b` (basmala) and `a` (ayah run), with
per-word ayah ownership so a tap can resolve to `surah:ayah`.

## 4. Madani (QCF) page fonts — `assets/mushaf/fonts/*.woff2`

| | |
| --- | --- |
| Content | 604 per-page QCF Madani fonts (`QCF_P001`…`QCF_P604`) |
| Plus | `surah-header.woff2`, `bismillah.woff2` ornament glyph sets |
| Origin | King Fahd Complex for the Printing of the Holy Quran (KFGQPC) |
| Distribution | Quranic Universal Library (QUL), via `SakinaDevGroup/al_quran_madani` |

`src/data/mushaf/fontModules.ts` is generated from this directory by
`node scripts/generate-font-map.mjs` (Metro requires literal `require()` calls).
Regenerate it whenever the font set changes.

Licensing note: Quranic page fonts remain the property of the King Fahd Complex
and are distributed under QUL's terms. They are intended for app-local rendering
of the Mushaf; **do not** re-host or redistribute them as a standalone package.

## 5. UI font — `assets/fonts/AmiriQuran.ttf`

| | |
| --- | --- |
| Font | Amiri Quran |
| Authors | The Amiri Quran Project Authors (https://github.com/aliftype/amiri) |
| License | SIL Open Font License, Version 1.1 |
| License file | `assets/fonts/OFL.txt` (bundled) |

Only `AmiriQuran-Regular` is bundled, and only to guarantee a readable Quran
face before the optimal QCF page font for the current page has loaded.

## 6. Not bundled (fetched at runtime)

| Data | Provider |
| --- | --- |
| Recitations (22 reciters) | AlQuran Cloud CDN (`https://cdn.islamic.network/quran/audio/…`) |
| Other tafsir editions | AlQuran Cloud (`ar.jalalayn`, `ar.miqbas`, …) |
| Translations | AlQuran Cloud (`/surah/{surah}/{edition}`) |

No API keys are required and none are bundled. No recitation audio is shipped
inside the app.

---

## Reproducing the bundle

- Quran & tafsir JSON: derived from the AlQuran Cloud `quran/quran-uthmani` and
  `quran/ar.muyassar` responses, reduced to the fields listed above.
- Page layout & fonts: extracted from `madani_package.zip` v1.0 (SHA-256 above)
  from the `SakinaDevGroup/al_quran_madani` release.
- Font map: `node scripts/generate-font-map.mjs`.
