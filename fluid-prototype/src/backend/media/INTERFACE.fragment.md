## Media

### context/MediaContext.jsx
Provider: `<MediaProvider>`
Hook: `useMedia()`
Returns: `{ source, currentTrack, currentStation, isPlaying, progress, duration, play(url), pause(), seek(sec), setSource(src), playTrack(track), playStation(station) }`

### hooks/useSpotify.js
Hook: `useSpotify()`
Returns: `{ tracks, search(query), loadNewReleases(), loading, error }`

### hooks/useRadio.js
Hook: `useRadio()`
Returns: `{ stations, search(query), loadTop(country), loading, error }`

### services/spotifyService.js
- `spotifySearch(query, signal): Promise<Array<{id, title, artist, album, duration, previewUrl, artwork}>>`
- `getNewReleases(signal): Promise<Array<track>>`
- `getFallbackTracks(): Array<track>`

### services/radioService.js
- `getTopStations(country, limit, signal): Promise<Array<{id, name, url, favicon, country, tags}>>`
- `searchStations(query, limit, signal): Promise<Array<station>>`
- `getFallbackStations(): Array<station>`
