export function playlistId(value) {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('Paste a public Spotify playlist link.');
  const uri = value.trim().match(/^spotify:playlist:([a-zA-Z0-9]{22})$/);
  if (uri) return uri[1];
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('Paste a public Spotify playlist link.'); }
  const match = url.pathname.match(/^\/(?:intl-[a-z-]+\/)?(?:embed\/)?playlist\/([a-zA-Z0-9]{22})\/?$/);
  if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com' || url.port || url.username || url.password || !match) throw new Error('Use an open.spotify.com/playlist/… link, not an album or track link.');
  return match[1];
}

export function extractPlaylist(html, id) {
  const match = html.match(/<script\b(?=[^>]*\bid=["']__NEXT_DATA__["'])[^>]*>([\s\S]*?)<\/script>/i);
  if (!match) throw new Error('Spotify did not expose this playlist. Make sure it is public and try again.');
  let entity;
  try { entity = JSON.parse(match[1]).props.pageProps.state.data.entity; } catch { /* unavailable embed */ }
  if (!entity || entity.type !== 'playlist' || !Array.isArray(entity.trackList)) throw new Error('This playlist is unavailable. Check that it is public; some Spotify-made playlists cannot be imported.');
  const seen = new Set();
  const tracks = entity.trackList.flatMap(track => {
    const trackId = track.uri?.match(/^spotify:track:([a-zA-Z0-9]{22})$/)?.[1];
    const preview = track.audioPreview?.url;
    if (!trackId || !track.title || !isPreviewUrl(preview) || seen.has(trackId)) return [];
    seen.add(trackId);
    return [{id: trackId, title: track.title, artist: track.subtitle || 'Unknown artist', preview, explicit: !!track.isExplicit}];
  });
  if (!tracks.length) throw new Error('This playlist has no available audio previews. Try another public playlist.');
  const image = entity.coverArt?.sources?.[0]?.url;
  return {id, name: entity.name || entity.title || 'Your playlist', owner: entity.subtitle || '', image: typeof image === 'string' && /^https:\/\/[a-z0-9.-]+\.spotifycdn\.com\//i.test(image) ? image : null, exposed: entity.trackList.length, skipped: entity.trackList.length - tracks.length, tracks};
}

export function isPreviewUrl(value) {
  if (typeof value !== 'string') return false;
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'p.scdn.co' && !url.port && !url.username && !url.password && url.pathname.startsWith('/mp3-preview/'); } catch { return false; }
}

export const levels = {Easy:[0.1,0.5,2,8,15], Medium:[0.1,0.5,2,5,10], Hard:[0.1,0.3,1,3,5], Expert:[0.1,0.2,0.5,1,2], Impossible:[0.1]};
