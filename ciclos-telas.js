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
  });
  const DB = DEMO;
  const perfilDemo = { "d-ana": ["Pleno 1", "2024-05-27", "2024-05-27"], "d-bruno": ["Sênior 1", "2023-05-22", "2025-01-06"], "d-carla": ["Pleno 1", "2025-04-16", "2025-04-16"],
    "d-diego": ["Sênior 1", "2023-09-01", "2024-03-01"], "d-eva": ["Pleno 1", "2026-05-04", "2026-05-04"], "d-fabio": ["Pleno 1", "2024-08-01", "2024-08-01"] };
  Object.assign(C.FAKE, {
    perfil: async (c) => { const p = DB.part.find(x => x.colaborador_id === c), d = perfilDemo[c] || ["—", null, null];
      return p ? { colaborador_id: c, nome: p.nome, cargo: p.cargo, nivel: d[0], funcao: p.cargo, nte_id: p.nte_id, entrada_projeto: d[1], cargo_desde: d[2],
        fonte: "Exemplo (no SGT real: planilhas Planejamento 2026 e Marco Zero)", coordenador: DB.nomes[p.avaliador_id] } : null; },
    equipeNte: async (n) => { const vis = souLider() || DB.cart.some(k => k.nte_id === n && !k.fim && k.coordenador_id === meuId());
      return vis ? DB.part.filter(p => p.ciclo_id === 2 && p.nte_id === n).map(p => ({ colaborador_id: p.colaborador_id, nome: p.nome, cargo: p.cargo })) : []; },
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
      const abas = [];
      if (S.meu || (!souCoord && !souLider())) abas.push(["meu", "Meu ciclo"]);
      if (souCoord || souLider()) abas.push(["carteira", souLider() && !souCoord ? "NTE e pessoas" : "Minha carteira"]);
      if (souLider()) abas.push(["painel", "Painel e calibração"]);
      if (souCoord || souLider() || (!S.demo && pode("gerencia"))) abas.push(["condutas", "Condutas de atenção"]);
      if (souGestao()) abas.push(["gestao", "Gestão do ciclo"]);
      S.abas = abas;
      $("cd-abas").innerHTML = abas.map(([k, t]) => `<button data-a="${k}">${t}</button>`).join("");
      $("cd-abas").querySelectorAll("button").forEach(b => b.addEventListener("click", () => { S.pessoa = null; S.nte = null; trocar(b.dataset.a); }));
      trocar(abas.some(a => a[0] === S.aba) ? S.aba : abas[0][0]);
    } catch (e) { falhou(e); }
  }
  function trocar(a) {
    S.aba = a; aviso("a-cd", "");
    $("cd-abas").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.a === a));
    $("cd-sub").textContent = S.ciclo ? `${S.ciclo.titulo} · ${statusCiclo(S.ciclo)}` : "Nenhum ciclo aberto ainda";
    const f = { meu: meuCiclo, carteira: () => S.pessoa ? ficha(S.pessoa) : S.nte ? nteLista(S.nte) : carteira(), painel, condutas: () => window.CicloCondutas.abrir(corpo()),
      gestao: () => window.CicloCondutas.gestao(corpo()) }[a];
    f && f();
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
    const op = [["coord", "Coordenação (Camila Icchi)"], ["lider", "Liderança (Paulo André)"], ["gestao", "Gestão / gerência"],
      ["av:d-ana", "Avaliada · Ana (autoavaliação em rascunho)"], ["av:d-bruno", "Avaliado · Bruno (aguardando devolutiva)"],
      ["av:d-carla", "Avaliada · Carla (devolutiva publicada, PDI em construção)"], ["av:d-diego", "Avaliado · Diego (PDI publicado, acompanhamento)"]];
    $("cd-pbar").innerHTML = `<div class="dc-previa"><b>Prévia</b> · dados de exemplo, nada é gravado. Ver como:
      <select id="cd-como">${op.map(([v, t]) => `<option value="${v}"${S.comoDemo === v ? " selected" : ""}>${t}</option>`).join("")}</select>
      <span>Dica: na Coordenação, abra o NTE 13, 14 ou 15 para ver cada etapa.</span></div>`;
    $("cd-como").addEventListener("input", () => { S.comoDemo = $("cd-como").value; S.pessoa = null; S.nte = null; S.aba = null; abrir(); });
  }

  // ------------------------------------------------------------------ linha do tempo do ciclo
  function passos(x) {
    const k = S.ciclo; if (!k) return "";
    const f = fase(x), ordem = FASES.map(a => a[0]), i = ordem.indexOf(f), h = hojeISO();
    const prazos = { avaliacao: k.prazo_avaliacao, devolutiva: k.prazo_devolutiva, pdi: k.prazo_pdi, acompanhamento: k.fim, concluido: k.fim };
    return `<div class="dc-passos">${FASES.map(([id, t], j) => { const cls = j < i ? "feito" : j === i ? (h > prazos[id] && id !== "concluido" ? "atraso" : "agora") : "";
      return `<div class="${cls}"><b>${j + 1}. ${t}</b>${id === "concluido" ? "" : "até " + dataBR(prazos[id])}${j < i ? " · ✓" : j === i && cls === "atraso" ? " · atrasado" : ""}</div>`; }).join("")}</div>`;
  }
  function proximaAcao(x, souAval) {
    const f = fase(x);
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
      const ntes = await B.ntes(), ativos = S.carteira.filter(k => !k.fim), meus = new Set(ativos.filter(k => k.coordenador_id === meuId()).map(k => k.nte_id));
      const nomes = S.demo ? DEMO.nomes : Object.fromEntries((S.lista || []).map(x => [x.avaliador_id, x.avaliador]));
      const pend = S.lista.filter(x => x.avaliador_id === meuId() && !["acompanhamento", "concluido"].includes(fase(x)));
      el.innerHTML = `${pend.length ? `<div class="dc-bloco"><h2>Suas pendências neste ciclo (${pend.length})</h2><div class="dc-rolar"><table class="dc-tab"><thead><tr><th>Pessoa</th><th>NTE</th><th>Etapa</th><th>Próxima ação</th></tr></thead><tbody>
        ${pend.map(x => `<tr data-c="${x.colaborador_id}"><td><b>${esc(x.nome)}</b><br><small>${esc(x.cargo || "")}</small></td><td>${esc(x.nte || "")}</td><td>${chipFase(x)}</td><td>${esc(proximaAcao(x, true))}</td></tr>`).join("")}</tbody></table></div></div>` : ""}
        <div class="dc-bloco"><h2>Núcleos Territoriais de Educação</h2><div class="ajuda">${souLider() ? "Você acompanha todos os NTE." : "Você abre os NTE da sua carteira. Os demais aparecem só para referência."}</div>
        <div class="dc-ntes">${ntes.map(n => { const k = ativos.find(a => a.nte_id === n.id), pode = souLider() || meus.has(n.id),
          qtd = S.lista.filter(x => x.nte_id === n.id).length, feitos = S.lista.filter(x => x.nte_id === n.id && ["acompanhamento", "concluido"].includes(fase(x))).length;
          return `<button class="dc-nte${pode ? "" : " off"}${meus.has(n.id) ? " meu" : ""}" data-n="${n.id}"${pode ? "" : " disabled"} title="${esc(n.nome)}">
            <b>NTE ${String(n.id).padStart(2, "0")}</b><span>${esc(String(n.nome || "").replace(/^NTE\s*\d+\s*[-–]?\s*/i, ""))}</span>
            <small>${k ? esc(nomes[k.coordenador_id] || (k.coordenador_id === meuId() ? "Você" : "Coordenação")) : "Sem coordenação"}${pode && qtd ? ` · ${feitos}/${qtd} com PDI` : ""}</small></button>`; }).join("")}</div></div>`;
      el.querySelectorAll("[data-n]").forEach(b => b.addEventListener("click", () => { S.nte = +b.dataset.n; nteLista(S.nte); }));
      el.querySelectorAll("tr[data-c]").forEach(tr => tr.addEventListener("click", () => { S.pessoa = tr.dataset.c; ficha(S.pessoa); }));
    } catch (e) { falhou(e); }
  }
  async function nteLista(n) {
    const el = corpo(); carregando(el);
    try {
      const eq = await B.equipeNte(n);
      $("cd-sub").textContent = `NTE ${String(n).padStart(2, "0")} · ${eq.length} pessoa(s)`;
      el.innerHTML = `<div class="dc-bloco"><h2>NTE ${String(n).padStart(2, "0")}</h2><div class="ajuda">Toque no nome para ver a ficha, a trajetória e a evolução no ciclo.</div>
        <div class="dc-rolar"><table class="dc-tab"><thead><tr><th>Nome</th><th>Função</th></tr></thead><tbody>
        ${eq.map(p => `<tr data-c="${p.colaborador_id}"><td><b>${esc(p.nome)}</b></td><td>${esc(p.cargo || "")}</td></tr>`).join("")
          || `<tr><td colspan="2">Nenhuma pessoa cadastrada neste NTE com os cargos do ciclo.</td></tr>`}</tbody></table></div></div>`;
      el.querySelectorAll("tr[data-c]").forEach(tr => tr.addEventListener("click", () => { S.pessoa = tr.dataset.c; ficha(S.pessoa); }));
    } catch (e) { falhou(e); }
  }

  // ficha: cargo, nível, entrada no projeto, no cargo atual desde, evolução e o ciclo atual
  async function ficha(colab, sub) {
    const el = corpo(); carregando(el);
    try {
      const [pf, hist] = await Promise.all([B.perfil(colab), B.historico(colab)]);
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
        ${x ? `<h3>Ciclo atual · ${esc(S.ciclo.titulo)}</h3>${passos(x)}<div class="ajuda">Próxima ação: <b>${esc(proximaAcao(x, souAval))}</b></div>` : `<div class="resumo">Esta pessoa não participa do ciclo selecionado.</div>`}
        </div>
        <div class="abas" id="cd-sabas"></div><div id="cd-sc"></div>`;
      const subs = x ? [["avaliar", souAval ? "Avaliação" : "Avaliações"], ["devolutiva", "Devolutiva"], ["pdi", "Conversa e PDI"], ["acomp", "Acompanhamento"], ["portfolio", "Portfólio"], ["relatorio", "Relatório"]]
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
    ({ avaliar: () => telaAvaliacaoCoord(el, x), devolutiva: () => telaDevolutiva(el, x, false), pdi: () => telaPdi(el, x, false), acomp: () => telaAcomp(el, x, false),
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
      <div class="dc-guia">Este ciclo é sobre o seu desenvolvimento. Você e a coordenação avaliam ao mesmo tempo, sem ver a avaliação um do outro. Depois, comparam as duas visões, conversam e constroem juntos o seu PDI.</div></div>
      <div class="abas" id="cd-sabas"></div><div id="cd-sc"></div>`;
    const subs = [["auto", "Autoavaliação"], ["devolutiva", "Devolutiva"], ["pdi", "Meu PDI"], ["acomp", "Acompanhamento"], ["portfolio", "Meu portfólio"], ["relatorio", "Minha evolução"]];
    $("cd-sabas").innerHTML = subs.map(([k, t]) => `<button data-s="${k}">${t}</button>`).join("");
    const ir = (s) => { $("cd-sabas").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.s === s)); const c = $("cd-sc");
      ({ auto: () => telaAuto(c, x), devolutiva: () => telaDevolutiva(c, x, true), pdi: () => telaPdi(c, x, true), acomp: () => telaAcomp(c, x, true),
         portfolio: () => telaPortfolio(c, meuId(), true, x), relatorio: () => telaRelatorio(c, x, meuId()) })[s](); };
    $("cd-sabas").querySelectorAll("button").forEach(b => b.addEventListener("click", () => ir(b.dataset.s)));
    ir(({ avaliacao: x.auto_enviada ? "auto" : "auto", devolutiva: "auto", pdi: "devolutiva", acompanhamento: "pdi", concluido: "relatorio" })[fase(x)]);
  }
  const recarregarLista = async () => { if (S.ciclo) S.lista = await B.lista(S.ciclo.id); if (S.ciclo && S.meu) S.meu = await B.meu(S.ciclo.id); };

  // ------------------------------------------------------------------ formulário de avaliação (auto e coordenação)
  function formAvaliacao(el, x, tipo, resp, editavel, evid) {
    const n = { ...(resp && resp.notas || {}) }, ju = { ...(resp && resp.justificativas || {}) }, si = { ...(resp && resp.sintese || {}) };
    const its = itens(), total = its.length;
    const quem = tipo === "auto" ? "você" : "a pessoa";
    el.innerHTML = `${editavel ? `<div class="dc-guia">${tipo === "auto"
        ? "Avalie seu desempenho nos <b>últimos 3 meses</b>, com base em fatos. Toque na nota para ver o que ela significa. Notas <b>1</b> e <b>5</b> pedem uma justificativa curta. O rascunho é salvo sozinho; leva cerca de 15 minutos."
        : "Avalie com base em fatos observados nos <b>últimos 3 meses</b>, comparando com o esperado para o cargo. Use toda a escala. Notas <b>1</b> e <b>5</b> pedem justificativa. A autoavaliação só aparece depois que você enviar a sua (avaliação às cegas). Leva cerca de 8 a 10 minutos."}</div>` : ""}
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
      try { await salvar(true); await recarregarLista(); ok(tipo === "auto" ? "Autoavaliação enviada. Você será avisado(a) quando a devolutiva for publicada." : "Avaliação enviada. A autoavaliação desta pessoa já pode ser vista na aba Devolutiva, se ela tiver enviado.");
        if (S.aba === "carteira") ficha(S.pessoa, tipo === "coord" ? "devolutiva" : undefined); else meuCiclo(); } catch (e) { falhou(e); }
    });
  }
  async function telaAuto(el, x) {
    carregando(el);
    try {
      const [rs, port] = await Promise.all([B.respostas(x.id), B.portfolio(meuId())]);
      const r = rs.find(y => y.tipo === "auto"), editavel = !x.devolutiva_em && S.ciclo.status !== "encerrado";
      formAvaliacao(el, x, "auto", r, editavel, port.filter(f => !f.ciclo_id || f.ciclo_id === S.ciclo.id));
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
      if (souDono && !x.devolutiva_em) { el.innerHTML = `<div class="resumo">A devolutiva aparece aqui quando a coordenação publicar. ${au ? "Sua autoavaliação foi enviada." : "Envie sua autoavaliação primeiro."}</div>`; return; }
      if (!souDono && !co) { el.innerHTML = `<div class="resumo">${souAval ? "Envie a sua avaliação primeiro. A autoavaliação aparece depois disso (avaliação às cegas)." : "A coordenação ainda não enviou a avaliação."}</div>`; return; }
      const ia = indices(au && au.notas), ic = indices(co && co.notas), its = itens();
      const gaps = its.filter(i => au && co && Math.abs((au.notas[i.k] || 0) - (co.notas[i.k] || 0)) >= 2);
      const porItem = (k) => cs.filter(c => c.item === k);
      const autor = (id) => id === x.colaborador_id ? (souDono ? "Você" : x.nome.split(" ")[0]) : id === meuId() ? "Você" : (S.demo ? DEMO.nomes[id] : x.avaliador) || "Coordenação";
      const fio = (k) => { const l = porItem(k); const podeEscrever = S.ciclo.status !== "encerrado" && (souAval || (souDono && x.devolutiva_em));
        return `<div class="dc-fio" data-fio="${k}">${l.map(c => `<div class="dc-msg${c.autor_id === meuId() ? " meu" : ""}"><b>${esc(autor(c.autor_id))}</b><small>${dataHora(c.criado_em)}</small><div style="white-space:pre-wrap">${esc(c.texto)}</div></div>`).join("")}
          ${podeEscrever ? `<div class="dc-env"><textarea placeholder="${souDono ? "Responder: concordo, discordo, contexto…" : "Comentário com fato: situação → comportamento → impacto"}" maxlength="2000"></textarea><button class="sec" data-env="${k}">Enviar</button></div>` : ""}</div>`; };
      el.innerHTML = `${!souDono && !au ? `<div class="dc-guia">${esc(x.nome)} ainda não enviou a autoavaliação${S.ciclo.prazo_avaliacao < hojeISO() ? " e o prazo passou. Você pode seguir com a devolutiva." : `. Prazo: ${dataBR(S.ciclo.prazo_avaliacao)}.`}</div>` : ""}
        <div class="dc-kpis"><div><b>${n1(ic.dgpe)} <small style="font-size:13px;color:var(--texto-2)">/ auto ${n1(ia.dgpe)}</small></b>Competências DGPE</div>
          <div><b>${n1(ic.ga)} <small style="font-size:13px;color:var(--texto-2)">/ auto ${n1(ia.ga)}</small></b>Atuação GA 2.0</div>
          <div><b>${n1(ic.res)} <small style="font-size:13px;color:var(--texto-2)">/ auto ${n1(ia.res)}</small></b>Resultados</div>
          <div><b>${gaps.length}</b>Itens com diferença de 2+ pontos</div></div>
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
        ${souAval && !x.devolutiva_em ? `<div class="dc-bloco"><h2>Publicar a devolutiva</h2><div class="ajuda">Ao publicar, ${esc(x.nome)} passa a ver a sua avaliação e os comentários, e pode responder antes da conversa individual. Depois disso, as notas não mudam mais.</div>
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
        try { await B.publicarDevolutiva(x.id); await recarregarLista(); ok("Devolutiva publicada. A pessoa foi avisada."); ficha(S.pessoa, "pdi"); } catch (e) { falhou(e); }
      });
    } catch (e) { falhou(e); }
  }

  // ------------------------------------------------------------------ CONVERSA E PDI
  const DEVERES = `<div class="dc-duas" style="margin-top:8px"><div class="dc-guia"><b>Deveres do(a) avaliado(a)</b><br>• Executar as ações combinadas no prazo<br>• Registrar entregas no portfólio<br>• Atualizar o progresso das metas antes de cada encontro<br>• Responder o formulário de efetividade após cada encontro</div>
    <div class="dc-guia"><b>Deveres da coordenação</b><br>• Oferecer o apoio combinado em cada meta<br>• Realizar os 3 encontros (ao menos 1 presencial ou por vídeo)<br>• Registrar o progresso e dar feedback com fatos<br>• Reconhecer avanços e replanejar quando preciso</div></div>`;
  async function telaPdi(el, x, souDono) {
    carregando(el);
    try {
      const [metas, rs] = await Promise.all([B.metas(x.id), B.respostas(x.id)]);
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
          ${editavel && sugest.length ? `<div class="dc-guia">Sugestões a partir da avaliação (menor nota da coordenação e maior diferença): ${sugest.map(s => `<b>${esc(s.i.nome)}</b> (${s.c})`).join(" · ")}. ${au && au.sintese.desenvolver ? `A pessoa quer desenvolver: “${esc(au.sintese.desenvolver)}”.` : ""} Recomendado: de 1 a 3 metas.</div>` : ""}
          ${DEVERES}
          <div id="dc-metas">${metas.map(cartao).join("") || (editavel ? "" : `<div class="resumo">Nenhuma meta registrada ainda.</div>`)}</div>
          ${editavel && metas.length < 3 ? cartao({ status: "Não iniciada" }, metas.length) : ""}
          ${editavel && !x.pdi_publicado_em ? `<div class="dc-btns"><button id="dc-pubpdi">Publicar PDI e agendar os 3 encontros</button></div>` : ""}
          ${x.pdi_publicado_em ? `<div class="ajuda">PDI publicado em ${dataHora(x.pdi_publicado_em)}.</div>` : ""}</div>
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
            ${e.realizado_em ? sit(`Realizado em ${dataBR(e.realizado_em)} · ${MODAL[e.modalidade] || ""}`, "ok") : e.previsto_em < hojeISO() ? sit("Atrasado", "erro") : sit("Agendado", "neutro")}</div>
            ${podeReg ? `<div class="grade2"><div><label>Realizado em</label><input type="date" data-f="realizado_em" value="${esc(e.realizado_em || "")}"></div>
                <div><label>Modalidade</label><select data-f="modalidade"><option value="">—</option>${Object.entries(MODAL).filter(([k]) => !precisaSinc || ["presencial", "video"].includes(k)).map(([k, t]) => `<option value="${k}"${e.modalidade === k ? " selected" : ""}>${t}</option>`).join("")}</select></div></div>
                ${precisaSinc ? `<div class="dc-guia">Este é o último encontro e nenhum foi presencial ou por vídeo. Ele precisa ser presencial ou por vídeo.</div>` : ""}
                <label>Registro do diálogo (fatos, avanços, dificuldades)</label><textarea data-f="registro">${esc(e.registro || "")}</textarea>
                <label>Próximos passos combinados</label><textarea data-f="proximos">${esc(e.proximos || "")}</textarea>
                ${metas.length ? `<label>Progresso de cada meta</label>${metas.map(m => `<div class="dc-linha" style="grid-template-columns:1fr 160px"><span style="font-size:13px">${esc(m.objetivo)}</span><input type="range" min="0" max="100" step="25" data-pm="${m.id}" value="${(e.progresso || {})[m.id] ?? m.progresso ?? 0}"></div>`).join("")}` : ""}
                <div class="dc-btns"><button class="sec" data-sv>Salvar encontro</button></div>`
              : `${e.registro ? `<h3>Registro</h3><p style="white-space:pre-wrap;margin:0">${esc(e.registro)}</p>` : ""}${e.proximos ? `<h3>Próximos passos</h3><p style="white-space:pre-wrap;margin:0">${esc(e.proximos)}</p>` : ""}`}
            ${e.pulso ? `<h3>Formulário de efetividade</h3><div class="ajuda">${PULSO.map(([k, t]) => `${esc(t)}: <b>${e.pulso[k]}</b>`).join(" · ")}</div>${e.pulso_texto ? `<p style="white-space:pre-wrap;margin:4px 0 0">${esc(e.pulso_texto)}</p>` : ""}`
              : podePulso ? `<h3>Formulário de efetividade (1 minuto)</h3>${PULSO.map(([k, t]) => `<div class="dc-linha" style="padding:6px 0"><span style="font-size:13.5px">${esc(t)}</span><div class="dc-esc">${[1, 2, 3, 4, 5].map(v => `<label title="${v === 1 ? "Discordo totalmente" : v === 5 ? "Concordo totalmente" : ""}"><input type="radio" name="p${e.id}-${k}" value="${v}"><span>${v}</span></label>`).join("")}</div></div>`).join("")}
                <div class="ajuda">1 = discordo totalmente · 5 = concordo totalmente</div><label>Comentário (opcional)</label><textarea data-pt></textarea><div class="dc-btns"><button data-pulso>Enviar</button></div>`
              : e.realizado_em ? `<div class="ajuda">Formulário de efetividade ainda não respondido.</div>` : ""}</div>`; }).join("")}`;
      el.querySelectorAll(".dc-enc").forEach(card => {
        const id = +card.dataset.e, sv = card.querySelector("[data-sv]"), pb = card.querySelector("[data-pulso]");
        if (sv) sv.addEventListener("click", async () => {
          const d = { progresso: {} }; card.querySelectorAll("[data-f]").forEach(i => d[i.dataset.f] = i.value.trim() || null);
          if (d.realizado_em && !d.modalidade) return aviso("a-cd", "Informe a modalidade do encontro.");
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
      const chips = (sel, dis) => `<div class="dc-chips">${itens().filter(i => i.k !== "res").map(i => `<label><input type="checkbox" value="${i.k}"${(sel || []).includes(i.k) ? " checked" : ""}${dis ? " disabled" : ""}><span>${esc(i.nome)}</span></label>`).join("")}</div>`;
      el.innerHTML = `${souDono ? `<div class="dc-bloco"><h2>Registrar uma entrega</h2><div class="ajuda">Registre entregas e evidências ao longo do trimestre (visitas, devolutivas, análises, formações). Elas aparecem para a coordenação na hora de avaliar e nos encontros.</div>
          <div class="grade2"><div><label>Título *</label><input id="pf-t" maxlength="200"></div><div><label>Data</label><input type="date" id="pf-d" value="${hojeISO()}"></div></div>
          <label>O que foi feito e qual o resultado</label><textarea id="pf-ds" maxlength="2000"></textarea>
          <label>Link da evidência (Drive, SGA, fotos)</label><input id="pf-l" placeholder="https://">
          ${metas.length ? `<label>Ligada a uma meta do PDI</label><select id="pf-m"><option value="">—</option>${metas.map(m => `<option value="${m.id}">${esc(m.objetivo)}</option>`).join("")}</select>` : ""}
          <label>Competências relacionadas</label><div id="pf-c">${chips([])}</div><div class="dc-btns"><button id="pf-s">Adicionar ao portfólio</button></div></div>` : ""}
        <div class="dc-bloco"><h2>${souDono ? "Meu portfólio" : "Portfólio de entregas"} (${lista.length})</h2>
        ${lista.map(f => `<div class="dc-port" data-f="${f.id}"><div class="dc-linha"><b>${esc(f.titulo)}</b><small>${dataBR(f.data)}</small></div>
          ${f.descricao ? `<div style="white-space:pre-wrap;margin-top:4px">${esc(f.descricao)}</div>` : ""}
          ${f.link ? `<div><a href="${esc(f.link)}" target="_blank" rel="noopener">Abrir evidência</a></div>` : ""}
          ${(f.competencias || []).length ? `<div class="dc-chips">${f.competencias.map(k => `<span class="dc-tag">${esc(nomeItem(k))}</span>`).join("")}</div>` : ""}
          ${f.nota_coord ? `<div class="dc-guia"><b>Coordenação:</b> ${esc(f.nota_coord)}</div>` : ""}
          ${podeNota ? `<div class="dc-env"><textarea placeholder="Nota da coordenação (reconhecimento, sugestão)">${esc(f.nota_coord || "")}</textarea><button class="sec" data-nota>Salvar nota</button></div>` : ""}
          ${souDono ? `<div class="dc-btns"><button class="perigo dc-mini" data-del>Excluir</button></div>` : ""}</div>`).join("") || `<div class="resumo">Nenhuma entrega registrada ainda.</div>`}</div>`;
      if ($("pf-s")) $("pf-s").addEventListener("click", async () => {
        const t = $("pf-t").value.trim(); if (!t) return aviso("a-cd", "Dê um título à entrega.");
        const l = $("pf-l").value.trim(); if (l && !/^https?:\/\//i.test(l)) return aviso("a-cd", "O link deve começar com https://");
        const f = { colaborador_id: colab, ciclo_id: S.ciclo ? S.ciclo.id : null, titulo: t, data: $("pf-d").value || hojeISO(), descricao: $("pf-ds").value.trim() || null, link: l || null,
          competencias: [...$("pf-c").querySelectorAll("input:checked")].map(i => i.value), meta_id: $("pf-m") && $("pf-m").value ? +$("pf-m").value : null };
        try { await B.salvarPort(f); ok("Entrega registrada."); telaPortfolio(el, colab, souDono, x); } catch (e) { falhou(e); } });
      el.querySelectorAll(".dc-port").forEach(card => { const id = +card.dataset.f;
        const n = card.querySelector("[data-nota]"), d = card.querySelector("[data-del]");
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
        <h3>Portfólio (${port.length} entrega(s))</h3><ul>${port.slice(0, 15).map(f => `<li>${dataBR(f.data)} · ${esc(f.titulo)}</li>`).join("") || "<li>Nenhuma.</li>"}</ul>
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
    .dc-ficha{display:grid;grid-template-columns:1.3fr 1fr;gap:16px;align-items:start}
    .dc-dados{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:6px}
    .dc-dados div{background:var(--fundo);border-radius:10px;padding:8px 10px;display:flex;flex-direction:column}
    .dc-dados small{font-size:11.5px;color:var(--texto-2)} .dc-dados b{font-size:14.5px}
    @media (max-width:760px){.dc-ficha{grid-template-columns:1fr}}
  </style>`);

  window.Ciclos = { abrir };
  window.CicloTelas = { abrir, trocar, ficha, telaRelatorio, carregando, sit, tempo, graficoEvolucao, recarregarLista };
})();
