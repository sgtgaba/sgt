// SGT · GANews — revista do projeto em modo leitura (sem download nem impressão pelo SGT), com comentários.
// Edições em PDF guardadas em espaço privado; a leitura desenha as páginas na tela com o PDF.js.
// Usa as funções globais do index.html: api, aviso, mostrar, esc, eu, pode, temModulo, renovar, lerSessao, SUPABASE_URL, CHAVE_PUBLICA.
(() => {
  const $ = (id) => document.getElementById(id);
  const PDFJS = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/";
  let edicoes = [], doc = null, edicao = null, pag = 1, dupla = false, lib = null, editor = false;

  document.head.insertAdjacentHTML("beforeend", `<style>
    .gan-lista{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-top:14px}
    .gan-ed{border:1px solid var(--borda);border-radius:14px;overflow:hidden;background:var(--superficie,#fff);cursor:pointer;text-align:left;padding:0;margin:0;color:var(--texto);font-weight:400}
    .gan-ed:hover{border-color:var(--cor);background:var(--superficie,#fff)}
    .gan-capa{aspect-ratio:3/4;width:100%;display:grid;place-items:center;background:linear-gradient(135deg,#E00D7E,#ED7F0C);color:#fff;font-size:26px;font-weight:800;overflow:hidden}
    .gan-capa canvas{width:100%;height:100%;object-fit:cover}
    .gan-ed div.t{padding:10px 12px} .gan-ed b{display:block;font-size:14.5px} .gan-ed small{color:var(--texto-2);font-size:12.5px}
    #gan-leitor{user-select:none;-webkit-user-select:none}
    .gan-palco{display:flex;justify-content:center;align-items:flex-start;gap:4px;background:#2b2528;border-radius:12px;padding:16px;min-height:300px;overflow:auto;margin-top:12px}
    .gan-palco canvas{max-width:100%;height:auto;box-shadow:0 6px 24px rgba(0,0,0,.45);background:#fff;transition:opacity .25s}
    .gan-nav{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:10px}
    .gan-nav button{width:auto;margin:0;padding:9px 16px}
    .gan-com{border-top:1px solid var(--borda);margin-top:18px}
    .gan-c{border:1px solid var(--borda);border-radius:10px;padding:10px 12px;margin-top:8px;font-size:14px;white-space:pre-wrap;background:var(--superficie,#fff)}
    .gan-c small{display:block;color:var(--texto-2);font-size:12px;margin-bottom:4px;white-space:normal}
    .gan-c .acao{float:right;width:auto;margin:0 0 0 8px;padding:3px 8px;font-size:12px}
    #v-gan textarea{width:100%;min-height:70px;padding:12px 14px;font-size:15px;border:1px solid var(--borda);border-radius:var(--raio);font-family:inherit}
    @media print{#v-gan{display:none!important}}
  </style>`);

  $("cartao").querySelector(".rodape").insertAdjacentHTML("beforebegin", `
  <section id="v-gan" class="oculto">
    <div class="topo"><div><h1>GANews</h1><div class="ajuda" style="margin:0" id="gan-sub">A revista do Projeto GA BA</div></div>
      <div style="display:flex;gap:8px"><button class="sec oculto" id="gan-nova">+ Nova edição</button><button class="sec" id="gan-voltar">← Início</button></div></div>
    <div id="gan-corpo"></div>
    <div class="aviso" id="a-gan"></div>
  </section>`);
  $("gan-voltar").addEventListener("click", () => { if (doc) return lista(); mostrar("v-inicio"); });
  $("gan-nova").addEventListener("click", novaEdicao);

  async function comToken(fn) { let r = await fn(lerSessao().t); if (r.status === 401 && await renovar()) r = await fn(lerSessao().t); return r; }
  async function pdfjs() {
    if (lib) return lib;
    lib = await import(PDFJS + "pdf.min.mjs");
    lib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.mjs";
    return lib;
  }
  async function urlAssinada(caminho) {
    const r = await comToken(t => fetch(`${SUPABASE_URL}/storage/v1/object/sign/ganews/${caminho}`, { method: "POST",
      headers: { apikey: CHAVE_PUBLICA, Authorization: "Bearer " + t, "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: 900 }) }));
    const d = await r.json(); if (!r.ok || !d.signedURL) throw new Error("Não foi possível abrir a edição agora.");
    return SUPABASE_URL + "/storage/v1" + d.signedURL;
  }

  // bloqueios de cópia enquanto a revista está aberta
  const bloquear = (e) => { if (!doc) return; if ((e.ctrlKey || e.metaKey) && /^[psc]$/i.test(e.key)) { e.preventDefault(); aviso("a-gan", "A GANews é só para leitura no SGT: não é possível imprimir, salvar ou copiar.", "alerta"); } };
  document.addEventListener("keydown", bloquear, true);
  document.addEventListener("keydown", (e) => { if (!doc || $("v-gan").classList.contains("oculto") || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (e.key === "ArrowRight") avancar(1); if (e.key === "ArrowLeft") avancar(-1); });

  async function abrir() { mostrar("v-gan"); await lista(); }
  async function lista() {
    doc = null; edicao = null;
    editor = pode("admin") || temModulo("ganews");
    $("gan-nova").classList.toggle("oculto", !editor);
    $("gan-sub").textContent = "A revista do Projeto GA BA";
    $("gan-corpo").innerHTML = `<div class="resumo">Carregando…</div>`;
    try {
      edicoes = await api("/rest/v1/ganews_edicao?select=*&order=publicada_em.desc,id.desc");
      if (!edicoes.length) { $("gan-corpo").innerHTML = `<div class="resumo">Nenhuma edição publicada ainda.${editor ? " Use “+ Nova edição” para enviar a primeira." : ""}</div>`; return; }
      $("gan-corpo").innerHTML = `<div class="gan-lista">${edicoes.map(e => `<button class="gan-ed" data-id="${e.id}">
        <div class="gan-capa" id="gan-capa-${e.id}">GANews${e.numero ? `<br>${esc(e.numero)}` : ""}</div>
        <div class="t"><b>${esc(e.titulo)}</b><small>${fmtData(e.publicada_em)}${e.paginas ? ` · ${e.paginas} páginas` : ""}${e.publicada ? "" : " · <b style='display:inline;color:var(--alerta)'>oculta</b>"}</small></div></button>`).join("")}</div>`;
      $("gan-corpo").querySelectorAll(".gan-ed").forEach(b => b.addEventListener("click", () => ler(+b.dataset.id)));
      capas();
    } catch (e) { if (e.message !== "sessao") aviso("a-gan", traduzErro(e)); $("gan-corpo").innerHTML = ""; }
  }
  async function capas() {
    try {
      const L = await pdfjs();
      for (const e of edicoes.slice(0, 12)) {
        const d = await L.getDocument({ url: await urlAssinada(e.caminho), disableAutoFetch: true, disableStream: false }).promise;
        const p = await d.getPage(1), vp = p.getViewport({ scale: 0.5 });
        const c = document.createElement("canvas"); c.width = vp.width; c.height = vp.height;
        await p.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
        const alvo = $("gan-capa-" + e.id); if (alvo) { alvo.innerHTML = ""; alvo.appendChild(c); }
        d.destroy();
      }
    } catch {}
  }

  async function ler(id) {
    edicao = edicoes.find(e => e.id === id); if (!edicao) return;
    $("gan-sub").textContent = edicao.titulo + (edicao.numero ? ` · ${edicao.numero}` : "");
    $("gan-corpo").innerHTML = `<div id="gan-leitor"><div class="resumo">Abrindo a revista…</div></div>`;
    try {
      const L = await pdfjs();
      doc = await L.getDocument({ url: await urlAssinada(edicao.caminho) }).promise;
      pag = 1;
      $("gan-corpo").innerHTML = `<div id="gan-leitor">
        ${edicao.descricao ? `<p class="sub" style="margin:4px 0 0">${esc(edicao.descricao)}</p>` : ""}
        ${editor ? `<div style="display:flex;gap:8px;margin-top:8px"><button class="sec" id="gan-pub" style="width:auto;margin:0">${edicao.publicada ? "Ocultar edição" : "Publicar edição"}</button><button class="perigo" id="gan-exc" style="width:auto;margin:0">Excluir edição</button></div>` : ""}
        <div class="gan-palco" id="gan-palco"></div>
        <div class="gan-nav"><button class="sec" id="gan-ant">← Anterior</button><span id="gan-pg" class="resumo" style="margin:0"></span><button class="sec" id="gan-prox">Próxima →</button></div>
        <div class="ajuda" style="text-align:center">Use as setas do teclado ou deslize para virar as páginas. Leitura exclusiva no SGT.</div></div>
        <div class="gan-com"><h2>Comentários</h2><div id="gan-lista-c" class="resumo">Carregando…</div>
          <form id="gan-f" novalidate><label for="gan-txt">Seu comentário</label><textarea id="gan-txt" maxlength="1500" placeholder="O que achou desta edição?"></textarea>
            <label class="check"><input type="checkbox" id="gan-sobre"><span>Sobre a página que estou vendo agora</span></label>
            <label class="check"><input type="checkbox" id="gan-lgpd"><span>Estou ciente de que meu nome aparecerá junto ao meu comentário para as pessoas com acesso ao SGT, conforme a LGPD.</span></label>
            <button type="submit" style="width:auto">Comentar</button></form></div>`;
      const palco = $("gan-palco");
      palco.addEventListener("contextmenu", (e) => e.preventDefault());
      let x0 = null; palco.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
      palco.addEventListener("touchend", (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) avancar(dx < 0 ? 1 : -1); x0 = null; });
      $("gan-ant").addEventListener("click", () => avancar(-1)); $("gan-prox").addEventListener("click", () => avancar(1));
      $("gan-f").addEventListener("submit", comentar);
      if (editor) {
        $("gan-pub").addEventListener("click", async () => {
          try { await api(`/rest/v1/ganews_edicao?id=eq.${edicao.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ publicada: !edicao.publicada }) });
            await lista(); aviso("a-gan", edicao.publicada ? "Edição ocultada." : "Edição publicada.", "ok"); } catch (er) { aviso("a-gan", traduzErro(er)); } });
        $("gan-exc").addEventListener("click", async () => {
          if (!confirm("Excluir esta edição e os comentários dela? Não dá para desfazer.")) return;
          try { await api(`/rest/v1/ganews_edicao?id=eq.${edicao.id}`, { method: "DELETE" });
            comToken(t => fetch(`${SUPABASE_URL}/storage/v1/object/ganews/${edicao.caminho}`, { method: "DELETE", headers: { apikey: CHAVE_PUBLICA, Authorization: "Bearer " + t } }));
            await lista(); aviso("a-gan", "Edição excluída.", "ok"); } catch (er) { aviso("a-gan", traduzErro(er)); } });
      }
      await desenharPaginas(); comentarios();
    } catch (e) { if (e.message !== "sessao") aviso("a-gan", traduzErro(e)); }
  }
  // revista: capa sozinha; depois páginas lado a lado (pares) em telas largas
  const passoDupla = () => dupla && pag > 1;
  function avancar(d) {
    if (!doc) return;
    const n = doc.numPages;
    if (d > 0) pag = pag === 1 ? 2 : Math.min(n, pag + (dupla ? 2 : 1));
    else pag = dupla ? (pag <= 3 ? 1 : pag - 2) : Math.max(1, pag - 1);
    if (dupla && pag > 1 && pag % 2 === 1) pag -= 1;
    desenharPaginas();
  }
  async function desenharPaginas() {
    const palco = $("gan-palco"); if (!palco || !doc) return;
    dupla = palco.clientWidth > 760;
    const nums = passoDupla() ? [pag, pag + 1].filter(n => n <= doc.numPages) : [pag];
    const largura = (palco.clientWidth - 40) / nums.length, altura = Math.max(420, window.innerHeight - 260);
    const canv = [];
    for (const n of nums) {
      const p = await doc.getPage(n), base = p.getViewport({ scale: 1 });
      const esc1 = Math.min(largura / base.width, altura / base.height) * (window.devicePixelRatio || 1);
      const vp = p.getViewport({ scale: esc1 }), c = document.createElement("canvas");
      c.width = vp.width; c.height = vp.height; c.style.width = (vp.width / (window.devicePixelRatio || 1)) + "px";
      await p.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise; canv.push(c);
    }
    palco.innerHTML = ""; canv.forEach(c => palco.appendChild(c));
    $("gan-pg").textContent = nums.length > 1 ? `Páginas ${nums[0]}–${nums[1]} de ${doc.numPages}` : `Página ${nums[0]} de ${doc.numPages}`;
    $("gan-ant").disabled = pag <= 1; $("gan-prox").disabled = nums[nums.length - 1] >= doc.numPages;
  }
  window.addEventListener("resize", () => { if (doc && !$("v-gan").classList.contains("oculto")) desenharPaginas(); });

  async function comentarios() {
    try {
      const cs = await api("/rest/v1/rpc/ganews_comentarios", { method: "POST", body: JSON.stringify({ p_edicao: edicao.id }) });
      $("gan-lista-c").outerHTML = `<div id="gan-lista-c">${cs.length ? cs.map(c => `<div class="gan-c">
        ${c.meu || editor ? `<button class="perigo acao" data-apagar="${c.id}">Excluir</button>` : ""}${editor ? `<button class="sec acao" data-ocultar="${c.id}" data-o="${c.oculto}">${c.oculto ? "Mostrar" : "Ocultar"}</button>` : ""}
        <small><b style="display:inline">${esc(c.nome)}</b> · ${new Date(c.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}${c.pagina ? ` · página ${c.pagina}` : ""}${c.oculto ? " · oculto" : ""}</small>${esc(c.texto)}</div>`).join("")
        : `<div class="resumo">Seja a primeira pessoa a comentar.</div>`}</div>`;
      document.querySelectorAll("[data-apagar]").forEach(b => b.addEventListener("click", async () => {
        if (!confirm("Excluir este comentário?")) return;
        try { await api(`/rest/v1/ganews_comentario?id=eq.${b.dataset.apagar}`, { method: "DELETE" }); comentarios(); } catch (e) { aviso("a-gan", traduzErro(e)); } }));
      document.querySelectorAll("[data-ocultar]").forEach(b => b.addEventListener("click", async () => {
        try { await api(`/rest/v1/ganews_comentario?id=eq.${b.dataset.ocultar}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ oculto: b.dataset.o !== "true" }) }); comentarios(); } catch (e) { aviso("a-gan", traduzErro(e)); } }));
    } catch (e) { if (e.message !== "sessao") aviso("a-gan", traduzErro(e)); }
  }
  async function comentar(e) {
    e.preventDefault();
    const txt = $("gan-txt").value.trim();
    if (!txt) return aviso("a-gan", "Escreva o comentário.");
    if (!$("gan-lgpd").checked) return aviso("a-gan", "Para comentar, marque a caixa de ciência (LGPD).");
    try {
      await api("/rest/v1/rpc/ganews_comentar", { method: "POST", body: JSON.stringify({ p_edicao: edicao.id, p_pagina: $("gan-sobre").checked ? pag : null, p_texto: txt, p_aceite: true }) });
      $("gan-txt").value = ""; $("gan-sobre").checked = false; aviso("a-gan", "Comentário publicado.", "ok"); comentarios();
    } catch (er) { if (er.message !== "sessao") aviso("a-gan", traduzErro(er)); }
  }

  // nova edição (Administrador(a) ou quem tem a ferramenta GANews)
  function novaEdicao() {
    const fundo = document.createElement("div"); fundo.className = "qg-mov";
    fundo.innerHTML = `<div role="dialog" aria-label="Nova edição"><h2 style="margin-top:0">Nova edição da GANews</h2>
      <form id="ge-f" novalidate>
        <label for="ge-tit">Título</label><input id="ge-tit" type="text" placeholder="Ex.: GANews · Novembro de 2026">
        <div class="grade2"><div><label for="ge-num">Número ou edição</label><input id="ge-num" type="text" placeholder="Ex.: Edição 05"></div>
          <div><label for="ge-data">Data de publicação</label><input id="ge-data" type="date" value="${new Date().toISOString().slice(0, 10)}"></div></div>
        <label for="ge-desc">Resumo (opcional)</label><input id="ge-desc" type="text" maxlength="300">
        <label for="ge-arq">Arquivo da revista (PDF, até 30 MB)</label><input id="ge-arq" type="file" accept="application/pdf">
        <label class="check"><input type="checkbox" id="ge-pub" checked><span>Publicar agora para todos que acessam o SGT</span></label>
        <div class="aviso" id="a-ge"></div>
        <div style="display:flex;gap:8px"><button type="submit" style="width:auto">Enviar edição</button><button type="button" class="sec" id="ge-cancelar" style="width:auto">Cancelar</button></div>
      </form></div>`;
    document.body.appendChild(fundo);
    const fechar = () => fundo.remove();
    $("ge-cancelar").addEventListener("click", fechar);
    $("ge-f").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = $("ge-arq").files[0], tit = $("ge-tit").value.trim();
      if (!tit) return aviso("a-ge", "Informe o título.");
      if (!f || !/pdf$/i.test(f.type || f.name)) return aviso("a-ge", "Escolha o arquivo da revista em PDF.");
      if (f.size > 30 * 1024 * 1024) return aviso("a-ge", "O PDF passa de 30 MB. Exporte em qualidade “web” ou “tela” e tente de novo.");
      ocupado(e.target, true); aviso("a-ge", "Enviando… não feche esta janela.", "alerta");
      try {
        let paginas = null;
        try { const L = await pdfjs(); const d = await L.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise; paginas = d.numPages; d.destroy(); } catch {}
        const caminho = `edicoes/${Date.now()}.pdf`;
        const r = await comToken(t => fetch(`${SUPABASE_URL}/storage/v1/object/ganews/${caminho}`, { method: "POST",
          headers: { apikey: CHAVE_PUBLICA, Authorization: "Bearer " + t, "Content-Type": "application/pdf" }, body: f }));
        if (!r.ok) throw new Error("Não foi possível enviar o PDF agora.");
        await api("/rest/v1/ganews_edicao", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({
          titulo: tit, numero: $("ge-num").value.trim() || null, descricao: $("ge-desc").value.trim() || null, caminho, paginas,
          publicada: $("ge-pub").checked, publicada_em: $("ge-data").value || null, criado_por: eu.id }) });
        fechar(); await lista(); aviso("a-gan", "Edição enviada.", "ok");
      } catch (er) { if (er.message !== "sessao") aviso("a-ge", traduzErro(er)); ocupado(e.target, false); }
    });
  }

  window.GANews = { abrir };
})();
