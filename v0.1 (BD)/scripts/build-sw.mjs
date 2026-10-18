import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root=path.resolve('dist');
async function walk(dir){
  const entries=await readdir(dir,{withFileTypes:true});
  const lists=await Promise.all(entries.map(e=>e.isDirectory()?walk(path.join(dir,e.name)):Promise.resolve([path.join(dir,e.name)])));
  return lists.flat();
}
const files=(await walk(root)).filter(p=>!p.endsWith('/sw.js') && !p.endsWith('.map'));
const hash=createHash('sha256');
for(const file of files.sort()) hash.update(await readFile(file));
const version=hash.digest('hex').slice(0,16);
const urls=files.map(p=>'/'+path.relative(root,p).split(path.sep).join('/'));
urls.push('/');
await writeFile(path.join(root,'sw.js'),`
const CACHE='kings-shell-${version}';
const ASSETS=${JSON.stringify(urls)};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('kings-shell-') && k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET' || url.origin!==self.location.origin || url.pathname.startsWith('/api/')) return;
  if(event.request.mode==='navigate') {
    event.respondWith(fetch(event.request).catch(()=>caches.match('/index.html')));
    return;
  }
  if(ASSETS.includes(url.pathname)) event.respondWith(caches.open(CACHE).then(async cache=>{
    const cached=await cache.match(event.request);
    return cached || fetch(event.request);
  }));
});
`);
console.log(`PWA: ${urls.length} arquivos públicos, versão ${version}.`);
