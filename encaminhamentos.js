// SGT · Encaminhamentos Gerais e Solicitações Diversas
// Usa as funções globais do index.html: api, aviso, mostrar, esc, eu, pode, temModulo, fmtData, traduzErro,
// lerSessao, renovar, SUPABASE_URL, CHAVE_PUBLICA.
(() => {
  const $ = (id) => document.getElementById(id);
  const STATUS = { aberta: "Aberta", em_andamento: "Em andamento", aguardando_solicitante: "Aguardando você", concluida: "Concluída", cancelada: "Cancelada" };
  const STATUS_EQUIPE = { ...STATUS, aguardando_solicitante: "Aguardando o solicitante" };
  const PRIOR = { baixa: "Baixa", normal: "Normal", alta: "Alta", urgente: "Urgente" };
  const COR_ST = { aberta: "lar", em_andamento: "", aguardando_solicitante: "lar", concluida: "verde", cancelada: "cinza" };
  const MAX_MB = 10;
  let categorias = [], minhas = [], fila = [], atual = null, souEquipe = false, souConfig = false, aba = "minhas", pessoas = null;

  document.head.insertAdjacentHTML("beforeend", `<style>
    .enc-item{display:grid;grid-template-columns:1fr auto;gap:6px 14px;border:1px solid var(--borda);border-radius:var(--raio);padding:12px 14px;background:#fff;cursor:pointer}
    .enc-item:hover{border-color:var(--cor)} .enc-item b{font-size:15px} .enc-item .meta{font-size:12.5px;color:var(--texto-2);margin-top:3px}
    .chat{display:flex;flex-direction:column;gap:10px;margin-top:10px}
    .bolha{max-width:88%;border-radius:12px;padding:10px 12px;font-size:14px;line-height:1.45;white-space:pre-wrap;background:#f4f4f6}
    .bolha.minha{align-self:flex-end;background:var(--cor-suave)}
    .bolha.interno{background:#fffaeb;border:1px dashed #f5c26b}
    .bolha small{display:block;color:var(--texto-2);font-size:11.5px;margin-bottom:4px;white-space:normal}
    .evento{align-self:center;font-size:12px;color:var(--texto-2);text-align:center}
    .painel-eq{background:var(--fundo);border:1px solid var(--borda);border-radius:var(--raio);padding:14px;margin-top:14px}
    .painel-eq .grade4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px}
    .painel-eq label{margin-top:0}
    textarea.enc{width:100%;min-height:110px;padding:12px 14px;font-size:15px;border:1px solid var(--borda);border-radius:var(--raio);font-family:inherit;resize:vertical}
    .anx{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px} .anx a{font-size:13px;color:var(--cor);font-weight:600;cursor:pointer;background:var(--cor-suave);padding:5px 10px;border-radius:999px}
    .cat-card{border:1px solid var(--borda);border-radius:var(--raio);padding:14px;margin-top:12px;background:#fff}
    .cat-card .linha{display:grid;grid-template-columns:2fr 3fr 110px 110px;gap:10px;align-items:end}
    .chips-p{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
    .chips-p span{font-size:12.5px;background:var(--cor-suave);color:var(--cor);padding:4px 8px;border-radius:999px}
    .chips-p button{width:auto;margin:0 0 0 4px;padding:0 4px;background:none;color:var(--cor);font-size:13px}
    .botao-zap{display:inline-flex;align-items:center;gap:6px;margin-left:10px;padding:10px 16px;border-radius:var(--raio);background:#e9f8ef;color:#137a3d;font-weight:700;text-decoration:none;font-size:14.5px}
    .wa-est{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:12px 0}
    .wa-est div{border:1px solid var(--borda);border-radius:var(--raio);padding:10px 12px;background:#fff} .wa-est b{display:block;font-size:20px} .wa-est small{color:var(--texto-2)}
    .wa-copia{display:flex;gap:8px;align-items:center} .wa-copia code{flex:1;background:var(--fundo);border:1px solid var(--borda);border-radius:8px;padding:8px 10px;font-size:13px;word-break:break-all}
    .wa-copia button{width:auto;margin:0;padding:8px 12px}
    .wa-passos{margin:8px 0 0 18px;font-size:14px;line-height:1.6} .wa-passos code{background:var(--fundo);padding:1px 5px;border-radius:5px}
    @media (max-width:640px){.wa-est{grid-template-columns:1fr 1fr}.botao-zap{margin:8px 0 0}}
    @media (max-width:640px){.painel-eq .grade4,.cat-card .linha{grid-template-columns:1fr 1fr}.enc-item{grid-template-columns:1fr}}
  </style>`);

  const voltar = (alvo) => `<button class="sec" data-ir="${alvo}">← Voltar</button>`;
  $("cartao").querySelector(".rodape").insertAdjacentHTML("beforebegin", `
  <section id="v-enc" class="oculto">
    <div class="topo"><div><h1>Encaminhamentos</h1><div class="ajuda" style="margin:0">Solicitações à gestão do projeto, do pedido à conclusão</div></div>${voltar("v-inicio")}</div>
    <div class="abas" id="enc-abas"></div>
    <div id="enc-filtros" class="filtros oculto">
      <input id="enc-busca" type="search" placeholder="Buscar por número, assunto ou nome">
      <select id="enc-fst"><option value="abertas">Em aberto</option><option value="">Todas</option>
        ${Object.entries(STATUS_EQUIPE).map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}<option value="atrasadas">Com prazo vencido</option></select>
      <select id="enc-fcat"><option value="">Todos os tipos</option></select>
    </div>
    <div class="btns" id="enc-btn-nova"><button id="enc-nova" style="width:auto">+ Nova solicitação</button></div>
    <div class="resumo" id="enc-resumo"></div>
    <div class="lista" id="enc-lista"></div>
    <div id="enc-conf" class="oculto"></div>
    <div id="enc-wa" class="oculto"></div>
    <div class="aviso" id="a-enc"></div>
  </section>

  <section id="v-enc-nova" class="oculto">
    <div class="topo"><div><h1>Nova solicitação</h1><div class="ajuda" style="margin:0">Quem atende recebe um aviso por e-mail.</div></div>${voltar("v-enc")}</div>
    <form id="f-enc" novalidate>
      <label for="en-cat">Tipo de solicitação</label>
      <select id="en-cat"></select>
      <div class="ajuda" id="en-cat-desc"></div>
      <label for="en-ass">Assunto</label>
      <input id="en-ass" type="text" maxlength="200" placeholder="Resumo em poucas palavras">
      <label for="en-desc">Descrição</label>
      <textarea id="en-desc" class="enc" placeholder="Explique o que você precisa, com os detalhes importantes"></textarea>
      <div class="grade2">
        <div><label for="en-pri">Prioridade</label><select id="en-pri">${Object.entries(PRIOR).map(([k, n]) => `<option value="${k}"${k === "normal" ? " selected" : ""}>${n}</option>`).join("")}</select></div>
        <div><label for="en-arq">Arquivos <span style="font-weight:400;color:var(--texto-2)">(opcional, até ${MAX_MB} MB cada)</span></label><input id="en-arq" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"></div>
      </div>
      <label class="check"><input type="checkbox" id="en-lgpd"><span>Estou ciente de que as informações e os arquivos enviados serão usados exclusivamente para tratar esta solicitação, pelas pessoas responsáveis por ela, conforme a LGPD.</span></label>
      <button type="submit">Enviar solicitação</button>
    </form>
    <div class="aviso" id="a-en"></div>
  </section>

  <section id="v-enc-det" class="oculto">
    <div class="topo"><div><h1 id="ed2-tit"></h1><div class="ajuda" style="margin:0" id="ed2-sub"></div></div><button class="sec" id="ed2-voltar">← Voltar</button></div>
    <div id="ed2-corpo"></div>
    <div class="aviso" id="a-ed2"></div>
  </section>`);
  document.querySelectorAll("#v-enc [data-ir],#v-enc-nova [data-ir]").forEach(b => b.addEventListener("click", () => {
    if (b.dataset.ir === "v-enc") abrir(); else mostrar(b.dataset.ir);
  }));

  // ---------- arquivos
  async function comToken(fn) {
    let r = await fn(lerSessao().t);
    if (r.status === 401 && await renovar()) r = await fn(lerSessao().t);
    return r;
  }
  const nomeSeguro = (n) => n.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.\-]+/g, "_").slice(-80);
  async function enviarArquivos(solId, arquivos) {
    for (const f of arquivos) {
      if (f.size > MAX_MB * 1024 * 1024) throw new Error(`O arquivo "${f.name}" passa de ${MAX_MB} MB.`);
      const caminho = `${solId}/${Date.now()}_${nomeSeguro(f.name)}`;
      const r = await comToken(t => fetch(`${SUPABASE_URL}/storage/v1/object/encaminhamentos/${caminho}`, {
        method: "POST", headers: { apikey: CHAVE_PUBLICA, Authorization: "Bearer " + t, "Content-Type": f.type || "application/octet-stream" }, body: f }));
      if (!r.ok) throw new Error(`Não foi possível enviar "${f.name}". Confira o tipo do arquivo (PDF, imagem, Word, Excel ou texto).`);
      await api("/rest/v1/rpc/enc_registrar_anexo", { method: "POST", body: JSON.stringify({ p_sol: solId, p_path: caminho, p_nome: f.name, p_tamanho: f.size }) });
    }
  }
  async function baixar(caminho) {
    const r = await comToken(t => fetch(`${SUPABASE_URL}/storage/v1/object/sign/encaminhamentos/${caminho}`, {
      method: "POST", headers: { apikey: CHAVE_PUBLICA, Authorization: "Bearer " + t, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 600 }) }));
    const d = await r.json();
    if (!r.ok || !d.signedURL) throw new Error("Não foi possível abrir o arquivo.");
    window.open(SUPABASE_URL + "/storage/v1" + d.signedURL, "_blank");
  }

  // ---------- lista
  async function abrir() {
    mostrar("v-enc");
    $("enc-lista").innerHTML = `<div class="resumo">Carregando…</div>`;
    try {
      souConfig = pode("admin") || temModulo("encaminhamentos");
      const [cats, resp] = await Promise.all([
        api("/rest/v1/enc_categoria?select=*&order=ordem.asc,nome.asc"),
        api(`/rest/v1/enc_responsavel?select=categoria_id&colaborador_id=eq.${eu.id}`)]);
      categorias = cats; souEquipe = souConfig || resp.length > 0;
      $("enc-fcat").innerHTML = `<option value="">Todos os tipos</option>` + categorias.map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join("");
      $("enc-abas").innerHTML = `<button data-a="minhas">Minhas solicitações</button>` +
        (souEquipe ? `<button data-a="fila">Para atender</button>` : "") + (souConfig ? `<button data-a="conf">Tipos e equipes</button><button data-a="wa">WhatsApp (TAAI)</button>` : "");
      $("enc-abas").querySelectorAll("button").forEach(b => b.addEventListener("click", () => trocar(b.dataset.a)));
      if (aba !== "minhas" && !souEquipe) aba = "minhas";
      await trocar(aba);
    } catch (e) { if (e.message !== "sessao") aviso("a-enc", traduzErro(e)); }
  }
  async function trocar(a) {
    aba = a;
    $("enc-abas").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.a === a));
    $("enc-conf").classList.toggle("oculto", a !== "conf");
    $("enc-wa").classList.toggle("oculto", a !== "wa");
    ["enc-lista", "enc-resumo"].forEach(id => $(id).classList.toggle("oculto", a === "conf" || a === "wa"));
    $("enc-filtros").classList.toggle("oculto", a !== "fila");
    $("enc-btn-nova").classList.toggle("oculto", a !== "minhas");
    if (a === "conf") return desenharConfig();
    if (a === "wa") return desenharWa();
    $("enc-lista").innerHTML = `<div class="resumo">Carregando…</div>`;
    try {
      if (a === "minhas") minhas = await api(`/rest/v1/enc_lista?select=*&solicitante_id=eq.${eu.id}&order=atualizado_em.desc`);
      else fila = await api(`/rest/v1/enc_lista?select=*&solicitante_id=neq.${eu.id}&order=atualizado_em.desc&limit=1000`);
      desenhar();
    } catch (e) { if (e.message !== "sessao") aviso("a-enc", traduzErro(e)); }
  }
  function desenhar() {
    const equipe = aba === "fila";
    let l = equipe ? fila : minhas;
    if (equipe) {
      const q = semAcento($("enc-busca").value.trim()), st = $("enc-fst").value, fc = $("enc-fcat").value;
      l = l.filter(s => (!q || semAcento(`${s.codigo} ${s.assunto} ${s.solicitante} ${s.responsavel || ""}`).includes(q))
        && (!fc || String(s.categoria_id) === fc)
        && (!st || (st === "abertas" ? !["concluida", "cancelada"].includes(s.status) : st === "atrasadas" ? s.atrasada : s.status === st)));
    }
    const nomes = equipe ? STATUS_EQUIPE : STATUS;
    $("enc-resumo").textContent = equipe
      ? `${l.length} solicitações · ${fila.filter(s => s.atrasada).length} com prazo vencido`
      : (minhas.length ? `${minhas.length} solicitações suas` : "");
    $("enc-lista").innerHTML = l.length ? l.map(s => `<div class="enc-item" data-id="${s.id}">
      <div><b>${esc(s.codigo)} · ${esc(s.assunto)}</b>
        <div class="meta">${esc(s.categoria)}${equipe ? " · " + esc(s.solicitante) : ""} · aberta em ${new Date(s.criado_em).toLocaleDateString("pt-BR")}${s.responsavel ? " · responsável: " + esc(s.responsavel) : ""}</div></div>
      <div class="tags"><span class="tag ${COR_ST[s.status]}">${nomes[s.status]}</span>${s.prioridade !== "normal" ? `<span class="tag ${s.prioridade === "baixa" ? "cinza" : "verm"}">${PRIOR[s.prioridade]}</span>` : ""}
        ${s.atrasada && equipe ? `<span class="tag verm">Prazo vencido</span>` : s.prazo && !["concluida", "cancelada"].includes(s.status) ? `<span class="tag cinza">Prazo ${fmtData(s.prazo)}</span>` : ""}</div></div>`).join("")
      : `<div class="resumo">${equipe ? "Nenhuma solicitação encontrada." : "Você ainda não abriu nenhuma solicitação."}</div>`;
    $("enc-lista").querySelectorAll(".enc-item").forEach(el => el.addEventListener("click", () => detalhe(el.dataset.id)));
  }
  ["enc-busca", "enc-fst", "enc-fcat"].forEach(id => $(id).addEventListener("input", desenhar));

  // ---------- nova
  $("enc-nova").addEventListener("click", () => {
    const ativas = categorias.filter(c => c.ativa);
    $("en-cat").innerHTML = `<option value="">Escolha…</option>` + ativas.map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join("");
    $("f-enc").reset(); $("en-cat-desc").textContent = "";
    mostrar("v-enc-nova");
  });
  $("en-cat").addEventListener("change", () => {
    const c = categorias.find(x => String(x.id) === $("en-cat").value);
    $("en-cat-desc").textContent = c ? `${c.descricao || ""}${c.prazo_dias ? ` · prazo de resposta: até ${c.prazo_dias} dia${c.prazo_dias > 1 ? "s" : ""}` : ""}` : "";
  });
  $("f-enc").addEventListener("submit", async (e) => {
    e.preventDefault();
    const cat = +$("en-cat").value, ass = $("en-ass").value.trim(), desc = $("en-desc").value.trim(), arqs = [...$("en-arq").files];
    if (!cat) return aviso("a-en", "Escolha o tipo de solicitação.");
    if (ass.length < 3) return aviso("a-en", "Informe o assunto.");
    if (desc.length < 5) return aviso("a-en", "Descreva a solicitação.");
    if (arqs.some(f => f.size > MAX_MB * 1024 * 1024)) return aviso("a-en", `Cada arquivo pode ter no máximo ${MAX_MB} MB.`);
    if (!$("en-lgpd").checked) return aviso("a-en", "Para enviar, marque a caixa de ciência sobre o uso dos dados.");
    ocupado(e.target, true);
    try {
      const r = await api("/rest/v1/rpc/enc_abrir", { method: "POST", body: JSON.stringify({ p_categoria: cat, p_assunto: ass, p_descricao: desc, p_prioridade: $("en-pri").value, p_aceite: true }) });
      let falhaArq = "";
      if (arqs.length) { try { await enviarArquivos(r.id, arqs); } catch (x) { falhaArq = x.message; } }
      aba = "minhas"; await abrir();
      aviso("a-enc", `Solicitação nº ${r.numero} enviada. Você recebe um e-mail quando houver resposta.` + (falhaArq ? `\nAtenção: ${falhaArq} Abra a solicitação para anexar de novo.` : ""), falhaArq ? "alerta" : "ok");
    } catch (x) { if (x.message !== "sessao") aviso("a-en", traduzErro(x)); }
    finally { ocupado(e.target, false); }
  });

  // ---------- detalhe
  async function detalhe(id) {
    try {
      const [[s], hist, anexos] = await Promise.all([
        api(`/rest/v1/enc_lista?select=*&id=eq.${id}`),
        api("/rest/v1/rpc/enc_historico", { method: "POST", body: JSON.stringify({ p_sol: id }) }),
        api(`/rest/v1/enc_anexo?select=*&solicitacao_id=eq.${id}&order=criado_em.asc`)]);
      if (!s) return;
      atual = s;
      const souSolic = s.solicitante_id === eu.id;
      const atende = !souSolic || souConfig ? (souConfig || await ehDaEquipe(s)) : false;
      const aberta = !["concluida", "cancelada"].includes(s.status);
      const nomes = atende ? STATUS_EQUIPE : STATUS;
      $("ed2-tit").textContent = `${s.codigo} · ${s.assunto}`;
      $("ed2-sub").textContent = `${s.categoria} · ${nomes[s.status]}${s.prazo ? " · prazo " + fmtData(s.prazo) : ""}`;
      const chat = hist.map(m => m.tipo === "evento"
        ? `<div class="evento">${esc(m.texto)} · ${esc(m.autor || "")} · ${new Date(m.criado_em).toLocaleString("pt-BR")}</div>`
        : `<div class="bolha${m.sou_eu ? " minha" : ""}${m.tipo === "interno" ? " interno" : ""}"><small>${esc(m.autor || "")} · ${new Date(m.criado_em).toLocaleString("pt-BR")}${m.tipo === "interno" ? " · nota interna (o solicitante não vê)" : ""}</small>${esc(m.texto)}</div>`).join("");
      let painel = "";
      if (atende && !souSolic) {
        pessoas = pessoas || await api("/rest/v1/rpc/enc_pessoas", { method: "POST", body: "{}" }).catch(() => []);
        const equipe = await api(`/rest/v1/enc_responsavel?select=colaborador_id&categoria_id=eq.${s.categoria_id}`);
        const ids = new Set(equipe.map(x => x.colaborador_id)); ids.add(eu.id); if (s.responsavel_id) ids.add(s.responsavel_id);
        const opc = (souConfig ? pessoas : pessoas.filter(p => ids.has(p.id)));
        painel = `<div class="painel-eq"><b>Atendimento</b>
          <div class="grade4" style="margin-top:10px">
            <div><label>Situação</label><select id="eq-st">${Object.entries(STATUS_EQUIPE).map(([k, n]) => `<option value="${k}"${k === s.status ? " selected" : ""}>${n}</option>`).join("")}</select></div>
            <div><label>Responsável</label><select id="eq-resp"><option value="">Ninguém</option>${opc.map(p => `<option value="${p.id}"${p.id === s.responsavel_id ? " selected" : ""}>${esc(p.nome)}${p.id === eu.id ? " (eu)" : ""}</option>`).join("")}</select></div>
            <div><label>Prazo</label><input id="eq-prazo" type="date" value="${s.prazo || ""}"></div>
            <div><label>Prioridade</label><select id="eq-pri">${Object.entries(PRIOR).map(([k, n]) => `<option value="${k}"${k === s.prioridade ? " selected" : ""}>${n}</option>`).join("")}</select></div>
          </div>
          <div class="ajuda">Solicitante: ${esc(s.solicitante)} · aberta em ${new Date(s.criado_em).toLocaleString("pt-BR")}</div>
          <button id="eq-salvar" style="width:auto">Salvar atendimento</button></div>`;
      }
      $("ed2-corpo").innerHTML = `
        <div class="fcard" style="border:1px solid var(--borda);border-radius:var(--raio);padding:14px;margin-top:14px;white-space:pre-wrap;font-size:14.5px;line-height:1.5">${esc(s.descricao)}</div>
        ${anexos.length ? `<div class="anx">${anexos.map(a => `<a data-arq="${esc(a.path)}">📎 ${esc(a.nome)}</a>`).join("")}</div>` : ""}
        ${painel}
        <h2>Conversa</h2><div class="chat">${chat}</div>
        ${aberta ? `<div style="margin-top:16px"><textarea id="ed2-msg" class="enc" style="min-height:80px" placeholder="Escreva uma mensagem"></textarea>
          <div class="grade2" style="align-items:center"><div><input id="ed2-arq" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"></div>
          <div>${atende && !souSolic ? `<label class="check" style="margin:0"><input type="checkbox" id="ed2-int"><span>Nota interna (o solicitante não vê)</span></label>` : ""}</div></div>
          <div class="btns"><button id="ed2-enviar">Enviar mensagem</button>${souSolic ? `<button class="perigo" id="ed2-cancelar">Cancelar solicitação</button>` : ""}</div></div>`
          : `<div class="aviso ok" style="display:block">Solicitação encerrada (${nomes[s.status].toLowerCase()}). Se precisar, abra uma nova.</div>`}`;
      mostrar("v-enc-det");
      $("ed2-corpo").querySelectorAll("[data-arq]").forEach(a => a.addEventListener("click", () => baixar(a.dataset.arq).catch(x => aviso("a-ed2", x.message))));
      if ($("eq-salvar")) $("eq-salvar").addEventListener("click", () => rodar($("eq-salvar"), async () => {
        await api("/rest/v1/rpc/enc_atualizar", { method: "POST", body: JSON.stringify({ p_sol: s.id, p_status: $("eq-st").value,
          p_responsavel: $("eq-resp").value || null, p_prazo: $("eq-prazo").value || null, p_prioridade: $("eq-pri").value }) });
        await detalhe(s.id); aviso("a-ed2", "Atendimento atualizado. O solicitante foi avisado se a situação mudou.", "ok");
      }));
      if ($("ed2-enviar")) $("ed2-enviar").addEventListener("click", () => rodar($("ed2-enviar"), async () => {
        const txt = $("ed2-msg").value.trim(), arqs = [...$("ed2-arq").files], interno = $("ed2-int") && $("ed2-int").checked;
        if (!txt && !arqs.length) throw new Error("Escreva uma mensagem ou escolha um arquivo.");
        if (arqs.length) await enviarArquivos(s.id, arqs);
        await api("/rest/v1/rpc/enc_comentar", { method: "POST", body: JSON.stringify({ p_sol: s.id,
          p_texto: txt || `Enviou ${arqs.length} arquivo${arqs.length > 1 ? "s" : ""}: ${arqs.map(f => f.name).join(", ")}`, p_interno: !!interno }) });
        await detalhe(s.id); aviso("a-ed2", interno ? "Nota interna registrada." : "Mensagem enviada.", "ok");
      }));
      if ($("ed2-cancelar")) {
        let conf = false;
        $("ed2-cancelar").addEventListener("click", () => {
          if (!conf) { conf = true; $("ed2-cancelar").textContent = "Confirmar cancelamento"; return; }
          rodar($("ed2-cancelar"), async () => {
            await api("/rest/v1/rpc/enc_atualizar", { method: "POST", body: JSON.stringify({ p_sol: s.id, p_status: "cancelada", p_responsavel: null, p_prazo: null, p_prioridade: null }) });
            await detalhe(s.id); aviso("a-ed2", "Solicitação cancelada.", "ok");
          });
        });
      }
    } catch (e) { if (e.message !== "sessao") aviso(atual ? "a-ed2" : "a-enc", traduzErro(e)); }
  }
  async function ehDaEquipe(s) {
    if (s.responsavel_id === eu.id) return true;
    const r = await api(`/rest/v1/enc_responsavel?select=categoria_id&categoria_id=eq.${s.categoria_id}&colaborador_id=eq.${eu.id}`);
    return r.length > 0;
  }
  async function rodar(btn, fn) {
    btn.disabled = true;
    try { await fn(); } catch (e) { if (e.message !== "sessao") aviso("a-ed2", traduzErro(e)); aviso("a-enc", ""); }
    finally { btn.disabled = false; }
  }
  $("ed2-voltar").addEventListener("click", () => abrir());

  // ---------- configuração: tipos e equipes
  // ---------- canal WhatsApp (TAAI)
  async function desenharWa() {
    const el = $("enc-wa");
    el.innerHTML = `<div class="resumo">Carregando…</div>`;
    let w;
    try { w = await api("/rest/v1/rpc/wa_painel", { method: "POST", body: "{}" }); }
    catch (e) { el.innerHTML = `<div class="resumo">${esc(traduzErro(e))}</div>`; return; }
    const adm = pode("admin");
    const ok = w.ativo && w.tem_token && w.phone_number_id;
    const copia = (rot, v) => `<label>${rot}</label><div class="wa-copia"><code>${esc(v || "")}</code><button type="button" class="sec" data-copia="${esc(v || "")}">Copiar</button></div>`;
    el.innerHTML = `
      <div class="painel-eq">
        <h2 style="margin:0">TAAI · assistente do time IA no WhatsApp</h2>
        <div class="ajuda" style="margin:4px 0 0">Robô que abre e acompanha encaminhamentos pelo WhatsApp, com o mesmo fluxo, prazos e equipes desta tela. O número é virtual, só de mensagens.</div>
        <div class="wa-est">
          <div><small>Situação</small><b style="color:${ok ? "#137a3d" : "#b54708"}">${ok ? "Ligado" : w.ativo ? "Incompleto" : "Desligado"}</b></div>
          <div><small>Pessoas ligadas</small><b>${w.ligados}</b></div>
          <div><small>Avisos na fila</small><b>${w.pendentes}</b></div>
          <div><small>Última mensagem recebida</small><b style="font-size:14px">${w.ultima_entrada ? esc(new Date(w.ultima_entrada).toLocaleString("pt-BR")) : "—"}</b></div>
        </div>
        ${(w.erros || []).length ? `<div class="ajuda" style="color:#b42318">Últimos erros: ${w.erros.map(x => esc(new Date(x.criado_em).toLocaleString("pt-BR") + " — " + x.resumo)).join("<br>")}</div>` : ""}
      </div>
      <div class="painel-eq">
        <h3 style="margin:0 0 6px">1. Dados para cadastrar na Meta (Webhook)</h3>
        ${copia("URL de retorno (Callback URL)", w.webhook)}
        ${copia("Token de verificação (Verify token)", w.verify_token)}
        <div class="ajuda">No app da Meta, em WhatsApp › Configuração › Webhook, cole os dois valores e assine o campo <b>messages</b>.</div>
      </div>
      <form class="painel-eq" id="f-wa">
        <h3 style="margin:0 0 6px">2. Dados do número (vindos da Meta)</h3>
        <div class="grade2">
          <div><label for="wa-pid">Identificação do número (Phone number ID)</label><input id="wa-pid" type="text" value="${esc(w.phone_number_id || "")}" inputmode="numeric" ${adm ? "" : "disabled"}></div>
          <div><label for="wa-num">Número exibido, com DDI e DDD</label><input id="wa-num" type="text" value="${esc(w.numero || "")}" placeholder="55 71 3333-0000" ${adm ? "" : "disabled"}></div>
          <div><label for="wa-tok">Token de acesso permanente</label><input id="wa-tok" type="password" autocomplete="off" placeholder="${w.tem_token ? "•••• já cadastrado (preencha só para trocar)" : "cole o token do usuário do sistema"}" ${adm ? "" : "disabled"}></div>
          <div><label for="wa-seg">Chave secreta do app (App secret)</label><input id="wa-seg" type="password" autocomplete="off" placeholder="${w.tem_segredo ? "•••• já cadastrada (preencha só para trocar)" : "confere que as mensagens vêm da Meta"}" ${adm ? "" : "disabled"}></div>
          <div><label for="wa-tpl">Modelo de aviso aprovado</label><input id="wa-tpl" type="text" value="${esc(w.template || "sgt_aviso")}" ${adm ? "" : "disabled"}></div>
          <div><label for="wa-at">Canal</label><select id="wa-at" ${adm ? "" : "disabled"}><option value="nao">Desligado</option><option value="sim"${w.ativo ? " selected" : ""}>Ligado</option></select></div>
        </div>
        ${adm ? `<button type="submit" style="width:auto">Salvar</button>` : `<div class="ajuda">Somente o programador ou um ADM altera estes dados.</div>`}
        <div class="aviso" id="a-wa"></div>
      </form>
      <div class="painel-eq">
        <h3 style="margin:0 0 6px">3. Modelo de aviso (para mensagens depois de 24 h)</h3>
        <div class="ajuda" style="margin:0">Crie no Gerenciador do WhatsApp um modelo da categoria <b>Utilidade</b>, idioma <b>Português (BR)</b>, nome <code>${esc(w.template || "sgt_aviso")}</code>, com este texto:</div>
        ${copia("Texto do modelo", "Olá! A TAAI, assistente do time IA, tem uma atualização sobre seus encaminhamentos no SGT: {{1}}. Responda esta mensagem para ver os detalhes e as opções.")}
        <div class="ajuda">Dentro de 24 h depois da última mensagem da pessoa, a TAAI responde com texto livre e botões; fora disso, usa este modelo.</div>
      </div>`;
    el.querySelectorAll("[data-copia]").forEach(b => b.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(b.dataset.copia); b.textContent = "Copiado"; setTimeout(() => b.textContent = "Copiar", 1500); } catch { /* sem área de transferência */ }
    }));
    const f = $("f-wa");
    if (adm) f.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const p = { phone_number_id: $("wa-pid").value.replace(/\D/g, ""), numero: $("wa-num").value.replace(/\D/g, ""),
        token: $("wa-tok").value.trim(), app_secret: $("wa-seg").value.trim(), template: $("wa-tpl").value.trim(), ativo: $("wa-at").value };
      if (p.ativo === "sim" && (!p.phone_number_id || (!p.token && !w.tem_token))) return aviso("a-wa", "Para ligar, informe a identificação do número e o token.");
      try {
        await api("/rest/v1/rpc/wa_configurar", { method: "POST", body: JSON.stringify({ p }) });
        aviso("a-wa", "Configuração salva.", "ok"); setTimeout(desenharWa, 900);
      } catch (e) { aviso("a-wa", traduzErro(e)); }
    });
  }

  async function desenharConfig() {
    $("enc-conf").innerHTML = `<div class="resumo">Carregando…</div>`;
    try {
      pessoas = pessoas || await api("/rest/v1/rpc/enc_pessoas", { method: "POST", body: "{}" });
      const resp = await api("/rest/v1/enc_responsavel?select=*");
      const nome = Object.fromEntries(pessoas.map(p => [p.id, p.nome]));
      $("enc-conf").innerHTML = `<p class="sub" style="margin-top:6px">Cada tipo tem uma equipe que recebe os avisos e atende. Tipos sem equipe vão para quem tem a ferramenta Encaminhamentos (gestão) ou, se ninguém tiver, para os administradores.</p>
        <datalist id="enc-pessoas">${pessoas.map(p => `<option value="${esc(p.nome)}">`).join("")}</datalist>
        ${categorias.map(c => `<div class="cat-card" data-c="${c.id}">
          <div class="linha">
            <div><label>Nome</label><input type="text" data-f="nome" value="${esc(c.nome)}"></div>
            <div><label>Descrição</label><input type="text" data-f="descricao" value="${esc(c.descricao || "")}"></div>
            <div><label>Prazo (dias)</label><input type="text" inputmode="numeric" data-f="prazo_dias" value="${c.prazo_dias}"></div>
            <div><label>Situação</label><select data-f="ativa"><option value="true"${c.ativa ? " selected" : ""}>Ativo</option><option value="false"${c.ativa ? "" : " selected"}>Inativo</option></select></div>
          </div>
          <div class="chips-p">${resp.filter(r => r.categoria_id === c.id).map(r => `<span>${esc(nome[r.colaborador_id] || "—")}<button type="button" data-tirar="${r.colaborador_id}" title="Tirar da equipe">×</button></span>`).join("") || `<span style="background:#f2f4f7;color:#475467">Sem equipe</span>`}</div>
          <div class="grade2" style="margin-top:8px;align-items:end"><div><input type="search" list="enc-pessoas" placeholder="Adicionar pessoa à equipe (digite o nome)" data-add></div>
            <div class="btns" style="margin:0"><button type="button" class="sec" data-salvar style="margin-top:0">Salvar tipo</button></div></div>
        </div>`).join("")}
        <h2>Novo tipo de solicitação</h2>
        <div class="cat-card" data-c="novo"><div class="linha">
          <div><label>Nome</label><input type="text" data-f="nome"></div><div><label>Descrição</label><input type="text" data-f="descricao"></div>
          <div><label>Prazo (dias)</label><input type="text" inputmode="numeric" data-f="prazo_dias" value="5"></div><div><button type="button" data-salvar style="margin-top:0">Criar</button></div></div></div>`;
      $("enc-conf").querySelectorAll(".cat-card").forEach(card => {
        const id = card.dataset.c, campo = (f) => card.querySelector(`[data-f="${f}"]`);
        card.querySelector("[data-salvar]").addEventListener("click", async () => {
          const d = { nome: campo("nome").value.trim(), descricao: campo("descricao").value.trim() || null, prazo_dias: parseInt(campo("prazo_dias").value, 10) || 0 };
          if (campo("ativa")) d.ativa = campo("ativa").value === "true";
          if (!d.nome) return aviso("a-enc", "Informe o nome do tipo.");
          try {
            if (id === "novo") await api("/rest/v1/enc_categoria", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ ...d, ordem: 50 }) });
            else await api(`/rest/v1/enc_categoria?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(d) });
            categorias = await api("/rest/v1/enc_categoria?select=*&order=ordem.asc,nome.asc");
            await desenharConfig(); aviso("a-enc", "Tipo salvo.", "ok");
          } catch (e) { if (e.message !== "sessao") aviso("a-enc", /duplicate|unique/i.test(e.message) ? "Já existe um tipo com esse nome." : traduzErro(e)); }
        });
        const add = card.querySelector("[data-add]");
        if (add) add.addEventListener("change", async () => {
          const p = pessoas.find(x => x.nome === add.value); if (!p) return;
          try { await api("/rest/v1/enc_responsavel", { method: "POST", headers: { Prefer: "return=minimal,resolution=ignore-duplicates" }, body: JSON.stringify({ categoria_id: +id, colaborador_id: p.id }) });
            await desenharConfig(); aviso("a-enc", `${p.nome} entrou na equipe.`, "ok"); } catch (e) { if (e.message !== "sessao") aviso("a-enc", traduzErro(e)); }
        });
        card.querySelectorAll("[data-tirar]").forEach(b => b.addEventListener("click", async () => {
          try { await api(`/rest/v1/enc_responsavel?categoria_id=eq.${id}&colaborador_id=eq.${b.dataset.tirar}`, { method: "DELETE" });
            await desenharConfig(); } catch (e) { if (e.message !== "sessao") aviso("a-enc", traduzErro(e)); }
        }));
      });
    } catch (e) { if (e.message !== "sessao") aviso("a-enc", traduzErro(e)); }
  }

  window.Encaminhamentos = { abrir };
})();
