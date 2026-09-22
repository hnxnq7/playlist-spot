import {extractPlaylist, playlistId} from './playlist.mjs';
import {timelinePercent} from './timing.mjs';
const $ = id => document.getElementById(id);
const staticHosting = location.hostname.endsWith('.github.io');
const levels = {Easy:[0.1,0.5,2,8,15],Medium:[0.1,0.5,2,5,10],Hard:[0.1,0.3,1,3,5],Expert:[0.1,0.2,0.5,1,2],Impossible:[0.1]};
let playlist, track, queue=[], level='Easy', step=0, round=0, points=0, streak=0, ended=false, loading=false;
let context, gain, source, buffer, audioOffset=0, animation, generation=0, audioAbort, matches=[], selected=-1;
const guessed = new Set();
function audioContext(){
  if(!context){context=new AudioContext();gain=context.createGain();gain.connect(context.destination);gain.gain.value=Number($('volume').value)/100;}
  return context;
}
function stopAudio(){if(source){source.onended=null;try{source.stop();}catch{} source=null;}cancelAnimationFrame(animation);$('play').classList.remove('playing');$('play').setAttribute('aria-label','Play audio clip');$('progress').style.width='0%';}
function shuffle(items){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
function setStatus(message){$('play-status').textContent=message;}
function renderStages(){
  const durations=levels[level];$('duration').textContent=durations[step];
  const duration=durations[step];
  $('stages').replaceChildren();
  const start=document.createElement('span');start.textContent='0s';start.className='start';
  const end=document.createElement('span');end.textContent=duration+'s';end.className='end current';
  $('stages').append(start,end);
  $('ticks').replaceChildren();$('clip-limit').hidden=true;$('unlocked').hidden=true;
  $('progress').style.width='0%';
}
function controls(){const disabled=!track||ended||loading;$('play').disabled=disabled||!buffer;$('guess').disabled=disabled||!buffer;$('skip').disabled=disabled||!buffer;}
function closeSuggestions(){$('suggestions').hidden=true;$('guess').setAttribute('aria-expanded','false');$('guess').removeAttribute('aria-activedescendant');selected=-1;}
async function prepareAudio(token){
  loading=true;buffer=null;controls();setStatus('Loading your next mystery song…');
  audioAbort?.abort();audioAbort=new AbortController();
  try{
    const response=await fetch(track.preview,{signal:audioAbort.signal});
    if(!response.ok)throw new Error('Preview unavailable.');
    const decoded=await audioContext().decodeAudioData(await response.arrayBuffer());
    if(token!==generation)return;
    buffer=decoded;audioOffset=$('offset').value==='random'?Math.random()*Math.max(0,buffer.duration-15):0;
    setStatus('Ready when you are');
  }catch(error){
    if(token!==generation||error.name==='AbortError')return;
    setStatus('This preview could not play. Try another song.');
    $('next').textContent='Try another song →';$('next').hidden=false;
  }finally{if(token===generation){loading=false;controls();}}
}
function newRound(){
  if(!playlist)return;stopAudio();generation++;
  if(!queue.length){queue=shuffle(playlist.tracks);if(queue.length>1&&queue[queue.length-1].id===track?.id)[queue[0],queue[queue.length-1]]=[queue[queue.length-1],queue[0]];}
  track=queue.pop();round++;step=0;ended=false;guessed.clear();
  $('round-label').textContent=`ROUND ${String(round).padStart(2,'0')} · ${playlist.tracks.length} SONG${playlist.tracks.length===1?'':'S'}`;
  $('guess').value='';$('attempts').replaceChildren();$('result').hidden=true;$('guess-controls').hidden=false;$('next').hidden=true;$('next').textContent='Next song →';closeSuggestions();renderStages();prepareAudio(generation);
}
$('play').addEventListener('click',async()=>{
  if(!buffer||ended||loading)return;
  if(source){stopAudio();setStatus('Ready to replay');return;}
  const token=generation;await audioContext().resume();if(token!==generation||ended||!buffer)return;
  source=context.createBufferSource();source.buffer=buffer;source.connect(gain);
  const duration=Math.min(levels[level][step],buffer.duration-audioOffset);const start=context.currentTime;
  source.start(start,audioOffset,duration);$('play').classList.add('playing');$('play').setAttribute('aria-label','Stop audio clip');setStatus('Listen closely…');
  source.onended=()=>{source=null;cancelAnimationFrame(animation);$('play').classList.remove('playing');$('play').setAttribute('aria-label','Replay audio clip');$('progress').style.width='100%';setStatus('Know it? Search below. Or listen again.');};
  const animate=()=>{if(!source)return;$('progress').style.width=timelinePercent(context.currentTime-start,duration,duration)+'%';animation=requestAnimationFrame(animate);};animate();
});
function finish(correct){
  stopAudio();ended=true;controls();closeSuggestions();
  const earned=correct?(levels[level].length-step)*100:0;points+=earned;streak=correct?streak+1:0;
  $('score').textContent=points.toLocaleString();$('streak').textContent=streak;
  const result=$('result');result.replaceChildren();result.className='result'+(correct?'':' missed');
  const label=document.createElement('p');label.textContent=correct?`You got it! +${earned} points`:'The song was…';
  const title=document.createElement('h2');title.textContent=track.title;
  const artist=document.createElement('p');artist.textContent=track.artist;
  const link=document.createElement('a');link.href=`https://open.spotify.com/track/${track.id}`;link.textContent='Listen on Spotify ↗';link.target='_blank';link.rel='noopener noreferrer';
  result.append(label,title,artist,link);result.hidden=false;$('guess-controls').hidden=true;$('next').hidden=false;setStatus(correct?`Solved with ${levels[level][step]} seconds`:'A new song is one click away');$('next').focus();
}
function advance(label){
  stopAudio();const pill=document.createElement('span');pill.textContent=label;$('attempts').append(pill);$('guess').value='';closeSuggestions();
  if(step>=levels[level].length-1){finish(false);return;}
  step++;renderStages();setStatus(`More to go on. Listen to ${levels[level][step]} seconds.`);
}
function answer(candidate){if(!candidate||ended||loading||guessed.has(candidate.id))return;guessed.add(candidate.id);if(candidate.id===track.id)finish(true);else advance(`× ${candidate.title}`);}
$('skip').addEventListener('click',()=>advance(`Skipped ${levels[level][step]}s`));
$('next').addEventListener('click',newRound);
const normalize=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
$('guess').addEventListener('input',()=>{
  const query=normalize($('guess').value.trim());selected=-1;
  if(!query||!playlist){closeSuggestions();return;}
  matches=playlist.tracks.filter(t=>!guessed.has(t.id)&&normalize(t.title+' '+t.artist).includes(query)).slice(0,7);
  const list=$('suggestions');list.replaceChildren();
  for(const [index,candidate]of matches.entries()){
    const button=document.createElement('button');button.type='button';button.id=`suggestion-${index}`;button.setAttribute('role','option');button.setAttribute('aria-selected','false');button.tabIndex=-1;button.textContent=candidate.title;
    const artist=document.createElement('small');artist.textContent=candidate.artist;button.append(artist);button.addEventListener('click',()=>answer(candidate));list.append(button);
  }
  if(!matches.length){const empty=document.createElement('span');empty.className='no-match';empty.textContent='No matching song in this playlist.';list.append(empty);}
  list.hidden=false;$('guess').setAttribute('aria-expanded','true');
});
$('guess').addEventListener('keydown',event=>{
  if(event.key==='Escape'){closeSuggestions();return;}
  if($('suggestions').hidden||!matches.length)return;
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){
    event.preventDefault();selected=(selected+(event.key==='ArrowDown'?1:-1)+matches.length)%matches.length;
    [...$('suggestions').children].forEach((el,i)=>el.setAttribute('aria-selected',String(i===selected)));$('guess').setAttribute('aria-activedescendant',`suggestion-${selected}`);$('suggestions').children[selected].scrollIntoView({block:'nearest'});
  }
  if(event.key==='Enter'){event.preventDefault();if(selected>=0)answer(matches[selected]);else if(matches.length===1)answer(matches[0]);}
});
document.addEventListener('click',event=>{if(!event.target.closest('.search-wrap'))closeSuggestions();});
document.querySelectorAll('[data-level]').forEach(button=>button.addEventListener('click',()=>{
  if(level===button.dataset.level)return;level=button.dataset.level;
  document.querySelectorAll('[data-level]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));
  if(playlist)newRound();else{step=0;renderStages();}
}));
$('volume').addEventListener('input',()=>{if(gain)gain.gain.value=Number($('volume').value)/100;});
$('offset').addEventListener('change',()=>{stopAudio();if(buffer){audioOffset=$('offset').value==='random'?Math.random()*Math.max(0,buffer.duration-15):0;if(!ended)setStatus('Playback position updated');}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAudio();});
function usePlaylist(data){
    playlist=data;queue=[];track=null;round=0;points=0;streak=0;$('score').textContent='0';$('streak').textContent='0';document.body.classList.add('has-playlist');
    $('playlist-info').hidden=false;$('cover').hidden=!data.image;if(data.image)$('cover').src=data.image;
    $('playlist-link').textContent=data.name;$('playlist-link').href=`https://open.spotify.com/playlist/${data.id}`;
    $('playlist-meta').textContent=`${data.owner} · ${data.tracks.length} playable songs${data.skipped?` · ${data.skipped} unavailable`:''}`;
    $('import-note').textContent=`Imported ${data.tracks.length} of ${data.exposed} exposed tracks. Spotify may not expose the full playlist.`;
    newRound();
}
$('import-form').addEventListener('submit',async event=>{
  event.preventDefault();const button=$('import-button');button.disabled=true;button.textContent='Importing…';$('import-error').hidden=true;
  try{
    if(staticHosting){
      const id=playlistId($('playlist-url').value.trim());
      $('embed-link').href=`https://open.spotify.com/embed/playlist/${id}`;$('file-instructions').hidden=false;
      $('file-instructions').scrollIntoView({block:'nearest',behavior:'smooth'});return;
    }
    const response=await fetch(`/api/import?url=${encodeURIComponent($('playlist-url').value.trim())}`,{signal:AbortSignal.timeout(25000)});const data=await response.json();if(!response.ok)throw new Error(data.error);
    usePlaylist(data);
  }catch(error){$('import-error').textContent=error.name==='TimeoutError'?'Import timed out. Please try again.':error.message || 'Could not import this playlist.';$('import-error').hidden=false;}
  finally{button.disabled=false;button.textContent=staticHosting?'Prepare import →':'Import playlist →';}
});
$('help-open').addEventListener('click',()=>$('help').showModal());
['help-close','help-done'].forEach(id=>$(id).addEventListener('click',()=>$('help').close()));
$('help').addEventListener('click',event=>{if(event.target===$('help')){const r=$('help').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('help').close();}});
renderStages();

$('playlist-file').addEventListener('change',async()=>{
  const file=$('playlist-file').files[0];if(!file)return;$('import-error').hidden=true;
  try{
    if(file.size>10_000_000)throw new Error('Choose a playlist HTML file smaller than 10 MB.');
    const html=await file.text();
    const match=html.match(/spotify:playlist:([a-zA-Z0-9]{22})/);
    if(!match)throw new Error('Choose the saved Spotify embed page (.html), not the regular playlist page.');
    const data=extractPlaylist(html,match[1]);usePlaylist(data);$('file-instructions').hidden=true;
  }catch(error){$('import-error').textContent=error.message;$('import-error').hidden=false;}
  finally{$('playlist-file').value='';}
});
if(staticHosting){$('import-button').textContent='Prepare import →';$('import-note').textContent='On GitHub Pages, import a saved Spotify playlist page. Paste its link to get instructions.';$('file-import').hidden=false;}
