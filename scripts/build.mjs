import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const types={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',mjs:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',svg:'image/svg+xml'};
const assets=Object.create(null);
for(const name of await readdir(new URL('public/',root))){
  const type=types[name.split('.').at(-1)];if(!type)continue;
  assets['/'+name]={body:await readFile(new URL('public/'+name,root),'utf8'),type};
}
const parser=(await readFile(new URL('public/playlist.mjs',root),'utf8')).replace(/^export /gm,'');
const worker=(await readFile(new URL('worker.mjs',root),'utf8')).replace(/^import .*from '.\/public\/playlist.mjs';\n/,'');
await mkdir(new URL('dist/server/',root),{recursive:true});
await mkdir(new URL('dist/.openai/',root),{recursive:true});
await writeFile(new URL('dist/server/index.js',root),'const EMBEDDED_ASSETS = '+JSON.stringify(assets)+';\n'+parser+'\n'+worker);
await copyFile(new URL('.openai/hosting.json',root),new URL('dist/.openai/hosting.json',root));
console.log('Built the game and Spotify import server for Sites.');
