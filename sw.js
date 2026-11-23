// SGT · service worker: permite instalar o app e abrir a tela mesmo com internet instável.
// Sempre tenta a versão mais nova na rede; usa a cópia guardada só quando estiver sem conexão.
// Dados do banco (Supabase) nunca são guardados aqui.
const CACHE = "sgt-v20";
const BASICO = ["./", "index.html", "ferias.js", "talentos.js", "encaminhamentos.js", "ouvidoria.js", "links.js", "dados.js", "app.js", "quadro.js", "carometro.js", "ganews.js", "orcamento.js", "ciclo-instrumento.js", "ciclos.js", "ciclos-telas.js", "ciclos-condutas.js", "rpa.js", "seguranca.js", "notificacoes.js", "cat.html",
  "manifest.webmanifest", "icones/sgt-192.png", "icones/sgt-512.png", "ouvidoria/", "links/"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASICO).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;   // banco, e-mails e CDNs: direto na rede
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("index.html"))));
});
