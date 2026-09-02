/* Le numéro de cache change à chaque modification de cette liste : sans ça, un
   appareil déjà installé garderait l'ancien précache et n'irait jamais chercher
   les nouveaux fichiers. */
const CACHE='smart-guide-v4.3.0';
/* LE PREMIER ÉCRAN NE SE CHARGE PAS EN DEUX FOIS. « bob-carte » est dans
   l'en-tête du tableau de bord : c'est la toute première chose qu'un gérant
   voit, et sans précache un premier lancement hors ligne lui montrerait un
   cadre vide. Les deux autres poses ne servent nulle part aujourd'hui — elles
   ne sont ni ici, ni dans fichiers.txt. */
const CORE=['./index.html','./bob-carte.png'];
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
  /* UNE URL PARAMÉTRÉE EST UNE DEMANDE DE CONTOURNER LE CACHE, PAS D'Y ENTRER.
     Le gestionnaire mettait en cache toute requête GET réussie, chaîne de
     requête comprise : chaque « ?x=… » unique créait une entrée permanente et
     distincte, jamais relue. Et c'est notre propre documentation qui recommande
     d'ajouter un paramètre pour contourner le service worker — on avait écrit
     une consigne qui remplissait le cache qu'elle prétendait éviter.
     Mesuré avant correction : un usage normal complet — tableau de bord, six
     sections de l'atelier, aperçu, compte — ajoute ZÉRO entrée ; chaque
     contournement en ajoute exactement une, définitivement. */
  const parametree = url.search !== '';
  e.respondWith((async()=>{
    const hit=parametree ? null : await caches.match(req);
    if(hit){ fetch(req).then(r=>{ if(r.ok) caches.open(CACHE).then(c=>c.put(req,r)); }).catch(()=>{}); return hit; }
    try{ const r=await fetch(req);
      if(r.ok && !parametree && (url.origin===location.origin||/fonts|cdnjs/.test(url.host)))
        (await caches.open(CACHE)).put(req,r.clone());
      return r; }
    catch(_){ /* hors ligne : une URL paramétrée retombe sur la version sans paramètre */
      return (parametree ? await caches.match(url.origin+url.pathname) : null) || Response.error(); }
  })());
});