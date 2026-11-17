// SGT · Quadro Geral do Time e Painel de Vagas
// Fonte única: função quadro_geral() do banco. Movimentações pelo atalho registrar_movimentacao(),
// que atualiza vaga, ocupação, cadastro da pessoa e histórico de uma vez.
// Usa as funções globais do index.html: api, aviso, mostrar, esc, eu, pode, temModulo, fmtData, traduzErro.
(() => {
  const $ = (id) => document.getElementById(id);
  let linhas = [], carregado = 0, aberta = null, pessoas = null;
  const podeEditar = () => pode("admin", "rh");
  const moeda = (v) => v == null || v === "" ? "" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const num = (s) => { if (s == null) return null; s = String(s).replace(/[R$\s.]/g, "").replace(",", "."); return s === "" || isNaN(+s) ? null : +s; };
  const hoje = () => new Date().toISOString().slice(0, 10);
  const ABERTAS = ["Aberta", "Em seleção", "Em contratação", "Sem previsão"];
  const COR_SIT = { "Ocupada": "ok", "Ocupada · afastamento": "alerta", "Aberta": "erro", "Em seleção": "info", "Em contratação": "info", "Sem previsão": "neutro", "Inativa": "neutro" };
  const TIPOS = { contratacao: "Contratação", rescisao: "Rescisão (desligamento)", promocao: "Promoção", realocacao: "Realocação", afastamento: "Afastamento / licença", retorno: "Retorno de afastamento" };

  document.head.insertAdjacentHTML("beforeend", `<style>
    .cartao.amplo{max-width:1400px}
    .qg-barra{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:14px 0 6px}
    .qg-barra input,.qg-barra select{width:auto;flex:1 1 150px;margin:0;padding:9px 10px;font-size:14px}
    .qg-barra button{width:auto;margin:0;padding:9px 14px;font-size:14px;white-space:nowrap}
    .qg-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:12px 0}
    .qg-kpi{border:1px solid var(--borda);border-radius:var(--raio);padding:10px 12px;background:var(--superficie,#fff);cursor:pointer}
    .qg-kpi b{display:block;font-size:22px;color:var(--texto)} .qg-kpi span{font-size:12.5px;color:var(--texto-2)}
    .qg-kpi.on{border-color:var(--cor);box-shadow:inset 0 0 0 1px var(--cor)}
    .qg-tabela{overflow:auto;max-height:65vh;border:1px solid var(--borda);border-radius:var(--raio)}
    .qg-tabela table{border-collapse:collapse;width:100%;font-size:13px}
    .qg-tabela th{position:sticky;top:0;background:var(--cor-suave);color:var(--texto);text-align:left;padding:8px 10px;white-space:nowrap;cursor:pointer;z-index:1}
    .qg-tabela td{padding:7px 10px;border-top:1px solid var(--borda);white-space:nowrap;max-width:320px;overflow:hidden;text-overflow:ellipsis}
    .qg-tabela tr:hover td{background:var(--fundo)} .qg-tabela tbody tr{cursor:pointer}
    .qg-tabela td.num{text-align:right;font-variant-numeric:tabular-nums}
    .sit{font-size:11.5px;font-weight:600;padding:3px 8px;border-radius:999px;white-space:nowrap}
    .sit.ok{background:var(--ok-fundo);color:var(--ok)} .sit.alerta{background:var(--alerta-fundo);color:var(--alerta)}
    .sit.erro{background:var(--erro-fundo);color:var(--erro)} .sit.info{background:var(--cor-suave);color:var(--cor)}
    .sit.neutro{background:var(--fundo);color:var(--texto-2);border:1px solid var(--borda)}
    .vac{font-weight:600} .vac.v1{color:var(--ok)} .vac.v2{color:var(--alerta)} .vac.v3{color:var(--erro)}
    .qg-det{border:1px solid var(--borda);border-radius:var(--raio);padding:4px 16px 16px;margin-top:14px;background:var(--superficie,#fff)}
    .qg-det .grade3{display:grid;grid-template-columns:repeat(3,1fr);gap:0 14px}
    .qg-hist{font-size:13px;border-collapse:collapse;width:100%;margin-top:6px}
    .qg-hist td,.qg-hist th{padding:6px 8px;border-top:1px solid var(--borda);text-align:left}
    .qg-mov{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:flex-start;justify-content:center;padding:40px 12px;z-index:50;overflow:auto}
    .qg-mov>div{background:var(--superficie,#fff);border-radius:16px;max-width:560px;width:100%;padding:20px 22px}
    @media (max-width:760px){.qg-det .grade3{grid-template-columns:1fr}}
  </style>`);

  $("cartao").querySelector(".rodape").insertAdjacentHTML("beforebegin", `
  <section id="v-qg" class="oculto">
    <div class="topo"><div><h1>Quadro Geral do Time</h1><div class="ajuda" style="margin:0" id="qg-sub">Vagas, ocupantes e memória de cada vaga</div></div><button class="sec" data-ir="v-inicio">← Início</button></div>
    <div class="qg-barra">
      <input type="search" id="qg-busca" placeholder="Buscar por código, nome, papel ou NTE">
      <select id="qg-sit"><option value="">Todas as situações</option></select>
      <select id="qg-eixo"><option value="">Todos os eixos</option></select>
      <select id="qg-vinc"><option value="">Todos os vínculos</option></select>
    </div>
    <div class="qg-barra">
      <button id="qg-mov-btn">⇄ Registrar movimentação</button>
      <button class="sec" id="qg-nova-btn">+ Nova vaga</button>
      <button class="sec" id="qg-csv">Baixar planilha</button>
      <span class="resumo" id="qg-resumo" style="margin:0 0 0 auto"></span>
    </div>
    <div class="qg-tabela"><table><thead><tr>
      <th data-o="codigo">Código</th><th data-o="situacao">Situação</th><th data-o="ocupante">Ocupante</th><th data-o="inicio">Desde</th>
      <th data-o="cargo_atual">Nível</th><th data-o="eixo">Eixo</th><th data-o="papel">Papel</th><th data-o="vinculo">Vínculo</th><th data-o="local">Local</th>
      <th data-o="valor_mensal">Mensal c/ encargos</th><th data-o="total_vaga">Total na vaga</th><th data-o="dias_vacancia">Vacância</th>
    </tr></thead><tbody id="qg-corpo"></tbody></table></div>
    <div id="qg-det"></div>
    <div class="aviso" id="a-qg"></div>
  </section>
  <section id="v-pv" class="oculto">
    <div class="topo"><div><h1>Painel de Vagas</h1><div class="ajuda" style="margin:0">Vagas ocupadas e abertas, com o tempo de vacância</div></div><button class="sec" data-ir="v-inicio">← Início</button></div>
    <div class="qg-kpis" id="pv-kpis"></div>
    <div class="qg-barra">
      <input type="search" id="pv-busca" placeholder="Buscar por código, papel ou NTE">
      <select id="pv-eixo"><option value="">Todos os eixos</option></select>
      <select id="pv-vinc"><option value="">Todos os vínculos</option></select>
      <select id="pv-local"><option value="">Todos os locais</option></select>
      <button class="sec" id="pv-csv">Baixar planilha</button>
    </div>
    <div class="resumo" id="pv-resumo"></div>
    <div class="qg-tabela"><table><thead><tr>
      <th data-o="codigo">Código</th><th data-o="situacao">Situação</th><th data-o="papel">Papel</th><th data-o="eixo">Eixo</th><th data-o="vinculo">Vínculo</th>
      <th data-o="local">Local</th><th data-o="ocupante">Ocupante</th><th data-o="aberta_desde">Aberta desde</th><th data-o="dias_vacancia">Tempo de vacância</th><th data-o="previsao_inicio">Previsão</th>
    </tr></thead><tbody id="pv-corpo"></tbody></table></div>
    <div class="aviso" id="a-pv"></div>
  </section>`);
  document.querySelectorAll("#v-qg [data-ir], #v-pv [data-ir]").forEach(b => b.addEventListener("click", () => mostrar("v-inicio")));

  // ---------------------------------------------------------------- dados
  async function carregar(forcar) {
    if (!forcar && linhas.length && Date.now() - carregado < 60000) return linhas;
    linhas = await api("/rest/v1/rpc/quadro_geral", { method: "POST", body: "{}" });
    carregado = Date.now();
    const opcoes = (campo) => [...new Set(linhas.map(l => l[campo]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const encher = (id, campo, rotulo) => { const s = $(id), v = s.value; s.innerHTML = `<option value="">${rotulo}</option>` + opcoes(campo).map(o => `<option>${esc(o)}</option>`).join(""); s.value = v; };
    encher("qg-sit", "situacao", "Todas as situações"); encher("qg-eixo", "eixo", "Todos os eixos"); encher("qg-vinc", "vinculo", "Todos os vínculos");
    encher("pv-eixo", "eixo", "Todos os eixos"); encher("pv-vinc", "vinculo", "Todos os vínculos"); encher("pv-local", "local", "Todos os locais");
    return linhas;
  }
  const casa = (l, termo) => !termo || [l.codigo, l.ocupante, l.papel, l.nte_texto, l.cargo_atual, l.eixo].some(x => x && x.toLowerCase().includes(termo));
  const vacancia = (d) => d == null ? "" : `<span class="vac ${d <= 30 ? "v1" : d <= 90 ? "v2" : "v3"}">${d} dia${d === 1 ? "" : "s"}</span>`;
  const sit = (s) => `<span class="sit ${COR_SIT[s] || "neutro"}">${esc(s)}</span>`;
  function ordenar(lista, campo, inv) {
    return lista.sort((a, b) => { const x = a[campo], y = b[campo];
      if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
      const r = typeof x === "number" ? x - y : String(x).localeCompare(String(y), "pt-BR", { numeric: true });
      return inv ? -r : r; });
  }
  function ligarOrdem(tabelaId, estado, redesenhar) {
    document.querySelectorAll(`#${tabelaId} th[data-o]`).forEach(th => th.addEventListener("click", () => {
      estado.inv = estado.campo === th.dataset.o ? !estado.inv : false; estado.campo = th.dataset.o; redesenhar(); }));
  }
  function baixar(nome, cab, dados) {
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const txt = "﻿" + [cab.map(c => q(c[1])).join(";"), ...dados.map(l => cab.map(c => q(typeof c[2] === "function" ? c[2](l) : l[c[0]])).join(";"))].join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "text/csv;charset=utf-8" }));
    a.download = `${nome}-${hoje()}.csv`; a.click();
  }
  const reais = (v) => v == null ? "" : String(Number(v).toFixed(2)).replace(".", ",");

  // ---------------------------------------------------------------- Quadro Geral
  const oQG = { campo: "codigo", inv: false };
  async function abrirQuadro() {
    mostrar("v-qg"); $("qg-det").innerHTML = "";
    $("qg-mov-btn").classList.toggle("oculto", !podeEditar()); $("qg-nova-btn").classList.toggle("oculto", !podeEditar());
    $("qg-corpo").innerHTML = `<tr><td colspan="12">Carregando…</td></tr>`;
    try { await carregar(true); desenharQuadro(); } catch (e) { if (e.message !== "sessao") aviso("a-qg", traduzErro(e)); }
  }
  function filtradosQG() {
    const t = $("qg-busca").value.trim().toLowerCase(), s = $("qg-sit").value, e = $("qg-eixo").value, v = $("qg-vinc").value;
    return ordenar(linhas.filter(l => casa(l, t) && (!s || l.situacao === s) && (!e || l.eixo === e) && (!v || l.vinculo === v)), oQG.campo, oQG.inv);
  }
  function desenharQuadro() {
    const lista = filtradosQG();
    const ocup = linhas.filter(l => l.ocupante).length, prov = linhas.filter(l => l.provisoria).length;
    $("qg-resumo").textContent = `${lista.length} de ${linhas.length} vagas · ${ocup} ocupadas` + (prov ? ` · ${prov} com código provisório` : "");
    $("qg-corpo").innerHTML = lista.map(l => `<tr data-c="${esc(l.codigo)}">
      <td><b>${esc(l.codigo)}</b>${l.provisoria ? ' <span class="sit alerta" title="Código criado pelo SGT: corrija pelo detalhe da vaga">provisório</span>' : ""}${l.ocupantes_atuais > 1 ? ` <span class="sit alerta" title="Mais de uma pessoa ocupando">${l.ocupantes_atuais} ocupantes</span>` : ""}</td>
      <td>${sit(l.situacao)}</td><td>${esc(l.ocupante || "")}</td><td>${fmtData(l.inicio)}</td><td>${esc(l.cargo_atual || "")}</td>
      <td>${esc(l.eixo || "")}</td><td title="${esc(l.papel || "")}">${esc(l.papel || "")}</td><td>${esc(l.vinculo || "")}</td><td>${esc(l.local || "")}</td>
      <td class="num">${moeda(l.valor_mensal)}</td><td class="num">${moeda(l.total_vaga)}</td><td>${vacancia(l.dias_vacancia)}</td></tr>`).join("")
      || `<tr><td colspan="12">Nenhuma vaga encontrada.</td></tr>`;
  }
  ["qg-busca", "qg-sit", "qg-eixo", "qg-vinc"].forEach(id => $(id).addEventListener("input", desenharQuadro));
  ligarOrdem("v-qg", oQG, desenharQuadro);
  $("qg-corpo").addEventListener("click", (e) => { const tr = e.target.closest("tr[data-c]"); if (tr) detalhe(tr.dataset.c); });
  $("qg-csv").addEventListener("click", () => baixar("quadro-geral", [
    ["codigo", "Código"], ["situacao", "Situação"], ["ocupante", "Ocupante"], ["inicio", "Desde", l => fmtData(l.inicio)], ["lider_nome", "Liderança imediata"],
    ["tipo_vaga", "Tipo de vaga"], ["cargo_organograma", "Cargo no organograma"], ["cargo_atual", "Nível"], ["eixo", "Eixo"], ["papel", "Papel"],
    ["vinculo", "Vínculo"], ["local", "Local"], ["nte_texto", "NTE"], ["valor_bruto", "Valor bruto mensal", l => reais(l.valor_bruto)],
    ["fator_encargos", "Fator de encargos", l => reais(l.fator_encargos)], ["valor_mensal", "Mensal com encargos", l => reais(l.valor_mensal)],
    ["total_vaga", "Total pago na vaga", l => reais(l.total_vaga)], ["historico", "Pessoas que já ocuparam"], ["aberta_desde", "Aberta desde", l => fmtData(l.aberta_desde)],
    ["dias_vacancia", "Dias de vacância"], ["observacao", "Observações"]], filtradosQG()));

  // detalhe e memória da vaga
  async function detalhe(codigo) {
    const l = linhas.find(x => x.codigo === codigo); if (!l) return;
    aberta = codigo;
    const ed = podeEditar(), dis = ed ? "" : " disabled";
    const campo = (id, rot, val, tipo = "text") => `<div><label for="${id}">${rot}</label><input type="${tipo}" id="${id}" value="${esc(val ?? "")}"${dis}></div>`;
    $("qg-det").innerHTML = `<div class="qg-det">
      <div class="topo" style="margin-top:12px"><h2 style="margin:0">Vaga ${esc(l.codigo)} ${sit(l.situacao)}</h2>
        <div style="display:flex;gap:6px">${ed ? `<button class="sec" id="qd-renomear" style="width:auto;margin:0">Trocar código</button>` : ""}<button class="sec" id="qd-fechar" style="width:auto;margin:0">Fechar</button></div></div>
      ${l.ocupante ? `<p class="sub" style="margin:6px 0 0">Ocupante: <b>${esc(l.ocupante)}</b> desde ${fmtData(l.inicio) || "—"}${l.lider_nome ? ` · liderança: ${esc(l.lider_nome)}` : ""}</p>` : ""}
      <form id="qd-form" novalidate><div class="grade3">
        ${campo("qd-papel", "Papel", l.papel)}${campo("qd-eixo", "Eixo", l.eixo)}${campo("qd-nivel", "Nível (cargo atual)", l.cargo_atual)}
        ${campo("qd-org", "Cargo no organograma", l.cargo_organograma)}${campo("qd-vinc", "Vínculo", l.vinculo)}${campo("qd-local", "Local", l.local)}
        ${campo("qd-nte", "NTE", l.nte_texto)}${campo("qd-tipo", "Tipo de vaga", l.tipo_vaga)}
        <div><label for="qd-etapa">Etapa (vaga sem ocupante)</label><select id="qd-etapa"${dis}><option value="">—</option><option value="selecao"${l.etapa_selecao === "selecao" ? " selected" : ""}>Em seleção</option><option value="contratacao"${l.etapa_selecao === "contratacao" ? " selected" : ""}>Em contratação</option></select></div>
        ${campo("qd-bruto", "Valor bruto mensal (R$)", l.valor_bruto == null ? "" : String(l.valor_bruto).replace(".", ","))}
        ${campo("qd-fator", "Fator de encargos (ex.: 2,00)", l.fator_encargos == null ? "" : String(l.fator_encargos).replace(".", ","))}
        <div><label for="qd-ativa">Situação no quadro</label><select id="qd-ativa"${dis}><option value="true">Ativa</option><option value="false"${l.ativa ? "" : " selected"}>Inativa</option></select></div>
        ${campo("qd-pini", "Previsão de início", l.previsao_inicio, "date")}${campo("qd-pfim", "Previsão de fim", l.previsao_fim, "date")}
        ${l.ocupacao_id ? campo("qd-lider", "Liderança imediata do ocupante", l.lider_nome) : ""}
      </div>
      <label for="qd-obs">Observações</label><textarea id="qd-obs" rows="2"${dis}>${esc(l.observacao || "")}</textarea>
      ${ed ? `<button type="submit" style="width:auto">Salvar dados da vaga</button>` : ""}</form>
      <div class="aviso" id="a-qd"></div>
      <h2>Memória da vaga</h2><div id="qd-hist" class="resumo">Carregando…</div></div>`;
    $("qd-fechar").addEventListener("click", () => { $("qg-det").innerHTML = ""; aberta = null; });
    $("qg-det").scrollIntoView({ behavior: "smooth", block: "start" });
    if (ed) {
      $("qd-form").addEventListener("submit", (e) => { e.preventDefault(); salvarVaga(l); });
      $("qd-renomear").addEventListener("click", () => renomear(l));
    }
    try {
      const h = await api("/rest/v1/rpc/quadro_historico", { method: "POST", body: JSON.stringify({ p_vaga: codigo }) });
      const oc = h.ocupacoes || [], mv = h.movimentacoes || [];
      $("qd-hist").outerHTML = `<div style="overflow:auto"><table class="qg-hist"><thead><tr><th>Pessoa</th><th>Situação</th><th>Início</th><th>Fim</th><th>Liderança</th><th>Meses</th><th>Mensal bruto</th><th>Total recebido</th></tr></thead><tbody>
        ${oc.map(o => `<tr><td>${esc(o.nome)}</td><td>${sit(o.status)}</td><td>${fmtData(o.inicio)}</td><td>${fmtData(o.fim)}</td><td>${esc(o.lider || "")}</td><td>${o.meses}</td><td>${moeda(o.valor_bruto)}</td><td>${moeda(o.total)}</td></tr>`).join("")
          || `<tr><td colspan="8">Ninguém ocupou esta vaga ainda.</td></tr>`}</tbody></table></div>
        ${mv.length ? `<h2 style="font-size:15px">Movimentações registradas no SGT</h2><table class="qg-hist"><tbody>${mv.map(m => `<tr><td>${fmtData(m.data)}</td><td>${esc(TIPOS[m.tipo] || m.tipo)}</td><td>${esc(m.nome || "")}</td><td>${m.origem && m.destino ? `${esc(m.origem)} → ${esc(m.destino)}` : ""}</td><td class="ajuda">${esc(m.obs || "")}${m.por ? ` · registrado por ${esc(m.por)}` : ""}</td></tr>`).join("")}</tbody></table>` : ""}`;
    } catch (e) { if (e.message !== "sessao") aviso("a-qd", traduzErro(e)); }
  }
  async function salvarVaga(l) {
    const v = (id) => $(id).value.trim() || null;
    const d = { papel: v("qd-papel"), eixo: v("qd-eixo"), cargo_atual: v("qd-nivel"), cargo_organograma: v("qd-org"), vinculo: v("qd-vinc"), local: v("qd-local"),
      nte_texto: v("qd-nte"), tipo_vaga: v("qd-tipo"), etapa_selecao: v("qd-etapa"), valor_bruto: num($("qd-bruto").value), fator_encargos: num($("qd-fator").value),
      ativa: $("qd-ativa").value === "true", previsao_inicio: v("qd-pini"), previsao_fim: v("qd-pfim"), observacao: v("qd-obs"),
      atualizado_em: new Date().toISOString(), atualizado_por: eu.id };
    try {
      await api(`/rest/v1/vaga?codigo=eq.${encodeURIComponent(l.codigo)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(d) });
      if (l.ocupacao_id && $("qd-lider")) await api(`/rest/v1/ocupacao_vaga?id=eq.${l.ocupacao_id}`, { method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ lider_nome: v("qd-lider"), atualizado_em: new Date().toISOString() }) });
      await carregar(true); desenharQuadro(); await detalhe(l.codigo); aviso("a-qd", "Dados da vaga salvos.", "ok");
    } catch (e) { if (e.message !== "sessao") aviso("a-qd", traduzErro(e)); }
  }
  async function renomear(l) {
    const novo = prompt(`Novo código para a vaga ${l.codigo}:`, l.provisoria ? "" : l.codigo);
    if (!novo || novo.trim().toUpperCase() === l.codigo) return;
    try {
      await api("/rest/v1/rpc/quadro_renomear_vaga", { method: "POST", body: JSON.stringify({ p_antigo: l.codigo, p_novo: novo }) });
      await carregar(true); desenharQuadro(); await detalhe(novo.trim().toUpperCase()); aviso("a-qd", "Código alterado. A memória da vaga foi mantida.", "ok");
    } catch (e) { if (e.message !== "sessao") aviso("a-qd", traduzErro(e)); }
  }

  // ---------------------------------------------------------------- atalho de movimentações
  async function listaPessoas() {
    if (pessoas) return pessoas;
    try { pessoas = await api("/rest/v1/colaborador?select=id,nome&situacao=neq.desligado&order=nome"); } catch { pessoas = []; }
    return pessoas;
  }
  async function movimentar(vagaInicial) {
    await carregar();
    const ps = await listaPessoas();
    const fundo = document.createElement("div"); fundo.className = "qg-mov";
    fundo.innerHTML = `<div role="dialog" aria-label="Registrar movimentação">
      <h2 style="margin-top:0">Registrar movimentação</h2>
      <p class="sub">O registro atualiza na hora o Quadro Geral, o Painel de Vagas, a memória da vaga e o cadastro da pessoa.</p>
      <datalist id="mv-vagas">${linhas.map(l => `<option value="${esc(l.codigo)}">${esc((l.ocupante ? l.ocupante + " · " : "") + (l.papel || ""))}</option>`).join("")}</datalist>
      <datalist id="mv-pessoas">${ps.map(p => `<option value="${esc(p.nome)}">`).join("")}</datalist>
      <form id="mv-form" novalidate>
        <label for="mv-tipo">Tipo</label><select id="mv-tipo">${Object.entries(TIPOS).map(([k, t]) => `<option value="${k}">${t}</option>`).join("")}</select>
        <label for="mv-vaga">Vaga</label><input id="mv-vaga" list="mv-vagas" value="${esc(vagaInicial || "")}" placeholder="Código da vaga">
        <div class="ajuda" id="mv-info"></div>
        <div id="mv-c-nome"><label for="mv-nome">Pessoa contratada</label><input id="mv-nome" list="mv-pessoas" placeholder="Nome completo"></div>
        <div id="mv-c-dest" class="oculto"><label for="mv-dest">Vaga de destino</label><input id="mv-dest" list="mv-vagas" placeholder="Código da nova vaga"></div>
        <div class="grade2"><div><label for="mv-data">Data</label><input type="date" id="mv-data" value="${hoje()}"></div>
          <div id="mv-c-valor"><label for="mv-valor">Valor bruto mensal (opcional)</label><input id="mv-valor" inputmode="decimal" placeholder="Usa o valor da vaga"></div></div>
        <div id="mv-c-lider"><label for="mv-lider">Liderança imediata (opcional)</label><input id="mv-lider" list="mv-pessoas"></div>
        <label for="mv-obs">Observação</label><textarea id="mv-obs" rows="2" placeholder="Ex.: motivo ou nº do processo (não informe diagnóstico)"></textarea>
        <div class="aviso" id="a-mv"></div>
        <div style="display:flex;gap:8px"><button type="submit">Registrar</button><button type="button" class="sec" id="mv-cancelar">Cancelar</button></div>
      </form></div>`;
    document.body.appendChild(fundo);
    const fechar = () => fundo.remove();
    fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(); });
    $("mv-cancelar").addEventListener("click", fechar);
    const ajustar = () => {
      const t = $("mv-tipo").value, l = linhas.find(x => x.codigo === $("mv-vaga").value.trim().toUpperCase() || x.codigo === $("mv-vaga").value.trim());
      $("mv-c-nome").classList.toggle("oculto", t !== "contratacao");
      $("mv-c-dest").classList.toggle("oculto", !["promocao", "realocacao"].includes(t));
      $("mv-c-valor").classList.toggle("oculto", !["contratacao", "promocao", "realocacao"].includes(t));
      $("mv-c-lider").classList.toggle("oculto", !["contratacao", "promocao", "realocacao"].includes(t));
      $("mv-info").textContent = !l ? "" : l.ocupante ? `Ocupante atual: ${l.ocupante} (${l.situacao})` : `Vaga sem ocupante (${l.situacao})`;
    };
    ["mv-tipo", "mv-vaga"].forEach(id => $(id).addEventListener("input", ajustar)); ajustar();
    $("mv-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const t = $("mv-tipo").value, cod = $("mv-vaga").value.trim(), l = linhas.find(x => x.codigo === cod || x.codigo === cod.toUpperCase());
      if (!l) return aviso("a-mv", "Escolha uma vaga da lista.");
      if (!$("mv-data").value) return aviso("a-mv", "Informe a data.");
      if (t === "contratacao" && l.ocupante && !confirm(`A vaga ${l.codigo} já tem ${l.ocupante}. Registrar mais uma pessoa nela?`)) return;
      const nome = $("mv-nome").value.trim(), pessoa = ps.find(p => p.nome.toLowerCase() === nome.toLowerCase());
      if (t === "contratacao" && !nome) return aviso("a-mv", "Informe o nome da pessoa contratada.");
      const dest = $("mv-dest").value.trim();
      if (["promocao", "realocacao"].includes(t) && !linhas.find(x => x.codigo === dest || x.codigo === dest.toUpperCase())) return aviso("a-mv", "Escolha a vaga de destino da lista.");
      const corpo = { p_tipo: t, p_data: $("mv-data").value, p_vaga: l.codigo,
        p_vaga_destino: ["promocao", "realocacao"].includes(t) ? (linhas.find(x => x.codigo === dest) || linhas.find(x => x.codigo === dest.toUpperCase())).codigo : null,
        p_nome: t === "contratacao" ? nome : null, p_colaborador: t === "contratacao" && pessoa ? pessoa.id : null,
        p_valor_bruto: num($("mv-valor").value), p_lider: $("mv-lider").value.trim() || null, p_obs: $("mv-obs").value.trim() || null };
      ocupado(e.target, true);
      try {
        const r = await api("/rest/v1/rpc/registrar_movimentacao", { method: "POST", body: JSON.stringify(corpo) });
        fechar(); await carregar(true);
        if (!$("v-qg").classList.contains("oculto")) { desenharQuadro(); if (aberta) detalhe(aberta); aviso("a-qg", `${TIPOS[t]} registrada para ${r.nome}.`, "ok"); }
        if (!$("v-pv").classList.contains("oculto")) { desenharPainel(); aviso("a-pv", `${TIPOS[t]} registrada para ${r.nome}.`, "ok"); }
      } catch (err) { if (err.message !== "sessao") aviso("a-mv", traduzErro(err)); ocupado(e.target, false); }
    });
  }
  $("qg-mov-btn").addEventListener("click", () => movimentar(aberta));

  // nova vaga
  $("qg-nova-btn").addEventListener("click", () => {
    const fundo = document.createElement("div"); fundo.className = "qg-mov";
    fundo.innerHTML = `<div role="dialog" aria-label="Nova vaga"><h2 style="margin-top:0">Nova vaga</h2>
      <form id="nv-form" novalidate><div class="grade2">
        <div><label for="nv-cod">Código</label><input id="nv-cod" placeholder="Ex.: SN11-001"></div>
        <div><label for="nv-vinc">Vínculo</label><select id="nv-vinc"><option>CLT</option><option>RPA</option><option>Bolsa estágio</option><option>Bolsista</option><option>PJ</option></select></div>
        <div><label for="nv-nivel">Nível</label><input id="nv-nivel" placeholder="Ex.: Sênior 1"></div>
        <div><label for="nv-eixo">Eixo</label><input id="nv-eixo" list="nv-eixos"></div>
        <div><label for="nv-local">Local</label><select id="nv-local"><option>Presencial</option><option>Remoto</option><option>Híbrido</option></select></div>
        <div><label for="nv-nte">NTE</label><input id="nv-nte" placeholder="Ex.: NTE 01 - Irecê"></div>
        <div><label for="nv-bruto">Valor bruto mensal (R$)</label><input id="nv-bruto" inputmode="decimal"></div>
        <div><label for="nv-fator">Fator de encargos</label><input id="nv-fator" inputmode="decimal" value="2,00"></div>
        <div><label for="nv-desde">Aberta desde</label><input type="date" id="nv-desde" value="${hoje()}"></div>
      </div>
      <datalist id="nv-eixos">${[...new Set(linhas.map(l => l.eixo).filter(Boolean))].map(x => `<option value="${esc(x)}">`).join("")}</datalist>
      <label for="nv-papel">Papel (descrição da vaga)</label><input id="nv-papel">
      <div class="aviso" id="a-nv"></div>
      <div style="display:flex;gap:8px"><button type="submit">Criar vaga</button><button type="button" class="sec" id="nv-cancelar">Cancelar</button></div></form></div>`;
    document.body.appendChild(fundo);
    const fechar = () => fundo.remove();
    $("nv-cancelar").addEventListener("click", fechar); fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(); });
    $("nv-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const v = (id) => $(id).value.trim();
      if (!v("nv-cod")) return aviso("a-nv", "Informe o código da vaga.");
      const p = { codigo: v("nv-cod"), vinculo: v("nv-vinc"), cargo_atual: v("nv-nivel"), eixo: v("nv-eixo"), local: v("nv-local"), nte_texto: v("nv-nte"),
        valor_bruto: num(v("nv-bruto")), fator_encargos: num(v("nv-fator")), aberta_desde: v("nv-desde"), papel: v("nv-papel"), tipo_vaga: "Replanejamento" };
      try {
        await api("/rest/v1/rpc/quadro_nova_vaga", { method: "POST", body: JSON.stringify({ p }) });
        fechar(); await carregar(true); desenharQuadro(); detalhe(p.codigo.toUpperCase()); aviso("a-qg", "Vaga criada.", "ok");
      } catch (err) { if (err.message !== "sessao") aviso("a-nv", /duplicate|vaga_pkey/i.test(err.message) ? "Já existe uma vaga com este código." : traduzErro(err)); }
    });
  });

  // ---------------------------------------------------------------- Painel de Vagas
  const oPV = { campo: "dias_vacancia", inv: true };
  let filtroPV = "abertas";
  async function abrirPainel() {
    mostrar("v-pv");
    $("pv-corpo").innerHTML = `<tr><td colspan="10">Carregando…</td></tr>`;
    try { await carregar(true); desenharPainel(); } catch (e) { if (e.message !== "sessao") aviso("a-pv", traduzErro(e)); }
  }
  function filtradosPV() {
    const t = $("pv-busca").value.trim().toLowerCase(), e = $("pv-eixo").value, v = $("pv-vinc").value, lo = $("pv-local").value;
    return ordenar(linhas.filter(l => l.situacao !== "Inativa" && casa(l, t) && (!e || l.eixo === e) && (!v || l.vinculo === v) && (!lo || l.local === lo) &&
      (filtroPV === "todas" || (filtroPV === "abertas" ? ABERTAS.includes(l.situacao) : filtroPV === "ocupadas" ? l.situacao.startsWith("Ocupada") : l.situacao === filtroPV))), oPV.campo, oPV.inv);
  }
  function desenharPainel() {
    const ativas = linhas.filter(l => l.situacao !== "Inativa");
    const c = (f) => ativas.filter(f).length;
    const vac = ativas.filter(l => l.dias_vacancia != null).map(l => l.dias_vacancia);
    const media = vac.length ? Math.round(vac.reduce((a, b) => a + b, 0) / vac.length) : null;
    const kpis = [["todas", "Vagas no quadro", ativas.length], ["ocupadas", "Ocupadas", c(l => l.situacao.startsWith("Ocupada"))],
      ["abertas", "Abertas (todas)", c(l => ABERTAS.includes(l.situacao))], ["Aberta", "Aguardando ação", c(l => l.situacao === "Aberta")],
      ["Em seleção", "Em seleção", c(l => l.situacao === "Em seleção")], ["Em contratação", "Em contratação", c(l => l.situacao === "Em contratação")],
      ["Sem previsão", "Sem previsão", c(l => l.situacao === "Sem previsão")]];
    $("pv-kpis").innerHTML = kpis.map(([k, r, n]) => `<div class="qg-kpi${filtroPV === k ? " on" : ""}" data-k="${esc(k)}"><b>${n}</b><span>${r}</span></div>`).join("")
      + `<div class="qg-kpi" style="cursor:default"><b>${media == null ? "—" : media + " d"}</b><span>Vacância média</span></div>`;
    const lista = filtradosPV();
    $("pv-resumo").textContent = `${lista.length} vaga(s) na lista. Vacância contada a partir da saída do último ocupante ou da abertura da vaga.`;
    $("pv-corpo").innerHTML = lista.map(l => `<tr data-c="${esc(l.codigo)}"><td><b>${esc(l.codigo)}</b></td><td>${sit(l.situacao)}</td><td title="${esc(l.papel || "")}">${esc(l.papel || "")}</td>
      <td>${esc(l.eixo || "")}</td><td>${esc(l.vinculo || "")}</td><td>${esc(l.local || "")}</td><td>${esc(l.ocupante || "")}</td>
      <td>${fmtData(l.aberta_desde)}</td><td>${vacancia(l.dias_vacancia)}</td><td>${fmtData(l.previsao_inicio)}</td></tr>`).join("")
      || `<tr><td colspan="10">Nenhuma vaga nesta seleção.</td></tr>`;
  }
  $("pv-kpis").addEventListener("click", (e) => { const k = e.target.closest("[data-k]"); if (k) { filtroPV = k.dataset.k; desenharPainel(); } });
  ["pv-busca", "pv-eixo", "pv-vinc", "pv-local"].forEach(id => $(id).addEventListener("input", desenharPainel));
  ligarOrdem("v-pv", oPV, desenharPainel);
  $("pv-corpo").addEventListener("click", async (e) => {
    const tr = e.target.closest("tr[data-c]"); if (!tr) return;
    if (pode("admin", "rh") || temModulo("quadro_geral")) { await abrirQuadro(); detalhe(tr.dataset.c); }
  });
  $("pv-csv").addEventListener("click", () => baixar("painel-de-vagas", [
    ["codigo", "Código"], ["situacao", "Situação"], ["papel", "Papel"], ["eixo", "Eixo"], ["vinculo", "Vínculo"], ["local", "Local"], ["nte_texto", "NTE"],
    ["ocupante", "Ocupante"], ["aberta_desde", "Aberta desde", l => fmtData(l.aberta_desde)], ["dias_vacancia", "Dias de vacância"],
    ["previsao_inicio", "Previsão de início", l => fmtData(l.previsao_inicio)], ["observacao", "Observações"]], filtradosPV()));

  window.Quadro = { abrir: abrirQuadro, movimentar };
  window.PainelVagas = { abrir: abrirPainel };
})();
