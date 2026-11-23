// SGT · Ciclos de Desenvolvimento · v2 (trimestral, articuladores plenos e sêniores)
// Instrumento: Matriz de Competências DGPE (Superintendência de Gestão de Pessoas) + bloco "Atuação do Articulador · GA 2.0".
// Fluxo: avaliação às cegas (autoavaliação e coordenação em paralelo, até o 5º dia útil) → devolutiva escrita com
// conversa por competência (até o 10º) → conversa individual e PDI (até o 15º) → 3 encontros de acompanhamento.
// Modo prévia (Programador/a): navega por todas as telas com dados de exemplo, sem gravar nada.
// Usa as funções globais do index.html: api, aviso, mostrar, esc, eu, pode, temModulo, ehSuper, fmtData, traduzErro.
(() => {
  const $ = (id) => document.getElementById(id);
  const INSTR = window.CicloInstrumento;
  const ESC = ["", "Muito abaixo do esperado", "Abaixo do esperado", "Dentro do esperado", "Acima do esperado", "Muito acima do esperado"];
  const ESC_C = ["", "Muito abaixo", "Abaixo", "Dentro", "Acima", "Muito acima"];
  const FORMATOS = ["Prática no território", "Troca com pares e coordenação", "Formação e estudo"];
  const MODAL = { presencial: "Presencial", video: "Vídeo", telefone: "Telefone", escrito: "Registro escrito" };
  const PULSO = [["utilidade", "O PDI está me ajudando a evoluir"], ["apoio", "Recebi o apoio combinado da coordenação"],
    ["aplicacao", "Consegui aplicar no território o que combinamos"], ["progresso", "Percebo progresso desde o último encontro"]];
  const ENCAMINHAMENTOS = ["Reconhecimento", "Manutenção com acompanhamento", "Ampliação de responsabilidades", "Preparação para promoção",
    "PDI intensivo (acompanhamento próximo)", "Plano de formação específico", "Avaliar mudança de função", "Encaminhar à gestão do projeto"];
  const STATUS_META = ["Não iniciada", "Em andamento", "Concluída", "Replanejada"];
  const FASES = [["avaliacao", "Avaliação"], ["devolutiva", "Devolutiva"], ["pdi", "Conversa e PDI"], ["acompanhamento", "Acompanhamento"], ["concluido", "Concluído"]];
  const SINTESE = {
    auto: [["orgulho", "A entrega de que mais me orgulho neste período (com um fato ou evidência)", true],
      ["desenvolver", "O que quero desenvolver no próximo trimestre", true],
      ["apoio", "Que apoio preciso da coordenação", false],
      ["res_texto", "Resultados: como minhas entregas contribuíram para os resultados do projeto no território", false]],
    coord: [["manter", "Manter: um ponto forte observado, com fato (situação → comportamento → impacto)", true],
      ["desenvolver", "Desenvolver: a prioridade para o próximo trimestre, com fato", true],
      ["contexto", "Contexto: o que fugiu ao controle da pessoa e pesou no período (condições de oferta, território, demandas)", false],
      ["res_texto", "Resultados: percepção geral da contribuição das entregas", false]] };

  // ------------------------------------------------------------------ estado
  const S = { demo: false, comoDemo: "coord", eu: null, ciclos: [], ciclo: null, lista: [], aba: null, part: null, sub: null, cache: {} };
  const instr = () => (S.ciclo && S.ciclo.instrumento && S.ciclo.instrumento.blocos) ? S.ciclo.instrumento : INSTR;
  const blocos = () => instr().blocos.filter(b => !b.opcional || (S.ciclo && S.ciclo.lideranca));
  const itens = () => blocos().flatMap(b => b.itens.map(i => ({ ...i, bloco: b.id, btitulo: b.titulo, fonte: b.fonte })));
  const nomeItem = (k) => (itens().find(i => i.k === k) || { nome: k === "geral" ? "Comentário geral" : k }).nome;
  const media = (notas, keys) => { const v = keys.map(k => +((notas || {})[k])).filter(x => x >= 1 && x <= 5); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const chavesDGPE = () => blocos().filter(b => b.fonte === "dgpe" && b.id !== "res").flatMap(b => b.itens.map(i => i.k));
  const chavesGA = () => (blocos().find(b => b.id === "ga") || { itens: [] }).itens.map(i => i.k);
  const indices = (n) => n ? { dgpe: media(n, chavesDGPE()), ga: media(n, chavesGA()), res: n.res ? +n.res : null,
    geral: media(n, [...chavesDGPE(), ...chavesGA()]) } : { dgpe: null, ga: null, res: null, geral: null };
  const faixa = (m) => m == null ? "" : ESC[m < 1.5 ? 1 : m < 2.5 ? 2 : m < 3.5 ? 3 : m < 4.5 ? 4 : 5];
  const n1 = (v) => v == null || isNaN(v) ? "—" : (Math.round(v * 10) / 10).toFixed(1).replace(".", ",");
  const cor = (m) => m == null ? "neutro" : m < 2.5 ? "erro" : m < 3.5 ? "info" : "ok";
  const hojeISO = () => new Date().toISOString().slice(0, 10);
  const dataBR = (d) => d ? new Date(String(d).slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR") : "—";
  const dataHora = (d) => d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "";
  const fase = (x) => !x ? "avaliacao" : !x.devolutiva_em ? (x.coord_enviada && (x.auto_enviada || (S.ciclo && S.ciclo.prazo_avaliacao < hojeISO())) ? "devolutiva" : "avaliacao")
    : !x.pdi_publicado_em ? "pdi" : (x.encontros_feitos || 0) < 3 ? "acompanhamento" : "concluido";
  const nomeFase = (f) => (FASES.find(x => x[0] === f) || ["", ""])[1];
  const souGestao = () => S.demo ? S.comoDemo === "gestao" : (pode("admin", "rh") || temModulo("ciclos"));
  const souLider = () => S.demo ? ["gestao", "lider"].includes(S.comoDemo) : (souGestao() || temModulo("ciclos_lideranca"));
  const meuId = () => S.demo ? (S.comoDemo.startsWith("av:") ? S.comoDemo.slice(3) : DEMO.eu[S.comoDemo]) : eu.id;
  const souAvaliadorDe = (x) => !!x && x.avaliador_id === meuId();   // gestão e liderança veem tudo, mas só quem avalia edita

  function falhou(e) { if (e && e.message === "sessao") return; aviso("a-cd", S.demo ? String(e.message || e) : traduzErro(e)); }
  function ok(msg) { aviso("a-cd", S.demo ? "Prévia: " + msg.replace(/\.$/, "") + " (nada foi gravado)." : msg, "ok"); }

  // ------------------------------------------------------------------ estilos
  document.head.insertAdjacentHTML("beforeend", `<style>
    #v-cd .dc-barra{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0}
    #v-cd .dc-barra input,#v-cd .dc-barra select{width:auto;margin:0;padding:8px 10px;font-size:14px}
    #v-cd textarea{width:100%;min-height:60px;padding:9px 11px;font-size:14.5px;border:1px solid var(--borda);border-radius:var(--raio);font-family:inherit;background:var(--superficie,#fff);color:var(--texto)}
    .dc-previa{background:#fff4e5;border:1px dashed var(--laranja);color:#7a3e00;border-radius:10px;padding:8px 12px;margin:8px 0;font-size:13.5px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
    .dc-previa select{width:auto;margin:0;padding:6px 8px;font-size:13px}
    [data-tema="escuro"] .dc-previa{background:#3a2a12;color:#ffd9a8}
    .dc-bloco{border:1px solid var(--borda);border-radius:var(--raio);padding:6px 16px 16px;margin-top:14px;background:var(--superficie,#fff)}
    .dc-bloco h2{font-size:16px;margin:12px 0 4px} .dc-bloco h3{font-size:14px;margin:14px 0 4px;color:var(--cor)}
    .dc-guia{font-size:13px;color:var(--texto-2);background:var(--fundo);border-radius:10px;padding:9px 12px;margin:8px 0;line-height:1.45}
    .dc-passos{display:flex;gap:4px;margin:10px 0 4px;flex-wrap:wrap}
    .dc-passos div{flex:1;min-width:110px;border-radius:10px;padding:7px 9px;font-size:12px;background:var(--fundo);border:1px solid var(--borda);line-height:1.3}
    .dc-passos div b{display:block;font-size:12.5px} .dc-passos .feito{background:var(--ok-fundo);border-color:#a6e3bf}
    .dc-passos .agora{background:var(--cor-suave);border-color:var(--cor)} .dc-passos .atraso{background:var(--erro-fundo);border-color:#f4b4ae}
    .dc-sit{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap}
    .dc-sit.ok{background:var(--ok-fundo);color:var(--ok)} .dc-sit.erro{background:var(--erro-fundo);color:var(--erro)}
    .dc-sit.info{background:#eef4ff;color:#1d4ed8} .dc-sit.neutro{background:var(--fundo);color:var(--texto-2)} .dc-sit.alerta{background:var(--alerta-fundo);color:var(--alerta)}
    .dc-tab{width:100%;border-collapse:collapse;font-size:13.5px} .dc-tab th,.dc-tab td{padding:8px 7px;border-bottom:1px solid var(--borda);text-align:left;vertical-align:top}
    .dc-tab th{font-size:12px;color:var(--texto-2);font-weight:600} .dc-tab tr[data-p]{cursor:pointer} .dc-tab tr[data-p]:hover{background:var(--cor-suave)}
    .dc-tab td.num,.dc-tab th.num{text-align:center} .dc-rolar{overflow-x:auto}
    .dc-item{padding:12px 0;border-top:1px solid var(--borda)}
    .dc-item .nome{font-weight:600;font-size:14.5px} .dc-item .desc{font-size:12.5px;color:var(--texto-2)}
    .dc-linha{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}
    .dc-esc{display:flex;gap:4px} .dc-esc label{margin:0;cursor:pointer;position:relative}
    .dc-esc input{position:absolute;opacity:0;pointer-events:none}
    .dc-esc span{display:grid;place-items:center;width:38px;height:38px;border-radius:9px;border:1px solid var(--borda);font-weight:700;font-size:15px;background:var(--superficie,#fff)}
    .dc-esc input:checked+span{background:var(--cor);color:#fff;border-color:var(--cor)} .dc-esc input:focus-visible+span{outline:2px solid var(--cor)}
    .dc-esc input:disabled+span{opacity:.75;cursor:default}
    .dc-anc{font-size:13px;margin-top:6px;padding:8px 10px;border-left:3px solid var(--cor);background:var(--fundo);border-radius:0 8px 8px 0;line-height:1.45}
    .dc-anc:empty{display:none}
    details.dc-niveis{font-size:12.5px;margin-top:4px} details.dc-niveis summary{cursor:pointer;color:var(--cor);font-weight:600}
    details.dc-niveis ol{margin:6px 0 0;padding-left:18px} details.dc-niveis li{margin:3px 0}
    .dc-fixo{position:sticky;top:0;z-index:3;background:var(--superficie,#fff);border-bottom:1px solid var(--borda);padding:8px 0;display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:13.5px}
    .dc-prog{flex:1;min-width:120px;height:8px;background:var(--fundo);border-radius:99px;overflow:hidden} .dc-prog i{display:block;height:100%;background:var(--cor)}
    .dc-tag{display:inline-block;font-size:11px;font-weight:700;padding:1px 7px;border-radius:99px;background:var(--fundo);color:var(--texto-2);margin-left:6px;vertical-align:middle}
    .dc-tag.ga{background:#e6f7f7;color:#137a7c} .dc-tag.dgpe{background:var(--cor-suave);color:var(--cor)}
    .dc-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin:10px 0}
    .dc-kpis div{border:1px solid var(--borda);border-radius:10px;padding:9px 11px;background:var(--superficie,#fff);font-size:12.5px;color:var(--texto-2)}
    .dc-kpis b{display:block;font-size:21px;color:var(--texto)}
    .dc-cmp td .gap{font-weight:700} .dc-cmp td .gap.alto{color:var(--erro)}
    .dc-fio{border-left:3px solid var(--borda);margin:6px 0 4px 6px;padding:2px 0 2px 10px}
    .dc-msg{font-size:13.5px;margin:6px 0;line-height:1.45} .dc-msg b{font-size:12.5px} .dc-msg small{color:var(--texto-2);font-size:11.5px;margin-left:6px}
    .dc-msg.dele{color:var(--texto)} .dc-msg.meu b{color:var(--cor)}
    .dc-env{display:flex;gap:6px;align-items:flex-end} .dc-env textarea{min-height:40px!important}
    .dc-env button{width:auto;margin:0;padding:9px 12px}
    .dc-duas{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .dc-meta{border:1px solid var(--borda);border-radius:12px;padding:10px 12px;margin-top:10px;background:var(--superficie,#fff)}
    .dc-meta .lado{border-radius:10px;padding:8px 10px;background:var(--fundo)} .dc-meta .lado h4{margin:0 0 4px;font-size:12.5px}
    .dc-meta label{font-size:12px;margin:6px 0 2px} .dc-meta input:not([type=range]):not([type=checkbox]),.dc-meta select{width:100%;padding:8px 10px;font-size:14px;margin:0} .dc-meta input[type=range]{width:100%}
    .dc-enc{border:1px solid var(--borda);border-radius:12px;padding:10px 12px;margin-top:10px}
    .dc-port{border:1px solid var(--borda);border-radius:12px;padding:10px 12px;margin-top:8px;font-size:13.5px}
    .dc-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px} .dc-chips label{margin:0;font-size:12px;cursor:pointer}
    .dc-chips input{position:absolute;opacity:0} .dc-chips span{display:inline-block;padding:3px 9px;border-radius:99px;border:1px solid var(--borda)}
    .dc-chips input:checked+span{background:var(--cor);color:#fff;border-color:var(--cor)}
    .dc-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px} .dc-btns button{width:auto;margin:0}
    .dc-mini{padding:5px 10px!important;font-size:12.5px!important;width:auto!important;margin:0!important}
    .dc-svg text{font-family:inherit;fill:var(--texto)} .dc-calor td{text-align:center;font-weight:600;border-radius:6px}
    @media (max-width:760px){.dc-linha{grid-template-columns:1fr}.dc-duas{grid-template-columns:1fr}.dc-esc span{width:44px;height:44px}}
    @media print{body *{visibility:hidden} #dc-imp,#dc-imp *{visibility:visible} #dc-imp{position:absolute;left:0;top:0;width:100%} .dc-noprint{display:none!important}}
  </style>`);

  $("cartao").querySelector(".rodape").insertAdjacentHTML("beforebegin", `
  <section id="v-cd" class="oculto">
    <div class="topo"><div><h1>Ciclos de Desenvolvimento</h1><div class="ajuda" style="margin:0" id="cd-sub">Avaliação, devolutiva, PDI e acompanhamento a cada trimestre</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><select id="cd-ciclo" style="width:auto;margin:0;padding:9px 10px;font-size:14px"></select>
      <button class="sec oculto" id="cd-previa" style="width:auto">👁 Prévia</button><button class="sec" id="cd-voltar" style="width:auto">← Voltar</button></div></div>
    <div id="cd-pbar"></div>
    <div class="abas" id="cd-abas"></div>
    <div class="aviso" id="a-cd"></div>
    <div id="cd-corpo"></div>
  </section>`);

  // ------------------------------------------------------------------ dados (banco real)
  const J = (o) => JSON.stringify(o);
  const REAL = {
    ciclos: () => api("/rest/v1/dc_ciclo?select=*&order=abertura.desc"),
    lista: (c) => api("/rest/v1/rpc/dc_lista", { method: "POST", body: J({ p_ciclo: c }) }),
    meu: (c) => api(`/rest/v1/dc_participante?select=*&ciclo_id=eq.${c}&colaborador_id=eq.${eu.id}`).then(r => r[0] || null),
    part: (id) => api(`/rest/v1/dc_participante?select=*&id=eq.${id}`).then(r => r[0] || null),
    respostas: (p) => api(`/rest/v1/dc_resposta?select=*&participante_id=eq.${p}`),
    salvarResposta: (p, tipo, d) => api("/rest/v1/dc_resposta?on_conflict=participante_id,tipo", { method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: J({ participante_id: p, tipo, autor_id: eu.id, ...d }) }),
    comentarios: (p) => api(`/rest/v1/dc_comentario?select=*&participante_id=eq.${p}&order=criado_em`),
    comentar: (p, item, texto) => api("/rest/v1/dc_comentario", { method: "POST", headers: { Prefer: "return=minimal" }, body: J({ participante_id: p, item, texto, autor_id: eu.id }) }),
    publicarDevolutiva: (p) => api("/rest/v1/rpc/dc_publicar_devolutiva", { method: "POST", body: J({ p }) }),
    atualizarPart: (p, d) => api(`/rest/v1/dc_participante?id=eq.${p}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: J(d) }),
    metas: (p) => api(`/rest/v1/dc_meta?select=*&participante_id=eq.${p}&order=ordem,id`),
    salvarMeta: (m) => m.id ? api(`/rest/v1/dc_meta?id=eq.${m.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: J(semId(m)) })
      : api("/rest/v1/dc_meta", { method: "POST", headers: { Prefer: "return=minimal" }, body: J({ ...m, criado_por: eu.id }) }),
    apagarMeta: (id) => api(`/rest/v1/dc_meta?id=eq.${id}`, { method: "DELETE" }),
    publicarPdi: (p) => api("/rest/v1/rpc/dc_publicar_pdi", { method: "POST", body: J({ p }) }),
    ciencia: (p, concorda, obs) => api("/rest/v1/rpc/dc_ciencia_pdi", { method: "POST", body: J({ p, p_concorda: concorda, p_obs: obs }) }),
    encontros: (p) => api(`/rest/v1/dc_encontro?select=*&participante_id=eq.${p}&order=ordem`),
    salvarEncontro: (id, d) => api(`/rest/v1/dc_encontro?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: J(d) }),
    portfolio: (c) => api(`/rest/v1/dc_portfolio?select=*&colaborador_id=eq.${c}&order=data.desc,id.desc`),
    salvarPort: (f) => f.id ? api(`/rest/v1/dc_portfolio?id=eq.${f.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: J(semId(f)) })
      : api("/rest/v1/dc_portfolio", { method: "POST", headers: { Prefer: "return=minimal" }, body: J(f) }),
    apagarPort: (id) => api(`/rest/v1/dc_portfolio?id=eq.${id}`, { method: "DELETE" }),
    gestao: (p) => api(`/rest/v1/dc_gestao?select=*&participante_id=eq.${p}`).then(r => r[0] || null),
    salvarGestao: (p, d) => api("/rest/v1/dc_gestao?on_conflict=participante_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: J({ participante_id: p, ...d, registrado_por: eu.id, atualizado_em: new Date().toISOString() }) }),
    historico: (c) => api("/rest/v1/rpc/dc_historico", { method: "POST", body: J({ p_colab: c }) }),
    respostasCiclo: (c) => api(`/rest/v1/dc_resposta?select=*,dc_participante!inner(ciclo_id)&dc_participante.ciclo_id=eq.${c}&enviada_em=not.is.null`),
    encontrosCiclo: (c) => api(`/rest/v1/dc_encontro?select=*,dc_participante!inner(ciclo_id)&dc_participante.ciclo_id=eq.${c}`),
    metasCiclo: (c) => api(`/rest/v1/dc_meta?select=*,dc_participante!inner(ciclo_id)&dc_participante.ciclo_id=eq.${c}`),
    carteira: () => api("/rest/v1/dc_carteira?select=*&order=nte_id,inicio.desc,id.desc"),
    ntes: () => api("/rest/v1/nte?select=id,nome&order=id"),
    pessoas: () => api("/rest/v1/rpc/dc_pessoas", { method: "POST", body: "{}" }),
    novaCarteira: (rows) => api("/rest/v1/dc_carteira", { method: "POST", headers: { Prefer: "return=minimal" }, body: J(rows.map(r => ({ ...r, registrado_por: eu.id }))) }),
    cargos: () => api("/rest/v1/cargo?select=id,nome&order=nome"),
    previa: (cargos) => api("/rest/v1/rpc/dc_previa", { method: "POST", body: J({ p_cargos: cargos }) }),
    abrirCiclo: (d) => api("/rest/v1/rpc/dc_abrir_ciclo", { method: "POST", body: J(d) }),
    statusCiclo: (id, status) => api(`/rest/v1/dc_ciclo?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: J({ status }) }),
    incluir: (c, colab) => api("/rest/v1/rpc/dc_incluir", { method: "POST", body: J({ p_ciclo: c, p_colab: colab }) }),
  };
  const semId = (o) => { const c = { ...o }; delete c.id; return c; };

  // ------------------------------------------------------------------ dados de exemplo (modo prévia)
  const DEMO = (() => {
    const add = (d, n) => { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
    const h = hojeISO();
    const pessoas = { gestao: "d-gestao", lider: "d-paulo", coord: "d-camila", avaliado: "d-ana" };
    const B = { seq: 1000 };
    const nota = (base, desvio) => { const o = {}; INSTR.blocos.filter(b => !b.opcional).forEach(b => b.itens.forEach((i, j) => o[i.k] = Math.max(1, Math.min(5, base + ((j + desvio) % 3) - 1)))); return o; };
    B.ciclos = [
      { id: 2, ano: 2026, ordem: 1, titulo: "1º ciclo · nov/2026 a fev/2027", abertura: add(h, -9), prazo_avaliacao: add(h, -2), prazo_devolutiva: add(h, 5), prazo_pdi: add(h, 12), fim: add(h, 80), cargos: [1, 2], lideranca: false, status: "aberto", instrumento: INSTR },
      { id: 1, ano: 2026, ordem: 0, titulo: "Ciclo piloto · ago a out/2026", abertura: add(h, -110), prazo_avaliacao: add(h, -103), prazo_devolutiva: add(h, -96), prazo_pdi: add(h, -89), fim: add(h, -10), cargos: [1, 2], lideranca: false, status: "encerrado", instrumento: INSTR }];
    const P = (id, ciclo, colab, nome, cargo, nte, aval, extra = {}) => ({ id, ciclo_id: ciclo, colaborador_id: colab, nome, cargo, nte_id: nte, avaliador_id: aval,
      devolutiva_em: null, conversa_em: null, conversa_modalidade: null, pdi_forca: null, pdi_publicado_em: null, pdi_ciencia_em: null, pdi_concorda: null, pdi_obs: null, ...extra });
    B.part = [
      P(11, 2, "d-ana", "Ana Beatriz Lima (exemplo)", "Articulador(a) Pleno", 10, "d-camila"),
      P(12, 2, "d-bruno", "Bruno Santos (exemplo)", "Articulador(a) Sênior", 13, "d-camila"),
      P(13, 2, "d-carla", "Carla Menezes (exemplo)", "Articulador(a) Pleno", 14, "d-camila", { devolutiva_em: add(h, -1) + "T10:00:00", conversa_em: h, conversa_modalidade: "video", pdi_forca: "Leitura de dados por turma e habilidade" }),
      P(14, 2, "d-diego", "Diego Rocha (exemplo)", "Articulador(a) Sênior", 15, "d-camila", { devolutiva_em: add(h, -6) + "T10:00:00", conversa_em: add(h, -4), conversa_modalidade: "presencial", pdi_forca: "Relação de confiança com as gestões escolares", pdi_publicado_em: add(h, -4) + "T15:00:00", pdi_ciencia_em: add(h, -3) + "T09:00:00", pdi_concorda: true }),
      P(15, 2, "d-eva", "Eva Nascimento (exemplo)", "Articulador(a) Pleno", 5, "d-paulo"),
      P(16, 2, "d-fabio", "Fábio Costa (exemplo)", "Articulador(a) Pleno", 1, "d-danilo", { devolutiva_em: add(h, -5) + "T10:00:00" }),
      P(4, 1, "d-diego", "Diego Rocha (exemplo)", "Articulador(a) Sênior", 15, "d-camila", { devolutiva_em: add(h, -100), conversa_em: add(h, -95), conversa_modalidade: "presencial", pdi_publicado_em: add(h, -95), pdi_ciencia_em: add(h, -94), pdi_concorda: true }),
      P(1, 1, "d-ana", "Ana Beatriz Lima (exemplo)", "Articulador(a) Pleno", 10, "d-camila", { devolutiva_em: add(h, -100), conversa_em: add(h, -95), conversa_modalidade: "video", pdi_publicado_em: add(h, -95), pdi_ciencia_em: add(h, -94), pdi_concorda: true })];
    const R = (id, p, tipo, notas, enviada, sintese = {}) => ({ id, participante_id: p, tipo, autor_id: null, notas, justificativas: {}, sintese, enviada_em: enviada ? add(h, -3) + "T10:00:00" : null });
    const sAuto = { orgulho: "Na escola Y, apoiei a coordenação a agrupar os estudantes por nível; em 3 semanas, 2 turmas passaram a usar os cadernos no contraturno.", desenvolver: "Registrar as visitas no SGA no mesmo dia.", apoio: "Acompanhamento de uma visita minha para feedback." };
    const sCoord = { manter: "Na visita à escola X, levou a análise de frequência pronta e a gestão definiu 2 ações na mesma reunião.", desenvolver: "Pactuar no máximo 2 compromissos por devolutiva e retomá-los na visita seguinte.", contexto: "Duas escolas do território ficaram sem coordenador pedagógico por 6 semanas." };
    B.resp = [
      R(1, 11, "auto", { ...nota(3, 0), v1c1: 4 }, false, {}),
      R(2, 12, "auto", nota(4, 1), true, sAuto), R(3, 12, "coord", nota(3, 2), true, sCoord),
      R(4, 13, "auto", nota(4, 0), true, sAuto), R(5, 13, "coord", { ...nota(3, 1), ga3: 2, ga4: 2 }, true, sCoord),
      R(6, 14, "auto", nota(4, 2), true, sAuto), R(7, 14, "coord", nota(4, 0), true, sCoord),
      R(8, 15, "auto", nota(3, 1), true, sAuto),
      R(9, 16, "auto", nota(3, 2), true, sAuto), R(10, 16, "coord", nota(3, 0), true, sCoord),
      R(11, 4, "auto", nota(3, 1), true, sAuto), R(12, 4, "coord", nota(3, 2), true, sCoord),
      R(13, 1, "auto", nota(3, 0), true, sAuto), R(14, 1, "coord", nota(2, 1), true, sCoord)];
    B.resp.find(r => r.id === 5).justificativas = {};
    B.com = [
      { id: 1, participante_id: 13, item: "geral", autor_id: "d-camila", texto: "Carla, foi um trimestre de muita entrega. Vamos olhar juntas os itens em que nossas visões ficaram distantes.", criado_em: add(h, -1) + "T10:05:00" },
      { id: 2, participante_id: 13, item: "ga3", autor_id: "d-camila", texto: "Nas duas visitas que acompanhei, a devolutiva terminou com 5 ou 6 encaminhamentos. Isso dificulta a retomada.", criado_em: add(h, -1) + "T10:07:00" },
      { id: 3, participante_id: 13, item: "ga3", autor_id: "d-carla", texto: "Entendo. Eu achava que listar tudo ajudava a escola. Posso testar priorizar 2 na próxima.", criado_em: add(h, -1) + "T16:20:00" },
      { id: 4, participante_id: 14, item: "geral", autor_id: "d-camila", texto: "Diego, ótimo trimestre. Seu PDI foca em ampliar a referência técnica para os colegas.", criado_em: add(h, -6) + "T11:00:00" }];
    B.metas = [
      { id: 1, participante_id: 13, competencia: "ga3", objetivo: "Fazer devolutivas com no máximo 2 compromissos e retomá-los na visita seguinte", acao_avaliado: "Usar o roteiro de devolutiva do Guia de Visita em todas as escolas prioritárias; registrar os 2 compromissos no SGA no mesmo dia.", apoio_avaliador: "Acompanhar 1 visita por mês e dar feedback em até 48 h; compartilhar 2 exemplos de boas devolutivas.", formato: FORMATOS[0], evidencia: "80% das visitas com até 2 compromissos registrados e retomados", prazo: add(h, 75), progresso: 0, status: "Não iniciada", ordem: 1 },
      { id: 2, participante_id: 14, competencia: "v1c2", objetivo: "Ser referência técnica em leitura de dados para os colegas do território", acao_avaliado: "Conduzir 2 rodas de estudo com os colegas sobre a rubrica de maturidade.", apoio_avaliador: "Garantir espaço na pauta da reunião de equipe e material de apoio.", formato: FORMATOS[1], evidencia: "2 rodas realizadas e avaliação positiva dos colegas", prazo: add(h, 70), progresso: 50, status: "Em andamento", ordem: 1 },
      { id: 3, participante_id: 14, competencia: "ga4", objetivo: "Registrar 100% das visitas no SGA em até 48 h", acao_avaliado: "Reservar 30 min ao fim de cada dia de visita para o registro.", apoio_avaliador: "Conferir os registros quinzenalmente no painel e sinalizar pendências.", formato: FORMATOS[0], evidencia: "Relatório do SGA sem pendências", prazo: add(h, 60), progresso: 75, status: "Em andamento", ordem: 2 },
      { id: 4, participante_id: 4, competencia: "ga2", objetivo: "Aplicar a rubrica de maturidade mensalmente", acao_avaliado: "Aplicar a rubrica nas escolas.", apoio_avaliador: "Formação sobre a rubrica.", formato: FORMATOS[2], evidencia: "Rubrica aplicada", prazo: add(h, -12), progresso: 100, status: "Concluída", ordem: 1 }];
    B.enc = [
      { id: 1, participante_id: 14, ordem: 1, previsto_em: add(h, -1), realizado_em: add(h, -1), modalidade: "presencial", registro: "Revisamos as metas. Primeira roda de estudo marcada.", proximos: "Enviar pauta da roda até sexta.", progresso: { 2: 50, 3: 75 }, pulso: { utilidade: 4, apoio: 5, aplicacao: 4, progresso: 4 }, pulso_texto: "O acompanhamento da visita ajudou muito.", pulso_em: add(h, 0) + "T09:00:00" },
      { id: 2, participante_id: 14, ordem: 2, previsto_em: add(h, 30), realizado_em: null, modalidade: null, registro: null, proximos: null, progresso: {}, pulso: null },
      { id: 3, participante_id: 14, ordem: 3, previsto_em: add(h, 62), realizado_em: null, modalidade: null, registro: null, proximos: null, progresso: {}, pulso: null },
      ...[1, 2, 3].map(o => ({ id: 10 + o, participante_id: 4, ordem: o, previsto_em: add(h, -80 + o * 20), realizado_em: add(h, -80 + o * 20), modalidade: o === 2 ? "presencial" : "telefone", registro: "Encontro registrado.", proximos: "", progresso: { 4: o * 33 }, pulso: { utilidade: 3 + (o > 1), apoio: 4, aplicacao: 3, progresso: 3 + (o > 2) }, pulso_em: add(h, -79 + o * 20) })),
      ...[1, 2, 3].map(o => ({ id: 20 + o, participante_id: 1, ordem: o, previsto_em: add(h, -80 + o * 20), realizado_em: add(h, -80 + o * 20), modalidade: "video", registro: "Encontro registrado.", proximos: "", progresso: {}, pulso: { utilidade: 3, apoio: 3, aplicacao: 3, progresso: 3 }, pulso_em: add(h, -79 + o * 20) }))];
    B.port = [
      { id: 1, colaborador_id: "d-diego", ciclo_id: 2, titulo: "Roda de estudo sobre a rubrica de maturidade", data: add(h, -2), descricao: "Conduzi a primeira roda com 6 colegas do NTE 15.", link: "https://drive.google.com/", competencias: ["v1c2", "v3c2"], meta_id: 2, nota_coord: "Muito bem conduzida. Os colegas pediram a segunda." },
      { id: 2, colaborador_id: "d-diego", ciclo_id: 2, titulo: "Devolutiva na escola Z com 2 compromissos", data: add(h, -8), descricao: "Compromissos retomados na visita seguinte: 1 concluído.", link: "", competencias: ["ga3"], meta_id: null, nota_coord: null },
      { id: 3, colaborador_id: "d-ana", ciclo_id: 2, titulo: "Apoio ao agrupamento por nível na escola Y", data: add(h, -5), descricao: "Planilha de agrupamento construída com a coordenação pedagógica.", link: "", competencias: ["ga2", "v1c1"], meta_id: null, nota_coord: null }];
    B.gest = [{ participante_id: 14, encaminhamento: "Ampliação de responsabilidades", observacao: "Potencial para apoiar a formação de novos articuladores." }];
    B.nomes = { "d-gestao": "Tailson (você, como gestão)", "d-paulo": "Paulo André", "d-camila": "Camila Icchi", "d-danilo": "Danilo Rodrigues", "d-flavia": "Flavia Kelly",
      "d-ana": "Ana Beatriz Lima (exemplo)", "d-bruno": "Bruno Santos (exemplo)", "d-carla": "Carla Menezes (exemplo)", "d-diego": "Diego Rocha (exemplo)", "d-eva": "Eva Nascimento (exemplo)", "d-fabio": "Fábio Costa (exemplo)" };
    const cart = { "d-paulo": [5, 6, 7, 8, 9, 19, 20, 22, 27], "d-camila": [10, 13, 14, 15, 16, 17, 18, 21, 24], "d-danilo": [1, 2, 3, 4, 11, 12, 23, 25], "d-flavia": [26] };
    B.cart = Object.entries(cart).flatMap(([c, ns]) => ns.map(n => ({ id: n, nte_id: n, coordenador_id: c, inicio: "2026-02-02", fim: null })));
    B.cart.push({ id: 99, nte_id: 13, coordenador_id: "d-danilo", inicio: "2026-02-02", fim: "2026-08-31" });
    B.eu = pessoas;
    return B;
  })();
  const DB = DEMO; // atalho
  const dl = (x) => JSON.parse(JSON.stringify(x));
  const demoLista = (c) => DB.part.filter(p => p.ciclo_id === c).map(p => {
    const r = DB.resp.filter(x => x.participante_id === p.id), e = DB.enc.filter(x => x.participante_id === p.id), m = DB.metas.filter(x => x.participante_id === p.id);
    return { ...p, nte: "NTE " + String(p.nte_id).padStart(2, "0"), avaliador: DB.nomes[p.avaliador_id],
      auto_enviada: r.some(x => x.tipo === "auto" && x.enviada_em), coord_enviada: r.some(x => x.tipo === "coord" && x.enviada_em),
      metas: m.length, metas_concluidas: m.filter(x => x.status === "Concluída").length, encontros_feitos: e.filter(x => x.realizado_em).length,
      encontro_sincrono: e.some(x => x.realizado_em && ["presencial", "video"].includes(x.modalidade)) || ["presencial", "video"].includes(p.conversa_modalidade),
      proximo_encontro: (e.filter(x => !x.realizado_em).map(x => x.previsto_em).sort()[0]) || null, pulsos: e.filter(x => x.pulso).length,
      comentarios: DB.com.filter(x => x.participante_id === p.id).length, portfolio: DB.port.filter(x => x.colaborador_id === p.colaborador_id).length };
  }).filter(x => { const me = meuId(); return souLider() || x.colaborador_id === me || x.avaliador_id === me; });
  const demoVisivel = (r) => { const p = DB.part.find(x => x.id === r.participante_id), me = meuId();
    if (p.colaborador_id === me) return r.tipo === "auto" || !!p.devolutiva_em;
    if (r.tipo === "auto" && p.avaliador_id === me) return DB.resp.some(x => x.participante_id === p.id && x.tipo === "coord" && x.enviada_em);
    return true; };
  const FAKE = {
    ciclos: async () => dl(DB.ciclos),
    lista: async (c) => dl(demoLista(c)),
    meu: async (c) => dl(DB.part.find(p => p.ciclo_id === c && p.colaborador_id === meuId()) || null),
    part: async (id) => dl(DB.part.find(p => p.id === +id) || null),
    respostas: async (p) => dl(DB.resp.filter(r => r.participante_id === +p && demoVisivel(r))),
    salvarResposta: async (p, tipo, d) => { let r = DB.resp.find(x => x.participante_id === p && x.tipo === tipo);
      if (!r) { r = { id: ++DB.seq, participante_id: p, tipo }; DB.resp.push(r); } Object.assign(r, dl(d)); },
    comentarios: async (p) => dl(DB.com.filter(c => c.participante_id === +p && (DB.part.find(x => x.id === +p).colaborador_id !== meuId() || DB.part.find(x => x.id === +p).devolutiva_em))),
    comentar: async (p, item, texto) => { DB.com.push({ id: ++DB.seq, participante_id: p, item, texto, autor_id: meuId(), criado_em: new Date().toISOString() }); },
    publicarDevolutiva: async (p) => { DB.part.find(x => x.id === p).devolutiva_em = new Date().toISOString(); },
    atualizarPart: async (p, d) => { Object.assign(DB.part.find(x => x.id === p), d); },
    metas: async (p) => dl(DB.metas.filter(m => m.participante_id === +p)),
    salvarMeta: async (m) => { if (m.id) Object.assign(DB.metas.find(x => x.id === m.id), m); else DB.metas.push({ ...m, id: ++DB.seq, progresso: 0, status: m.status || "Não iniciada" }); },
    apagarMeta: async (id) => { DB.metas = DB.metas.filter(x => x.id !== id); },
    publicarPdi: async (p) => { const x = DB.part.find(y => y.id === p); x.pdi_publicado_em = new Date().toISOString();
      const k = DB.ciclos.find(c => c.id === x.ciclo_id), dias = Math.max(30, (new Date(k.fim) - new Date()) / 864e5);
      [0.25, 0.55, 0.85].forEach((f, i) => { if (!DB.enc.some(e => e.participante_id === p && e.ordem === i + 1)) { const d = new Date(); d.setDate(d.getDate() + Math.round(dias * f));
        DB.enc.push({ id: ++DB.seq, participante_id: p, ordem: i + 1, previsto_em: d.toISOString().slice(0, 10), progresso: {}, pulso: null }); } }); },
    ciencia: async (p, c, o) => { Object.assign(DB.part.find(x => x.id === p), { pdi_ciencia_em: new Date().toISOString(), pdi_concorda: c, pdi_obs: o }); },
    encontros: async (p) => dl(DB.enc.filter(e => e.participante_id === +p).sort((a, b) => a.ordem - b.ordem)),
    salvarEncontro: async (id, d) => { Object.assign(DB.enc.find(x => x.id === id), d); },
    portfolio: async (c) => dl(DB.port.filter(f => f.colaborador_id === c).sort((a, b) => b.data.localeCompare(a.data))),
    salvarPort: async (f) => { if (f.id) Object.assign(DB.port.find(x => x.id === f.id), f); else DB.port.push({ ...f, id: ++DB.seq }); },
    apagarPort: async (id) => { DB.port = DB.port.filter(x => x.id !== id); },
    gestao: async (p) => dl(DB.gest.find(g => g.participante_id === +p) || null),
    salvarGestao: async (p, d) => { const g = DB.gest.find(x => x.participante_id === p); if (g) Object.assign(g, d); else DB.gest.push({ participante_id: p, ...d }); },
    historico: async (c) => dl(DB.part.filter(p => p.colaborador_id === c).map(p => { const k = DB.ciclos.find(x => x.id === p.ciclo_id);
      const a = DB.resp.find(r => r.participante_id === p.id && r.tipo === "auto" && r.enviada_em), co = DB.resp.find(r => r.participante_id === p.id && r.tipo === "coord" && r.enviada_em);
      const ps = DB.enc.filter(e => e.participante_id === p.id && e.pulso).map(e => (e.pulso.utilidade + e.pulso.apoio + e.pulso.aplicacao + e.pulso.progresso) / 4);
      return { participante_id: p.id, ciclo_id: k.id, ano: k.ano, ordem: k.ordem, titulo: k.titulo, abertura: k.abertura, cargo: p.cargo, avaliador: DB.nomes[p.avaliador_id],
        auto: a && demoVisivel(a) ? a.notas : null, coord: co && demoVisivel(co) ? co.notas : null, metas: DB.metas.filter(m => m.participante_id === p.id).length,
        metas_concluidas: DB.metas.filter(m => m.participante_id === p.id && m.status === "Concluída").length, pulso_medio: ps.length ? ps.reduce((x, y) => x + y, 0) / ps.length : null }; })
      .sort((a, b) => a.abertura.localeCompare(b.abertura))),
    respostasCiclo: async (c) => dl(DB.resp.filter(r => r.enviada_em && DB.part.find(p => p.id === r.participante_id).ciclo_id === c)),
    encontrosCiclo: async (c) => dl(DB.enc.filter(e => DB.part.find(p => p.id === e.participante_id).ciclo_id === c)),
    metasCiclo: async (c) => dl(DB.metas.filter(e => DB.part.find(p => p.id === e.participante_id).ciclo_id === c)),
    carteira: async () => dl(DB.cart.sort((a, b) => a.nte_id - b.nte_id || (a.fim ? 1 : -1))),
    ntes: async () => Array.from({ length: 27 }, (_, i) => ({ id: i + 1, nome: "NTE " + String(i + 1).padStart(2, "0") })),
    pessoas: async () => Object.entries(DB.nomes).map(([id, nome]) => ({ id, nome, cargo: id.match(/paulo|camila|danilo|flavia/) ? "Coordenador(a) Pedagógico(a)" : "Articulador(a)" })),
    novaCarteira: async (rows) => { rows.forEach(r => { DB.cart.filter(c => c.nte_id === r.nte_id && !c.fim).forEach(c => c.fim = hojeISO()); DB.cart.push({ id: ++DB.seq, ...r, fim: null }); }); },
    cargos: async () => [{ id: 1, nome: "Articulador(a) Pleno" }, { id: 2, nome: "Articulador(a) Sênior" }, { id: 3, nome: "Coordenador(a) Pedagógico(a)" }, { id: 4, nome: "Estagiário(a)" }],
    previa: async () => DB.part.filter(p => p.ciclo_id === 2).map(p => ({ colaborador_id: p.colaborador_id, nome: p.nome, cargo: p.cargo, nte_id: p.nte_id, avaliador_id: p.avaliador_id, avaliador: DB.nomes[p.avaliador_id] }))
      .concat([{ colaborador_id: "d-novo", nome: "Gil Pereira (exemplo)", cargo: "Articulador(a) Pleno", nte_id: null, avaliador_id: null, avaliador: null }]),
    abrirCiclo: async () => { throw new Error("Na prévia o ciclo não é aberto de verdade. As telas acima mostram como fica depois da abertura."); },
    statusCiclo: async (id, status) => { DB.ciclos.find(c => c.id === id).status = status; },
    incluir: async () => null,
  };
  const B = new Proxy({}, { get: (_, k) => (S.demo ? FAKE : REAL)[k] });

  window.CicloDados = { S, B, DEMO, REAL, FAKE, J, semId, itens, indices, fase, blocos, chavesDGPE, chavesGA, media, faixa, n1, cor, nomeItem, ESC, ESC_C, SINTESE, FORMATOS, MODAL, PULSO, ENCAMINHAMENTOS, STATUS_META, FASES, nomeFase, souGestao, souLider, meuId, souAvaliadorDe, falhou, ok, dataBR, dataHora, hojeISO };
})();
