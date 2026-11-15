# Ask Zaen

A calm, parent-curated media library for young children. Browse sensory-aware titles, filter by language and age, and open each title in the streaming service you already use.

## What's inside

- **Sanctuary** — featured calm picks, a platform filter, and curated shelves.
- **Discover** — weighted local search (accent- and typo-tolerant), sanctuary gates, and age tiers.
- **Languages** — choose a language to shape the whole library, with a dedicated browse page.
- **My List** — saved titles persisted on device.
- **Detail sheet** — a plain-language verdict (Healthy pick / Okay in moderation / Too stimulating), a "What to expect" sensory note with an optional assessment breakdown, episode lists for shows, and a platform-aware handoff such as "Watch on Netflix".
- **Episodes** — season and episode browsing linked to the parent show.

Playback is external by design: the app recommends, the parent opens the service.

## Content model

Titles come from `constants/bundled_kids_media.json` through `constants/mediaSource.ts`. Each item carries a language, age group, platform URL, and an optional sensory profile. Episodes reference their show through `parent_show_id`.

To connect a separate database, reimplement the functions in `constants/mediaSource.ts`; the screens do not need to change.

The sensory verdict is our editorial read, not a medical certification.

## Run

```bash
cd scratch/netflix-expo
npm run web      # http://localhost:8081
npm run android
npm run ios      # macOS only
```

## Checks

```bash
npx tsc --noEmit
npx expo export --platform web
```
