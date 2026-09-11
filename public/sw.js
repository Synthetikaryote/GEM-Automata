/* Riftward's device-local game cache. No cross-origin or authentication endpoints are cached. */
const CACHE = 'riftward-first-light-v1';
const ASSETS = ['/art/battlefield.webp','/art/sprites.png','/art/icon-192.png','/art/icon-512.png','/art/apple-touch-icon.png','/art/icon-maskable.png','/manifest.webmanifest'];
const BASE = new URL('.', self.location.href).pathname;
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(async cache=>{await cache.addAll(ASSETS);const response=await fetch('/',{redirect:'error'});if(response.ok&&response.headers.get('content-type')?.includes('text/html'))await cache.put('/',response);await self.skipWaiting();})));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('riftward-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
  if(event.data?.type==='CACHE_RUNTIME'&&Array.isArray(event.data.urls)){
    const urls=event.data.urls.filter(value=>{try{const u=new URL(value);return u.origin===self.location.origin&&u.pathname.startsWith(BASE)&&/\.(js|css|woff2?)$/.test(u.pathname);}catch{return false;}});
    event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(urls.map(url=>cache.add(url)))));
  }
});
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(BASE)||url.pathname.startsWith('/api/')||url.pathname.includes('auth')||url.searchParams.has('_rsc'))return;
  if(req.mode==='navigate'&&url.pathname==='/'){
    event.respondWith(fetch(req).then(async response=>{if(response.ok&&!response.redirected&&response.headers.get('content-type')?.includes('text/html')){const cache=await caches.open(CACHE);await cache.put('/',response.clone());}return response;}).catch(async()=>await caches.open(CACHE).then(c=>c.match('/'))||new Response('Connect once to open Riftward.',{status:503,headers:{'Content-Type':'text/plain'}})));return;
  }
  if(!['script','style','image','font'].includes(req.destination)&&url.pathname!=='/manifest.webmanifest')return;
  event.respondWith(caches.open(CACHE).then(c=>c.match(req)).then(cached=>cached||fetch(req).then(response=>{if(response.ok&&!response.redirected){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,copy)));}return response;})));
});
