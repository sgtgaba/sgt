// SGT · Carômetro
// Mostra quem ocupa as vagas do Quadro Geral hoje (entra e sai sozinho com as movimentações).
// A foto é enviada pela própria pessoa, com aceite da LGPD, e fica num espaço privado do SGT.
// Usa as funções globais do index.html: api, aviso, mostrar, esc, eu, renovar, lerSessao, SUPABASE_URL, CHAVE_PUBLICA.
(() => {
  const $ = (id) => document.getElementById(id);
  let pessoas = [], urls = {}, carregado = 0;

  document.head.insertAdjacentHTML("beforeend", `<style>
    .car-grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px;margin-top:14px}
    .car-p{border:1px solid var(--borda);border-radius:14px;overflow:hidden;background:var(--superficie,#fff);text-align:center}
    .car-foto{aspect-ratio:1/1;width:100%;object-fit:cover;display:block;background:var(--cor-suave)}
    .car-ini{aspect-ratio:1/1;display:grid;place-items:center;font-size:42px;font-weight:700;color:#fff}
    .car-p b{display:block;font-size:13.5px;margin:9px 8px 2px;line-height:1.25}
    .car-p small{display:block;font-size:11.5px;color:var(--texto-2);margin:0 8px 10px;line-height:1.3}
    .car-p .sit{display:inline-block;margin:-4px 0 8px}
    .car-grupo{margin-top:22px;font-size:15px;display:flex;align-items:center;gap:8px}
    .car-grupo span{font-size:12px;color:var(--texto-2);font-weight:400}
    .car-minha{display:flex;gap:16px;align-items:center;flex-wrap:wrap;border:1px solid var(--borda);border-radius:var(--raio);padding:14px;margin-top:14px;background:var(--superficie,#fff)}
    .car-minha img,.car-minha .car-ini{width:96px;height:96px;border-radius:12px;font-size:34px;object-fit:cover}
    #v-car.apresentacao{position:fixed;inset:0;z-index:70;background:var(--fundo);overflow:auto;padding:28px 34px}
    #v-car.apresentacao .car-grade{grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:18px}
    #v-car.apresentacao .car-p b{font-size:15px} #v-car.apresentacao .qg-barra,#v-car.apresentacao .car-minha{display:none}
  </style>`);

  $("cartao").querySelector(".rodape").insertAdjacentHTML("beforebegin", `
  <section id="v-car" class="oculto">
    <div class="topo"><div><h1>Carômetro</h1><div class="ajuda" style="margin:0" id="car-sub">Quem faz parte do Projeto GA BA hoje</div></div>
      <div style="display:flex;gap:8px"><button class="sec" id="car-apres">▶ Modo apresentação</button><button class="sec" id="car-voltar">← Início</button></div></div>
    <div id="car-minha"></div>
    <div class="qg-barra">
      <input type="search" id="car-busca" placeholder="Buscar por nome, papel ou NTE">
      <select id="car-eixo"><option value="">Todos os eixos</option></select>
      <select id="car-local"><option value="">Todos os locais</option></select>
      <select id="car-agrupar"><option value="eixo">Agrupar por eixo</option><option value="nte">Agrupar por NTE</option><option value="">Sem agrupar</option></select>
    </div>
    <div id="car-corpo"></div>
    <div class="aviso" id="a-car"></div>
  </section>`);
  $("car-voltar").addEventListener("click", () => { sairApresentacao(); mostrar("v-inicio"); });

  const CORES = ["#E00D7E", "#ED7F0C", "#90BF23", "#E00E1B", "#27B2B5"];
  const iniciais = (n) => { const w = n.trim().split(/\s+/); return ((w[0] || "")[0] + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase(); };
  const corDe = (n) => CORES[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % CORES.length];
  const avatar = (p, cls = "car-ini") => urls[p.foto] ? `<img class="car-foto" src="${urls[p.foto]}" alt="Foto de ${esc(p.nome)}" loading="lazy">`
    : `<div class="${cls}" style="background:${corDe(p.nome)}" aria-hidden="true">${esc(iniciais(p.nome))}</div>`;

  async function comToken(fn) {
    let r = await fn(lerSessao().t);
    if (r.status === 401 && await renovar()) r = await fn(lerSessao().t);
    return r;
  }
  async function assinar(caminhos) {
    const faltam = caminhos.filter(c => c && !urls[c]);
    for (let i = 0; i < faltam.length; i += 100) {
      const lote = faltam.slice(i, i + 100);
      const r = await comToken(t => fetch(`${SUPABASE_URL}/storage/v1/object/sign/fotos`, { method: "POST",
        headers: { apikey: CHAVE_PUBLICA, Authorization: "Bearer " + t, "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: 3600, paths: lote }) }));
      if (!r.ok) continue;
      (await r.json()).forEach(x => { if (x.signedURL) urls[x.path] = SUPABASE_URL + "/storage/v1" + x.signedURL; });
    }
  }

  async function abrir() {
    mostrar("v-car");
    $("car-corpo").innerHTML = `<div class="resumo">Carregando…</div>`;
    try {
      if (!pessoas.length || Date.now() - carregado > 60000) { pessoas = await api("/rest/v1/rpc/carometro", { method: "POST", body: "{}" }); carregado = Date.now(); }
      await assinar(pessoas.map(p => p.foto));
      const op = (c) => [...new Set(pessoas.map(p => p[c]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
      $("car-eixo").innerHTML = `<option value="">Todos os eixos</option>` + op("eixo").map(x => `<option>${esc(x)}</option>`).join("");
      $("car-local").innerHTML = `<option value="">Todos os locais</option>` + op("local").map(x => `<option>${esc(x)}</option>`).join("");
      desenharMinha(); desenhar();
    } catch (e) { if (e.message !== "sessao") aviso("a-car", traduzErro(e)); $("car-corpo").innerHTML = ""; }
  }
  function desenharMinha() {
    const minha = pessoas.find(p => p.sou_eu);
    const comFoto = pessoas.filter(p => p.foto).length;
    $("car-sub").textContent = `${pessoas.length} pessoas no time · ${comFoto} com foto`;
    $("car-minha").innerHTML = `<div class="car-minha">
      ${minha ? avatar(minha) : `<div class="car-ini" style="background:${corDe(eu.nome)}">${esc(iniciais(eu.nome))}</div>`}
      <div style="flex:1;min-width:220px"><b>${minha && minha.foto ? "Sua foto no Carômetro" : "Você ainda não tem foto no Carômetro"}</b>
        <div class="ajuda">Use uma foto recente, nítida, com boa luz e perfil profissional: rosto centralizado, fundo neutro, sem óculos escuros nem filtros.${minha ? "" : " Seu cadastro ainda não está ligado a uma vaga do Quadro Geral; a foto aparece aqui assim que a ligação for feita."}</div></div>
      <button class="sec" id="car-foto-btn" style="width:auto;margin:0">${minha && minha.foto ? "Trocar foto" : "Enviar foto"}</button></div>`;
    $("car-foto-btn").addEventListener("click", minhaFoto);
  }
  function filtrados() {
    const t = $("car-busca").value.trim().toLowerCase(), e = $("car-eixo").value, l = $("car-local").value;
    return pessoas.filter(p => (!t || [p.nome, p.papel, p.nte, p.eixo].some(x => x && x.toLowerCase().includes(t))) && (!e || p.eixo === e) && (!l || p.local === l))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }
  const cartao = (p) => `<div class="car-p">${avatar(p)}<b>${esc(p.nome)}</b>
    <small>${esc(p.papel || "")}${p.nte ? `<br>${esc(p.nte)}` : p.local ? `<br>${esc(p.local)}` : ""}</small>${p.afastado ? `<span class="sit alerta">afastamento</span>` : ""}</div>`;
  function desenhar() {
    const lista = filtrados(), por = $("car-agrupar").value;
    if (!lista.length) { $("car-corpo").innerHTML = `<div class="resumo">Ninguém encontrado.</div>`; return; }
    if (!por) { $("car-corpo").innerHTML = `<div class="car-grade">${lista.map(cartao).join("")}</div>`; return; }
    const grupos = {};
    lista.forEach(p => { const g = p[por] || (por === "nte" ? "Sem NTE (remoto ou sede)" : "Sem eixo"); (grupos[g] = grupos[g] || []).push(p); });
    $("car-corpo").innerHTML = Object.keys(grupos).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }))
      .map(g => `<h2 class="car-grupo">${esc(g)} <span>${grupos[g].length}</span></h2><div class="car-grade">${grupos[g].map(cartao).join("")}</div>`).join("");
  }
  ["car-busca", "car-eixo", "car-local", "car-agrupar"].forEach(id => $(id).addEventListener("input", desenhar));

  // modo apresentação (tela cheia)
  function sairApresentacao() { $("v-car").classList.remove("apresentacao"); $("car-apres").textContent = "▶ Modo apresentação"; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); }
  $("car-apres").addEventListener("click", () => {
    if ($("v-car").classList.contains("apresentacao")) return sairApresentacao();
    $("v-car").classList.add("apresentacao"); $("car-apres").textContent = "✕ Sair da apresentação";
    document.documentElement.requestFullscreen?.().catch(() => {});
  });
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement) sairApresentacao(); });

  // envio da própria foto (também chamado por Dados e Contatos)
  async function reduzir(arq) {
    const img = await createImageBitmap(arq);
    const lado = Math.min(img.width, img.height), alvo = Math.min(720, lado);
    const c = document.createElement("canvas"); c.width = c.height = alvo;
    c.getContext("2d").drawImage(img, (img.width - lado) / 2, Math.max(0, (img.height - lado) / 3), lado, lado, 0, 0, alvo, alvo);
    return { blob: await new Promise(r => c.toBlob(r, "image/jpeg", 0.86)), lado };
  }
  function minhaFoto() {
    const minha = pessoas.find(p => p.sou_eu);
    const fundo = document.createElement("div"); fundo.className = "qg-mov";
    fundo.innerHTML = `<div role="dialog" aria-label="Minha foto"><h2 style="margin-top:0">Minha foto no Carômetro</h2>
      <p class="sub">Dicas: foto recente, nítida e com boa luz; rosto centralizado, ombros visíveis, fundo neutro; roupa de trabalho; sem óculos escuros, bonés ou filtros. A foto é recortada em formato quadrado.</p>
      <input type="file" id="cf-arq" accept="image/jpeg,image/png,image/webp">
      <div id="cf-prev" style="margin-top:12px"></div>
      <label class="check"><input type="checkbox" id="cf-lgpd"><span>Autorizo o uso da minha foto no Carômetro do Projeto GA BA, visível apenas às pessoas com acesso ao SGT, exclusivamente para identificação da equipe, conforme a LGPD. Posso trocar ou remover a foto a qualquer momento.</span></label>
      <div class="aviso" id="a-cf"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button id="cf-enviar" style="width:auto">Salvar foto</button>
        ${minha && minha.foto ? `<button class="perigo" id="cf-remover" style="width:auto">Remover minha foto</button>` : ""}
        <button class="sec" id="cf-cancelar" style="width:auto">Cancelar</button></div></div>`;
    document.body.appendChild(fundo);
    const fechar = () => fundo.remove(); let pronta = null;
    $("cf-cancelar").addEventListener("click", fechar); fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(); });
    $("cf-arq").addEventListener("change", async () => {
      const f = $("cf-arq").files[0]; pronta = null; $("cf-prev").innerHTML = ""; aviso("a-cf", "");
      if (!f) return;
      try {
        const { blob, lado } = await reduzir(f); pronta = blob;
        $("cf-prev").innerHTML = `<img src="${URL.createObjectURL(blob)}" alt="Prévia" style="width:160px;height:160px;border-radius:14px;object-fit:cover">`;
        if (lado < 400) aviso("a-cf", "A foto está com resolução baixa e pode ficar borrada. Se puder, use uma foto maior.", "alerta");
      } catch { aviso("a-cf", "Não consegui abrir esta imagem. Use JPG ou PNG."); }
    });
    $("cf-enviar").addEventListener("click", async (e) => {
      if (!pronta) return aviso("a-cf", "Escolha uma foto.");
      if (!$("cf-lgpd").checked) return aviso("a-cf", "Para enviar, marque a caixa de autorização (LGPD).");
      e.target.disabled = true;
      try {
        const caminho = `${eu.id}/foto_${Date.now()}.jpg`;
        const r = await comToken(t => fetch(`${SUPABASE_URL}/storage/v1/object/fotos/${caminho}`, { method: "POST",
          headers: { apikey: CHAVE_PUBLICA, Authorization: "Bearer " + t, "Content-Type": "image/jpeg" }, body: pronta }));
        if (!r.ok) throw new Error("Não foi possível enviar a foto agora.");
        await api("/rest/v1/rpc/foto_salvar", { method: "POST", body: JSON.stringify({ p_caminho: caminho, p_aceite: true }) });
        if (minha && minha.foto) comToken(t => fetch(`${SUPABASE_URL}/storage/v1/object/fotos/${minha.foto}`, { method: "DELETE", headers: { apikey: CHAVE_PUBLICA, Authorization: "Bearer " + t } }));
        fechar(); carregado = 0;
        if (!$("v-car").classList.contains("oculto")) { await abrir(); aviso("a-car", "Foto salva.", "ok"); }
        else if ($("a-dad")) aviso("a-dad", "Foto do Carômetro salva.", "ok");
      } catch (er) { if (er.message !== "sessao") aviso("a-cf", traduzErro(er)); e.target.disabled = false; }
    });
    const rem = $("cf-remover");
    if (rem) rem.addEventListener("click", async () => {
      try {
        await api("/rest/v1/rpc/foto_salvar", { method: "POST", body: JSON.stringify({ p_caminho: null, p_aceite: false }) });
        comToken(t => fetch(`${SUPABASE_URL}/storage/v1/object/fotos/${minha.foto}`, { method: "DELETE", headers: { apikey: CHAVE_PUBLICA, Authorization: "Bearer " + t } }));
        fechar(); carregado = 0; if (!$("v-car").classList.contains("oculto")) { await abrir(); aviso("a-car", "Foto removida.", "ok"); }
      } catch (er) { if (er.message !== "sessao") aviso("a-cf", traduzErro(er)); }
    });
  }
  async function abrirFoto() { if (!pessoas.length) { try { pessoas = await api("/rest/v1/rpc/carometro", { method: "POST", body: "{}" }); carregado = Date.now(); } catch {} } minhaFoto(); }

  window.Carometro = { abrir, minhaFoto: abrirFoto };
})();
