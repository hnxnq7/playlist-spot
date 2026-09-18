# Playlist Spot

A SongSpot-inspired music guessing game using public Spotify playlist previews. Built with Node.js 22+ and browser Web Audio; no dependencies or API keys.

## Run

```sh
npm start
```

Open http://localhost:3000 and paste a public Spotify playlist link. `PORT` may be set to choose another local port. `npm test` checks playlist parsing and URL validation.

## What works

- Public playlist import, available-preview counts, and useful failures.
- Five difficulty levels, precise Web Audio clip limits, guesses with keyboard-accessible suggestions, skips, song reveals, points, and streaks.
- Shuffled rounds without repeats until the imported set is exhausted.
- Preview-start or random-position playback, volume, responsive layout, and instructions.

## Integration limitations

This is an experimental local prototype. It reads data exposed in Spotify's unauthenticated public embed HTML; this is not a supported Spotify API contract and may change or fail. It imports only the exposed tracks with previews, not a guaranteed complete playlist. Private playlists and some Spotify-curated playlists are unavailable. Audio clues start from the provided preview and are not necessarily a song's opening.

Spotify's developer policy excludes games/trivia, and development-mode API access also restricts playlist items. This prototype should not be represented as an approved Spotify integration. A publicly distributed product needs an approved/licensed music and playlist source; do not assume public previews grant permission to deploy a game.

References: https://developer.spotify.com/policy and https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide

No user authentication, account credentials, analytics, or persistent playlist storage. The server binds to loopback only. Playlist metadata caches are bounded and short-lived in process; fetched preview audio is streamed into a size-bounded buffer and not stored on disk. External fetches are restricted to Spotify playlist embeds and validated Spotify preview URLs.
