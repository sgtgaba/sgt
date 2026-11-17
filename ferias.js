// SGT · Módulo Gestão de Férias
// Usa as funções globais do index.html: api, aviso, mostrar, esc, eu, pode, fmtData, traduzErro,
// lerSessao, renovar, SUPABASE_URL, CHAVE_PUBLICA.
(() => {
  const ETAPAS = [
    ["periodos_informados", "Períodos informados"],
    ["aguardando_prazo_rh", "Prazo do sistema do RH"],
    ["comprovante_solicitado", "Comprovante"],
    ["aviso_solicitado", "Aviso do colaborador"],
    ["aguardando_gerencia", "Assinatura da gerência"],
    ["concluido", "Concluído"],
  ];
  const IDX = Object.fromEntries(ETAPAS.map(([k], i) => [k, i]));
  const NOME_ETAPA = Object.fromEntries(ETAPAS);
  NOME_ETAPA.cancelado = "Cancelado";
  const $ = (id) => document.getElementById(id);
  const hoje = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const dt = (s) => new Date(s + "T00:00:00");
  const dias = (a, b) => Math.round((dt(b) - dt(a)) / 864e5) + 1;
  const ateHoje = (s) => Math.round((dt(s) - hoje()) / 864e5);
  let minhas = [], todas = [], atual = null, substitui = null;

  // ---------- estilos e telas
  document.head.insertAdjacentHTML("beforeend", `<style>
    .prog{display:flex;gap:4px;margin:14px 0 6px}
    .prog .p{flex:1;text-align:center;font-size:11px;color:var(--texto-2);line-height:1.25}
    .prog .p i{display:block;height:8px;border-radius:6px;background:#eee;margin-bottom:6px}
    .prog .p.feito i{background:var(--verde)} .prog .p.agora i{background:var(--laranja)} .prog .p.agora{color:var(--texto);font-weight:700}
    .prog.cancel .p i{background:#e5e7eb!important}
    .fcard{border:1px solid var(--borda);border-radius:var(--raio);padding:16px;margin-top:12px;background:#fff}
    .fcard h3{margin:0;font-size:16px} .fcard .meta{font-size:13px;color:var(--texto-2);margin-top:4px}
    .acao{background:var(--cor-suave);border-radius:10px;padding:14px;margin-top:12px;font-size:14px;line-height:1.45}
    .acao input[type=file]{margin-top:10px;width:100%}
    .acao button{margin-top:12px}
    .linha-per{display:grid;grid-template-columns:1fr 1fr 90px;gap:10px;align-items:end}
    .linha-per .d{font-size:13px;color:var(--texto-2);padding-bottom:12px}
    .mini{display:inline-flex;gap:3px;vertical-align:middle} .mini i{width:14px;height:6px;border-radius:3px;background:#eee}
    .mini i.f{background:var(--verde)} .mini i.a{background:var(--laranja)}
    .hist{border-left:3px solid var(--cor-suave);margin:10px 0 0 6px;padding-left:14px}
    .hist div{font-size:13px;margin-bottom:10px} .hist small{color:var(--texto-2);display:block}
    .btns{display:flex;gap:10px;flex-wrap:wrap} .btns button{width:auto;flex:1;min-width:150px;margin-top:12px}
    .arqs a{display:inline-block;margin:6px 10px 0 0;color:var(--cor);font-weight:600;font-size:14px;cursor:pointer}
    @media (max-width:640px){.linha-per{grid-template-columns:1fr 1fr}.linha-per .d{grid-column:1/-1;padding:0}.prog .p{font-size:0}.prog .p.agora{font-size:11px}}
  </style>`);

  const voltar = (alvo) => `<button class="sec" data-ir="${alvo}">← Voltar</button>`;
  $("cartao").querySelector(".rodape").insertAdjacentHTML("beforebegin", `
  <section id="v-fer" class="oculto">
    <div class="topo"><div><h1>Gestão de Férias</h1><div class="ajuda" style="margin:0">Suas férias, do lançamento à assinatura do aviso</div></div>${voltar("v-inicio")}</div>
    <div class="btns"><button id="fer-nova">Informar férias</button><button class="sec oculto" id="fer-ir-gestao">Acompanhar a equipe</button></div>
    <div class="aviso" id="a-fer"></div>
    <div id="fer-lista"></div>
  </section>

  <section id="v-fer-form" class="oculto">
    <div class="topo"><div><h1 id="ff-tit">Informar férias</h1><div class="ajuda" style="margin:0">Preencha só depois de lançar as férias no sistema do RH.</div></div>${voltar("v-fer")}</div>
    <form id="f-fer" novalidate>
      <label for="ff-pa">Período aquisitivo</label>
      <input id="ff-pa" type="text" placeholder="Ex.: 2025/2026">
      <div class="ajuda">Até 3 períodos: um com pelo menos 14 dias e os demais com pelo menos 5 dias (CLT, art. 134).</div>
      <div id="ff-per"></div>
      <button type="button" class="sec" id="ff-mais" style="width:auto">+ Adicionar período</button>
      <div class="ajuda" id="ff-resumo"></div>
      <label class="check"><input type="checkbox" id="ff-c1"><span>Declaro que já lancei estes períodos de férias no sistema do RH.</span></label>
      <label class="check" style="margin-top:6px"><input type="checkbox" id="ff-c2"><span>Estou ciente de que os dados informados serão usados exclusivamente para a gestão das minhas férias no Projeto GA BA, conforme a LGPD.</span></label>
      <button type="submit">Enviar</button>
    </form>
    <div class="aviso" id="a-ff"></div>
  </section>

  <section id="v-fer-gestao" class="oculto">
    <div class="topo"><div><h1>Férias da equipe</h1><div class="ajuda" style="margin:0" id="fg-sub"></div></div>${voltar("v-fer")}</div>
    <div class="filtros" style="margin-top:16px">
      <input id="fg-busca" type="search" placeholder="Buscar por nome">
      <select id="fg-etapa"><option value="abertas">Em andamento</option><option value="">Todas</option>
        ${ETAPAS.map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}<option value="cancelado">Canceladas</option></select>
      <select id="fg-flag"><option value="">Sem filtro de alerta</option><option value="prazo">Começam em até 30 dias</option><option value="erro">Com erro no sistema do RH</option></select>
    </div>
    <div class="resumo" id="fg-resumo"></div>
    <div class="lista" id="fg-lista"></div>
    <div class="aviso" id="a-fg"></div>
  </section>

  <section id="v-fer-det" class="oculto">
    <div class="topo"><div><h1 id="fd-nome"></h1><div class="ajuda" style="margin:0" id="fd-sub"></div></div><button class="sec" id="fd-voltar">← Voltar</button></div>
    <div id="fd-corpo"></div>
    <div class="aviso" id="a-fd"></div>
  </section>`);
  document.querySelectorAll("#v-fer [data-ir],#v-fer-form [data-ir],#v-fer-gestao [data-ir]").forEach(b => b.addEventListener("click", () => {
    if (b.dataset.ir === "v-fer") abrir(); else mostrar(b.dataset.ir);
  }));

  // ---------- arquivos
  async function comToken(fn) {
    let r = await fn(lerSessao().t);
    if (r.status === 401 && await renovar()) r = await fn(lerSessao().t);
    return r;
  }
  async function enviarPDF(arquivo, nome) {
    if (!arquivo) throw new Error("Escolha o arquivo em PDF.");
    if (arquivo.type !== "application/pdf" && !/\.pdf$/i.test(arquivo.name)) throw new Error("O arquivo precisa ser PDF.");
    if (arquivo.size > 5 * 1024 * 1024) throw new Error("O PDF pode ter no máximo 5 MB.");
    const caminho = `${atual.colaborador_id}/${atual.id}/${nome}_${Date.now()}.pdf`;
    const r = await comToken(t => fetch(`${SUPABASE_URL}/storage/v1/object/ferias/${caminho}`, {
      method: "POST", headers: { apikey: CHAVE_PUBLICA, Authorization: "Bearer " + t, "Content-Type": "application/pdf" }, body: arquivo }));
    if (!r.ok) throw new Error("Não foi possível enviar o arquivo. Tente de novo.");
    return caminho;
  }
  async function baixar(caminho) {
    const r = await comToken(t => fetch(`${SUPABASE_URL}/storage/v1/object/sign/ferias/${caminho}`, {
      method: "POST", headers: { apikey: CHAVE_PUBLICA, Authorization: "Bearer " + t, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 600 }) }));
    const d = await r.json();
    if (!r.ok || !d.signedURL) throw new Error("Não foi possível abrir o arquivo.");
    window.open(SUPABASE_URL + "/storage/v1" + d.signedURL, "_blank");
  }

  // ---------- componentes
  function barra(s) {
    const i = s.etapa === "cancelado" ? -1 : IDX[s.etapa];
    return `<div class="prog${s.etapa === "cancelado" ? " cancel" : ""}">` + ETAPAS.map(([k, n], j) =>
      `<div class="p ${s.etapa === "concluido" || j < i ? "feito" : j === i ? "agora" : ""}"><i></i>${n}</div>`).join("") + `</div>`;
  }
  function mini(s) {
    const i = IDX[s.etapa] ?? -1;
    return `<span class="mini">` + ETAPAS.map((_, j) => `<i class="${s.etapa === "concluido" || j < i ? "f" : j === i ? "a" : ""}"></i>`).join("") + `</span>`;
  }
  const periodos = (s) => (s.ferias_periodo || []).sort((a, b) => a.ordem - b.ordem)
    .map(p => `${fmtData(p.inicio)} a ${fmtData(p.fim)} (${p.dias} dias)`).join(" · ");
  const inicio = (s) => (s.ferias_periodo || []).map(p => p.inicio).sort()[0];

  function blocoAcao(s, dono) {
    const e = s.etapa;
    if (e === "aguardando_prazo_rh" || e === "comprovante_solicitado") {
      const falta = ateHoje(s.prazo_rh_ate);
      const txt = e === "aguardando_prazo_rh"
        ? `O sistema do RH pode levar até 10 dias para atualizar. ${falta > 0 ? `Faltam <b>${falta} dia(s)</b>: em ${fmtData(s.prazo_rh_ate)} você recebe o pedido do comprovante.` : ""} Se a programação já aparece no sistema, pode enviar o comprovante agora.`
        : `<b>Envie o comprovante da programação em PDF.</b> Você recebe um lembrete por dia até enviar.`;
      return dono ? `<div class="acao">${txt}
        <input type="file" accept="application/pdf,.pdf" id="fx-arq">
        <label class="check"><input type="checkbox" id="fx-erro"><span>Encontrei erro na programação do sistema do RH</span></label>
        <input type="text" id="fx-desc" class="oculto" placeholder="Descreva o erro (datas, dias, outro)">
        <button id="fx-enviar">Enviar comprovante</button></div>` : `<div class="acao">${txt}</div>`;
    }
    if (e === "aviso_solicitado") return dono ? `<div class="acao"><b>Envie o seu aviso de férias assinado, em PDF.</b> Depois, a gerência assina e o documento volta para o seu e-mail.
        <input type="file" accept="application/pdf,.pdf" id="fx-arq"><button id="fx-aviso">Enviar aviso assinado</button></div>`
      : `<div class="acao">Aguardando o colaborador enviar o aviso assinado.</div>`;
    if (e === "aguardando_gerencia") return pode("gerencia")
      ? `<div class="acao"><b>Assinatura da gerência.</b> Baixe o aviso enviado pelo colaborador, assine pelo gov.br ou à mão, e envie o PDF assinado. Ele vai automaticamente para o e-mail do colaborador.
        <input type="file" accept="application/pdf,.pdf" id="fx-arq"><button id="fx-concluir">Enviar aviso assinado pela gerência</button></div>`
      : `<div class="acao">Aguardando a assinatura da gerência. Você será avisado(a) por e-mail.</div>`;
    if (e === "concluido") return `<div class="acao">Processo concluído em ${new Date(s.concluido_em).toLocaleDateString("pt-BR")}. O aviso assinado foi enviado por e-mail${dono ? " para você" : " ao colaborador"}.</div>`;
    return "";
  }

  function arquivos(s) {
    const a = [];
    if (s.comprovante_url) a.push(`<a data-arq="${esc(s.comprovante_url)}">Comprovante da programação</a>`);
    if (s.aviso_colab_url) a.push(`<a data-arq="${esc(s.aviso_colab_url)}">Aviso assinado pelo colaborador</a>`);
    if (s.aviso_final_url) a.push(`<a data-arq="${esc(s.aviso_final_url)}">Aviso assinado pela gerência</a>`);
    return a.length ? `<div class="arqs">${a.join("")}</div>` : "";
  }

  function ligarAcoes(raiz, s, aoTerminar) {
    atual = s;
    raiz.querySelectorAll("[data-arq]").forEach(el => el.addEventListener("click", () => baixar(el.dataset.arq).catch(e => aviso("a-fd", e.message))));
    const erro = raiz.querySelector("#fx-erro");
    if (erro) erro.addEventListener("change", () => raiz.querySelector("#fx-desc").classList.toggle("oculto", !erro.checked));
    const rodar = async (btn, fn) => {
      btn.disabled = true;
      try { await fn(); await aoTerminar("ok"); }
      catch (e) { if (e.message !== "sessao") aoTerminar("erro", traduzErro(e)); }
      finally { btn.disabled = false; }
    };
    const b1 = raiz.querySelector("#fx-enviar");
    if (b1) b1.addEventListener("click", () => rodar(b1, async () => {
      const temErro = erro.checked, desc = raiz.querySelector("#fx-desc").value.trim();
      if (temErro && !desc) throw new Error("Descreva o erro encontrado no sistema do RH.");
      const p = await enviarPDF(raiz.querySelector("#fx-arq").files[0], "comprovante");
      await api("/rest/v1/rpc/ferias_enviar_comprovante", { method: "POST", body: JSON.stringify({ p_sol: s.id, p_path: p, p_erro: temErro, p_desc: desc }) });
    }));
    const b2 = raiz.querySelector("#fx-aviso");
    if (b2) b2.addEventListener("click", () => rodar(b2, async () => {
      const p = await enviarPDF(raiz.querySelector("#fx-arq").files[0], "aviso_colaborador");
      await api("/rest/v1/rpc/ferias_enviar_aviso", { method: "POST", body: JSON.stringify({ p_sol: s.id, p_path: p }) });
    }));
    const b3 = raiz.querySelector("#fx-concluir");
    if (b3) b3.addEventListener("click", () => rodar(b3, async () => {
      const p = await enviarPDF(raiz.querySelector("#fx-arq").files[0], "aviso_gerencia");
      await api("/rest/v1/rpc/ferias_concluir", { method: "POST", body: JSON.stringify({ p_sol: s.id, p_path: p }) });
    }));
  }

  const SELECT = "select=*,colaborador:colaborador!ferias_solicitacao_colaborador_id_fkey(nome),ferias_periodo(*),ferias_evento(*)";

  // ---------- Minhas férias
  async function abrir() {
    mostrar("v-fer");
    $("fer-ir-gestao").classList.toggle("oculto", !pode("gerencia", "rh", "admin", "lideranca"));
    $("fer-lista").innerHTML = `<div class="resumo">Carregando…</div>`;
    try {
      minhas = await api(`/rest/v1/ferias_solicitacao?${SELECT}&colaborador_id=eq.${eu.id}&order=criado_em.desc`);
      desenharMinhas();
    } catch (e) { if (e.message !== "sessao") aviso("a-fer", traduzErro(e)); }
  }
  function desenharMinhas() {
    const ativas = minhas.filter(s => s.etapa !== "cancelado");
    $("fer-lista").innerHTML = ativas.length ? ativas.map(s => `
      <div class="fcard" data-sol="${s.id}">
        <h3>Período aquisitivo ${esc(s.periodo_aquisitivo)}</h3>
        <div class="meta">${periodos(s)}</div>
        ${barra(s)}${blocoAcao(s, true)}${arquivos(s)}
        ${s.etapa !== "concluido" ? `<div class="btns"><button class="sec" data-ajustar="${s.id}">Ajustar datas</button><button class="perigo" data-cancelar="${s.id}">Cancelar</button></div>` : ""}
      </div>`).join("")
      : `<div class="fcard"><h3>Nenhuma férias informada ainda</h3><div class="meta">Depois de lançar suas férias no sistema do RH, clique em <b>Informar férias</b>.</div></div>`;
    $("fer-lista").querySelectorAll("[data-sol]").forEach(card => {
      const s = minhas.find(x => x.id === card.dataset.sol);
      ligarAcoes(card, s, async (st, msg) => { if (st === "ok") { await abrir(); aviso("a-fer", "Enviado com sucesso.", "ok"); } else aviso("a-fer", msg); });
    });
    $("fer-lista").querySelectorAll("[data-ajustar]").forEach(b => b.addEventListener("click", () => abrirForm(minhas.find(x => x.id === b.dataset.ajustar))));
    $("fer-lista").querySelectorAll("[data-cancelar]").forEach(b => b.addEventListener("click", async () => {
      if (b.dataset.conf !== "1") { b.dataset.conf = "1"; b.textContent = "Confirmar cancelamento"; return; }
      try { await api("/rest/v1/rpc/ferias_cancelar", { method: "POST", body: JSON.stringify({ p_sol: b.dataset.cancelar }) }); await abrir(); aviso("a-fer", "Solicitação cancelada.", "ok"); }
      catch (e) { if (e.message !== "sessao") aviso("a-fer", traduzErro(e)); }
    }));
  }

  // ---------- Formulário
  function linhaPeriodo(i, p = {}) {
    return `<div class="linha-per" data-i="${i}">
      <div><label>${i}º período · início</label><input type="date" class="fp-ini" value="${p.inicio || ""}"></div>
      <div><label>fim</label><input type="date" class="fp-fim" value="${p.fim || ""}"></div>
      <div class="d"></div></div>`;
  }
  function abrirForm(sub = null) {
    substitui = sub ? sub.id : null;
    $("ff-tit").textContent = sub ? "Ajustar datas das férias" : "Informar férias";
    $("f-fer").reset();
    $("ff-pa").value = sub ? sub.periodo_aquisitivo : "";
    const ps = sub ? sub.ferias_periodo.sort((a, b) => a.ordem - b.ordem) : [{}];
    $("ff-per").innerHTML = ps.map((p, i) => linhaPeriodo(i + 1, p)).join("");
    $("ff-mais").classList.toggle("oculto", ps.length >= 3);
    calcular();
    mostrar("v-fer-form");
    if (sub) aviso("a-ff", "Ao ajustar as datas, o processo recomeça da etapa 1. O histórico anterior fica guardado.", "alerta");
  }
  $("fer-nova").addEventListener("click", () => abrirForm());
  $("fer-ir-gestao").addEventListener("click", () => abrirGestao());
  $("ff-mais").addEventListener("click", () => {
    const n = $("ff-per").children.length + 1;
    if (n <= 3) $("ff-per").insertAdjacentHTML("beforeend", linhaPeriodo(n));
    $("ff-mais").classList.toggle("oculto", n >= 3);
  });
  $("ff-per").addEventListener("input", calcular);

  function lerPeriodos() {
    return [...$("ff-per").children].map(l => ({ inicio: l.querySelector(".fp-ini").value, fim: l.querySelector(".fp-fim").value }))
      .filter(p => p.inicio || p.fim);
  }
  function validar(ps) {
    if (!ps.length) return "Informe ao menos um período.";
    for (const p of ps) { if (!p.inicio || !p.fim) return "Preencha início e fim de cada período."; if (p.fim < p.inicio) return "O fim de um período está antes do início."; }
    const d = ps.map(p => dias(p.inicio, p.fim));
    if (Math.max(...d) < 14) return "Um dos períodos precisa ter pelo menos 14 dias.";
    if (Math.min(...d) < 5) return "Nenhum período pode ter menos de 5 dias.";
    const o = [...ps].sort((a, b) => a.inicio.localeCompare(b.inicio));
    for (let i = 1; i < o.length; i++) if (o[i].inicio <= o[i - 1].fim) return "Os períodos não podem se sobrepor.";
    return null;
  }
  function calcular() {
    [...$("ff-per").children].forEach(l => {
      const a = l.querySelector(".fp-ini").value, b = l.querySelector(".fp-fim").value;
      l.querySelector(".d").textContent = a && b && b >= a ? dias(a, b) + " dias" : "";
    });
    const ps = lerPeriodos(), erro = ps.length ? validar(ps) : null;
    const total = ps.filter(p => p.inicio && p.fim && p.fim >= p.inicio).reduce((t, p) => t + dias(p.inicio, p.fim), 0);
    $("ff-resumo").innerHTML = total ? `Total: <b>${total} dias</b>${erro ? ` · <span style="color:var(--erro)">${erro}</span>` : " · divisão de acordo com a CLT ✓"}` : "";
  }
  $("f-fer").addEventListener("submit", async (e) => {
    e.preventDefault();
    const pa = $("ff-pa").value.trim(), ps = lerPeriodos();
    if (!pa) return aviso("a-ff", "Informe o período aquisitivo (ex.: 2025/2026).");
    const erro = validar(ps); if (erro) return aviso("a-ff", erro);
    if (!$("ff-c1").checked || !$("ff-c2").checked) return aviso("a-ff", "Para enviar, marque as duas caixas de confirmação.");
    e.submitter && (e.submitter.disabled = true);
    try {
      await api("/rest/v1/rpc/ferias_registrar", { method: "POST", body: JSON.stringify({ p_periodo_aquisitivo: pa, p_periodos: ps, p_substitui: substitui }) });
      await abrir();
      aviso("a-fer", "Férias registradas. Em 10 dias o SGT vai pedir o comprovante da programação do sistema do RH.", "ok");
    } catch (err) { if (err.message !== "sessao") aviso("a-ff", traduzErro(err)); }
    finally { e.submitter && (e.submitter.disabled = false); }
  });

  // ---------- Gestão
  async function abrirGestao() {
    mostrar("v-fer-gestao");
    $("fg-sub").textContent = pode("gerencia", "rh", "admin") ? "Todas as solicitações do projeto" : "Solicitações da sua equipe";
    $("fg-lista").innerHTML = `<div class="resumo">Carregando…</div>`;
    try {
      todas = await api(`/rest/v1/ferias_solicitacao?${SELECT}&order=atualizado_em.desc`);
      desenharGestao();
    } catch (e) { if (e.message !== "sessao") aviso("a-fg", traduzErro(e)); }
  }
  function desenharGestao() {
    const q = ($("fg-busca").value || "").toLowerCase(), et = $("fg-etapa").value, fl = $("fg-flag").value;
    const vis = todas.filter(s => {
      if (et === "abertas" && ["concluido", "cancelado"].includes(s.etapa)) return false;
      if (et && et !== "abertas" && s.etapa !== et) return false;
      if (q && !(s.colaborador?.nome || "").toLowerCase().includes(q)) return false;
      const ini = inicio(s), falta = ini ? ateHoje(ini) : 999;
      if (fl === "prazo" && !(falta <= 30 && !["concluido", "cancelado"].includes(s.etapa))) return false;
      if (fl === "erro" && !s.erro_rh_relatado) return false;
      return true;
    });
    const abertas = todas.filter(s => !["concluido", "cancelado"].includes(s.etapa));
    const gerencia = todas.filter(s => s.etapa === "aguardando_gerencia").length;
    $("fg-resumo").textContent = `${abertas.length} em andamento · ${gerencia} aguardando a gerência` + (vis.length !== todas.length ? ` · mostrando ${vis.length}` : "");
    $("fg-lista").innerHTML = vis.length ? vis.map(s => {
      const ini = inicio(s), falta = ini ? ateHoje(ini) : null, aberta = !["concluido", "cancelado"].includes(s.etapa);
      const tags = [];
      if (aberta && falta !== null && falta <= 30) tags.push(`<span class="tag verm">Começa em ${falta < 0 ? "andamento" : falta + " dia(s)"}</span>`);
      if (s.erro_rh_relatado) tags.push(`<span class="tag lar">Erro no sistema do RH</span>`);
      tags.push(`<span class="tag ${s.etapa === "concluido" ? "verde" : s.etapa === "cancelado" ? "cinza" : ""}">${NOME_ETAPA[s.etapa]}</span>`);
      return `<div class="pessoa" data-sol="${s.id}"><div><b>${esc(s.colaborador?.nome || "")}</b> ${mini(s)}
        <div class="meta">${esc(s.periodo_aquisitivo)} · ${periodos(s)}</div></div><div class="tags">${tags.join("")}</div></div>`;
    }).join("") : `<div class="resumo">Nenhuma solicitação encontrada.</div>`;
    $("fg-lista").querySelectorAll("[data-sol]").forEach(el => el.addEventListener("click", () => detalhe(el.dataset.sol)));
  }
  ["fg-busca", "fg-etapa", "fg-flag"].forEach(id => $(id).addEventListener("input", desenharGestao));

  function detalhe(id) {
    const s = todas.find(x => x.id === id); if (!s) return;
    $("fd-nome").textContent = s.colaborador?.nome || "";
    $("fd-sub").textContent = `Período aquisitivo ${s.periodo_aquisitivo} · ${NOME_ETAPA[s.etapa]}`;
    const hist = (s.ferias_evento || []).sort((a, b) => a.feito_em.localeCompare(b.feito_em))
      .map(ev => `<div>${esc(ev.descricao || NOME_ETAPA[ev.etapa_nova])}<small>${new Date(ev.feito_em).toLocaleString("pt-BR")}</small></div>`).join("");
    $("fd-corpo").innerHTML = `${barra(s)}
      <div class="fcard"><h3>Períodos</h3><div class="meta">${periodos(s)}</div>
        ${s.erro_rh_relatado ? `<div class="aviso alerta" style="display:block">Erro relatado no sistema do RH: ${esc(s.erro_rh_descricao || "")}</div>` : ""}
        ${blocoAcao(s, s.colaborador_id === eu.id)}${arquivos(s)}</div>
      <h2>Histórico</h2><div class="hist">${hist}</div>`;
    mostrar("v-fer-det");
    ligarAcoes($("fd-corpo"), s, async (st, msg) => {
      if (st === "ok") { await abrirGestao(); detalhe(id); aviso("a-fd", "Aviso assinado enviado. O colaborador vai recebê-lo por e-mail.", "ok"); }
      else aviso("a-fd", msg);
    });
  }
  $("fd-voltar").addEventListener("click", abrirGestao);

  window.Ferias = { abrir };
})();
