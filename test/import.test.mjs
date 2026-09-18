import test from 'node:test';
import assert from 'node:assert/strict';
import {playlistId,extractPlaylist} from '../lib.mjs';
const id='7CyyLHw9kox8vdQGlKuiKO';
test('accepts Spotify playlist links and URIs while rejecting unrelated hosts and paths',()=>{
  for(const value of [`https://open.spotify.com/playlist/${id}?si=test`,`https://open.spotify.com/intl-de/playlist/${id}`,`spotify:playlist:${id}`])assert.equal(playlistId(value),id);
  for(const value of [`https://evil.test/playlist/${id}`,`https://open.spotify.com/track/${id}`,`https://open.spotify.com.evil.test/playlist/${id}`,`https://user@open.spotify.com/playlist/${id}`,`http://open.spotify.com/playlist/${id}`,null])assert.throws(()=>playlistId(value));
});
test('extracts real preview tracks, filters missing audio, duplicates and arbitrary media hosts',()=>{
  const track={uri:`spotify:track:${id}`,title:'A title <script>',subtitle:'Artist',audioPreview:{url:'https://p.scdn.co/mp3-preview/test'}};
  const entity={type:'playlist',name:'My mix',trackList:[track,track,{...track,uri:'spotify:track:1vRsN6V8FNUVIsaZBRjIFZ',audioPreview:null},{...track,uri:'spotify:track:70cHKK8bHAfJrOGVnfRG9J',audioPreview:{url:'https://evil.test/audio'}}]};
  const html=`<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({props:{pageProps:{state:{data:{entity}}}}})}</script>`;
  const result=extractPlaylist(html,id);assert.equal(result.tracks.length,1);assert.equal(result.exposed,4);assert.equal(result.skipped,3);assert.equal(result.tracks[0].title,'A title <script>');
});
test('returns helpful errors for unavailable and changed Spotify responses',()=>{
  assert.throws(()=>extractPlaylist('<html>Unavailable</html>',id),/did not expose/);
  assert.throws(()=>extractPlaylist('<script id="__NEXT_DATA__">{"props":{"pageProps":{"status":500}}}</script>',id),/unavailable/);
});
