import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {playlistId, extractPlaylist} from './lib.mjs';

const publicDir = fileURLToPath(new URL('./public/', import.meta.url));
const previews = new Map();
const cache = new Map();
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
function json(res, status, value) {res.writeHead(status, {'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
async function remote(url, limit) {
  const response = await fetch(url, {signal:AbortSignal.timeout(18000),redirect:'error', headers:{'User-Agent':'Mozilla/5.0', 'Accept-Language':'en-US,en;q=0.9'}});
  if (!response.ok) throw new Error(response.status === 429 ? 'Spotify is temporarily limiting requests. Please try again later.' : 'Spotify could not load this playlist or preview. Please try another.');
  const chunks=[];let size=0;
  for await (const chunk of response.body) {size+=chunk.length;if(size>limit) throw new Error('The response was too large. Try a smaller playlist.');chunks.push(chunk);}
  return Buffer.concat(chunks);
}
const server = http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' https://*.spotifycdn.com; media-src 'self' blob:; connect-src 'self'; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  try {
    const url=new URL(req.url,'http://localhost');
    if(req.method!=='GET') return json(res,405,{error:'Method not allowed'});
    if(url.pathname==='/api/import') {
      let id;try{id=playlistId(url.searchParams.get('url'));}catch(e){return json(res,400,{error:e.message});}
      let data=cache.get(id);
      if(!data || Date.now()-data.at>300000) {
        const html=(await remote(`https://open.spotify.com/embed/playlist/${id}`,5_000_000)).toString('utf8');
        const playlist=extractPlaylist(html,id);
        for(const track of playlist.tracks) previews.set(track.id,track.preview);
        while(previews.size>5000) previews.delete(previews.keys().next().value);
        data={at:Date.now(),playlist};cache.set(id,data);
        while(cache.size>50) cache.delete(cache.keys().next().value);
      }
      const playlist={...data.playlist,tracks:data.playlist.tracks.map(({preview,...track})=>({...track,preview:`/api/preview/${track.id}`}))};
      return json(res,200,playlist);
    }
    if(url.pathname.startsWith('/api/preview/')) {
      const preview=previews.get(url.pathname.slice('/api/preview/'.length));
      if(!preview) return json(res,404,{error:'Preview expired. Import the playlist again.'});
      const buffer=await remote(preview,3_000_000);
      res.writeHead(200,{'Content-Type':'audio/mpeg','Cache-Control':'private, max-age=300','Content-Length':buffer.length});return res.end(buffer);
    }
    const files={'/':'index.html','/app.js':'app.js','/styles.css':'styles.css','/favicon.svg':'favicon.svg'};
    const file=files[url.pathname];if(!file) return json(res,404,{error:'Not found'});
    const body=await readFile(publicDir+file);res.writeHead(200,{'Content-Type':types[file.slice(file.lastIndexOf('.'))],'Cache-Control':'no-cache'});res.end(body);
  }catch(error){json(res,502,{error:error.name==='TimeoutError'?'Spotify took too long to respond. Please try again.':error.message || 'Something went wrong. Please try again.'});}
});
server.listen(Number(process.env.PORT)||3000,'127.0.0.1',()=>console.log(`Playlist Spot ready at http://localhost:${server.address().port}`));
