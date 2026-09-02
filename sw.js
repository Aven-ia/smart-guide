/* Le numéro de cache change à chaque modification de cette liste : sans ça, un
   appareil déjà installé garderait l'ancien précache et n'irait jamais chercher
   les nouveaux fichiers. */
const CACHE='smart-guide-v4.1.0';
/* LE PREMIER ÉCRAN NE SE CHARGE PAS EN DEUX FOIS. « bob-trois-quarts » est sur
   le tableau de bord vierge, c'est-à-dire la toute première chose qu'un gérant
   voit : sans précache, un premier lancement hors ligne lui montre un cadre
   vide. « bob-carte » n'apparaît qu'à une recherche infructueuse — la mise en
   cache paresseuse du gestionnaire de `fetch` suffit pour lui. */
const CORE=['./index.html','./bob-trois-quarts.png'];
self.addEventListener('install',e=>{ self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{})); });
self.addEventListener('activate',e=>{ e.waitUntil((async()=>{ const ks=await caches.keys(); await Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))); await self.clients.claim(); })()); });
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin===location.origin && (req.mode==='navigate'||url.pathname.endsWith('index.html'))){
    e.respondWith((async()=>{ try{ const r=await fetch(req); (await caches.open(CACHE)).put('./index.html',r.clone()); return r; }catch(_){ return (await caches.match('./index.html'))||Response.error(); } })());
    return;
  }
  e.respondWith((async()=>{
    const hit=await caches.match(req);
    if(hit){ fetch(req).then(r=>{ if(r.ok) caches.open(CACHE).then(c=>c.put(req,r)); }).catch(()=>{}); return hit; }
    try{ const r=await fetch(req); if(r.ok&&(url.origin===location.origin||/fonts|cdnjs/.test(url.host))) (await caches.open(CACHE)).put(req,r.clone()); return r; }
    catch(_){ return Response.error(); }
  })());
});