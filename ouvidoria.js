// SGT · Ouvidoria (gestão das manifestações recebidas)
// O registro é feito sem login, na página ouvidoria/. Aqui só entra quem tem a ferramenta Ouvidoria.
(() => {
  const $ = (id) => document.getElementById(id);
  const TIPOS = { denuncia: "Denúncia", reclamacao: "Reclamação", sugestao: "Sugestão", elogio: "Elogio", solicitacao: "Solicitação", outro: "Outro" };
  const STATUS = { recebida: "Recebida", em_analise: "Em análise", encaminhada: "Encaminhada", respondida: "Respondida", concluida: "Concluída", arquivada: "Arquivada" };
  const COR = { recebida: "verm", em_analise: "lar", encaminhada: "lar", respondida: "", concluida: "verde", arquivada: "cinza" };
  const PRIOR = { baixa: "Baixa", normal: "Normal", alta: "Alta", urgente: "Urgente" };
  let lista = [], equipe = null;

  $("cartao").querySelector(".rodape").insertAdjacentHTML("beforebegin", `
  <section id="v-ouv" class="oculto">
    <div class="topo"><div><h1>Ouvidoria</h1><div class="ajuda" style="margin:0">Manifestações recebidas · acesso restrito e sigiloso</div></div><button class="sec" data-ir="v-inicio">← Início</button></div>
    <div class="filtros" style="margin-top:16px">
      <input id="ov-busca" type="search" placeholder="Buscar por protocolo, assunto ou texto">
      <select id="ov-st"><option value="abertas">Em aberto</option><option value="">Todas</option>${Object.entries(STATUS).map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select>
      <select id="ov-tipo"><option value="">Todos os tipos</option>${Object.entries(TIPOS).map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select>
    </div>
    <div class="resumo" id="ov-resumo"></div>
    <div class="lista" id="ov-lista"></div>
    <div class="aviso" id="a-ov"></div>
    <p class="ajuda" style="margin-top:18px">Link para divulgar: <a href="ouvidoria/" target="_blank" id="ov-link"></a></p>
  </section>
  <section id="v-ouv-det" class="oculto">
    <div class="topo"><div><h1 id="od-tit"></h1><div class="ajuda" style="margin:0" id="od-sub"></div></div><button class="sec" id="od-voltar">← Voltar</button></div>
    <div id="od-corpo"></div>
    <div class="aviso" id="a-od"></div>
  </section>`);
  $("v-ouv").querySelector("[data-ir]").addEventListener("click", () => mostrar("v-inicio"));
  $("ov-link").textContent = new URL("ouvidoria/", location.href).href;
  $("ov-link").href = $("ov-link").textContent;

  async function comToken(fn) {
    let r = await fn(lerSessao().t);
    if (r.status === 401 && await renovar()) r = await fn(lerSessao().t);
    return r;
  }
  async function baixar(caminho) {
    const r = await comToken(t => fetch(`${SUPABASE_URL}/storage/v1/object/sign/ouvidoria/${caminho}`, {
      method: "POST", headers: { apikey: CHAVE_PUBLICA, Authorization: "Bearer " + t, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 300 }) }));
    const d = await r.json();
    if (!r.ok || !d.signedURL) throw new Error("Não foi possível abrir o arquivo.");
    window.open(SUPABASE_URL + "/storage/v1" + d.signedURL, "_blank");
  }

  async function abrir() {
    mostrar("v-ouv");
    $("ov-lista").innerHTML = `<div class="resumo">Carregando…</div>`;
    try {
      lista = await api("/rest/v1/ouv_manifestacao?select=id,protocolo,tipo,assunto,relato,status,prioridade,envolve_terceiros,identificado,criado_em,atualizado_em,responsavel_id&order=criado_em.desc&limit=2000");
      desenhar();
    } catch (e) { if (e.message !== "sessao") aviso("a-ov", traduzErro(e)); }
  }
  function desenhar() {
    const q = semAcento($("ov-busca").value.trim()), st = $("ov-st").value, tp = $("ov-tipo").value;
    const l = lista.filter(m => (!q || semAcento(`${m.protocolo} ${m.assunto} ${m.relato}`).includes(q)) && (!tp || m.tipo === tp)
      && (!st || (st === "abertas" ? !["concluida", "arquivada"].includes(m.status) : m.status === st)));
    const novas = lista.filter(m => m.status === "recebida").length;
    $("ov-resumo").textContent = `${lista.length} manifestações · ${novas} ainda não lidas` + (l.length !== lista.length ? ` · mostrando ${l.length}` : "");
    $("ov-lista").innerHTML = l.length ? l.map(m => `<div class="pessoa" data-id="${m.id}"><div><b>${esc(m.protocolo)} · ${TIPOS[m.tipo]} · ${esc(m.assunto)}</b>
        <div class="meta">Recebida em ${new Date(m.criado_em).toLocaleString("pt-BR")} · ${esc(m.relato.slice(0, 120))}${m.relato.length > 120 ? "…" : ""}</div></div>
      <div class="tags"><span class="tag ${COR[m.status]}">${STATUS[m.status]}</span>${m.prioridade !== "normal" ? `<span class="tag ${m.prioridade === "baixa" ? "cinza" : "verm"}">${PRIOR[m.prioridade]}</span>` : ""}
        ${m.envolve_terceiros ? `<span class="tag cinza">Envolve terceiros</span>` : ""}${m.identificado ? `<span class="tag cinza">Identificada</span>` : `<span class="tag cinza">Anônima</span>`}</div></div>`).join("")
      : `<div class="resumo">Nenhuma manifestação encontrada.</div>`;
    $("ov-lista").querySelectorAll(".pessoa").forEach(el => el.addEventListener("click", () => detalhe(el.dataset.id)));
  }
  ["ov-busca", "ov-st", "ov-tipo"].forEach(id => $(id).addEventListener("input", desenhar));

  const linha = (rot, val) => val ? `<tr><th style="width:190px">${rot}</th><td style="white-space:pre-wrap">${esc(val)}</td></tr>` : "";
  async function detalhe(id) {
    try {
      const [[m], msgs, anexos] = await Promise.all([
        api(`/rest/v1/ouv_manifestacao?select=*&id=eq.${id}`),
        api(`/rest/v1/ouv_mensagem?select=*&manifestacao_id=eq.${id}&order=criado_em.asc`),
        api(`/rest/v1/ouv_anexo?select=*&manifestacao_id=eq.${id}&order=criado_em.asc`)]);
      equipe = equipe || await api("/rest/v1/rpc/ouv_equipe", { method: "POST", body: "{}" });
      const nome = Object.fromEntries(equipe.map(p => [p.id, p.nome]));
      $("od-tit").textContent = `${m.protocolo} · ${TIPOS[m.tipo]}`;
      $("od-sub").textContent = `${m.assunto} · recebida em ${new Date(m.criado_em).toLocaleString("pt-BR")}`;
      const conversa = msgs.map(x => x.autor === "interno"
        ? `<div class="evento" style="align-self:stretch;text-align:left;background:#fffaeb;border:1px dashed #f5c26b;border-radius:10px;padding:8px 10px;white-space:pre-wrap"><b>Nota interna</b> · ${esc(nome[x.feito_por] || "")} · ${new Date(x.criado_em).toLocaleString("pt-BR")}<br>${esc(x.texto)}</div>`
        : `<div class="bolha${x.autor === "ouvidoria" ? " minha" : ""}"><small>${x.autor === "ouvidoria" ? "Ouvidoria · " + esc(nome[x.feito_por] || "") : "Manifestante"} · ${new Date(x.criado_em).toLocaleString("pt-BR")}</small>${esc(x.texto)}</div>`).join("");
      $("od-corpo").innerHTML = `
        <div class="rolar" style="max-height:none;margin-top:14px"><table class="prev">
          ${linha("Tipo", TIPOS[m.tipo])}${linha("Assunto", m.assunto)}${linha("O que aconteceu", m.relato)}
          ${linha("Envolve outras pessoas", m.envolve_terceiros ? "Sim" : "Não")}${linha("Pessoas envolvidas", m.pessoas_envolvidas)}
          ${linha("Local", m.local_fato)}${linha("Quando", m.data_fato)}${linha("Provas e testemunhas", m.evidencias)}
          ${linha("Identificação", m.identificado ? `${m.nome_contato || "—"} · ${m.contato || "—"}` : "Anônima")}
        </table></div>
        ${anexos.length ? `<h2>Arquivos enviados</h2><div class="anx" style="display:flex;flex-wrap:wrap;gap:8px">${anexos.map(a => `<a data-arq="${esc(a.path)}" style="font-size:13px;color:var(--cor);font-weight:600;cursor:pointer;background:var(--cor-suave);padding:5px 10px;border-radius:999px">📎 ${esc(a.nome)}</a>`).join("")}</div>` : ""}
        <div class="painel-eq" style="background:var(--fundo);border:1px solid var(--borda);border-radius:var(--raio);padding:14px;margin-top:14px"><b>Tratamento</b>
          <div class="grade2" style="margin-top:6px">
            <div><label>Situação</label><select id="od-st">${Object.entries(STATUS).map(([k, n]) => `<option value="${k}"${k === m.status ? " selected" : ""}>${n}</option>`).join("")}</select></div>
            <div><label>Prioridade</label><select id="od-pri">${Object.entries(PRIOR).map(([k, n]) => `<option value="${k}"${k === m.prioridade ? " selected" : ""}>${n}</option>`).join("")}</select></div>
            <div><label>Responsável</label><select id="od-resp"><option value="">Ninguém</option>${equipe.map(p => `<option value="${p.id}"${p.id === m.responsavel_id ? " selected" : ""}>${esc(p.nome)}</option>`).join("")}</select></div>
          </div>
          <button id="od-salvar" style="width:auto">Salvar</button></div>
        <h2>Conversa com o manifestante</h2>
        <div class="ajuda">O manifestante lê as respostas no acompanhamento, com o protocolo e a chave dele. Notas internas não aparecem para ele.</div>
        <div class="chat" style="display:flex;flex-direction:column;gap:10px;margin-top:10px">${conversa || `<div class="resumo">Sem mensagens ainda.</div>`}</div>
        <textarea id="od-msg" style="width:100%;min-height:90px;margin-top:14px;padding:12px 14px;font-size:15px;border:1px solid var(--borda);border-radius:var(--raio);font-family:inherit" placeholder="Escreva a resposta ao manifestante ou uma nota interna"></textarea>
        <label class="check" style="margin-top:6px"><input type="checkbox" id="od-int"><span>Nota interna (o manifestante não vê)</span></label>
        <button id="od-enviar" style="width:auto">Registrar</button>`;
      mostrar("v-ouv-det");
      $("od-corpo").querySelectorAll("[data-arq]").forEach(a => a.addEventListener("click", () => baixar(a.dataset.arq).catch(x => aviso("a-od", x.message))));
      $("od-salvar").addEventListener("click", () => rodar($("od-salvar"), async () => {
        await api("/rest/v1/rpc/ouv_atualizar", { method: "POST", body: JSON.stringify({ p_id: m.id, p_status: $("od-st").value, p_prioridade: $("od-pri").value, p_responsavel: $("od-resp").value || null }) });
        await detalhe(m.id); aviso("a-od", "Tratamento atualizado.", "ok");
      }));
      $("od-enviar").addEventListener("click", () => rodar($("od-enviar"), async () => {
        const t = $("od-msg").value.trim(), interno = $("od-int").checked;
        if (t.length < 2) throw new Error("Escreva a mensagem.");
        await api("/rest/v1/rpc/ouv_responder", { method: "POST", body: JSON.stringify({ p_id: m.id, p_texto: t, p_interno: interno }) });
        await detalhe(m.id); aviso("a-od", interno ? "Nota interna registrada." : "Resposta registrada. O manifestante verá no acompanhamento.", "ok");
      }));
      // marca como em análise ao abrir pela primeira vez
      if (m.status === "recebida") api("/rest/v1/rpc/ouv_atualizar", { method: "POST", body: JSON.stringify({ p_id: m.id, p_status: "em_analise", p_prioridade: m.prioridade, p_responsavel: m.responsavel_id }) })
        .then(() => { const x = lista.find(y => y.id === m.id); if (x) x.status = "em_analise"; $("od-st").value = "em_analise"; }).catch(() => {});
    } catch (e) { if (e.message !== "sessao") aviso("a-ov", traduzErro(e)); }
  }
  async function rodar(btn, fn) {
    btn.disabled = true;
    try { await fn(); } catch (e) { if (e.message !== "sessao") aviso("a-od", traduzErro(e)); }
    finally { btn.disabled = false; }
  }
  $("od-voltar").addEventListener("click", abrir);

  window.Ouvidoria = { abrir };
})();
