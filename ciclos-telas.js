// SGT · Ciclos de Desenvolvimento · telas (navegação, carteira por NTE, ficha, avaliação, devolutiva, PDI, acompanhamento, portfólio, relatório, painel)
(() => {
  const C = window.CicloDados, { S, B, DEMO } = C;
  const $ = (id) => document.getElementById(id);
  const { itens, indices, fase, blocos, media, faixa, n1, cor, nomeItem, ESC, ESC_C, SINTESE, FORMATOS, MODAL, PULSO, ENCAMINHAMENTOS, STATUS_META, FASES,
    nomeFase, souGestao, souLider, meuId, souAvaliadorDe, falhou, ok, dataBR, dataHora, hojeISO } = C;
  const corpo = () => $("cd-corpo");
  const carregando = (el) => { el.innerHTML = `<div class="resumo">Carregando…</div>`; };
  const sit = (t, c) => `<span class="dc-sit ${c}">${esc(t)}</span>`;
  const tempo = (d) => { if (!d) return ""; const a = new Date(String(d).slice(0, 10) + "T12:00:00"), b = new Date();
    let m = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth(); if (b.getDate() < a.getDate()) m--; if (m < 1) return "menos de 1 mês";
    const y = Math.floor(m / 12), r = m % 12; return [y ? `${y} ano${y > 1 ? "s" : ""}` : "", r ? `${r} ${r > 1 ? "meses" : "mês"}` : ""].filter(Boolean).join(" e "); };

  // ------------------------------------------------------------------ dados extras (ficha, NTE)
  Object.assign(C.REAL, {
    perfil: (c) => api("/rest/v1/rpc/dc_perfil", { method: "POST", body: C.J({ p_colab: c }) }).then(r => r[0] || null),
    equipeNte: (n) => api("/rest/v1/rpc/dc_equipe_nte", { method: "POST", body: C.J({ p_nte: n }) }),
    carteiraVisao: () => api("/rest/v1/rpc/dc_carteira_visao", { method: "POST", body: "{}" }),
    preFicha: (o) => api("/rest/v1/rpc/dc_pre_ficha", { method: "POST", body: C.J({ p_ocup: Number(o) }) }),
    histPessoa: (c) => api("/rest/v1/rpc/dc_hist_pessoa", { method: "POST", body: C.J({ p_colab: c }) }),
    iniciarPrevia: (p) => api("/rest/v1/rpc/dc_iniciar_previa", { method: "POST", body: C.J({ p_publico: p }) }),
    iniciar: (p) => api("/rest/v1/rpc/dc_iniciar", { method: "POST", body: C.J({ p_publico: p, p_instrumento: window.CicloInstrumento }) }),
    planoAbrir: () => api("/rest/v1/rpc/dc_plano_abrir", { method: "POST", body: "{}" }),
    plano: (id) => api(`/rest/v1/dc_plano?select=*&id=eq.${id}`).then(r => r[0]),
    planoItens: (id) => api(`/rest/v1/dc_plano_item?select=*&plano_id=eq.${id}&order=nome`).then(ordenarPlano),
    planoAvaliadores: () => api("/rest/v1/rpc/dc_plano_avaliadores", { method: "POST", body: "{}" }),
    planoAjustar: (id, inc, av, obs) => api("/rest/v1/rpc/dc_plano_ajustar", { method: "POST", body: C.J({ p_item: id, p_incluido: inc, p_avaliador: av, p_obs: obs }) }),
    planoRecalcular: (id) => api("/rest/v1/rpc/dc_plano_recalcular", { method: "POST", body: C.J({ p_plano: id }) }),
    agenda: () => api("/rest/v1/dc_encontro?select=id,ordem,previsto_em,agendado_para,realizado_em,participante_id,dc_participante!inner(nome,colaborador_id,avaliador_id,ciclo_id)&realizado_em=is.null&order=previsto_em"),
    portArquivos: (ids) => ids.length ? api(`/rest/v1/dc_portfolio_arquivo?select=*&portfolio_id=in.(${ids.join(",")})`) : Promise.resolve([]),
    planoPublicar: (id) => api("/rest/v1/rpc/dc_plano_publicar", { method: "POST", body: C.J({ p_plano: id, p_instrumento: window.CicloInstrumento }) }),
  });
  const dataHoraBR = (d) => d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
  const paraLocal = (d) => { if (!d) return ""; const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
  const icsLink = (quando, titulo) => { const a = new Date(quando), b = new Date(a.getTime() + 60 * 60000), f = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SGT//Ciclo de Desenvolvimento//PT", "BEGIN:VEVENT", "UID:" + f(a) + "-" + Math.random().toString(36).slice(2) + "@sgt",
      "DTSTAMP:" + f(new Date()), "DTSTART:" + f(a), "DTEND:" + f(b), "SUMMARY:" + titulo, "BEGIN:VALARM", "TRIGGER:-PT48H", "ACTION:DISPLAY", "DESCRIPTION:" + titulo, "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    return "data:text/calendar;charset=utf-8," + encodeURIComponent(ics); };
  const GRUPOS = { articuladores: "Articuladores", coordenadores: "Coordenação pedagógica", lideres: "Lideranças", consultores: "Consultores das frentes" };
  const ordemG = Object.keys(GRUPOS);
  function ordenarPlano(L) { return (L || []).sort((a, b) => ordemG.indexOf(a.grupo) - ordemG.indexOf(b.grupo) || String(a.frente || "").localeCompare(String(b.frente || ""))
    || (a.nte_id || 0) - (b.nte_id || 0) || a.nome.localeCompare(b.nome)); }
  // mapa de exemplo (modo prévia)
  const PLANO_DEMO = (() => { let id = 0; const it = (nome, grupo, frente, funcao, nte, desde, meses, av, regra, inc = true, motivo = null, conferir = false) =>
      ({ id: ++id, nome, grupo, frente, funcao, nte_id: nte, nivel: "Sênior 1", funcao_desde: desde, meses, avaliador_nome: av, avaliador_id: av ? "x" : null, regra, incluido: inc, motivo, conferir, ajuste_manual: false, colaborador_id: id % 3 ? "x" : null });
    return [it("Ana Beatriz Lima (exemplo)", "articuladores", "Acompanhamento Pedagógico", "Articulador(a) da Coordenação Pedagógica", 10, "2026-01-01", 10.7, "Camila Ichii Costa", "Coordenação do NTE 10"),
      it("Bruno Sênior (exemplo)", "articuladores", "Acompanhamento Pedagógico", "Articulador(a) da Coordenação Pedagógica", 5, "2026-01-01", 10.7, "Paulo André Santos Leite", "Coordenação do NTE 5"),
      it("Carla Menezes (exemplo)", "articuladores", "Acompanhamento Pedagógico", "Articulador(a) da Coordenação Pedagógica", 24, "2026-09-01", 2.7, "Camila Ichii Costa", "Menos de 6 meses na função atual (desde 01/09/2026): avalia a liderança da função anterior (Assistente da Coordenação Pedagógica, 8 meses) · Coordenação do NTE 24"),
      it("Eva Nunes (exemplo)", "articuladores", "Acompanhamento Pedagógico", "Articulador(a) da Coordenação Pedagógica", 14, "2026-07-01", 4.8, null, null, false, "Menos de 6 meses na função (desde 01/07/2026)"),
      it("Danilo (exemplo)", "coordenadores", "Acompanhamento Pedagógico", "Consultor(a) da Coordenação Pedagógica - Presencial", null, "2026-04-18", 7.2, "Paulo André Santos Leite", "Liderança do Acompanhamento Pedagógico avalia a coordenação"),
      it("Fábio Dados (exemplo)", "consultores", "Dados e Sistemas", "Consultor(a) de Dados", null, "2026-01-01", 10.7, "André Luis Gomes Santos", "Liderança da frente Dados e Sistemas"),
      it("Gil Projetos (exemplo)", "consultores", "Escritório de Projetos", "Consultor(a) de Projetos", null, "2026-01-01", 10.7, null, "Frente Escritório de Projetos sem liderança definida: escolha na revisão", true, null, true),
      it("Tâmera (exemplo)", "lideres", "Projetos Pedagógicos", "Liderança · Projetos Pedagógicos", null, "2026-01-01", 10.7, "Tamires Matos de Paula Gonçalves", "Gerência da frente Projetos Pedagógicos")]; })();
  const DB = DEMO;
  const perfilDemo = { "d-ana": ["Pleno 1", "2024-05-27", "2024-05-27"], "d-bruno": ["Sênior 1", "2023-05-22", "2025-01-06"], "d-carla": ["Pleno 1", "2025-04-16", "2025-04-16"],
    "d-diego": ["Sênior 1", "2023-09-01", "2024-03-01"], "d-eva": ["Pleno 1", "2026-05-04", "2026-05-04"], "d-fabio": ["Pleno 1", "2024-08-01", "2024-08-01"] };
  Object.assign(C.FAKE, {
    perfil: async (c) => { const p = DB.part.find(x => x.colaborador_id === c), d = perfilDemo[c] || ["—", null, null];
      return p ? { colaborador_id: c, nome: p.nome, cargo: p.cargo, nivel: d[0], funcao: p.cargo, nte_id: p.nte_id, entrada_projeto: d[1], cargo_desde: d[2],
        fonte: "Exemplo (no SGT real: planilhas Planejamento 2026 e Marco Zero)", coordenador: DB.nomes[p.avaliador_id] } : null; },
    equipeNte: async (n) => { const vis = souLider() || DB.cart.some(k => k.nte_id === n && !k.fim && k.coordenador_id === meuId());
      return vis ? DB.part.filter(p => p.ciclo_id === 2 && p.nte_id === n).map(p => ({ colaborador_id: p.colaborador_id, nome: p.nome, cargo: p.cargo, cadastrado: true }))
        .concat(n === 14 ? [{ colaborador_id: null, nome: "Hugo Almeida (exemplo)", cargo: "Articulador(a) da Coordenação Pedagógica", cadastrado: false, ocupacao_id: 9001 }] : []) : []; },
    carteiraVisao: async () => (await C.FAKE.ntes()).map(n => { const k = DB.cart.find(c => c.nte_id === n.id && !c.fim);
      return { nte_id: n.id, nte: n.nome, coordenador_id: k ? k.coordenador_id : null, coordenador: k ? DB.nomes[k.coordenador_id] : null, cadastrado: !!k }; }),
    preFicha: async () => ({ nome: "Hugo Almeida (exemplo)", funcao: "Articulador(a) da Coordenação Pedagógica", nivel: "Pleno 1", nte_id: 14, nte: "NTE 14",
      vaga_codigo: "AP - 140", entrada_projeto: "2025-02-10", cargo_desde: "2025-02-10", fonte: "Exemplo (no SGT real: Quadro Geral e planilhas Planejamento/Marco Zero)",
      coordenador: DB.nomes["d-camila"] || "Camila Ichii", historico: [{ vaga: "AP - 140", funcao: "Articulador(a) da Coordenação Pedagógica", nivel: "Pleno 1", nte_id: 14, situacao: "Alocado(a)", inicio: "2025-02-10", fim: null }] }),
    histPessoa: async (c) => { const p = DB.part.find(x => x.colaborador_id === c), d = perfilDemo[c];
      if (!p || !d) return [];
      const h = [{ vaga: "AP - " + p.nte_id + "0", funcao: p.cargo, nivel: "Pleno 1", nte_id: p.nte_id, situacao: d[0] === "Sênior 1" ? "Promovido(a)" : "Alocado(a)", inicio: d[1], fim: d[0] === "Sênior 1" ? d[2] : null }];
      if (d[0] === "Sênior 1") h.push({ vaga: "AS - " + p.nte_id + "0", funcao: p.cargo, nivel: "Sênior 1", nte_id: p.nte_id, situacao: "Alocado(a)", inicio: d[2], fim: null });
      return h; },
    iniciarPrevia: async (p) => ({ publico: p, ano: 2026, ordem: 2, cadastrados: p === "coordenadores" ? 3 : 18, sem_cadastro: p === "coordenadores" ? 0 : 74,
      abertura: hojeISO(), prazo_avaliacao: hojeISO(), prazo_pdi: hojeISO(), aberto: false, sem_coordenacao: p === "coordenadores" ? [] : [5, 6, 7, 8, 9, 19, 20, 22, 27] }),
    iniciar: async () => { throw new Error("Prévia: nada foi gravado. No SGT real, o ciclo seria aberto agora e todos seriam avisados."); },
    planoAbrir: async () => 1,
    agenda: async () => DB.enc.filter(e => !e.realizado_em).map(e => { const p = DB.part.find(x => x.id === e.participante_id);
      return { ...e, dc_participante: { nome: p.nome, colaborador_id: p.colaborador_id, avaliador_id: p.avaliador_id, ciclo_id: p.ciclo_id } }; }),
    portArquivos: async () => [],
    plano: async () => ({ id: 1, ano: 2026, ordem: 1, referencia: hojeISO(), status: "rascunho", grupos: ["articuladores"] }),
    planoItens: async () => ordenarPlano(PLANO_DEMO.map(i => ({ ...i }))),
    planoAvaliadores: async () => ["Camila Ichii Costa", "Paulo André Santos Leite", "André Luis Gomes Santos", "Tamires Matos de Paula Gonçalves", "Gabriel Guedes Gama de Lima"].map(nome => ({ nome, cadastrado: true })),
    planoAjustar: async (id, inc, av) => { const i = PLANO_DEMO.find(z => z.id === id); Object.assign(i, { incluido: inc, avaliador_nome: av, ajuste_manual: true, conferir: inc && !av }); },
    planoRecalcular: async () => 0,
    planoPublicar: async () => { throw new Error("Prévia: nada foi gravado. No SGT real, o Ciclo de Desenvolvimento seria publicado e quem avalia seria avisado por e-mail."); },
  });

  // ------------------------------------------------------------------ abrir e navegar
  async function abrir() {
    mostrar("v-cd");
    $("cd-previa").classList.toggle("oculto", !ehSuper());
    barraPrevia();
    try {
      S.ciclos = await B.ciclos();
      const h = hojeISO();
      if (!S.ciclo || !S.ciclos.some(c => c.id === S.ciclo.id)) S.ciclo = S.ciclos.find(c => c.status !== "encerrado" && c.abertura <= h) || S.ciclos[0] || null;
      else S.ciclo = S.ciclos.find(c => c.id === S.ciclo.id);
      $("cd-ciclo").innerHTML = S.ciclos.map(c => `<option value="${c.id}">${esc(c.titulo)}${c.status === "encerrado" ? " (encerrado)" : ""}</option>`).join("") || `<option value="">Nenhum ciclo aberto</option>`;
      if (S.ciclo) $("cd-ciclo").value = S.ciclo.id;
      S.lista = S.ciclo ? await B.lista(S.ciclo.id) : [];
      S.carteira = await B.carteira().catch(() => []);
      S.meu = S.ciclo ? await B.meu(S.ciclo.id) : null;
      const souCoord = S.carteira.some(k => !k.fim && k.coordenador_id === meuId()) || S.lista.some(x => x.avaliador_id === meuId());
      S.souCoord = souCoord;
      const abas = [["inicio", "Início"]];
      if (S.meu) abas.push(["meu", "Meu ciclo"]);
      if (souCoord || souLider()) abas.push(["carteira", ehGeral() ? "Pessoas" : ehCoordCiclo() ? "Coordenadores" : "Articuladores"]);
      if (souLider()) abas.push(["painel", "Painel e calibração"]);
      if (souCoord || souLider() || (!S.demo && pode("gerencia"))) abas.push(["condutas", "Condutas de atenção"]);
      if (souGestao()) abas.push(["gestao", "Gestão do ciclo"]);
      S.abas = abas;
      $("cd-abas").innerHTML = abas.map(([k, t]) => `<button data-a="${k}">${t}</button>`).join("");
      $("cd-abas").querySelectorAll("button").forEach(b => b.addEventListener("click", () => { S.pessoa = null; S.nte = null; trocar(b.dataset.a); }));
      trocar(abas.some(a => a[0] === S.aba) ? S.aba : "inicio");
    } catch (e) { falhou(e); }
  }
  function trocar(a) {
    S.aba = a; aviso("a-cd", "");
    $("cd-abas").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.a === a));
    $("cd-sub").textContent = S.ciclo ? `${S.ciclo.titulo} · ${statusCiclo(S.ciclo)}` : "Nenhum ciclo aberto ainda";
    const f = { inicio, meu: meuCiclo, carteira: () => S.pessoa ? (String(S.pessoa).startsWith("pre:") ? preFicha(S.pessoa.slice(4)) : ficha(S.pessoa)) : ehCoordCiclo() ? listaCoord() : ehGeral() && grupoAtual() !== "articuladores" ? listaGrupo(grupoAtual()) : S.nte ? nteLista(S.nte) : carteira(), painel, condutas: () => window.CicloCondutas.abrir(corpo()),
      gestao: () => window.CicloCondutas.gestao(corpo()) }[a];
    f && f();
  }
  const ehCoordCiclo = () => !!S.ciclo && S.ciclo.publico === "coordenadores";
  const ehGeral = () => !!S.ciclo && S.ciclo.publico === "geral";
  const avaliaAlguem = () => S.lista.some(x => x.avaliador_id === meuId());
  const grupoAtual = () => S.grupo || (souLider() ? "articuladores" : S.lista.some(x => x.avaliador_id === meuId() && x.grupo !== "articuladores") ? "meus" : "articuladores");
  // Ciclo de Desenvolvimento: lista por grupo (coordenação, lideranças, consultores, quem eu avalio)
  const chipsGrupo = (g) => { const ks = [...(souLider() ? ordemG : []), ...(avaliaAlguem() ? ["meus"] : [])];
    return ks.length > 1 ? `<div class="dc-btns" style="justify-content:flex-start;flex-wrap:wrap;margin:0 0 8px">${ks.map(k => `<button class="sec dc-mini${k === g ? " on" : ""}" data-g="${k}">${k === "meus" ? "Quem eu avalio" : GRUPOS[k]}</button>`).join("")}</div>` : ""; };
  const ligarChips = (el) => el.querySelectorAll("[data-g]").forEach(b => b.addEventListener("click", () => { S.grupo = b.dataset.g; S.nte = null; S.pessoa = null; trocar("carteira"); }));
  function listaGrupo(g) {
    const el = corpo(), L = g === "meus" ? S.lista.filter(x => x.avaliador_id === meuId()) : S.lista.filter(x => x.grupo === g);
    el.innerHTML = `<div class="dc-bloco"><h2>${esc(g === "meus" ? "Quem eu avalio" : GRUPOS[g] || "Pessoas")}</h2>${chipsGrupo(g)}<div class="ajuda">Toque no nome para abrir a ficha.</div>
      <div class="dc-rolar"><table class="dc-tab"><thead><tr><th>Nome</th><th>Função</th><th>Quem avalia</th><th>Etapa</th><th>Próxima ação</th></tr></thead><tbody>
      ${L.map(x => `<tr data-c="${x.colaborador_id}"><td><b>${esc(x.nome)}</b></td><td>${esc(x.cargo || "")}${x.nte ? `<br><small>${esc(x.nte)}</small>` : ""}</td>
        <td>${esc(x.avaliador || "aguardando cadastro")}${x.regra ? `<br><small>${esc(x.regra)}</small>` : ""}</td><td>${chipFase(x)}</td><td>${esc(proximaAcao(x, x.avaliador_id === meuId()))}</td></tr>`).join("")
        || `<tr><td colspan="5">Ninguém neste grupo ainda. Quem está no mapa do ciclo entra sozinho ao se cadastrar no SGT.</td></tr>`}</tbody></table></div></div>`;
    ligarChips(el);
    el.querySelectorAll("tr[data-c]").forEach(tr => tr.addEventListener("click", () => { S.pessoa = tr.dataset.c; ficha(S.pessoa); }));
  }
  // troca para o ciclo mais recente do público escolhido (articuladores ou coordenadores)
  function irPublico(p) {
    if (ehGeral()) { S.grupo = p; S.pessoa = null; S.nte = null; return trocar("carteira"); }
    const doPublico = S.ciclos.filter(c => (c.publico || "articuladores") === p);
    const alvo = doPublico.find(c => c.status !== "encerrado") || doPublico[0];
    if (!alvo) return aviso("a-cd", p === "coordenadores" ? "Ainda não há ciclo de avaliação dos coordenadores." : "Ainda não há ciclo de avaliação dos articuladores.", "alerta");
    S.pessoa = null; S.nte = null; S.aba = "carteira";
    if (!S.ciclo || alvo.id !== S.ciclo.id) { S.ciclo = alvo; return abrir(); }
    trocar("carteira");
  }
  // lista do ciclo dos coordenadores (avaliados pela liderança)
  function listaCoord() {
    const el = corpo();
    el.innerHTML = `<div class="dc-bloco"><h2>Coordenação pedagógica</h2><div class="ajuda">Avaliação da coordenação pela liderança. Toque no nome para abrir a ficha.</div>
      <div class="dc-rolar"><table class="dc-tab"><thead><tr><th>Nome</th><th>Função</th><th>Quem avalia</th><th>Etapa</th></tr></thead><tbody>
      ${S.lista.map(x => `<tr data-c="${x.colaborador_id}"><td><b>${esc(x.nome)}</b></td><td>${esc(x.cargo || "")}</td><td>${esc(x.avaliador || "—")}</td><td>${esc(nomeFase(fase(x)))}</td></tr>`).join("")
        || `<tr><td colspan="4">Ninguém neste ciclo ainda. Coordenadores entram sozinhos ao se cadastrar no SGT, enquanto a avaliação estiver aberta.</td></tr>`}</tbody></table></div></div>`;
    el.querySelectorAll("tr[data-c]").forEach(tr => tr.addEventListener("click", () => { S.pessoa = tr.dataset.c; ficha(S.pessoa); }));
  }
  const statusCiclo = (k) => k.status === "encerrado" ? "encerrado" : hojeISO() <= k.prazo_pdi ? `rodadas até ${dataBR(k.prazo_pdi)}` : `acompanhamento até ${dataBR(k.fim)}`;
  $("cd-ciclo").addEventListener("input", async () => { S.ciclo = S.ciclos.find(c => c.id === +$("cd-ciclo").value) || null; S.pessoa = null; S.nte = null; await abrir(); });
  $("cd-voltar").addEventListener("click", () => {
    if (S.aba === "carteira" && S.pessoa) { S.pessoa = null; return trocar("carteira"); }
    if (S.aba === "carteira" && S.nte) { S.nte = null; return trocar("carteira"); }
    if (S.voltar) { const v = S.voltar; S.voltar = null; return v(); }
    mostrar("v-inicio");
  });

  // ------------------------------------------------------------------ modo prévia (Programador/a)
  $("cd-previa").addEventListener("click", () => { S.demo = !S.demo; S.ciclo = null; S.pessoa = null; S.nte = null; S.aba = null; abrir(); });
  function barraPrevia() {
    $("cd-previa").textContent = S.demo ? "✕ Sair da prévia" : "👁 Prévia";
    if (!S.demo) { $("cd-pbar").innerHTML = ""; return; }
    const op = [["coord", "Coordenação (Camila Ichii)"], ["lider", "Liderança (Paulo André)"], ["gestao", "Gestão / gerência"],
      ["av:d-ana", "Avaliada · Ana (autoavaliação em rascunho)"], ["av:d-bruno", "Avaliado · Bruno (aguardando devolutiva)"],
      ["av:d-carla", "Avaliada · Carla (devolutiva publicada, PDI em construção)"], ["av:d-diego", "Avaliado · Diego (PDI publicado, acompanhamento)"]];
    $("cd-pbar").innerHTML = `<div class="dc-previa"><b>Prévia</b> · dados de exemplo, nada é gravado. Ver como:
      <select id="cd-como">${op.map(([v, t]) => `<option value="${v}"${S.comoDemo === v ? " selected" : ""}>${t}</option>`).join("")}</select>
      <span>Dica: na Coordenação, abra o NTE 13, 14 ou 15 para ver cada etapa.</span></div>`;
    $("cd-como").addEventListener("input", () => { S.comoDemo = $("cd-como").value; S.pessoa = null; S.nte = null; S.aba = null; abrir(); });
  }

  // ------------------------------------------------------------------ INÍCIO: página padrão do instrumento (por público)
  function inicio() {
    const el = corpo(), k = S.ciclo, x = S.meu ? (S.lista.find(y => y.id === S.meu.id) || S.meu) : null;
    const cartao = (id, ico, t, d, ativo, extra = "") => `<button class="ferr dc-ini${ativo ? "" : " off"}" data-ir="${id}"${ativo ? "" : " disabled"}><span class="ico">${ico}</span><span>${t}<small>${d}</small>${extra}</span></button>`;
    el.innerHTML = `<div class="dc-bloco"><h2>${k ? esc(k.titulo) : "Nenhum ciclo aberto"}</h2>
        ${k && k.publico === "geral" ? `<div class="ajuda">Publicado em ${dataBR(k.abertura)} · avaliações até ${dataBR(k.prazo_avaliacao)} · autoavaliação em até 5 dias úteis depois de liberada · PDI em até 5 dias úteis depois do feedback · acompanhamento até ${dataBR(k.fim)}</div>`
          : k ? `<div class="ajuda">Abertura ${dataBR(k.abertura)} · avaliação até ${dataBR(k.prazo_avaliacao)} · devolutiva até ${dataBR(k.prazo_devolutiva)} · conversa e PDI até ${dataBR(k.prazo_pdi)} · acompanhamento até ${dataBR(k.fim)}</div>`
          : `<div class="ajuda">Quando a gestão abrir um ciclo, os prazos aparecem aqui.</div>`}
        <div class="dc-guia">${k && k.publico !== "geral" ? "O ciclo acontece a cada 3 meses: <b>1.</b> avaliação às cegas (autoavaliação e coordenação) · <b>2.</b> devolutiva com conversa por competência · <b>3.</b> conversa individual e PDI · <b>4.</b> três encontros de acompanhamento."
          : "O Ciclo de Desenvolvimento acontece a cada 3 meses, em sequência: <b>1.</b> quem avalia registra a avaliação · <b>2.</b> a pessoa é avisada e faz a autoavaliação (5 dias úteis) · <b>3.</b> quem avalia envia o feedback, que abre a conversa · <b>4.</b> PDI em até 5 dias úteis · <b>5.</b> três encontros de acompanhamento (o 2º, de preferência por vídeo no Teams, transcrito e com consentimento)."}</div></div>
      <div class="dc-bloco" id="dc-agenda" style="display:none"></div>
      <div class="dc-bloco"><h2>Para você</h2><div class="ferramentas">
        ${cartao("meu", "✎", "Meu ciclo", x ? `${nomeFase(fase(x))} · autoavaliação, devolutiva, PDI e acompanhamento` : "Você não participa do ciclo selecionado", !!x)}
        ${cartao("portfolio", "▤", "Meu portfólio de entregas", "Registre entregas e evidências ao longo do trimestre", true)}
      </div></div>
      ${k && k.publico === "geral" && (S.souCoord || souLider()) ? `<div class="dc-bloco"><h2>Pessoas do ciclo</h2><div class="ferramentas">
        ${avaliaAlguem() ? cartao("pub:meus", "✔", "Quem eu avalio", "Suas avaliações, feedbacks e PDI", true, ` <span class="dc-tag">${S.lista.filter(y => y.avaliador_id === meuId()).length}</span>`) : ""}
        ${souLider() ? Object.entries(GRUPOS).map(([g, t]) => cartao("pub:" + g, g === "articuladores" ? "◎" : g === "coordenadores" ? "◈" : g === "lideres" ? "★" : "◇", t,
          ({ articuladores: "Avaliados pela coordenação do NTE", coordenadores: "Avaliados pela liderança do Acompanhamento Pedagógico", lideres: "Avaliadas pela gerência da frente", consultores: "Avaliados pela liderança de cada frente" })[g],
          true, ` <span class="dc-tag">${S.lista.filter(y => y.grupo === g).length}</span>`)).join("") : ""}
      </div></div>` : S.souCoord || souLider() ? `<div class="dc-bloco"><h2>Públicos do ciclo</h2><div class="ferramentas">
        ${cartao("pub:articuladores", "◎", "Articuladores", "Avaliados pela coordenação pedagógica · NTE, pessoas, avaliações e PDI", true, !ehCoordCiclo() && k ? ` <span class="dc-tag">${S.lista.length} no ciclo</span>` : "")}
        ${souLider() ? cartao("pub:coordenadores", "◈", "Coordenadores", "Avaliados pela liderança · mesma matriz, com o bloco de liderança", true, ehCoordCiclo() ? ` <span class="dc-tag">${S.lista.length} no ciclo</span>` : "") : ""}
        ${cartao("consultores", "◇", "Consultores", "Em breve: mesmo fluxo, com a matriz e as lideranças de cada frente", false)}
      </div></div>` : ""}
      ${souLider() ? (() => { const andamento = S.ciclos.some(c => c.publico === "geral" && c.status !== "encerrado" && c.fim >= hojeISO());
        return `<div class="dc-bloco"><h2>Liberar avaliações</h2>
        <div class="ajuda">Antes de publicar, confira quem será avaliado e quem avalia cada pessoa (regra dos 6 meses, carteiras de NTE, frentes e gerências). Ninguém é avisado até a publicação.</div>
        <div class="ferramentas">${cartao("plano", "▶", andamento ? "Ciclo de Desenvolvimento em andamento" : "Revisar e publicar o Ciclo de Desenvolvimento",
          andamento ? "O próximo pode ser preparado quando este terminar" : "Quem avalia quem, retirar pessoas do processo e publicar", !andamento)}</div></div>`; })() : ""}
      ${souLider() || S.souCoord || (!S.demo && pode("gerencia")) ? `<div class="dc-bloco"><h2>Acompanhamento</h2><div class="ferramentas">
        ${souLider() ? cartao("painel", "▦", "Painel e calibração", "Andamento por etapa, médias por avaliador e por NTE", true) : ""}
        ${cartao("condutas", "!", "Condutas de atenção", "Registros restritos e relatório de rescisão", true)}
        ${souGestao() ? cartao("gestao", "⚙", "Gestão do ciclo", "Abrir ciclos, carteiras de NTE, trajetórias e exportação", true) : ""}
      </div></div>` : ""}`;
    el.querySelectorAll("[data-ir]:not([disabled])").forEach(b => b.addEventListener("click", () => {
      const d = b.dataset.ir; S.pessoa = null; S.nte = null;
      if (d.startsWith("pub:")) return irPublico(d.slice(4));
      if (d.startsWith("ini:")) return confirmarInicio(d.slice(4));
      if (d === "plano") return telaPlano();
      if (d === "portfolio") { $("cd-abas").querySelectorAll("button").forEach(z => z.classList.remove("on")); el.innerHTML = `<div id="cd-sc"></div>`; S.voltar = () => trocar("inicio"); return telaPortfolio($("cd-sc"), meuId(), true, x); }
      trocar(d); }));
    agendaInicio();
  }

  // agenda dos encontros de acompanhamento (quem avalia e quem é avaliado)
  async function agendaInicio() {
    const box = $("dc-agenda"); if (!box) return;
    try {
      const L = (await B.agenda()).filter(e => e.dc_participante && [e.dc_participante.colaborador_id, e.dc_participante.avaliador_id].includes(meuId()))
        .sort((a, b) => String(a.agendado_para || a.previsto_em).localeCompare(String(b.agendado_para || b.previsto_em)));
      if (!L.length) return;
      const semData = L.filter(e => !e.agendado_para && e.dc_participante.avaliador_id === meuId()).length;
      box.style.display = "";
      box.innerHTML = `<h2>Agenda de encontros do PDI</h2>${semData ? `<div class="dc-guia" style="color:#b54708">⚠ ${semData} encontro(s) seus ainda sem data. Combine com a pessoa e agende no próprio SGT: os dois recebem aviso 48 h antes e no dia.</div>` : ""}
        <div class="dc-rolar"><table class="dc-tab"><thead><tr><th>Quando</th><th>Encontro</th><th>Com</th><th></th></tr></thead><tbody>
        ${L.map(e => { const p = e.dc_participante, souAv = p.avaliador_id === meuId();
          return `<tr data-ag="${souAv ? p.colaborador_id : "meu"}"><td>${e.agendado_para ? `<b>${dataHoraBR(e.agendado_para)}</b>` : `${sit("a agendar", "alerta")}<br><small>previsto para ${dataBR(e.previsto_em)}</small>`}</td>
            <td>${e.ordem} de 3${e.ordem === 2 ? "<br><small>de preferência por vídeo no Teams</small>" : ""}</td><td>${esc(souAv ? p.nome : "Quem avalia você")}</td>
            <td>${e.agendado_para ? `<a href="${icsLink(e.agendado_para, "Encontro de acompanhamento do PDI · " + (souAv ? p.nome : "SGT"))}" download="encontro-pdi.ics">Adicionar ao meu calendário</a>` : ""}</td></tr>`; }).join("")}</tbody></table></div>
        <div class="ajuda">Toque na linha para abrir o acompanhamento e agendar ou reagendar.</div>`;
      box.querySelectorAll("tr[data-ag]").forEach(tr => tr.addEventListener("click", (ev) => { if (ev.target.closest("a")) return;
        if (tr.dataset.ag === "meu") { S.aba = "meu"; S.subMeu = "acomp"; return trocar("meu"); }
        S.pessoa = tr.dataset.ag; S.aba = "carteira"; $("cd-abas").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.a === "carteira")); ficha(S.pessoa, "acomp"); }));
    } catch (e) { /* agenda é complementar */ }
  }

  // ------------------------------------------------------------------ CICLO DE DESENVOLVIMENTO: quem avalia quem (revisão e publicação pela liderança)
  async function telaPlano() {
    const el = corpo(); carregando(el);
    $("cd-abas").querySelectorAll("button").forEach(z => z.classList.remove("on"));
    $("cd-sub").textContent = "Ciclo de Desenvolvimento · quem avalia quem";
    try {
      const pid = await B.planoAbrir();
      const [pl, L, avs] = await Promise.all([B.plano(pid), B.planoItens(pid), B.planoAvaliadores()]);
      S.plano = { pid, pl, itens: L, avs }; S.planoFiltro = S.planoFiltro || "todos";
      desenharPlano();
    } catch (e) { el.innerHTML = ""; falhou(e); }
  }
  function desenharPlano() {
    const el = corpo(), { pid, pl, itens: L, avs } = S.plano, f = S.planoFiltro, q = (S.planoBusca || "").toLowerCase();
    const gp = pl.grupos || ["articuladores"], pub = (i) => gp.includes(i.grupo);
    const inc = L.filter(i => i.incluido && pub(i)), fora = L.filter(i => !i.incluido), semAval = inc.filter(i => !i.avaliador_nome), conf = L.filter(i => i.conferir && pub(i));
    const vis = L.filter(i => (f === "todos" || (f === "fora" ? !i.incluido : f === "conferir" ? i.conferir : i.grupo === f && i.incluido))
      && (!q || (i.nome + " " + (i.avaliador_nome || "") + " " + (i.frente || "")).toLowerCase().includes(q)));
    const porAval = {}; inc.forEach(i => { const k = i.avaliador_nome || "— sem quem avalia —"; porAval[k] = (porAval[k] || 0) + 1; });
    const chip = (k, t, n) => `<button class="sec dc-mini${f === k ? " on" : ""}" data-fl="${k}">${t} (${n})</button>`;
    el.innerHTML = `<div class="dc-bloco"><h2>Ciclo de Desenvolvimento · ${pl.ordem}º/${pl.ano} <span class="dc-tag">rascunho</span></h2>
        <div class="ajuda">Mapa calculado em ${dataBR(pl.referencia)} com o Quadro Geral (planilha do Planejamento), as carteiras de NTE e as frentes. Nada foi enviado ainda: retire quem não deve ser avaliado, defina quem avalia nos casos em aberto e publique.</div>
        <details class="dc-traj"><summary>Regras aplicadas</summary><div class="dc-guia">• Só CLT. Com menos de <b>6 meses</b> na função, a pessoa não é avaliada, salvo se a função anterior durou mais de 6 meses: nesse caso, avalia a liderança imediata da função anterior.<br>
          • Articulador(a) e assistente: a coordenação do NTE. Se a coordenação acompanha o NTE há menos de 6 meses, avalia a coordenação anterior.<br>
          • Coordenação pedagógica: a liderança do Acompanhamento Pedagógico.<br>• Consultores: a liderança da frente.<br>
          • Lideranças: a gerência da frente (Tamires de Paula: Projetos Pedagógicos, Acompanhamento Pedagógico e Fluxo Escolar; Gabriel Guedes: Apoio à Gestão, Mobilização e Engajamento, Dados e Sistemas e Gestão de Formações).<br>
          • Escritório de Projetos e Planejamento Estratégico estão sem liderança e gerência definidas: escolha quem avalia aqui.</div></details>
        <div class="dc-guia"><b>Nesta publicação: só articuladores.</b> A matriz atual é exclusiva dos articuladores; coordenação, lideranças e consultores das frentes aparecem no mapa para conferência de quem avalia quem e entram quando a matriz de cada um estiver ajustada.</div>
        <div class="dc-kpis"><div><b>${inc.length}</b>Serão avaliados</div><div><b>${fora.length}</b>Fora deste ciclo</div><div><b>${semAval.length}</b>Incluídos sem quem avalia</div><div><b>${Object.keys(porAval).length}</b>Pessoas que avaliam</div></div>
        <details class="dc-traj"><summary>Quantas pessoas cada um avalia</summary><div class="dc-rolar"><table class="dc-tab"><thead><tr><th>Quem avalia</th><th class="num">Pessoas</th></tr></thead><tbody>
          ${Object.entries(porAval).sort((a, b) => b[1] - a[1]).map(([n, c]) => `<tr><td>${esc(n)}</td><td class="num">${c}</td></tr>`).join("")}</tbody></table></div></details></div>
      <div class="dc-bloco"><div class="dc-btns" style="flex-wrap:wrap;justify-content:flex-start">${chip("todos", "Todos", L.length)}${Object.entries(GRUPOS).map(([k, t]) => chip(k, t, L.filter(i => i.incluido && i.grupo === k).length)).join("")}${chip("fora", "Fora do ciclo", fora.length)}${chip("conferir", "A conferir", conf.length)}</div>
        <input id="pl-busca" placeholder="Buscar por nome, quem avalia ou frente" value="${esc(S.planoBusca || "")}" style="margin:8px 0;width:100%">
        <datalist id="pl-avs">${avs.map(a => `<option value="${esc(a.nome)}">${a.cadastrado ? "" : "aguardando cadastro"}</option>`).join("")}</datalist>
        <div class="dc-rolar"><table class="dc-tab"><thead><tr><th>Avaliar?</th><th>Pessoa</th><th>Função · frente</th><th>Na função</th><th>Quem avalia e por quê</th></tr></thead><tbody>
        ${vis.map(i => `<tr data-i="${i.id}"${i.incluido ? "" : ` style="opacity:.65"`}><td><input type="checkbox" data-inc${i.incluido ? " checked" : ""} aria-label="Avaliar ${esc(i.nome)}"></td>
          <td><b>${esc(i.nome)}</b>${i.colaborador_id ? "" : `<br><small>sem cadastro: entra ao se cadastrar</small>`}${i.conferir ? ` ${sit("conferir", "alerta")}` : ""}${i.ajuste_manual ? ` <span class="dc-tag">ajustado</span>` : ""}${pub(i) ? "" : `<br><small>aguarda a matriz própria</small>`}</td>
          <td>${esc(i.funcao || "—")}<br><small>${esc(i.frente || "")}${i.nte_id ? " · NTE " + String(i.nte_id).padStart(2, "0") : ""}${i.nivel ? " · " + esc(i.nivel) : ""}</small></td>
          <td>${i.funcao_desde ? `desde ${dataBR(i.funcao_desde)}<br><small>${String(i.meses).replace(".", ",")} meses</small>` : "—"}</td>
          <td><input list="pl-avs" data-av style="width:100%;min-width:200px" value="${esc(i.avaliador_nome || "")}" placeholder="${i.incluido ? "Escolha quem avalia" : "—"}"${i.incluido ? "" : " disabled"}>
            <small style="display:block;margin-top:3px">${esc(i.incluido ? (i.regra || (i.ajuste_manual ? "Definido na revisão" : "")) : (i.motivo || "Retirado na revisão"))}${i.avaliador_nome && !i.avaliador_id && i.incluido ? " · quem avalia ainda não tem cadastro" : ""}</small></td></tr>`).join("")
          || `<tr><td colspan="5">Nenhuma pessoa neste filtro.</td></tr>`}</tbody></table></div></div>
      <div class="dc-bloco"><h2>Publicar</h2><div class="ajuda">Ao publicar, quem avalia recebe o aviso por e-mail. Cada pessoa só é avisada depois que a avaliação dela for concluída, para então fazer a autoavaliação (5 dias úteis). Concluída a autoavaliação, quem avalia é avisado e envia o feedback, que abre a conversa; o PDI deve ser disponibilizado em até 5 dias úteis depois do feedback. Quem está no mapa e ainda não tem cadastro entra sozinho ao se cadastrar.</div>
        ${semAval.length ? `<div class="dc-guia" style="color:#b54708">⚠ ${semAval.length} pessoa(s) incluída(s) sem quem avalia. Defina ou retire antes de publicar.</div>` : ""}
        <div class="dc-btns"><button class="sec" id="pl-rec">Recalcular pelas regras (mantém os ajustes)</button><button id="pl-pub"${semAval.length || !inc.length ? " disabled" : ""}>Publicar o Ciclo de Desenvolvimento (${inc.length} pessoas)</button></div></div>`;
    el.querySelectorAll("[data-fl]").forEach(b => b.addEventListener("click", () => { S.planoFiltro = b.dataset.fl; desenharPlano(); }));
    $("pl-busca").addEventListener("input", () => { S.planoBusca = $("pl-busca").value; clearTimeout(S.tBusca);
      S.tBusca = setTimeout(() => { desenharPlano(); const b = $("pl-busca"); b.focus(); b.setSelectionRange(b.value.length, b.value.length); }, 350); });
    const salvarLinha = async (tr) => {
      const i = L.find(z => z.id === +tr.dataset.i), marcado = tr.querySelector("[data-inc]").checked, av = tr.querySelector("[data-av]").value.trim();
      try { await B.planoAjustar(i.id, marcado, av || i.avaliador_nome || null, i.obs || null);
        S.plano.itens = await B.planoItens(pid); desenharPlano(); } catch (e) { falhou(e); } };
    el.querySelectorAll("tr[data-i]").forEach(tr => {
      tr.querySelector("[data-inc]").addEventListener("change", () => salvarLinha(tr));
      tr.querySelector("[data-av]").addEventListener("change", () => salvarLinha(tr)); });
    $("pl-rec").addEventListener("click", async () => { try { await B.planoRecalcular(pid); await telaPlano(); ok("Mapa recalculado com a data de hoje."); } catch (e) { falhou(e); } });
    $("pl-pub").addEventListener("click", async () => {
      if (!confirm(`Publicar o Ciclo de Desenvolvimento com ${inc.length} pessoas? Quem avalia será avisado agora por e-mail.`)) return;
      $("pl-pub").disabled = true;
      try { await B.planoPublicar(pid); S.ciclo = null; S.aba = "inicio"; await abrir(); ok("Ciclo de Desenvolvimento publicado. Quem avalia foi avisado por e-mail."); }
      catch (e) { $("pl-pub").disabled = false; aviso("a-cd", traduzErro(e), S.demo ? "alerta" : "erro"); } });
  }

  // confirmação do botão "Iniciar" (liderança)
  async function confirmarInicio(p) {
    const box = $("dc-ini-conf"); box.innerHTML = `<div class="resumo">Calculando…</div>`;
    try {
      const v = await B.iniciarPrevia(p), nome = p === "coordenadores" ? "dos coordenadores" : "dos articuladores";
      const semC = v.sem_coordenacao || [];
      box.innerHTML = `<div class="dc-guia" style="margin-top:12px">
        <b>Iniciar a avaliação ${nome} · ${v.ordem}º ciclo de ${v.ano}</b><br>
        Abertura hoje (${dataBR(v.abertura)}) · avaliação até ${dataBR(v.prazo_avaliacao)} · conversa e PDI até ${dataBR(v.prazo_pdi)}.<br>
        <b>${v.cadastrados}</b> pessoa(s) com cadastro entram agora${v.sem_cadastro ? `; outras <b>${v.sem_cadastro}</b> do Quadro Geral entram sozinhas quando se cadastrarem, até o fim do prazo de avaliação` : ""}.
        ${p === "coordenadores" ? `<br>Quem avalia: <b>você</b>. A coordenação transitória (quem coordenou só neste ciclo e foi promovido à liderança) não é avaliada como coordenação.` : ""}
        ${semC.length ? `<br><span style="color:#b54708">⚠ NTE sem coordenação para este ciclo: ${semC.map(n => String(n).padStart(2, "0")).join(", ")}. As pessoas desses NTE entram sem avaliador até a gestão definir a carteira (Gestão do ciclo › Carteiras).</span>` : ""}
        ${v.aberto ? `<br><b>Já há um ciclo ${nome} em andamento.</b> Encerre-o antes de iniciar outro.` : ""}
        <div class="btns" style="margin-top:10px">${v.aberto ? "" : `<button id="dc-ini-ok" style="width:auto">Confirmar e iniciar</button>`}<button class="sec" id="dc-ini-no" style="width:auto">Cancelar</button></div></div>`;
      $("dc-ini-no").addEventListener("click", () => { box.innerHTML = ""; });
      if ($("dc-ini-ok")) $("dc-ini-ok").addEventListener("click", async () => {
        $("dc-ini-ok").disabled = true;
        try { await B.iniciar(p); S.ciclo = null; S.aba = "inicio"; await abrir(); aviso("a-cd", `Avaliação ${nome} iniciada. Todos foram avisados.`, "ok"); }
        catch (e) { $("dc-ini-ok").disabled = false; aviso("a-cd", traduzErro(e), S.demo ? "alerta" : "erro"); }
      });
    } catch (e) { box.innerHTML = ""; falhou(e); }
  }

  // ------------------------------------------------------------------ linha do tempo do ciclo
  function passos(x) {
    const k = S.ciclo; if (!k) return "";
    const f = fase(x), ordem = FASES.map(a => a[0]), i = ordem.indexOf(f), h = hojeISO();
    const prazos = { avaliacao: (k.publico === "geral" && x.coord_enviada && x.auto_prazo) || k.prazo_avaliacao, devolutiva: k.prazo_devolutiva, pdi: (k.publico === "geral" && x.pdi_prazo) || k.prazo_pdi, acompanhamento: k.fim, concluido: k.fim };
    return `<div class="dc-passos">${FASES.map(([id, t], j) => { const cls = j < i ? "feito" : j === i ? (h > prazos[id] && id !== "concluido" ? "atraso" : "agora") : "";
      return `<div class="${cls}"><b>${j + 1}. ${t}</b>${id === "concluido" ? "" : "até " + dataBR(prazos[id])}${j < i ? " · ✓" : j === i && cls === "atraso" ? " · atrasado" : ""}</div>`; }).join("")}</div>`;
  }
  function proximaAcao(x, souAval) {
    const f = fase(x);
    if (S.ciclo && S.ciclo.publico === "geral") {
      if (f === "avaliacao") return souAval ? (x.coord_enviada ? "Aguardando a autoavaliação" : "Avaliar") : (x.coord_enviada ? (x.auto_enviada ? "Aguardando feedback" : "Fazer a autoavaliação" + (x.auto_prazo ? " até " + dataBR(x.auto_prazo) : "")) : "Aguardando a avaliação da liderança");
      if (f === "devolutiva") return souAval ? "Enviar o feedback" : "Aguardando feedback";
      if (f === "pdi") return souAval ? (x.conversa_em ? "Publicar o PDI" : "Registrar a conversa e o PDI") + (x.pdi_prazo ? " até " + dataBR(x.pdi_prazo) : "") : "Conversa e PDI com quem avalia";
    }
    if (f === "avaliacao") return souAval ? (x.coord_enviada ? "Aguardando autoavaliação" : "Avaliar") : (x.auto_enviada ? "Aguardando coordenação" : "Fazer autoavaliação");
    if (f === "devolutiva") return souAval ? "Escrever e publicar a devolutiva" : "Aguardando devolutiva";
    if (f === "pdi") return souAval ? (x.conversa_em ? "Publicar o PDI" : "Registrar a conversa e o PDI") : "Conversa e PDI com a coordenação";
    if (f === "acompanhamento") return `Encontro ${Math.min(3, (x.encontros_feitos || 0) + 1)} de 3${x.proximo_encontro ? " · " + dataBR(x.proximo_encontro) : ""}`;
    return "Ciclo concluído";
  }
  const chipFase = (x) => { const f = fase(x); return sit(nomeFase(f), f === "concluido" ? "ok" : f === "acompanhamento" ? "info" : "alerta"); };

  // ------------------------------------------------------------------ CARTEIRA: 27 NTE → pessoas → ficha
  async function carteira() {
    const el = corpo(); carregando(el);
    try {
      const ntes = await B.carteiraVisao(), meus = new Set(ntes.filter(k => k.coordenador_id && k.coordenador_id === meuId()).map(k => k.nte_id));
      const pend = S.lista.filter(x => x.avaliador_id === meuId() && !["acompanhamento", "concluido"].includes(fase(x)));
      el.innerHTML = `${ehGeral() && chipsGrupo("articuladores") ? `<div class="dc-bloco">${chipsGrupo("articuladores")}</div>` : ""}${pend.length ? `<div class="dc-bloco"><h2>Suas pendências neste ciclo (${pend.length})</h2><div class="dc-rolar"><table class="dc-tab"><thead><tr><th>Pessoa</th><th>NTE</th><th>Etapa</th><th>Próxima ação</th></tr></thead><tbody>
        ${pend.map(x => `<tr data-c="${x.colaborador_id}"><td><b>${esc(x.nome)}</b><br><small>${esc(x.cargo || "")}</small></td><td>${esc(x.nte || "")}</td><td>${chipFase(x)}</td><td>${esc(proximaAcao(x, true))}</td></tr>`).join("")}</tbody></table></div></div>` : ""}
        <div class="dc-bloco"><h2>Núcleos Territoriais de Educação</h2><div class="ajuda">${souLider() ? "Você acompanha todos os NTE." : "Você abre os NTE da sua carteira. Os demais aparecem só para referência."}</div>
        <div class="dc-ntes">${ntes.map(n => { const pode = souLider() || meus.has(n.nte_id),
          qtd = S.lista.filter(x => x.nte_id === n.nte_id).length, feitos = S.lista.filter(x => x.nte_id === n.nte_id && ["acompanhamento", "concluido"].includes(fase(x))).length;
          return `<button class="dc-nte${pode ? "" : " off"}${meus.has(n.nte_id) ? " meu" : ""}" data-n="${n.nte_id}"${pode ? "" : " disabled"} title="${esc(n.nte)}">
            <b>NTE ${String(n.nte_id).padStart(2, "0")}</b><span>${esc(String(n.nte || "").replace(/^NTE\s*\d+\s*[-–]?\s*/i, ""))}</span>
            <small>${n.coordenador ? esc(n.coordenador_id === meuId() ? "Você" : n.coordenador) + (n.cadastrado ? "" : " (aguardando cadastro)") : "Sem coordenação"}${pode && qtd ? ` · ${feitos}/${qtd} com PDI` : ""}</small></button>`; }).join("")}</div></div>`;
      el.querySelectorAll("[data-n]").forEach(b => b.addEventListener("click", () => { S.nte = +b.dataset.n; nteLista(S.nte); }));
      ligarChips(el);
      el.querySelectorAll("tr[data-c]").forEach(tr => tr.addEventListener("click", () => { S.pessoa = tr.dataset.c; ficha(S.pessoa); }));
      el.querySelectorAll("tr[data-o]").forEach(tr => tr.addEventListener("click", () => { S.pessoa = "pre:" + tr.dataset.o; preFicha(tr.dataset.o); }));
    } catch (e) { falhou(e); }
  }

  // trajetória funcional (Quadro Geral): vagas, situações e datas, sem valores
  function tabelaTrajetoria(h) {
    if (!h || !h.length) return `<div class="ajuda">Sem registros no Quadro Geral.</div>`;
    return `<div class="dc-rolar"><table class="dc-tab"><thead><tr><th>Período</th><th>Função e nível</th><th>NTE</th><th>Vaga</th><th>Situação</th></tr></thead><tbody>
      ${h.map(r => `<tr><td>${dataBR(r.inicio)} a ${r.fim ? dataBR(r.fim) : "hoje"}</td><td>${esc(r.funcao || "—")}${r.nivel ? `<br><small>${esc(r.nivel)}</small>` : ""}</td>
        <td>${r.nte_id ? "NTE " + String(r.nte_id).padStart(2, "0") : "—"}</td><td>${esc(r.vaga || "—")}</td><td>${esc(r.situacao || "—")}</td></tr>`).join("")}</tbody></table></div>`;
  }

  // ficha de pré-cadastro: só dados funcionais; o restante depende do cadastro e do aceite da própria pessoa (LGPD)
  async function preFicha(ocup) {
    const el = corpo(); carregando(el);
    try {
      const pf = await B.preFicha(ocup);
      $("cd-sub").textContent = pf.nome + " · pré-cadastro";
      el.innerHTML = `<div class="dc-bloco"><div class="dc-ficha"><div>
          <h2 style="margin-top:6px">${esc(pf.nome)} <span class="dc-tag">pré-cadastro</span></h2>
          <div class="dc-dados">
            <div><small>Cargo</small><b>${esc(pf.funcao || "—")}</b></div>
            <div><small>Nível</small><b>${esc(pf.nivel || "—")}</b></div>
            <div><small>NTE</small><b>${pf.nte_id ? "NTE " + String(pf.nte_id).padStart(2, "0") : "—"}</b></div>
            <div><small>Entrou no projeto em</small><b>${dataBR(pf.entrada_projeto)}</b><small>${pf.entrada_projeto ? "há " + tempo(pf.entrada_projeto) : ""}</small></div>
            <div><small>No cargo atual desde</small><b>${dataBR(pf.cargo_desde)}</b><small>${pf.cargo_desde ? "há " + tempo(pf.cargo_desde) : ""}</small></div>
            <div><small>Coordenação</small><b>${esc(pf.coordenador || "—")}</b></div></div>
          ${pf.fonte ? `<div class="ajuda">Fonte das datas: ${esc(pf.fonte)}.</div>` : ""}</div></div>
        <h3>Trajetória no projeto</h3>${tabelaTrajetoria(pf.historico)}
        <div class="dc-guia" style="margin-top:12px">🔒 <b>Dados pessoais e avaliações aguardam a própria pessoa.</b> Aqui aparecem só dados funcionais do Quadro Geral (nome, função, NTE e trajetória).
          Contatos, endereço e demais dados pessoais só ficam disponíveis depois que ${esc(String(pf.nome).split(" ")[0])} se cadastrar no SGT, preencher <b>Dados e Contatos</b> e concordar com o termo de uso dos dados (LGPD).
          Ao se cadastrar, a pessoa entra sozinha no ciclo que estiver em período de avaliação.</div></div>`;
    } catch (e) { falhou(e); }
  }
  async function nteLista(n) {
    const el = corpo(); carregando(el);
    try {
      const eq = await B.equipeNte(n);
      $("cd-sub").textContent = `NTE ${String(n).padStart(2, "0")} · ${eq.length} pessoa(s)`;
      el.innerHTML = `<div class="dc-bloco"><h2>NTE ${String(n).padStart(2, "0")}</h2><div class="ajuda">Toque no nome para ver a ficha, a trajetória e a evolução no ciclo.</div>
        <div class="dc-rolar"><table class="dc-tab"><thead><tr><th>Nome</th><th>Função</th></tr></thead><tbody>
        ${eq.map(p => p.cadastrado === false ? `<tr data-o="${p.ocupacao_id}"><td><b>${esc(p.nome)}</b> <span class="dc-tag">pré-cadastro</span><br><small>ainda sem cadastro no SGT · dados do Quadro Geral</small></td><td>${esc(p.cargo || "")}</td></tr>`
          : `<tr data-c="${p.colaborador_id}"><td><b>${esc(p.nome)}</b></td><td>${esc(p.cargo || "")}</td></tr>`).join("")
          || `<tr><td colspan="2">Nenhuma pessoa cadastrada neste NTE com os cargos do ciclo.</td></tr>`}</tbody></table></div></div>`;
      el.querySelectorAll("tr[data-c]").forEach(tr => tr.addEventListener("click", () => { S.pessoa = tr.dataset.c; ficha(S.pessoa); }));
      el.querySelectorAll("tr[data-o]").forEach(tr => tr.addEventListener("click", () => { S.pessoa = "pre:" + tr.dataset.o; preFicha(tr.dataset.o); }));
    } catch (e) { falhou(e); }
  }

  // trajetória funcional (Quadro Geral): vagas, situações e datas, sem valores
  function tabelaTrajetoria(h) {
    if (!h || !h.length) return `<div class="ajuda">Sem registros no Quadro Geral.</div>`;
    return `<div class="dc-rolar"><table class="dc-tab"><thead><tr><th>Período</th><th>Função e nível</th><th>NTE</th><th>Vaga</th><th>Situação</th></tr></thead><tbody>
      ${h.map(r => `<tr><td>${dataBR(r.inicio)} a ${r.fim ? dataBR(r.fim) : "hoje"}</td><td>${esc(r.funcao || "—")}${r.nivel ? `<br><small>${esc(r.nivel)}</small>` : ""}</td>
        <td>${r.nte_id ? "NTE " + String(r.nte_id).padStart(2, "0") : "—"}</td><td>${esc(r.vaga || "—")}</td><td>${esc(r.situacao || "—")}</td></tr>`).join("")}</tbody></table></div>`;
  }

  // ficha de pré-cadastro: só dados funcionais; o restante depende do cadastro e do aceite da própria pessoa (LGPD)
  async function preFicha(ocup) {
    const el = corpo(); carregando(el);
    try {
      const pf = await B.preFicha(ocup);
      $("cd-sub").textContent = pf.nome + " · pré-cadastro";
      el.innerHTML = `<div class="dc-bloco"><div class="dc-ficha"><div>
          <h2 style="margin-top:6px">${esc(pf.nome)} <span class="dc-tag">pré-cadastro</span></h2>
          <div class="dc-dados">
            <div><small>Cargo</small><b>${esc(pf.funcao || "—")}</b></div>
            <div><small>Nível</small><b>${esc(pf.nivel || "—")}</b></div>
            <div><small>NTE</small><b>${pf.nte_id ? "NTE " + String(pf.nte_id).padStart(2, "0") : "—"}</b></div>
            <div><small>Entrou no projeto em</small><b>${dataBR(pf.entrada_projeto)}</b><small>${pf.entrada_projeto ? "há " + tempo(pf.entrada_projeto) : ""}</small></div>
            <div><small>No cargo atual desde</small><b>${dataBR(pf.cargo_desde)}</b><small>${pf.cargo_desde ? "há " + tempo(pf.cargo_desde) : ""}</small></div>
            <div><small>Coordenação</small><b>${esc(pf.coordenador || "—")}</b></div></div>
          ${pf.fonte ? `<div class="ajuda">Fonte das datas: ${esc(pf.fonte)}.</div>` : ""}</div></div>
        <h3>Trajetória no projeto</h3>${tabelaTrajetoria(pf.historico)}
        <div class="dc-guia" style="margin-top:12px">🔒 <b>Dados pessoais e avaliações aguardam a própria pessoa.</b> Aqui aparecem só dados funcionais do Quadro Geral (nome, função, NTE e trajetória).
          Contatos, endereço e demais dados pessoais só ficam disponíveis depois que ${esc(String(pf.nome).split(" ")[0])} se cadastrar no SGT, preencher <b>Dados e Contatos</b> e concordar com o termo de uso dos dados (LGPD).
          Ao se cadastrar, a pessoa entra sozinha no ciclo que estiver em período de avaliação.</div></div>`;
    } catch (e) { falhou(e); }
  }

  // ficha: cargo, nível, entrada no projeto, no cargo atual desde, evolução e o ciclo atual
  async function ficha(colab, sub) {
    const el = corpo(); carregando(el);
    try {
      const [pf, hist, traj] = await Promise.all([B.perfil(colab), B.historico(colab), B.histPessoa(colab).catch(() => [])]);
      const x = S.lista.find(y => y.colaborador_id === colab) || null;
      S.part = x; S.perfil = pf;
      $("cd-sub").textContent = pf ? pf.nome : "Ficha";
      const souAval = souAvaliadorDe(x);
      el.innerHTML = `<div class="dc-bloco"><div class="dc-ficha">
          <div><h2 style="margin-top:6px">${esc(pf ? pf.nome : (x && x.nome) || "")}</h2>
            <div class="dc-dados">
              <div><small>Cargo</small><b>${esc((pf && (pf.funcao || pf.cargo)) || (x && x.cargo) || "—")}</b></div>
              <div><small>Nível</small><b>${esc((pf && pf.nivel) || "—")}</b></div>
              <div><small>NTE</small><b>${pf && pf.nte_id ? "NTE " + String(pf.nte_id).padStart(2, "0") : "—"}</b></div>
              <div><small>Entrou no projeto em</small><b>${dataBR(pf && pf.entrada_projeto)}</b><small>${pf && pf.entrada_projeto ? "há " + tempo(pf.entrada_projeto) : ""}</small></div>
              <div><small>No cargo atual desde</small><b>${dataBR(pf && pf.cargo_desde)}</b><small>${pf && pf.cargo_desde ? "há " + tempo(pf.cargo_desde) : ""}</small></div>
              <div><small>Coordenação</small><b>${esc((pf && pf.coordenador) || (x && x.avaliador) || "—")}</b></div></div>
            ${pf && pf.fonte ? `<div class="ajuda">Fonte das datas: ${esc(pf.fonte)}.</div>` : ""}</div>
          <div class="dc-evo">${graficoEvolucao(hist)}</div></div>
        ${(traj || []).length ? `<details class="dc-traj"><summary>Trajetória no projeto (${traj.length} registro${traj.length > 1 ? "s" : ""})</summary>${tabelaTrajetoria(traj)}</details>` : ""}
        ${x ? `<h3>Ciclo atual · ${esc(S.ciclo.titulo)}</h3>${passos(x)}<div class="ajuda">Próxima ação: <b>${esc(proximaAcao(x, souAval))}</b></div>` : `<div class="resumo">Esta pessoa não participa do ciclo selecionado.</div>`}
        </div>
        <div class="abas" id="cd-sabas"></div><div id="cd-sc"></div>`;
      const subs = x ? [["avaliar", souAval ? "Avaliação" : "Avaliação da coordenação"], ...(souAval ? [] : [["auto", "Autoavaliação"]]), ["devolutiva", "Devolutiva"], ["pdi", "Conversa e PDI"], ["acomp", "Acompanhamento"], ["portfolio", "Portfólio"], ["relatorio", "Relatório"]]
        : [["portfolio", "Portfólio"], ["historico", "Histórico"]];
      if (x && (souAval || souLider())) subs.push(["encaminhar", "Encaminhamento"]);
      $("cd-sabas").innerHTML = subs.map(([k, t]) => `<button data-s="${k}">${t}</button>`).join("");
      $("cd-sabas").querySelectorAll("button").forEach(b => b.addEventListener("click", () => abrirSub(b.dataset.s)));
      const padrao = x ? ({ avaliacao: "avaliar", devolutiva: "devolutiva", pdi: "pdi", acompanhamento: "acomp", concluido: "relatorio" })[fase(x)] : "portfolio";
      abrirSub(sub || padrao);
    } catch (e) { falhou(e); }
  }
  function abrirSub(s) {
    $("cd-sabas").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.s === s));
    const el = $("cd-sc"), x = S.part, colab = S.pessoa;
    ({ avaliar: () => telaAvaliacaoCoord(el, x), auto: () => telaAutoLeitura(el, x), devolutiva: () => telaDevolutiva(el, x, false), pdi: () => telaPdi(el, x, false), acomp: () => telaAcomp(el, x, false),
       portfolio: () => telaPortfolio(el, colab, false, x), relatorio: () => telaRelatorio(el, x, colab), historico: () => telaRelatorio(el, null, colab),
       encaminhar: () => telaEncaminhamento(el, x) })[s]();
  }

  // ------------------------------------------------------------------ MEU CICLO (avaliado)
  async function meuCiclo() {
    const el = corpo(); const x = S.meu ? (S.lista.find(y => y.id === S.meu.id) || { ...S.meu }) : null;
    S.part = x;
    if (!x) { el.innerHTML = `<div class="resumo">Você não participa do ciclo selecionado.${S.ciclo ? "" : " Ainda não há ciclo aberto."}</div><div id="cd-sc"></div>`;
      return telaPortfolio($("cd-sc"), meuId(), true, null); }
    el.innerHTML = `<div class="dc-bloco"><h2>Meu Ciclo de Desenvolvimento</h2>${passos(x)}
      <div class="dc-guia">Este ciclo é sobre o seu desenvolvimento. ${S.ciclo && S.ciclo.publico === "geral" ? "Primeiro, quem avalia você registra a avaliação; em seguida, você é avisado(a) por e-mail e faz a sua autoavaliação (5 dias úteis). Depois, recebe o feedback, conversa e constrói o PDI, disponibilizado em até 5 dias úteis." : "Você e a coordenação avaliam ao mesmo tempo, sem ver a avaliação um do outro. Depois, comparam as duas visões, conversam e constroem juntos o seu PDI."}</div></div>
      <div class="abas" id="cd-sabas"></div><div id="cd-sc"></div>`;
    const subs = [["auto", "Autoavaliação"], ["devolutiva", "Devolutiva"], ["pdi", "Meu PDI"], ["acomp", "Acompanhamento"], ["portfolio", "Meu portfólio"], ["relatorio", "Minha evolução"]];
    $("cd-sabas").innerHTML = subs.map(([k, t]) => `<button data-s="${k}">${t}</button>`).join("");
    const ir = (s) => { $("cd-sabas").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.s === s)); const c = $("cd-sc");
      ({ auto: () => telaAuto(c, x), devolutiva: () => telaDevolutiva(c, x, true), pdi: () => telaPdi(c, x, true), acomp: () => telaAcomp(c, x, true),
         portfolio: () => telaPortfolio(c, meuId(), true, x), relatorio: () => telaRelatorio(c, x, meuId()) })[s](); };
    $("cd-sabas").querySelectorAll("button").forEach(b => b.addEventListener("click", () => ir(b.dataset.s)));
    const subIni = S.subMeu; S.subMeu = null;
    ir(subIni || ({ avaliacao: x.auto_enviada ? "auto" : "auto", devolutiva: "auto", pdi: "devolutiva", acompanhamento: "pdi", concluido: "relatorio" })[fase(x)]);
  }
  const recarregarLista = async () => { if (S.ciclo) S.lista = await B.lista(S.ciclo.id); if (S.ciclo && S.meu) S.meu = await B.meu(S.ciclo.id); };

  // ------------------------------------------------------------------ formulário de avaliação (auto e coordenação)
  function formAvaliacao(el, x, tipo, resp, editavel, evid) {
    const n = { ...(resp && resp.notas || {}) }, ju = { ...(resp && resp.justificativas || {}) }, si = { ...(resp && resp.sintese || {}) };
    const its = itens(), total = its.length;
    const quem = tipo === "auto" ? "você" : "a pessoa";
    el.innerHTML = `${editavel ? `<div class="dc-guia">${tipo === "auto"
        ? "Avalie seu desempenho nos <b>últimos 3 meses</b>, com base em fatos. Toque na nota para ver o que ela significa. Notas <b>1</b> e <b>5</b> pedem uma justificativa curta. O rascunho é salvo sozinho; leva cerca de 15 minutos."
        : "Avalie com base em fatos observados nos <b>últimos 3 meses</b>, comparando com o esperado para o cargo. Use toda a escala. Notas <b>1</b> e <b>5</b> pedem justificativa. "
          + (S.ciclo && S.ciclo.publico === "geral" ? "Ao enviar, a pessoa é avisada para fazer a autoavaliação, e você é avisado(a) quando ela concluir." : "A autoavaliação só aparece depois que você enviar a sua (avaliação às cegas).") + " Leva cerca de 8 a 10 minutos."}</div>` : ""}
      <div class="dc-fixo"><span id="dc-cont">0 de ${total}</span><div class="dc-prog"><i id="dc-pbar" style="width:0"></i></div><span id="dc-salvo" class="ajuda" style="margin:0"></span></div>
      ${evid && evid.length ? `<details class="dc-niveis" style="margin:8px 0"><summary>Portfólio de entregas de ${quem} (${evid.length}) — use como evidência</summary><ul>${evid.map(f => `<li><b>${esc(f.titulo)}</b> · ${dataBR(f.data)}${f.link ? ` · <a href="${esc(f.link)}" target="_blank" rel="noopener">abrir</a>` : ""}</li>`).join("")}</ul></details>` : ""}
      ${blocos().map(b => `<div class="dc-bloco"><h2>${esc(b.titulo)}<span class="dc-tag ${b.fonte === "dgpe" ? "dgpe" : "ga"}">${b.fonte === "dgpe" ? "Matriz DGPE" : "Projeto GA"}</span></h2>
        ${b.itens.map(i => `<div class="dc-item" data-k="${i.k}"><div class="dc-linha"><div><div class="nome">${esc(i.nome)}</div>${i.desc ? `<div class="desc">${esc(i.desc)}</div>` : ""}</div>
          <div class="dc-esc" role="radiogroup" aria-label="${esc(i.nome)}">${[1, 2, 3, 4, 5].map(v => `<label title="${ESC[v]}"><input type="radio" name="dc-${i.k}" value="${v}"${n[i.k] === v ? " checked" : ""}${editavel ? "" : " disabled"}><span>${v}</span></label>`).join("")}</div></div>
          <div class="dc-anc" data-anc>${n[i.k] ? `<b>${n[i.k]} · ${ESC[n[i.k]]}:</b> ${esc(i.ancoras[n[i.k] - 1])}` : ""}</div>
          <div data-just class="${n[i.k] === 1 || n[i.k] === 5 ? "" : "oculto"}"><label style="font-size:12.5px;margin:6px 0 2px">Justificativa da nota ${n[i.k] || ""} (obrigatória)</label><textarea data-j="${i.k}" maxlength="1000"${editavel ? "" : " disabled"}>${esc(ju[i.k] || "")}</textarea></div>
          <details class="dc-niveis"><summary>Ver os 5 níveis</summary><ol>${i.ancoras.map((a, j) => `<li><b>${ESC_C[j + 1]}:</b> ${esc(a)}</li>`).join("")}</ol></details></div>`).join("")}</div>`).join("")}
      <div class="dc-bloco"><h2>Síntese</h2>${SINTESE[tipo].map(([k, t, obr]) => `<label>${esc(t)}${obr ? " *" : ""}</label><textarea data-s="${k}" maxlength="2000"${editavel ? "" : " disabled"}>${esc(si[k] || "")}</textarea>`).join("")}
        ${tipo === "auto" && editavel ? `<label class="check"><input type="checkbox" id="dc-lgpd"${resp && resp.enviada_em ? " checked" : ""}><span>Estou ciente de que minha autoavaliação será lida pela coordenação pedagógica, pela liderança e pela gestão do Projeto GA BA, exclusivamente para o ciclo de desenvolvimento, conforme a LGPD.</span></label>` : ""}
        ${editavel ? `<div class="dc-btns"><button id="dc-enviar">${resp && resp.enviada_em ? "Atualizar envio" : tipo === "auto" ? "Enviar autoavaliação" : "Enviar avaliação"}</button></div>
          <div class="ajuda">${resp && resp.enviada_em ? `Enviada em ${dataHora(resp.enviada_em)}. Você pode ajustar até a devolutiva ser publicada.` : "Depois de enviar, você ainda pode ajustar até a devolutiva ser publicada."}</div>`
          : resp && resp.enviada_em ? `<div class="ajuda">Enviada em ${dataHora(resp.enviada_em)}.</div>` : ""}</div>`;
    const conta = () => { const q = its.filter(i => n[i.k]).length; $("dc-cont").textContent = `${q} de ${total}`; $("dc-pbar").style.width = (q / total * 100) + "%"; };
    conta();
    if (!editavel) return;
    let t = null;
    const salvar = (enviar) => { clearTimeout(t); const d = { notas: n, justificativas: ju, sintese: si }; if (enviar) d.enviada_em = new Date().toISOString(); else if (resp && resp.enviada_em) d.enviada_em = resp.enviada_em;
      return B.salvarResposta(x.id, tipo, d).then(() => { $("dc-salvo").textContent = (enviar ? "Enviada " : "Rascunho salvo ") + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }); };
    const agendar = () => { $("dc-salvo").textContent = "Salvando…"; clearTimeout(t); t = setTimeout(() => salvar(false).catch(falhou), 1200); };
    el.querySelectorAll(".dc-item").forEach(it => {
      const k = it.dataset.k, def = its.find(i => i.k === k);
      it.querySelectorAll("input[type=radio]").forEach(r => r.addEventListener("change", () => {
        n[k] = +r.value; it.querySelector("[data-anc]").innerHTML = `<b>${n[k]} · ${ESC[n[k]]}:</b> ${esc(def.ancoras[n[k] - 1])}`;
        const js = it.querySelector("[data-just]"); js.classList.toggle("oculto", !(n[k] === 1 || n[k] === 5)); js.querySelector("label").textContent = `Justificativa da nota ${n[k]} (obrigatória)`;
        conta(); agendar(); }));
    });
    el.querySelectorAll("[data-j]").forEach(a => a.addEventListener("input", () => { ju[a.dataset.j] = a.value; agendar(); }));
    el.querySelectorAll("[data-s]").forEach(a => a.addEventListener("input", () => { si[a.dataset.s] = a.value; agendar(); }));
    $("dc-enviar").addEventListener("click", async () => {
      const falta = its.filter(i => !n[i.k]);
      if (falta.length) { aviso("a-cd", `Faltam ${falta.length} item(ns): ${falta.slice(0, 3).map(i => i.nome).join(", ")}${falta.length > 3 ? "…" : ""}.`);
        return el.querySelector(`[data-k="${falta[0].k}"]`).scrollIntoView({ behavior: "smooth", block: "center" }); }
      const semJ = its.filter(i => (n[i.k] === 1 || n[i.k] === 5) && !(ju[i.k] || "").trim());
      if (semJ.length) { aviso("a-cd", `Justifique as notas extremas em: ${semJ.map(i => i.nome).join(", ")}.`); return el.querySelector(`[data-j="${semJ[0].k}"]`).focus(); }
      const obr = SINTESE[tipo].filter(s => s[2] && !(si[s[0]] || "").trim());
      if (obr.length) { aviso("a-cd", `Preencha na síntese: ${obr.map(s => s[1].split(":")[0]).join("; ")}.`); return el.querySelector(`[data-s="${obr[0][0]}"]`).focus(); }
      if (tipo === "auto" && !$("dc-lgpd").checked) return aviso("a-cd", "Para enviar, marque a caixa de ciência (LGPD).");
      try { await salvar(true); await recarregarLista(); const g = S.ciclo && S.ciclo.publico === "geral";
        ok(tipo === "auto" ? (g ? "Autoavaliação enviada. Quem avalia foi avisado(a) e vai enviar o feedback." : "Autoavaliação enviada. Você será avisado(a) quando a devolutiva for publicada.")
          : (g ? "Avaliação enviada. A pessoa foi avisada para fazer a autoavaliação." : "Avaliação enviada. A autoavaliação desta pessoa já pode ser vista na aba Devolutiva, se ela tiver enviado."));
        if (S.aba === "carteira") ficha(S.pessoa, tipo === "coord" ? "devolutiva" : undefined); else meuCiclo(); } catch (e) { falhou(e); }
    });
  }
  async function telaAuto(el, x) {
    carregando(el);
    try {
      const [rs, port] = await Promise.all([B.respostas(x.id), B.portfolio(meuId())]);
      const r = rs.find(y => y.tipo === "auto"), editavel = !x.devolutiva_em && S.ciclo.status !== "encerrado";
      if (S.ciclo.publico === "geral" && !x.coord_enviada && !(r && r.enviada_em)) { el.innerHTML = `<div class="resumo">Sua autoavaliação é liberada quando ${esc(x.avaliador || "quem avalia você")} concluir a sua avaliação. Você será avisado(a) por e-mail e terá 5 dias úteis para fazê-la.</div>`; return; }
      formAvaliacao(el, x, "auto", r, editavel, port.filter(f => !f.ciclo_id || f.ciclo_id === S.ciclo.id));
    } catch (e) { falhou(e); }
  }
  // autoavaliação somente leitura (liderança, gestão, gerência, programador e quem coordena o NTE depois de enviar a própria avaliação)
  async function telaAutoLeitura(el, x) {
    carregando(el);
    try {
      const rs = await B.respostas(x.id), au = rs.find(y => y.tipo === "auto" && y.enviada_em);
      if (!au) { el.innerHTML = `<div class="resumo">${x.auto_enviada ? "A autoavaliação ainda não está visível para você." : esc(x.nome) + " ainda não enviou a autoavaliação."}</div>`; return; }
      formAvaliacao(el, x, "auto", au, false, null);
      el.insertAdjacentHTML("afterbegin", `<div class="dc-guia">Somente leitura. Enviada em ${dataHora(au.enviada_em)}.</div>`);
    } catch (e) { falhou(e); }
  }
  async function telaAvaliacaoCoord(el, x) {
    carregando(el);
    try {
      const [rs, port] = await Promise.all([B.respostas(x.id), B.portfolio(x.colaborador_id)]);
      const co = rs.find(y => y.tipo === "coord"), au = rs.find(y => y.tipo === "auto" && y.enviada_em);
      const editavel = souAvaliadorDe(x) && !x.devolutiva_em && S.ciclo.status !== "encerrado";
      if (!editavel && !co) { el.innerHTML = `<div class="resumo">A coordenação ainda não registrou a avaliação.${au ? " A autoavaliação já foi enviada." : ""}</div>`; return; }
      formAvaliacao(el, x, "coord", co, editavel, port.filter(f => !f.ciclo_id || f.ciclo_id === S.ciclo.id));
      if (!editavel && au) el.insertAdjacentHTML("afterbegin", `<div class="dc-guia">Somente leitura. Compare com a autoavaliação na aba Devolutiva.</div>`);
    } catch (e) { falhou(e); }
  }

  // ------------------------------------------------------------------ DEVOLUTIVA: comparação + conversa por competência
  async function telaDevolutiva(el, x, souDono) {
    carregando(el);
    try {
      const [rs, cs] = await Promise.all([B.respostas(x.id), B.comentarios(x.id)]);
      const au = rs.find(y => y.tipo === "auto" && y.enviada_em), co = rs.find(y => y.tipo === "coord" && y.enviada_em);
      const souAval = souAvaliadorDe(x) && !souDono;
      const g = S.ciclo.publico === "geral";
      if (souDono && !x.devolutiva_em) { el.innerHTML = `<div class="resumo">${g ? "O feedback aparece aqui quando quem avalia você enviar." : "A devolutiva aparece aqui quando a coordenação publicar."} ${au ? "Sua autoavaliação foi enviada." : "Envie sua autoavaliação primeiro."}</div>`; return; }
      if (!souDono && !co) { el.innerHTML = `<div class="resumo">${souAval ? "Envie a sua avaliação primeiro. A autoavaliação aparece depois disso (avaliação às cegas)." : "A coordenação ainda não enviou a avaliação."}</div>`; return; }
      const ia = indices(au && au.notas), ic = indices(co && co.notas), its = itens();
      const gaps = its.filter(i => au && co && Math.abs((au.notas[i.k] || 0) - (co.notas[i.k] || 0)) >= 2);
      const porItem = (k) => cs.filter(c => c.item === k);
      const autor = (id) => id === x.colaborador_id ? (souDono ? "Você" : x.nome.split(" ")[0]) : id === meuId() ? "Você" : (S.demo ? DEMO.nomes[id] : x.avaliador) || "Coordenação";
      const chatAberto = !g || !x.devolutiva_em || !x.chat_ate || hojeISO() <= x.chat_ate;
      const fio = (k) => { const l = porItem(k); const podeEscrever = S.ciclo.status !== "encerrado" && chatAberto && (souAval || (souDono && x.devolutiva_em));
        return `<div class="dc-fio" data-fio="${k}">${l.map(c => `<div class="dc-msg${c.autor_id === meuId() ? " meu" : ""}"><b>${esc(autor(c.autor_id))}</b><small>${dataHora(c.criado_em)}</small><div style="white-space:pre-wrap">${esc(c.texto)}</div></div>`).join("")}
          ${podeEscrever ? `<div class="dc-env"><textarea placeholder="${souDono ? "Responder: concordo, discordo, contexto…" : "Comentário com fato: situação → comportamento → impacto"}" maxlength="2000"></textarea><button class="sec" data-env="${k}">Enviar</button></div>` : ""}</div>`; };
      el.innerHTML = `${!souDono && !au && g ? `<div class="dc-guia">${esc(x.nome)} ainda não concluiu a autoavaliação${x.auto_prazo ? ` (prazo: ${dataBR(x.auto_prazo)})` : ""}. Você é avisado(a) por e-mail quando ela concluir; o feedback é liberado depois disso.</div>`
        : !souDono && !au ? `<div class="dc-guia">${esc(x.nome)} ainda não enviou a autoavaliação${S.ciclo.prazo_avaliacao < hojeISO() ? " e o prazo passou. Você pode seguir com a devolutiva." : `. Prazo: ${dataBR(S.ciclo.prazo_avaliacao)}.`}</div>` : ""}
        <div class="dc-kpis"><div><b>${n1(ic.dgpe)} <small style="font-size:13px;color:var(--texto-2)">/ auto ${n1(ia.dgpe)}</small></b>Competências DGPE</div>
          <div><b>${n1(ic.ga)} <small style="font-size:13px;color:var(--texto-2)">/ auto ${n1(ia.ga)}</small></b>Atuação GA 2.0</div>
          <div><b>${n1(ic.res)} <small style="font-size:13px;color:var(--texto-2)">/ auto ${n1(ia.res)}</small></b>Resultados</div>
          <div><b>${gaps.length}</b>Itens com diferença de 2+ pontos</div></div>
        ${g && x.devolutiva_em ? `<div class="dc-bloco"><h2>Conversa sobre o PDI</h2><div class="dc-guia">${chatAberto ? `Conversa aberta até <b>${dataBR(x.chat_ate)}</b> (5 dias úteis depois do feedback).` : `Conversa encerrada em ${dataBR(x.chat_ate)}.`}
          Foco exclusivo no PDI: prestação de contas, diagnóstico e registro do progresso de adesão ao PDI e dúvidas.</div>${fio("pdi")}</div>` : ""}
        <div class="dc-bloco"><h2>Comentário geral</h2>${fio("geral")}</div>
        <div class="dc-bloco"><h2>Item a item</h2><div class="ajuda">Toque em 💬 para comentar. Comece pelos itens com diferença de 2 pontos ou mais.</div>
        <div class="dc-rolar"><table class="dc-tab dc-cmp"><thead><tr><th>Competência</th><th class="num">Auto</th><th class="num">Coord.</th><th class="num">Dif.</th><th class="num">💬</th></tr></thead><tbody>
        ${its.map(i => { const a = au && au.notas[i.k], c = co && co.notas[i.k], d = a && c ? c - a : null;
          return `<tr><td>${esc(i.nome)}<span class="dc-tag ${i.fonte === "dgpe" ? "dgpe" : "ga"}">${i.fonte === "dgpe" ? "DGPE" : "GA"}</span>
            ${(au && au.justificativas[i.k]) ? `<div class="ajuda">Auto: ${esc(au.justificativas[i.k])}</div>` : ""}${(co && co.justificativas[i.k]) ? `<div class="ajuda">Coord.: ${esc(co.justificativas[i.k])}</div>` : ""}</td>
            <td class="num">${a || "—"}</td><td class="num"><b>${c || "—"}</b></td><td class="num"><span class="gap${d != null && Math.abs(d) >= 2 ? " alto" : ""}">${d == null ? "—" : (d > 0 ? "+" : "") + d}</span></td>
            <td class="num"><button class="sec dc-mini" data-ab="${i.k}">💬 ${porItem(i.k).length || ""}</button></td></tr>
            <tr class="oculto" data-linha="${i.k}"><td colspan="5">${fio(i.k)}</td></tr>`; }).join("")}</tbody></table></div></div>
        <div class="dc-duas"><div class="dc-bloco"><h2>Síntese da autoavaliação</h2>${au ? SINTESE.auto.map(([k, t]) => au.sintese[k] ? `<h3>${esc(t.split(" (")[0])}</h3><p style="white-space:pre-wrap;margin:0">${esc(au.sintese[k])}</p>` : "").join("") : `<div class="resumo">Não enviada.</div>`}</div>
          <div class="dc-bloco"><h2>Síntese da coordenação</h2>${co ? SINTESE.coord.map(([k, t]) => co.sintese[k] ? `<h3>${esc(t.split(":")[0])}</h3><p style="white-space:pre-wrap;margin:0">${esc(co.sintese[k])}</p>` : "").join("") : ""}</div></div>
        ${souAval && !x.devolutiva_em && g && au ? `<div class="dc-bloco"><h2>Enviar o feedback</h2><div class="ajuda">Ao enviar, ${esc(x.nome)} passa a ver a sua avaliação e os comentários, e a conversa fica aberta para os dois. A partir daí, o PDI deve ser disponibilizado em até 5 dias úteis. Depois disso, as notas não mudam mais.</div>
          <div class="dc-btns"><button id="dc-pub">Enviar feedback</button></div></div>`
          : x.devolutiva_em && g ? `<div class="ajuda">Feedback enviado em ${dataHora(x.devolutiva_em)}${x.pdi_prazo ? ` · PDI até ${dataBR(x.pdi_prazo)}` : ""}.</div>`
          : souAval && !x.devolutiva_em && !g ? `<div class="dc-bloco"><h2>Publicar a devolutiva</h2><div class="ajuda">Ao publicar, ${esc(x.nome)} passa a ver a sua avaliação e os comentários, e pode responder antes da conversa individual. Depois disso, as notas não mudam mais.</div>
          <div class="dc-btns"><button id="dc-pub">Publicar devolutiva</button></div></div>`
          : x.devolutiva_em ? `<div class="ajuda">Devolutiva publicada em ${dataHora(x.devolutiva_em)}.</div>` : ""}`;
      el.querySelectorAll("[data-ab]").forEach(b => b.addEventListener("click", () => el.querySelector(`[data-linha="${b.dataset.ab}"]`).classList.toggle("oculto")));
      gaps.forEach(i => { const l = el.querySelector(`[data-linha="${i.k}"]`); if (l && porItem(i.k).length) l.classList.remove("oculto"); });
      el.querySelectorAll("[data-env]").forEach(b => b.addEventListener("click", async () => {
        const ta = b.parentElement.querySelector("textarea"), t = ta.value.trim(); if (!t) return;
        try { await B.comentar(x.id, b.dataset.env, t); const aberto = [...el.querySelectorAll("tr[data-linha]:not(.oculto)")].map(r => r.dataset.linha); await telaDevolutiva(el, x, souDono);
          aberto.forEach(k => { const l = el.querySelector(`[data-linha="${k}"]`); if (l) l.classList.remove("oculto"); }); } catch (e) { falhou(e); }
      }));
      if ($("dc-pub")) $("dc-pub").addEventListener("click", async () => {
        const semCom = gaps.filter(i => !porItem(i.k).length);
        if (!porItem("geral").length) return aviso("a-cd", "Escreva um comentário geral antes de publicar.");
        if (semCom.length && !confirm(`${semCom.length} item(ns) com diferença de 2+ pontos não têm comentário (${semCom.map(i => i.nome).join(", ")}). Publicar mesmo assim?`)) return;
        try { await B.publicarDevolutiva(x.id); await recarregarLista(); ok(g ? "Feedback enviado. A pessoa foi avisada e a conversa está aberta. O PDI vence em 5 dias úteis." : "Devolutiva publicada. A pessoa foi avisada."); ficha(S.pessoa, "pdi"); } catch (e) { falhou(e); }
      });
    } catch (e) { falhou(e); }
  }

  // ------------------------------------------------------------------ CONVERSA E PDI
  const DEVERES = `<div class="dc-duas" style="margin-top:8px"><div class="dc-guia"><b>Deveres do(a) avaliado(a)</b><br>• Executar as ações combinadas no prazo<br>• Registrar entregas no portfólio<br>• Atualizar o progresso das metas antes de cada encontro<br>• Responder o formulário de efetividade após cada encontro</div>
    <div class="dc-guia"><b>Deveres da coordenação</b><br>• Oferecer o apoio combinado em cada meta<br>• Realizar os 3 encontros (ao menos 1 presencial ou por vídeo; o 2º, de preferência por vídeo no Teams, transcrito e com consentimento)<br>• Registrar o progresso e dar feedback com fatos<br>• Reconhecer avanços e replanejar quando preciso</div></div>`;
  async function telaPdi(el, x, souDono) {
    carregando(el);
    try {
      const [metas, rs, encs] = await Promise.all([B.metas(x.id), B.respostas(x.id), x.pdi_publicado_em ? B.encontros(x.id).catch(() => []) : Promise.resolve([])]);
      const trans = encs.filter(e => e.transcricao_link);
      const souAval = souAvaliadorDe(x) && !souDono, editavel = souAval && S.ciclo.status !== "encerrado";
      if (!x.devolutiva_em) { el.innerHTML = `<div class="resumo">O PDI é construído depois da devolutiva publicada.</div>${DEVERES}`; return; }
      if (souDono && !x.pdi_publicado_em && !metas.length) { el.innerHTML = `<div class="resumo">Seu PDI será construído com a coordenação na conversa individual${x.conversa_em ? ` (${dataBR(x.conversa_em)})` : ""}.</div>${DEVERES}`; return; }
      const co = rs.find(y => y.tipo === "coord"), au = rs.find(y => y.tipo === "auto");
      const sugest = co ? itens().filter(i => i.k !== "res").map(i => ({ i, c: co.notas[i.k] || 3, g: au ? Math.abs((au.notas[i.k] || 0) - (co.notas[i.k] || 0)) : 0 }))
        .sort((a, b) => a.c - b.c || b.g - a.g).slice(0, 3) : [];
      const opcoes = (sel) => `<option value="">— escolha —</option>${blocos().map(b => `<optgroup label="${esc(b.titulo)}">${b.itens.map(i => `<option value="${i.k}"${sel === i.k ? " selected" : ""}>${esc(i.nome)}</option>`).join("")}</optgroup>`).join("")}`;
      const dis = editavel ? "" : " disabled";
      const cartao = (m, i) => `<div class="dc-meta" data-m="${m.id || "novo"}"><div class="dc-linha" style="grid-template-columns:1fr auto"><b>${m.id ? `Meta ${i + 1}` : "Nova meta"}</b>${m.id ? sit(m.status + " · " + (m.progresso || 0) + "%", m.status === "Concluída" ? "ok" : "neutro") : ""}</div>
        <div class="grade2"><div><label>Competência</label><select data-f="competencia"${dis}>${opcoes(m.competencia)}</select></div>
          <div><label>Prazo</label><input type="date" data-f="prazo" value="${esc(m.prazo || S.ciclo.fim)}"${dis}></div></div>
        <label>Objetivo (o que vai melhorar, de forma observável)</label><textarea data-f="objetivo"${dis}>${esc(m.objetivo || "")}</textarea>
        <div class="dc-duas"><div class="lado"><h4>Compromissos do(a) avaliado(a)</h4><textarea data-f="acao_avaliado" placeholder="O quê, quando e onde. Ex.: Em cada visita às escolas prioritárias, …"${dis}>${esc(m.acao_avaliado || "")}</textarea></div>
          <div class="lado"><h4>Compromissos da coordenação</h4><textarea data-f="apoio_avaliador" placeholder="Apoio concreto. Ex.: acompanhar 1 visita por mês e dar feedback em 48 h"${dis}>${esc(m.apoio_avaliador || "")}</textarea></div></div>
        <div class="grade2"><div><label>Como vai aprender</label><select data-f="formato"${dis}><option value="">—</option>${FORMATOS.map(f => `<option${m.formato === f ? " selected" : ""}>${f}</option>`).join("")}</select></div>
          <div><label>Evidência de sucesso</label><input data-f="evidencia" value="${esc(m.evidencia || "")}" placeholder="Como saberemos que deu certo"${dis}></div></div>
        ${m.id && (souDono || editavel) && x.pdi_publicado_em ? `<div class="grade2"><div><label>Status</label><select data-f2="status">${STATUS_META.map(s => `<option${m.status === s ? " selected" : ""}>${s}</option>`).join("")}</select></div>
          <div><label>Progresso: <b data-pv>${m.progresso || 0}%</b></label><input type="range" min="0" max="100" step="25" data-f2="progresso" value="${m.progresso || 0}"></div></div>` : ""}
        ${editavel || (souDono && m.id && x.pdi_publicado_em) ? `<div class="dc-btns"><button class="sec" data-sv>${m.id ? "Salvar" : "Adicionar meta"}</button>${m.id && editavel ? `<button class="perigo" data-del>Excluir</button>` : ""}</div>` : ""}</div>`;
      el.innerHTML = `<div class="dc-bloco"><h2>Conversa individual</h2>
          <div class="grade2"><div><label>Data</label><input type="date" id="dc-cv" value="${esc(x.conversa_em || "")}"${dis}></div>
          <div><label>Modalidade</label><select id="dc-cm"${dis}><option value="">—</option>${["presencial", "video", "telefone"].map(m => `<option value="${m}"${x.conversa_modalidade === m ? " selected" : ""}>${MODAL[m]}</option>`).join("")}</select></div></div>
          ${editavel ? `<div class="dc-guia">Roteiro (cerca de 45 min): <b>1.</b> abertura e escuta (como a pessoa viu o trimestre) · <b>2.</b> reconhecimento com fato · <b>3.</b> 1 ou 2 prioridades com fato, sem “mas” · <b>4.</b> investigar a causa: falta saber, poder ou querer? · <b>5.</b> construir o PDI juntos · <b>6.</b> combinar as datas dos encontros.</div>` : ""}
          <label>Ponto forte a alavancar (feedforward)</label><textarea id="dc-forca"${dis}>${esc(x.pdi_forca || "")}</textarea>
          ${editavel ? `<div class="dc-btns"><button class="sec" id="dc-svc">Salvar conversa</button></div>` : ""}</div>
        <div class="dc-bloco"><h2>Plano de Desenvolvimento Individual · ${esc(S.ciclo.titulo)}</h2>
          ${x.pdi_prazo && !x.pdi_publicado_em ? `<div class="ajuda">Prazo para disponibilizar o PDI: <b>${dataBR(x.pdi_prazo)}</b> (5 dias úteis depois do feedback).</div>` : ""}
          ${editavel && sugest.length ? `<div class="dc-guia">Sugestões a partir da avaliação (menor nota da coordenação e maior diferença): ${sugest.map(s => `<b>${esc(s.i.nome)}</b> (${s.c})`).join(" · ")}. ${au && au.sintese.desenvolver ? `A pessoa quer desenvolver: “${esc(au.sintese.desenvolver)}”.` : ""} Recomendado: de 1 a 3 metas.</div>` : ""}
          ${DEVERES}
          <div id="dc-metas">${metas.map(cartao).join("") || (editavel ? "" : `<div class="resumo">Nenhuma meta registrada ainda.</div>`)}</div>
          ${editavel && metas.length < 3 ? cartao({ status: "Não iniciada" }, metas.length) : ""}
          ${editavel && !x.pdi_publicado_em ? `<div class="dc-btns"><button id="dc-pubpdi">Publicar PDI e agendar os 3 encontros</button></div>` : ""}
          ${x.pdi_publicado_em ? `<div class="ajuda">PDI publicado em ${dataHora(x.pdi_publicado_em)}.</div>` : ""}
          ${trans.length ? `<h3>Transcrições dos encontros por vídeo</h3><ul>${trans.map(e => `<li>Encontro ${e.ordem} de 3${e.realizado_em ? " · " + dataBR(e.realizado_em) : ""}: <a href="${esc(e.transcricao_link)}" target="_blank" rel="noopener">abrir a transcrição no Teams</a>${e.consentimento ? " · consentimento confirmado no início" : ""}</li>`).join("")}</ul>` : ""}</div>
        ${x.pdi_publicado_em ? `<div class="dc-bloco"><h2>Ciência do(a) avaliado(a)</h2>${x.pdi_ciencia_em
          ? `<div>${sit(x.pdi_concorda ? "Ciente e de acordo" : "Ciente, com ressalvas", x.pdi_concorda ? "ok" : "alerta")} em ${dataHora(x.pdi_ciencia_em)}</div>${x.pdi_obs ? `<p style="white-space:pre-wrap">${esc(x.pdi_obs)}</p>` : ""}`
          : souDono ? `<div class="ajuda">Confira os compromissos e registre sua ciência.</div><label>Observação (opcional)</label><textarea id="dc-cobs"></textarea>
            <div class="dc-btns"><button id="dc-c1">Li e concordo</button><button class="sec" id="dc-c2">Li, com ressalvas</button></div>` : `<div class="resumo">Aguardando a ciência de ${esc(x.nome)}.</div>`}</div>` : ""}`;
      if ($("dc-svc")) $("dc-svc").addEventListener("click", async () => {
        try { await B.atualizarPart(x.id, { conversa_em: $("dc-cv").value || null, conversa_modalidade: $("dc-cm").value || null, pdi_forca: $("dc-forca").value.trim() || null });
          Object.assign(x, { conversa_em: $("dc-cv").value || null, conversa_modalidade: $("dc-cm").value || null, pdi_forca: $("dc-forca").value.trim() || null }); ok("Conversa salva."); } catch (e) { falhou(e); } });
      el.querySelectorAll(".dc-meta").forEach(card => {
        const id = card.dataset.m === "novo" ? null : +card.dataset.m, pv = card.querySelector("[data-pv]"), rg = card.querySelector("[data-f2=progresso]");
        if (rg) rg.addEventListener("input", () => pv.textContent = rg.value + "%");
        const sv = card.querySelector("[data-sv]"), del = card.querySelector("[data-del]");
        if (sv) sv.addEventListener("click", async () => {
          const d = { participante_id: x.id }; if (id) d.id = id;
          if (editavel) { card.querySelectorAll("[data-f]").forEach(i => d[i.dataset.f] = i.value.trim() || null);
            if (!d.objetivo) return aviso("a-cd", "Escreva o objetivo da meta.");
            if (!d.acao_avaliado || !d.apoio_avaliador) return aviso("a-cd", "Preencha os compromissos dos dois lados: avaliado(a) e coordenação."); d.ordem = id ? undefined : metas.length + 1; }
          card.querySelectorAll("[data-f2]").forEach(i => d[i.dataset.f2] = i.dataset.f2 === "progresso" ? +i.value : i.value);
          if (d.progresso === 100 && d.status !== "Concluída") d.status = "Concluída";
          Object.keys(d).forEach(k => d[k] === undefined && delete d[k]);
          try { await B.salvarMeta(d); ok("Meta salva."); telaPdi(el, x, souDono); } catch (e) { falhou(e); } });
        if (del) del.addEventListener("click", async () => { if (!confirm("Excluir esta meta?")) return; try { await B.apagarMeta(id); telaPdi(el, x, souDono); } catch (e) { falhou(e); } });
      });
      if ($("dc-pubpdi")) $("dc-pubpdi").addEventListener("click", async () => {
        if (!$("dc-cv").value) return aviso("a-cd", "Registre a data da conversa individual e salve antes de publicar.");
        if (!metas.length) return aviso("a-cd", "Adicione ao menos uma meta.");
        try { if (!x.conversa_em) await B.atualizarPart(x.id, { conversa_em: $("dc-cv").value, conversa_modalidade: $("dc-cm").value || null, pdi_forca: $("dc-forca").value.trim() || null });
          await B.publicarPdi(x.id); await recarregarLista(); ok("PDI publicado. Os 3 encontros foram agendados e a pessoa foi avisada."); ficha(S.pessoa, "acomp"); } catch (e) { falhou(e); } });
      const ciencia = async (c) => { try { await B.ciencia(x.id, c, $("dc-cobs").value.trim()); await recarregarLista(); ok("Ciência registrada."); meuCiclo(); } catch (e) { falhou(e); } };
      if ($("dc-c1")) { $("dc-c1").addEventListener("click", () => ciencia(true)); $("dc-c2").addEventListener("click", () => { if (!$("dc-cobs").value.trim()) return aviso("a-cd", "Escreva a sua ressalva na observação."); ciencia(false); }); }
    } catch (e) { falhou(e); }
  }

  // ------------------------------------------------------------------ ACOMPANHAMENTO: 3 encontros + formulário de efetividade
  async function telaAcomp(el, x, souDono) {
    carregando(el);
    try {
      const [encs, metas] = await Promise.all([B.encontros(x.id), B.metas(x.id)]);
      if (!encs.length) { el.innerHTML = `<div class="resumo">Os 3 encontros de acompanhamento são agendados automaticamente quando o PDI é publicado.</div>`; return; }
      const souAval = souAvaliadorDe(x) && !souDono, aberto = S.ciclo.status !== "encerrado";
      const sincrono = encs.some(e => e.realizado_em && ["presencial", "video"].includes(e.modalidade));
      const pulsos = encs.filter(e => e.pulso), efet = pulsos.length ? pulsos.map(e => PULSO.reduce((s, [k]) => s + (+e.pulso[k] || 0), 0) / PULSO.length).reduce((a, b) => a + b, 0) / pulsos.length : null;
      const prog = metas.length ? metas.reduce((s, m) => s + (m.progresso || 0), 0) / metas.length : null;
      el.innerHTML = `<div class="dc-kpis"><div><b>${encs.filter(e => e.realizado_em).length} de 3</b>Encontros realizados</div><div><b>${sincrono ? "Sim" : "Ainda não"}</b>Encontro presencial ou por vídeo</div>
          <div><b>${prog == null ? "—" : Math.round(prog) + "%"}</b>Progresso médio das metas</div><div><b>${n1(efet)}</b>Efetividade percebida (1 a 5)</div></div>
        ${encs.map(e => { const precisaSinc = e.ordem === 3 && !sincrono && !e.realizado_em, podeReg = souAval && aberto, podePulso = souDono && e.realizado_em && !e.pulso && aberto;
          return `<div class="dc-enc" data-e="${e.id}"><div class="dc-linha"><b>Encontro ${e.ordem} de 3 · previsto para ${dataBR(e.previsto_em)}</b>
            ${e.realizado_em ? sit(`Realizado em ${dataBR(e.realizado_em)} · ${MODAL[e.modalidade] || ""}`, "ok") : e.agendado_para ? sit(`Agendado · ${dataHoraBR(e.agendado_para)}`, "neutro") : e.previsto_em < hojeISO() ? sit("Atrasado e sem data", "erro") : sit("A agendar", "alerta")}</div>
            ${!e.realizado_em && aberto && (souAval || souDono) ? `<div class="dc-agendar"><div class="grade2"><div><label>${e.agendado_para ? "Reagendar para" : "Agendar para"} (data e hora)</label><input type="datetime-local" data-ag value="${esc(paraLocal(e.agendado_para))}"></div>
                <div style="align-self:end"><div class="dc-btns" style="margin:0"><button class="sec" data-agsv>${e.agendado_para ? "Reagendar" : "Agendar"}</button>${e.agendado_para ? `<a class="dc-mini" href="${icsLink(e.agendado_para, "Encontro de acompanhamento do PDI · " + x.nome)}" download="encontro-pdi.ics" style="align-self:center">Adicionar ao meu calendário</a>` : ""}</div></div></div>
                <div class="ajuda">Combinem a data juntos. Os dois recebem aviso 48 h antes e no dia${e.reagendamentos ? ` · reagendado ${e.reagendamentos} vez(es)` : ""}.</div></div>` : ""}
            ${podeReg ? `<div class="grade2"><div><label>Realizado em</label><input type="date" data-f="realizado_em" value="${esc(e.realizado_em || "")}"></div>
                <div><label>Modalidade</label><select data-f="modalidade"><option value="">—</option>${Object.entries(MODAL).filter(([k]) => !precisaSinc || ["presencial", "video"].includes(k)).map(([k, t]) => `<option value="${k}"${(e.modalidade || (e.ordem === 2 && !e.realizado_em ? "video" : "")) === k ? " selected" : ""}>${t}</option>`).join("")}</select></div></div>
                ${e.ordem === 2 ? `<div class="dc-guia">Recomendado: faça este encontro por <b>videochamada no Teams</b>, com transcrição. No início da transcrição, peça e confirme em voz alta o consentimento de ${esc(x.nome)}.</div>` : ""}
                <div data-vid class="${(e.modalidade || (e.ordem === 2 && !e.realizado_em ? "video" : "")) === "video" ? "" : "oculto"}"><label>Link da transcrição no Teams *</label><input type="text" inputmode="url" data-f="transcricao_link" value="${esc(e.transcricao_link || "")}" placeholder="https://teams.microsoft.com/…">
                  <label class="check"><input type="checkbox" data-cons${e.consentimento ? " checked" : ""}><span>Confirmei, no início da transcrição, o consentimento de ${esc(x.nome)} para a transcrição do encontro.</span></label>
                  <div class="ajuda">O link fica disponível no PDI para quem avalia e para a pessoa avaliada.</div></div>
                ${precisaSinc ? `<div class="dc-guia">Este é o último encontro e nenhum foi presencial ou por vídeo. Ele precisa ser presencial ou por vídeo.</div>` : ""}
                <label>Registro do diálogo (fatos, avanços, dificuldades)</label><textarea data-f="registro">${esc(e.registro || "")}</textarea>
                <label>Próximos passos combinados</label><textarea data-f="proximos">${esc(e.proximos || "")}</textarea>
                ${metas.length ? `<label>Progresso de cada meta</label>${metas.map(m => `<div class="dc-linha" style="grid-template-columns:1fr 160px"><span style="font-size:13px">${esc(m.objetivo)}</span><input type="range" min="0" max="100" step="25" data-pm="${m.id}" value="${(e.progresso || {})[m.id] ?? m.progresso ?? 0}"></div>`).join("")}` : ""}
                <div class="dc-btns"><button class="sec" data-sv>Salvar encontro</button></div>`
              : `${e.transcricao_link ? `<div class="ajuda">Transcrição: <a href="${esc(e.transcricao_link)}" target="_blank" rel="noopener">abrir no Teams</a>${e.consentimento ? " · consentimento confirmado" : ""}</div>` : ""}${e.registro ? `<h3>Registro</h3><p style="white-space:pre-wrap;margin:0">${esc(e.registro)}</p>` : ""}${e.proximos ? `<h3>Próximos passos</h3><p style="white-space:pre-wrap;margin:0">${esc(e.proximos)}</p>` : ""}`}
            ${e.pulso ? `<h3>Formulário de efetividade</h3><div class="ajuda">${PULSO.map(([k, t]) => `${esc(t)}: <b>${e.pulso[k]}</b>`).join(" · ")}</div>${e.pulso_texto ? `<p style="white-space:pre-wrap;margin:4px 0 0">${esc(e.pulso_texto)}</p>` : ""}`
              : podePulso ? `<h3>Formulário de efetividade (1 minuto)</h3>${PULSO.map(([k, t]) => `<div class="dc-linha" style="padding:6px 0"><span style="font-size:13.5px">${esc(t)}</span><div class="dc-esc">${[1, 2, 3, 4, 5].map(v => `<label title="${v === 1 ? "Discordo totalmente" : v === 5 ? "Concordo totalmente" : ""}"><input type="radio" name="p${e.id}-${k}" value="${v}"><span>${v}</span></label>`).join("")}</div></div>`).join("")}
                <div class="ajuda">1 = discordo totalmente · 5 = concordo totalmente</div><label>Comentário (opcional)</label><textarea data-pt></textarea><div class="dc-btns"><button data-pulso>Enviar</button></div>`
              : e.realizado_em ? `<div class="ajuda">Formulário de efetividade ainda não respondido.</div>` : ""}</div>`; }).join("")}`;
      el.querySelectorAll(".dc-enc").forEach(card => {
        const id = +card.dataset.e, sv = card.querySelector("[data-sv]"), pb = card.querySelector("[data-pulso]"), sm = card.querySelector('select[data-f="modalidade"]');
        if (sm) sm.addEventListener("input", () => card.querySelector("[data-vid]").classList.toggle("oculto", sm.value !== "video"));
        const ag = card.querySelector("[data-agsv]");
        if (ag) ag.addEventListener("click", async () => { const v = card.querySelector("[data-ag]").value; if (!v) return aviso("a-cd", "Escolha a data e a hora do encontro.");
          const quando = new Date(v); if (quando < new Date()) return aviso("a-cd", "Escolha uma data e hora futuras.");
          try { await B.salvarEncontro(id, { agendado_para: quando.toISOString() }); ok("Encontro agendado. A outra pessoa foi avisada; os dois recebem lembrete 48 h antes e no dia."); telaAcomp(el, x, souDono); } catch (e) { falhou(e); } });
        if (sv) sv.addEventListener("click", async () => {
          const d = { progresso: {} }; card.querySelectorAll("[data-f]").forEach(i => d[i.dataset.f] = i.value.trim() || null);
          if (d.realizado_em && !d.modalidade) return aviso("a-cd", "Informe a modalidade do encontro.");
          d.consentimento = !!(card.querySelector("[data-cons]") || {}).checked;
          if (d.modalidade !== "video") { d.transcricao_link = null; d.consentimento = null; }
          if (d.realizado_em && d.modalidade === "video") {
            if (!/^https?:\/\//i.test(d.transcricao_link || "")) return aviso("a-cd", "Encontro por vídeo: informe o link da transcrição no Teams.");
            if (!d.consentimento) return aviso("a-cd", "Encontro por vídeo: confirme o consentimento da pessoa avaliada no início da transcrição."); }
          card.querySelectorAll("[data-pm]").forEach(r => d.progresso[r.dataset.pm] = +r.value);
          try { await B.salvarEncontro(id, d);
            if (d.realizado_em) for (const m of metas) { const p = d.progresso[m.id]; if (p != null && p !== m.progresso) await B.salvarMeta({ id: m.id, progresso: p, status: p >= 100 ? "Concluída" : p > 0 ? "Em andamento" : m.status }); }
            await recarregarLista(); ok("Encontro salvo."); telaAcomp(el, x, souDono); } catch (e) { falhou(e); } });
        if (pb) pb.addEventListener("click", async () => {
          const p = {}; for (const [k] of PULSO) { const r = card.querySelector(`input[name="p${id}-${k}"]:checked`); if (!r) return aviso("a-cd", "Responda as 4 afirmações."); p[k] = +r.value; }
          try { await B.salvarEncontro(id, { pulso: p, pulso_texto: card.querySelector("[data-pt]").value.trim() || null }); ok("Obrigado! Resposta registrada."); telaAcomp(el, x, souDono); } catch (e) { falhou(e); } });
      });
    } catch (e) { falhou(e); }
  }

  // ------------------------------------------------------------------ PORTFÓLIO DE ENTREGAS
  async function telaPortfolio(el, colab, souDono, x) {
    carregando(el);
    try {
      const [lista, metas] = await Promise.all([B.portfolio(colab), x ? B.metas(x.id) : Promise.resolve([])]);
      const podeNota = !souDono && (souLider() || (x && souAvaliadorDe(x)));
      const arqs = podeNota ? await B.portArquivos(lista.filter(f => f.considerado === false).map(f => f.id)).catch(() => []) : [];
      const linkDe = (f) => f.link || ((arqs.find(a => a.portfolio_id === f.id) || {}).link) || null;
      const parecer = (f) => f.considerado == null ? sit("Aguardando seu parecer", "alerta") : f.considerado ? sit("Considerado na avaliação" + (f.avanco_pdi ? " · avanço no PDI" : ""), "ok") : sit("Não considerado", "neutro");
      const pend = podeNota ? lista.filter(f => f.considerado == null).length : 0;
      const chips = (sel, dis) => `<div class="dc-chips">${itens().filter(i => i.k !== "res").map(i => `<label><input type="checkbox" value="${i.k}"${(sel || []).includes(i.k) ? " checked" : ""}${dis ? " disabled" : ""}><span>${esc(i.nome)}</span></label>`).join("")}</div>`;
      el.innerHTML = `${souDono ? `<div class="dc-bloco"><h2>Registrar uma entrega</h2><div class="ajuda">Registre entregas e evidências ao longo do trimestre (visitas, devolutivas, análises, formações). Elas aparecem para a coordenação na hora de avaliar e nos encontros.</div>
          <div class="grade2"><div><label>Título *</label><input id="pf-t" maxlength="200"></div><div><label>Data</label><input type="date" id="pf-d" value="${hojeISO()}"></div></div>
          <label>O que foi feito e qual o resultado</label><textarea id="pf-ds" maxlength="2000"></textarea>
          <label>Link da evidência (Drive, SGA, fotos)</label><input id="pf-l" placeholder="https://">
          ${metas.length ? `<label>Ligada a uma meta do PDI</label><select id="pf-m"><option value="">—</option>${metas.map(m => `<option value="${m.id}">${esc(m.objetivo)}</option>`).join("")}</select>` : ""}
          <label>Competências relacionadas</label><div id="pf-c">${chips([])}</div><div class="dc-btns"><button id="pf-s">Adicionar ao portfólio</button></div></div>` : ""}
        <div class="dc-bloco"><h2>${souDono ? "Meu portfólio" : "Portfólio de entregas"} (${lista.length})</h2>
        ${souDono && lista.length ? `<div class="dc-btns" style="justify-content:flex-start;margin-top:0"><button class="sec dc-mini" id="pf-baixar">Baixar meu portfólio</button></div>` : ""}
        ${podeNota ? `<div class="dc-guia">Para cada entrega, indique se ela será considerada na avaliação de desempenho e se é avanço no PDI. A pessoa não é avisada do seu parecer. O que não for considerado deixa de ficar disponível para ela baixar; o que for considerado vai para o relatório.${pend ? ` <b>${pend} aguardando parecer.</b>` : ""}</div>` : ""}
        ${lista.map(f => `<div class="dc-port" data-f="${f.id}"><div class="dc-linha"><b>${esc(f.titulo)}</b><small>${dataBR(f.data)}</small></div>
          ${f.descricao ? `<div style="white-space:pre-wrap;margin-top:4px">${esc(f.descricao)}</div>` : ""}
          ${linkDe(f) ? `<div><a href="${esc(linkDe(f))}" target="_blank" rel="noopener">Abrir evidência</a></div>` : souDono && f.considerado === false ? `<div class="ajuda">Evidência indisponível para download.</div>` : ""}
          ${podeNota ? `<div class="dc-linha" style="grid-template-columns:auto 1fr;gap:8px;margin-top:6px">${parecer(f)}<span></span></div>
            <div class="dc-btns" style="justify-content:flex-start;flex-wrap:wrap"><button class="sec dc-mini${f.considerado === true ? " on" : ""}" data-cons="1">Considerar na avaliação</button><button class="sec dc-mini${f.considerado === false ? " on" : ""}" data-cons="0">Não considerar</button>
              <label class="check" style="margin:0"><input type="checkbox" data-avpdi${f.avanco_pdi ? " checked" : ""}><span>É avanço no PDI</span></label></div>` : ""}
          ${(f.competencias || []).length ? `<div class="dc-chips">${f.competencias.map(k => `<span class="dc-tag">${esc(nomeItem(k))}</span>`).join("")}</div>` : ""}
          ${f.nota_coord ? `<div class="dc-guia"><b>Coordenação:</b> ${esc(f.nota_coord)}</div>` : ""}
          ${podeNota ? `<div class="dc-env"><textarea placeholder="Nota da coordenação (reconhecimento, sugestão)">${esc(f.nota_coord || "")}</textarea><button class="sec" data-nota>Salvar nota</button></div>` : ""}
          ${souDono && f.considerado == null ? `<div class="dc-btns"><button class="perigo dc-mini" data-del>Excluir</button></div>` : ""}</div>`).join("") || `<div class="resumo">Nenhuma entrega registrada ainda.</div>`}</div>`;
      if ($("pf-baixar")) $("pf-baixar").addEventListener("click", () => {
        const L = lista.filter(f => f.considerado !== false), q = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
        const csv = [["Data", "Título", "Descrição", "Evidência", "Competências"], ...L.map(f => [dataBR(f.data), f.titulo, f.descricao || "", f.link || "", (f.competencias || []).map(nomeItem).join("; ")])].map(r => r.map(q).join(";")).join("\r\n");
        const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })); a.download = "meu-portfolio.csv"; a.click(); });
      if ($("pf-s")) $("pf-s").addEventListener("click", async () => {
        const t = $("pf-t").value.trim(); if (!t) return aviso("a-cd", "Dê um título à entrega.");
        const l = $("pf-l").value.trim(); if (l && !/^https?:\/\//i.test(l)) return aviso("a-cd", "O link deve começar com https://");
        const f = { colaborador_id: colab, ciclo_id: S.ciclo ? S.ciclo.id : null, titulo: t, data: $("pf-d").value || hojeISO(), descricao: $("pf-ds").value.trim() || null, link: l || null,
          competencias: [...$("pf-c").querySelectorAll("input:checked")].map(i => i.value), meta_id: $("pf-m") && $("pf-m").value ? +$("pf-m").value : null };
        try { await B.salvarPort(f); ok("Entrega registrada."); telaPortfolio(el, colab, souDono, x); } catch (e) { falhou(e); } });
      el.querySelectorAll(".dc-port").forEach(card => { const id = +card.dataset.f;
        const n = card.querySelector("[data-nota]"), d = card.querySelector("[data-del]"), f0 = lista.find(z => z.id === id);
        const salvarParecer = async (cons) => { const av = card.querySelector("[data-avpdi]").checked;
          try { await B.salvarPort({ id, considerado: cons, avanco_pdi: av }); ok(cons === false ? "Entrega não considerada. Ela deixa de ficar disponível para a pessoa baixar." : "Parecer registrado."); telaPortfolio(el, colab, souDono, x); } catch (e) { falhou(e); } };
        card.querySelectorAll("[data-cons]").forEach(b => b.addEventListener("click", () => salvarParecer(b.dataset.cons === "1")));
        const cav = card.querySelector("[data-avpdi]"); if (cav) cav.addEventListener("change", () => salvarParecer(f0.considerado == null ? true : f0.considerado));
        if (n) n.addEventListener("click", async () => { try { await B.salvarPort({ id, nota_coord: card.querySelector("textarea").value.trim() || null }); ok("Nota salva."); telaPortfolio(el, colab, souDono, x); } catch (e) { falhou(e); } });
        if (d) d.addEventListener("click", async () => { if (!confirm("Excluir esta entrega?")) return; try { await B.apagarPort(id); telaPortfolio(el, colab, souDono, x); } catch (e) { falhou(e); } }); });
    } catch (e) { falhou(e); }
  }

  // ------------------------------------------------------------------ ENCAMINHAMENTO (coordenação, liderança, gestão)
  async function telaEncaminhamento(el, x) {
    carregando(el);
    try {
      const g = await B.gestao(x.id) || {}, pode = souAvaliadorDe(x);
      el.innerHTML = `<div class="dc-bloco"><h2>Encaminhamento do ciclo</h2><div class="ajuda">Visível só para coordenação, liderança e gestão. A pessoa avaliada não vê.</div>
        <label>Encaminhamento</label><select id="dc-enc"${pode ? "" : " disabled"}><option value="">—</option>${ENCAMINHAMENTOS.map(t => `<option${g.encaminhamento === t ? " selected" : ""}>${t}</option>`).join("")}</select>
        <label>Observação</label><textarea id="dc-encobs"${pode ? "" : " disabled"}>${esc(g.observacao || "")}</textarea>
        ${pode ? `<div class="dc-btns"><button class="sec" id="dc-encsv">Salvar</button></div>` : ""}
        <div class="dc-guia">Situações que podem levar a rescisão são registradas em <b>Condutas de atenção</b>, com fatos, arquivos e vínculo ao PDI.</div></div>`;
      if ($("dc-encsv")) $("dc-encsv").addEventListener("click", async () => { try { await B.salvarGestao(x.id, { encaminhamento: $("dc-enc").value || null, observacao: $("dc-encobs").value.trim() || null }); ok("Encaminhamento salvo."); } catch (e) { falhou(e); } });
    } catch (e) { falhou(e); }
  }

  // ------------------------------------------------------------------ RELATÓRIO INDIVIDUAL (imprimível) e gráficos
  function graficoEvolucao(hist) {
    const pts = (hist || []).filter(h => h.coord || h.auto);
    if (!pts.length) return `<div class="ajuda" style="text-align:center;padding:20px 6px">A evolução aparece aqui a partir do primeiro ciclo concluído.</div>`;
    const W = 300, H = 150, L = 26, R = 10, T = 14, Bt = 30, xs = (i) => L + (pts.length === 1 ? (W - L - R) / 2 : i * (W - L - R) / (pts.length - 1)), ys = (v) => T + (5 - v) * (H - T - Bt) / 4;
    const serie = (f, c, tracejado) => { const p = pts.map((h, i) => [i, f(h)]).filter(a => a[1] != null);
      return `<polyline fill="none" stroke="${c}" stroke-width="2.4"${tracejado ? ' stroke-dasharray="5 4"' : ""} points="${p.map(([i, v]) => `${xs(i)},${ys(v)}`).join(" ")}"/>${p.map(([i, v]) => `<circle cx="${xs(i)}" cy="${ys(v)}" r="3.5" fill="${c}"><title>${n1(v)}</title></circle>`).join("")}`; };
    return `<svg class="dc-svg" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Evolução por ciclo">
      ${[1, 2, 3, 4, 5].map(v => `<line x1="${L}" x2="${W - R}" y1="${ys(v)}" y2="${ys(v)}" stroke="var(--borda)"/><text x="${L - 6}" y="${ys(v) + 4}" font-size="10" text-anchor="end">${v}</text>`).join("")}
      ${pts.map((h, i) => `<text x="${xs(i)}" y="${H - 12}" font-size="9.5" text-anchor="middle">${esc(h.titulo.split(" · ")[0].slice(0, 14))}</text>`).join("")}
      ${serie(h => h.coord ? indices(h.coord).dgpe : null, "#c40f6d")}${serie(h => h.coord ? indices(h.coord).ga : null, "#27B2B5")}${serie(h => h.auto ? indices(h.auto).geral : null, "#9ca3af", true)}
      </svg><div class="ajuda" style="text-align:center;margin:0"><span style="color:#c40f6d">●</span> DGPE (coord.) · <span style="color:#27B2B5">●</span> GA 2.0 (coord.) · <span style="color:#9ca3af">- -</span> autoavaliação</div>`;
  }
  function barras(au, co) {
    const its = itens(), lh = 24, W = 640, L = 250, H = its.length * lh + 30, xs = (v) => L + (v / 5) * (W - L - 20);
    return `<svg class="dc-svg" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Notas por competência">
      ${[1, 2, 3, 4, 5].map(v => `<line x1="${xs(v)}" x2="${xs(v)}" y1="4" y2="${H - 22}" stroke="var(--borda)"/><text x="${xs(v)}" y="${H - 8}" font-size="10" text-anchor="middle">${v}</text>`).join("")}
      ${its.map((i, j) => { const y = 8 + j * lh, a = au && au.notas[i.k], c = co && co.notas[i.k];
        return `<text x="${L - 8}" y="${y + 13}" font-size="11" text-anchor="end">${esc(i.nome.length > 40 ? i.nome.slice(0, 38) + "…" : i.nome)}</text>
          ${c ? `<rect x="${L}" y="${y + 2}" width="${xs(c) - L}" height="9" rx="3" fill="#c40f6d"><title>Coordenação: ${c}</title></rect>` : ""}
          ${a ? `<rect x="${L}" y="${y + 12}" width="${xs(a) - L}" height="6" rx="3" fill="#9ca3af"><title>Autoavaliação: ${a}</title></rect>` : ""}`; }).join("")}</svg>
      <div class="ajuda"><span style="color:#c40f6d">■</span> coordenação · <span style="color:#9ca3af">■</span> autoavaliação</div>`;
  }
  async function telaRelatorio(el, x, colab) {
    carregando(el);
    try {
      const [hist, pf, rs, metas, encs, port] = await Promise.all([B.historico(colab), B.perfil(colab), x ? B.respostas(x.id) : [], x ? B.metas(x.id) : [], x ? B.encontros(x.id) : [], B.portfolio(colab)]);
      const au = rs.find(y => y.tipo === "auto" && y.enviada_em), co = rs.find(y => y.tipo === "coord" && y.enviada_em), ic = indices(co && co.notas), ia = indices(au && au.notas);
      const pul = encs.filter(e => e.pulso), efet = pul.length ? pul.map(e => PULSO.reduce((s, [k]) => s + (+e.pulso[k] || 0), 0) / 4).reduce((a, b) => a + b, 0) / pul.length : null;
      el.innerHTML = `<div class="dc-btns dc-noprint"><button class="sec" id="dc-imprimir">Imprimir ou salvar em PDF</button></div>
        <div id="dc-imp" class="dc-bloco"><h2>Relatório do Ciclo de Desenvolvimento</h2>
        <div class="ajuda">${esc(pf ? pf.nome : "")} · ${esc((pf && (pf.funcao || pf.cargo)) || "")} ${pf && pf.nivel ? "· " + esc(pf.nivel) : ""} · ${pf && pf.nte_id ? "NTE " + String(pf.nte_id).padStart(2, "0") : ""}
          · no projeto desde ${dataBR(pf && pf.entrada_projeto)} · no cargo desde ${dataBR(pf && pf.cargo_desde)}${x ? ` · ${esc(S.ciclo.titulo)} · avaliador(a): ${esc(x.avaliador || "")}` : ""}</div>
        ${x ? `<div class="dc-kpis"><div><b>${n1(ic.dgpe)}</b>Competências DGPE (coord.) · auto ${n1(ia.dgpe)}<br>${esc(faixa(ic.dgpe))}</div><div><b>${n1(ic.ga)}</b>Atuação GA 2.0 (coord.) · auto ${n1(ia.ga)}<br>${esc(faixa(ic.ga))}</div>
          <div><b>${n1(ic.res)}</b>Resultados (coord.) · auto ${n1(ia.res)}</div><div><b>${metas.length ? Math.round(metas.reduce((s, m) => s + (m.progresso || 0), 0) / metas.length) + "%" : "—"}</b>Progresso do PDI</div>
          <div><b>${n1(efet)}</b>Efetividade do PDI (1 a 5)</div><div><b>${encs.filter(e => e.realizado_em).length}/3</b>Encontros</div></div>
          ${co || au ? `<h3>Notas por competência</h3>${barras(au, co)}` : `<div class="resumo">As notas aparecem depois da devolutiva.</div>`}` : ""}
        <h3>Evolução entre ciclos</h3><div style="max-width:520px">${graficoEvolucao(hist)}</div>
        <div class="dc-rolar"><table class="dc-tab"><thead><tr><th>Ciclo</th><th class="num">DGPE</th><th class="num">GA 2.0</th><th class="num">Resultados</th><th class="num">Auto (geral)</th><th class="num">Metas concluídas</th><th class="num">Efetividade</th></tr></thead><tbody>
          ${hist.map(h => { const c = indices(h.coord), a = indices(h.auto); return `<tr><td>${esc(h.titulo)}</td><td class="num">${n1(c.dgpe)}</td><td class="num">${n1(c.ga)}</td><td class="num">${n1(c.res)}</td><td class="num">${n1(a.geral)}</td><td class="num">${h.metas_concluidas}/${h.metas}</td><td class="num">${n1(h.pulso_medio)}</td></tr>`; }).join("") || `<tr><td colspan="7">Sem ciclos ainda.</td></tr>`}</tbody></table></div>
        ${metas.length ? `<h3>PDI</h3>${metas.map((m, i) => `<div class="dc-meta"><b>Meta ${i + 1}: ${esc(m.objetivo)}</b> ${sit(m.status + " · " + (m.progresso || 0) + "%", m.status === "Concluída" ? "ok" : "neutro")}
          <div class="ajuda">${esc(nomeItem(m.competencia || ""))} · prazo ${dataBR(m.prazo)} · ${esc(m.formato || "")}</div>
          <div class="dc-duas"><div class="lado"><h4>Avaliado(a)</h4>${esc(m.acao_avaliado || "")}</div><div class="lado"><h4>Coordenação</h4>${esc(m.apoio_avaliador || "")}</div></div>
          <div class="ajuda">Evidência de sucesso: ${esc(m.evidencia || "—")}</div></div>`).join("")}` : ""}
        ${encs.length ? `<h3>Encontros</h3><ul>${encs.map(e => `<li>Encontro ${e.ordem}: ${e.realizado_em ? `${dataBR(e.realizado_em)} (${MODAL[e.modalidade] || ""})${e.registro ? " — " + esc(e.registro) : ""}` : `previsto para ${dataBR(e.previsto_em)}`}</li>`).join("")}</ul>` : ""}
        ${(() => { const pc = port.filter(f => f.considerado === true || (f.considerado == null && !(S.ciclo && S.ciclo.publico === "geral")));
          return `<h3>Portfólio considerado na avaliação (${pc.length} entrega(s))</h3><ul>${pc.slice(0, 20).map(f => `<li>${dataBR(f.data)} · ${esc(f.titulo)}${f.avanco_pdi ? " · <b>avanço no PDI</b>" : ""}</li>`).join("") || "<li>Nenhuma.</li>"}</ul>`; })()}
        <div class="ajuda">Gerado pelo SGT em ${new Date().toLocaleString("pt-BR")}.</div></div>`;
      $("dc-imprimir").addEventListener("click", () => window.print());
    } catch (e) { falhou(e); }
  }

  // ------------------------------------------------------------------ PAINEL E CALIBRAÇÃO (liderança e gestão)
  async function painel() {
    const el = corpo(); carregando(el);
    if (!S.ciclo) { el.innerHTML = `<div class="resumo">Ainda não há ciclo.</div>`; return; }
    try {
      const [rs, encs] = await Promise.all([B.respostasCiclo(S.ciclo.id), B.encontrosCiclo(S.ciclo.id)]);
      const L = S.lista, cnt = (f) => L.filter(f).length, porFase = Object.fromEntries(FASES.map(([f]) => [f, cnt(x => fase(x) === f)]));
      const coord = (pid) => rs.find(r => r.participante_id === pid && r.tipo === "coord"), auto = (pid) => rs.find(r => r.participante_id === pid && r.tipo === "auto");
      const avals = [...new Set(L.map(x => x.avaliador_id))].map(id => { const ps = L.filter(x => x.avaliador_id === id);
        const ms = ps.map(x => coord(x.id)).filter(Boolean).map(r => indices(r.notas).geral).filter(v => v != null);
        const gs = ps.map(x => [coord(x.id), auto(x.id)]).filter(([c, a]) => c && a).map(([c, a]) => indices(c.notas).geral - indices(a.notas).geral);
        const m = ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : null, dp = ms.length > 1 ? Math.sqrt(ms.reduce((s, v) => s + (v - m) ** 2, 0) / (ms.length - 1)) : null;
        return { nome: (ps[0] && ps[0].avaliador) || "Sem avaliador(a)", n: ps.length, enviadas: ps.filter(x => x.coord_enviada).length, devol: ps.filter(x => x.devolutiva_em).length, pdi: ps.filter(x => x.pdi_publicado_em).length,
          m, dp, gap: gs.length ? gs.reduce((a, b) => a + b, 0) / gs.length : null, sinc: ps.filter(x => x.encontro_sincrono).length }; });
      const todas = rs.filter(r => r.tipo === "coord").map(r => indices(r.notas).geral).filter(v => v != null), mg = todas.length ? todas.reduce((a, b) => a + b, 0) / todas.length : null;
      const bls = blocos().filter(b => b.id !== "res"), ntes = [...new Set(L.map(x => x.nte_id))].filter(Boolean).sort((a, b) => a - b);
      const celula = (v) => { if (v == null) return `<td style="color:var(--texto-2)">—</td>`; const h = v < 2.5 ? "#fde2e1" : v < 3.5 ? "#fff1d6" : v < 4.5 ? "#dff3e6" : "#bfe8cd"; return `<td style="background:${h};color:#1f2937">${n1(v)}</td>`; };
      const pul = encs.filter(e => e.pulso).map(e => PULSO.reduce((s, [k]) => s + (+e.pulso[k] || 0), 0) / 4);
      el.innerHTML = `<div class="dc-kpis"><div><b>${L.length}</b>Participantes</div><div><b>${cnt(x => x.auto_enviada)}</b>Autoavaliações enviadas</div><div><b>${cnt(x => x.coord_enviada)}</b>Avaliações da coordenação</div>
          <div><b>${cnt(x => x.devolutiva_em)}</b>Devolutivas publicadas</div><div><b>${cnt(x => x.pdi_publicado_em)}</b>PDIs publicados</div><div><b>${encs.filter(e => e.realizado_em).length}/${encs.length}</b>Encontros realizados</div>
          <div><b>${n1(mg)}</b>Média geral (coord.)</div><div><b>${n1(pul.length ? pul.reduce((a, b) => a + b, 0) / pul.length : null)}</b>Efetividade do PDI (1 a 5)</div></div>
        <div class="dc-passos">${FASES.map(([f, t]) => `<div><b>${porFase[f]}</b>${t}</div>`).join("")}</div>
        <div class="dc-bloco"><h2>Calibração entre avaliadores</h2><div class="ajuda">Mais da metade da variação das notas costuma vir do estilo de quem avalia, e não de quem é avaliado. Compare médias e diferenças antes de fechar as devolutivas. Uma média muito acima ou abaixo das demais, ou uma dispersão muito baixa, pede uma conversa de calibração.</div>
          <div class="dc-rolar"><table class="dc-tab"><thead><tr><th>Avaliador(a)</th><th class="num">Pessoas</th><th class="num">Avaliações</th><th class="num">Devolutivas</th><th class="num">PDIs</th><th class="num">Média dada</th><th class="num">Dispersão</th><th class="num">Coord. − auto</th><th class="num">Com encontro síncrono</th></tr></thead><tbody>
          ${avals.map(a => `<tr><td><b>${esc(a.nome)}</b></td><td class="num">${a.n}</td><td class="num">${a.enviadas}</td><td class="num">${a.devol}</td><td class="num">${a.pdi}</td><td class="num">${n1(a.m)}</td><td class="num">${n1(a.dp)}</td><td class="num">${a.gap == null ? "—" : (a.gap > 0 ? "+" : "") + n1(a.gap)}</td><td class="num">${a.sinc}</td></tr>`).join("")}</tbody></table></div></div>
        <div class="dc-bloco"><h2>Mapa por NTE e valor (média da coordenação)</h2><div class="dc-rolar"><table class="dc-tab dc-calor"><thead><tr><th>NTE</th>${bls.map(b => `<th>${esc(b.titulo)}</th>`).join("")}</tr></thead><tbody>
          ${ntes.map(n => `<tr><td style="text-align:left">NTE ${String(n).padStart(2, "0")}</td>${bls.map(b => { const v = L.filter(x => x.nte_id === n).map(x => coord(x.id)).filter(Boolean).map(r => media(r.notas, b.itens.map(i => i.k))).filter(v => v != null);
            return celula(v.length ? v.reduce((a, c) => a + c, 0) / v.length : null); }).join("")}</tr>`).join("") || `<tr><td colspan="${bls.length + 1}">Sem avaliações enviadas.</td></tr>`}</tbody></table></div></div>
        <div class="dc-bloco"><h2>Pessoas</h2><div class="dc-barra"><input type="search" id="dc-busca" placeholder="Buscar"><select id="dc-ff"><option value="">Todas as etapas</option>${FASES.map(([f, t]) => `<option value="${f}">${t}</option>`).join("")}</select></div>
          <div class="dc-rolar"><table class="dc-tab"><thead><tr><th>Pessoa</th><th>NTE</th><th>Avaliador(a)</th><th>Etapa</th><th class="num">DGPE</th><th class="num">GA</th><th class="num">Auto</th></tr></thead><tbody id="dc-pl"></tbody></table></div></div>`;
      const desenhar = () => { const q = $("dc-busca").value.toLowerCase(), ff = $("dc-ff").value;
        $("dc-pl").innerHTML = L.filter(x => (!q || x.nome.toLowerCase().includes(q)) && (!ff || fase(x) === ff)).map(x => { const c = coord(x.id), a = auto(x.id), ic = indices(c && c.notas), ia = indices(a && a.notas);
          return `<tr data-c="${x.colaborador_id}"><td><b>${esc(x.nome)}</b><br><small>${esc(x.cargo || "")}</small></td><td>${esc(x.nte || "")}</td><td>${esc(x.avaliador || "")}</td><td>${chipFase(x)}</td>
            <td class="num">${n1(ic.dgpe)}</td><td class="num">${n1(ic.ga)}</td><td class="num">${n1(ia.geral)}</td></tr>`; }).join("") || `<tr><td colspan="7">Ninguém encontrado.</td></tr>`;
        $("dc-pl").querySelectorAll("tr[data-c]").forEach(tr => tr.addEventListener("click", () => { S.voltar = () => trocar("painel"); S.aba = "carteira"; S.pessoa = tr.dataset.c;
          $("cd-abas").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.a === "carteira")); ficha(S.pessoa); })); };
      $("dc-busca").addEventListener("input", desenhar); $("dc-ff").addEventListener("input", desenhar); desenhar();
    } catch (e) { falhou(e); }
  }

  document.head.insertAdjacentHTML("beforeend", `<style>
    .dc-ntes{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:10px}
    .dc-nte{width:auto;margin:0;text-align:left;padding:10px 11px;border-radius:12px;border:1px solid var(--borda);background:var(--superficie,#fff);color:var(--texto);display:flex;flex-direction:column;gap:2px;cursor:pointer}
    .dc-nte b{font-size:14px;color:var(--cor)} .dc-nte span{font-size:12.5px} .dc-nte small{font-size:11.5px;color:var(--texto-2)}
    .dc-nte.meu{border-color:var(--cor);box-shadow:0 0 0 1px var(--cor) inset} .dc-nte:hover:not(.off){background:var(--cor-suave)}
    .dc-nte.off{opacity:.45;cursor:not-allowed;filter:grayscale(1)} .dc-nte.off b{color:var(--texto-2)}
    .dc-ini.off{opacity:.5;cursor:not-allowed} .dc-ini small{display:block}
    .dc-traj{margin:10px 0} .dc-traj summary{cursor:pointer;font-weight:600;color:var(--cor);font-size:14px}
    .dc-tab tr[data-c],.dc-tab tr[data-o]{cursor:pointer} .dc-tab tr[data-c]:hover,.dc-tab tr[data-o]:hover{background:var(--cor-suave)}
    .dc-ficha{display:grid;grid-template-columns:1.3fr 1fr;gap:16px;align-items:start}
    .dc-dados{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:6px}
    .dc-dados div{background:var(--fundo);border-radius:10px;padding:8px 10px;display:flex;flex-direction:column}
    .dc-dados small{font-size:11.5px;color:var(--texto-2)} .dc-dados b{font-size:14.5px}
    @media (max-width:760px){.dc-ficha{grid-template-columns:1fr}}
  </style>`);

  window.Ciclos = { abrir };
  window.CicloTelas = { abrir, trocar, ficha, telaRelatorio, carregando, sit, tempo, graficoEvolucao, recarregarLista };
})();
