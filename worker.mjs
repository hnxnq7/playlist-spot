import {playlistId, extractPlaylist, isPreviewUrl} from './public/playlist.mjs';

const headers = {'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const json = (value,status=200) => new Response(JSON.stringify(value), {status,headers:{...headers,'Content-Type':'application/json','Cache-Control':'no-store'}});

async function spotifyFetch(url, limit) {
  const response = await fetch(url, {redirect:'error',signal:AbortSignal.timeout(18000),headers:{'Accept-Language':'en-US,en;q=0.9','User-Agent':'Mozilla/5.0'}});
  if (!response.ok) throw new Error(response.status===429?'Spotify is limiting requests. Please try again later.':'Spotify could not load this playlist or preview. Try another public playlist.');
  const reader=response.body.getReader();const chunks=[];let length=0;
  try {
    while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit)throw new Error('The response was too large. Try a smaller playlist.');chunks.push(value);}
  }finally{await reader.cancel();}
  const data=new Uint8Array(length);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}return data;
}

export default {
  async fetch(request) {
    const url=new URL(request.url);
    if(request.method!=='GET' && request.method!=='HEAD')return json({error:'Method not allowed'},405);
    try {
      if(url.pathname==='/api/import') {
        let id;try{id=playlistId(url.searchParams.get('url'));}catch(error){return json({error:error.message},400);}
        const html=new TextDecoder().decode(await spotifyFetch(`https://open.spotify.com/embed/playlist/${id}`,5_000_000));
        const playlist=extractPlaylist(html,id);
        playlist.tracks=playlist.tracks.map(track=>({...track,preview:'/api/preview?url='+encodeURIComponent(track.preview)}));
        return json(playlist);
      }
      if(url.pathname==='/api/preview') {
        const preview=url.searchParams.get('url');
        if(!isPreviewUrl(preview))return json({error:'Invalid preview URL.'},400);
        const data=await spotifyFetch(preview,3_000_000);
        return new Response(request.method==='HEAD'?null:data,{headers:{...headers,'Content-Type':'audio/mpeg','Cache-Control':'private, max-age=300'}});
      }
      const asset=EMBEDDED_ASSETS[url.pathname==='/'?'/index.html':url.pathname];
      if(!asset)return json({error:'Not found'},404);
      return new Response(request.method==='HEAD'?null:asset.body,{headers:{...headers,'Content-Type':asset.type,'Cache-Control':'no-cache'}});
    }catch(error){return json({error:error.name==='TimeoutError'?'Spotify took too long to respond. Please try again.':error.message||'Could not load the playlist.'},502);}
  }
};
