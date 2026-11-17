// SGT · Central de avisos (sino no início)
// Mostra os avisos da tabela "notificacao" de quem está logado, com contador de não lidos.
(function(){
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const linkar = (t) => esc(t).replace(/https?:\/\/[^\s<]+/g, u => `<a href="${u}" class="not-link" data-url="${u}">${u.replace(/^https?:\/\//, "").slice(0, 60)}</a>`);
  const quando = (d) => {
    const s = (Date.now() - new Date(d)) / 1000;
    if (s < 3600) return `há ${Math.max(1, Math.round(s / 60))} min`;
    if (s < 86400) return `há ${Math.round(s / 3600)} h`;
    return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  };
  let avisos = [], timer = null;

  document.head.insertAdjacentHTML("beforeend", `<style>
    #v-inicio{position:relative}
    #sino{position:absolute;top:0;right:0;width:auto;margin:0;padding:8px 12px;font-size:18px;line-height:1;background:var(--superficie,#fff);color:var(--cor);border:1px solid var(--borda);border-radius:999px}
    #sino:hover{background:var(--cor-suave)}
    #sino b{display:inline-block;min-width:20px;margin-left:6px;padding:2px 6px;border-radius:999px;background:#E00E1B;color:#fff;font-size:12px;vertical-align:middle}
    #sino b:empty{display:none}
    #v-inicio h1{padding-right:90px}
    .not-item{border:1px solid var(--borda);border-radius:var(--raio);padding:12px 14px;margin-bottom:10px;font-size:14px;line-height:1.5}
    .not-item.nova{border-left:4px solid var(--magenta);background:var(--cor-suave)}
    .not-item b{display:block;font-size:15px}
    .not-item .q{font-size:12px;color:var(--texto-2);margin-top:4px}
    .not-item p{margin:6px 0 0;white-space:pre-line}
    .not-item a{color:var(--cor);font-weight:600;word-break:break-all}
  </style>`);

  $("ola").insertAdjacentHTML("beforebegin", `<button id="sino" class="sec" title="Avisos" aria-label="Avisos">🔔<b id="sino-n"></b></button>`);
  $("cartao").querySelector(".rodape").insertAdjacentHTML("beforebegin", `
  <section id="v-not" class="oculto">
    <div class="topo"><div><h1>Avisos</h1><div class="ajuda" style="margin:0">Mensagens do SGT para você. As mais importantes também chegam por e-mail.</div></div><button class="sec" data-ir="v-inicio">← Início</button></div>
    <div id="not-lista" style="margin-top:16px"></div>
    <div class="aviso" id="a-not"></div>
  </section>`);
  document.querySelector('#v-not [data-ir]').addEventListener("click", () => mostrar("v-inicio"));

  async function atualizar(){
    if (!lerSessao()) return;
    try {
      avisos = await api("/rest/v1/notificacao?select=id,titulo,corpo,link,criada_em,lida_em&order=criada_em.desc&limit=60");
      const n = avisos.filter(a => !a.lida_em).length;
      $("sino-n").textContent = n ? (n > 99 ? "99+" : n) : "";
      $("sino").setAttribute("aria-label", n ? `Avisos: ${n} não lidos` : "Avisos");
    } catch {}
    clearTimeout(timer); timer = setTimeout(atualizar, 120000);
  }

  function abrirLink(url){
    const base = location.origin + location.pathname;
    if (url.startsWith(base) || url.startsWith("https://sgtgaba.github.io/sgt/")) {
      const q = url.split("?")[1] || "";
      if (window.Seguranca && /trocar-senha/.test(q)) return Seguranca.abrir("seg-senha");
      if (window.Seguranca && /acessos/.test(q)) return Seguranca.abrir("seg-conf");
      return mostrar("v-inicio");
    }
    window.open(url, "_blank", "noopener");
  }

  async function abrir(){
    mostrar("v-not");
    await atualizar();
    $("not-lista").innerHTML = avisos.length ? avisos.map(a => `<div class="not-item ${a.lida_em ? "" : "nova"}">
      <b>${esc(a.titulo)}</b><div class="q">${quando(a.criada_em)}</div>
      ${a.corpo ? `<p>${linkar(a.corpo)}</p>` : ""}
      ${a.link && !(a.corpo || "").includes(a.link) ? `<div style="margin-top:6px"><a href="${esc(a.link)}" class="not-link" data-url="${esc(a.link)}">Abrir</a></div>` : ""}</div>`).join("")
      : `<div class="resumo">Você não tem avisos.</div>`;
    $("not-lista").querySelectorAll(".not-link").forEach(l => l.addEventListener("click", (e) => { e.preventDefault(); abrirLink(l.dataset.url); }));
    const novas = avisos.filter(a => !a.lida_em).map(a => a.id);
    if (novas.length) {
      try {
        await api(`/rest/v1/notificacao?id=in.(${novas.join(",")})`, { method: "PATCH", headers: { "Prefer": "return=minimal" }, body: JSON.stringify({ lida_em: new Date().toISOString() }) });
        avisos.forEach(a => { if (!a.lida_em) a.lida_em = new Date().toISOString(); });
        $("sino-n").textContent = "";
      } catch {}
    }
  }
  $("sino").addEventListener("click", abrir);

  window.Notificacoes = { atualizar, abrir };
})();
