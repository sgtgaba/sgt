// SGT · Orçamento do Projeto — custo de pessoal mês a mês, alimentado pelo Quadro Geral (ocupações e movimentações).
// Realizado: meses até o atual. Projetado: quem ocupa hoje, até o fim do ano. Vagas abertas: vagas sem ocupante, pela previsão.
// Usa as funções globais do index.html: api, aviso, mostrar, esc, eu, pode, temModulo, traduzErro.
(() => {
  const $ = (id) => document.getElementById(id);
  let dados = [], teto = null, ano = new Date().getFullYear();
  const moeda = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

  document.head.insertAdjacentHTML("beforeend", `<style>
    .orc-graf{display:grid;grid-template-columns:repeat(12,1fr);gap:6px;align-items:end;height:200px;margin:16px 0 4px;padding:0 4px;border-bottom:1px solid var(--borda)}
    .orc-col{display:flex;flex-direction:column-reverse;height:100%;cursor:default}
    .orc-col i{display:block;width:100%;border-radius:3px 3px 0 0}
    .orc-meses{display:grid;grid-template-columns:repeat(12,1fr);gap:6px;font-size:11.5px;color:var(--texto-2);text-align:center;padding:0 4px}
    .orc-leg{display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px;color:var(--texto-2);margin-top:8px}
    .orc-leg span::before{content:"";display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;background:var(--c)}
    .orc-teto{display:flex;gap:8px;align-items:end;flex-wrap:wrap;margin-top:10px}
    .orc-teto input{width:auto;flex:0 1 200px;margin:0;padding:9px 10px;font-size:14px} .orc-teto button{width:auto;margin:0;padding:9px 14px;font-size:14px}
  </style>`);

  $("cartao").querySelector(".rodape").insertAdjacentHTML("beforebegin", `
  <section id="v-orc" class="oculto">
    <div class="topo"><div><h1>Orçamento do Projeto</h1><div class="ajuda" style="margin:0">Custo de pessoal com encargos, alimentado pelo Quadro Geral</div></div><button class="sec" id="orc-voltar">← Início</button></div>
    <div class="qg-barra">
      <select id="orc-ano"></select>
      <select id="orc-eixo"><option value="">Todos os eixos</option></select>
      <select id="orc-vinc"><option value="">Todos os vínculos</option></select>
      <button class="sec" id="orc-csv">Baixar planilha</button>
    </div>
    <div class="qg-kpis" id="orc-kpis"></div>
    <div id="orc-teto"></div>
    <div class="orc-graf" id="orc-graf"></div><div class="orc-meses">${MESES.map(m => `<span>${m}</span>`).join("")}</div>
    <div class="orc-leg"><span style="--c:#E00D7E">Realizado</span><span style="--c:#ED7F0C">Projetado (quem está no time)</span><span style="--c:#27B2B5">Vagas abertas previstas</span></div>
    <h2>Mês a mês</h2><div class="qg-tabela"><table><thead><tr><th>Mês</th><th>Realizado</th><th>Projetado</th><th>Vagas abertas</th><th>Total</th></tr></thead><tbody id="orc-meses"></tbody></table></div>
    <h2>Por eixo</h2><div class="qg-tabela"><table><thead><tr><th>Eixo</th><th>Realizado</th><th>Projetado</th><th>Vagas abertas</th><th>Total no ano</th></tr></thead><tbody id="orc-eixos"></tbody></table></div>
    <p class="ajuda">Os valores usam o salário ou bolsa bruta de cada ocupação multiplicado pelo fator de encargos da vaga, conforme a planilha de Planejamento. Para mudar um valor, edite a vaga no Quadro Geral.</p>
    <div class="aviso" id="a-orc"></div>
  </section>`);
  $("orc-voltar").addEventListener("click", () => mostrar("v-inicio"));
  const a0 = new Date().getFullYear();
  $("orc-ano").innerHTML = [a0 - 1, a0, a0 + 1].map(a => `<option${a === a0 ? " selected" : ""}>${a}</option>`).join("");

  async function abrir() { mostrar("v-orc"); await carregar(); }
  async function carregar() {
    ano = +$("orc-ano").value;
    $("orc-meses").innerHTML = `<tr><td colspan="5">Carregando…</td></tr>`;
    try {
      const [d, t] = await Promise.all([api("/rest/v1/rpc/orcamento_mensal", { method: "POST", body: JSON.stringify({ p_ano: ano }) }),
        api(`/rest/v1/orcamento_teto?select=*&ano=eq.${ano}`)]);
      dados = d; teto = (t || []).find(x => x.eixo === "Total do projeto") || null;
      const op = (c) => [...new Set(dados.map(x => x[c]))].sort((a, b) => a.localeCompare(b, "pt-BR"));
      const enc = (id, c, r) => { const s = $(id), v = s.value; s.innerHTML = `<option value="">${r}</option>` + op(c).map(x => `<option>${esc(x)}</option>`).join(""); s.value = v; };
      enc("orc-eixo", "eixo", "Todos os eixos"); enc("orc-vinc", "vinculo", "Todos os vínculos");
      desenhar();
    } catch (e) { if (e.message !== "sessao") aviso("a-orc", traduzErro(e)); }
  }
  function filtrados() { const e = $("orc-eixo").value, v = $("orc-vinc").value; return dados.filter(x => (!e || x.eixo === e) && (!v || x.vinculo === v)); }
  const soma = (l, c) => l.reduce((a, x) => a + Number(x[c] || 0), 0);
  function desenhar() {
    const l = filtrados();
    const porMes = MESES.map((_, i) => { const m = l.filter(x => +x.mes.slice(5, 7) === i + 1); return { r: soma(m, "realizado"), p: soma(m, "projetado"), a: soma(m, "vagas_abertas") }; });
    const R = soma(l, "realizado"), P = soma(l, "projetado"), A = soma(l, "vagas_abertas"), T = R + P + A;
    const filtroTotal = !$("orc-eixo").value && !$("orc-vinc").value;
    const kp = [["Realizado até agora", moeda(R)], ["Projetado até dezembro", moeda(P)], ["Vagas abertas previstas", moeda(A)], ["Estimativa do ano", moeda(T)]];
    if (teto && filtroTotal) kp.push(["Teto aprovado", moeda(teto.valor)], [T > teto.valor ? "Acima do teto" : "Saldo estimado", moeda(Math.abs(teto.valor - T))]);
    $("orc-kpis").innerHTML = kp.map(([r, v]) => `<div class="qg-kpi" style="cursor:default"><b style="font-size:18px">${v}</b><span>${r}</span></div>`).join("");
    $("orc-teto").innerHTML = pode("admin") ? `<div class="orc-teto"><div><label for="orc-tv" style="margin:0 0 4px">Teto aprovado para ${ano} (total do projeto)</label>
      <input id="orc-tv" inputmode="decimal" value="${teto ? String(teto.valor).replace(".", ",") : ""}" placeholder="R$"></div><button class="sec" id="orc-ts">Salvar teto</button></div>` : "";
    if ($("orc-ts")) $("orc-ts").addEventListener("click", salvarTeto);
    const max = Math.max(1, ...porMes.map(m => m.r + m.p + m.a));
    $("orc-graf").innerHTML = porMes.map((m, i) => `<div class="orc-col" title="${MESES[i]}: ${moeda(m.r + m.p + m.a)}">
      <i style="height:${m.r / max * 100}%;background:#E00D7E"></i><i style="height:${m.p / max * 100}%;background:#ED7F0C"></i><i style="height:${m.a / max * 100}%;background:#27B2B5"></i></div>`).join("");
    $("orc-meses").innerHTML = porMes.map((m, i) => `<tr><td>${MESES[i]}/${ano}</td><td class="num">${moeda(m.r)}</td><td class="num">${moeda(m.p)}</td><td class="num">${moeda(m.a)}</td><td class="num"><b>${moeda(m.r + m.p + m.a)}</b></td></tr>`).join("")
      + `<tr><td><b>Total</b></td><td class="num"><b>${moeda(R)}</b></td><td class="num"><b>${moeda(P)}</b></td><td class="num"><b>${moeda(A)}</b></td><td class="num"><b>${moeda(T)}</b></td></tr>`;
    const eixos = [...new Set(l.map(x => x.eixo))].map(e => { const m = l.filter(x => x.eixo === e); return { e, r: soma(m, "realizado"), p: soma(m, "projetado"), a: soma(m, "vagas_abertas") }; })
      .sort((a, b) => (b.r + b.p + b.a) - (a.r + a.p + a.a));
    $("orc-eixos").innerHTML = eixos.map(x => `<tr><td>${esc(x.e)}</td><td class="num">${moeda(x.r)}</td><td class="num">${moeda(x.p)}</td><td class="num">${moeda(x.a)}</td><td class="num"><b>${moeda(x.r + x.p + x.a)}</b></td></tr>`).join("");
  }
  async function salvarTeto() {
    const v = Number(String($("orc-tv").value).replace(/[R$\s.]/g, "").replace(",", "."));
    if (!v || v < 0) return aviso("a-orc", "Informe o valor do teto.");
    try {
      await api("/rest/v1/orcamento_teto", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ ano, eixo: "Total do projeto", valor: v, atualizado_por: eu.id, atualizado_em: new Date().toISOString() }) });
      await carregar(); aviso("a-orc", "Teto salvo.", "ok");
    } catch (e) { if (e.message !== "sessao") aviso("a-orc", traduzErro(e)); }
  }
  ["orc-eixo", "orc-vinc"].forEach(id => $(id).addEventListener("input", desenhar));
  $("orc-ano").addEventListener("input", carregar);
  $("orc-csv").addEventListener("click", () => {
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`, n = (v) => Number(v || 0).toFixed(2).replace(".", ",");
    const linhas = [["Mês", "Eixo", "Vínculo", "Realizado", "Projetado", "Vagas abertas", "Total"].map(q).join(";"),
      ...filtrados().map(x => [x.mes.slice(0, 7), x.eixo, x.vinculo, n(x.realizado), n(x.projetado), n(x.vagas_abertas), n(+x.realizado + +x.projetado + +x.vagas_abertas)].map(q).join(";"))];
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + linhas.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    a.download = `orcamento-${ano}.csv`; a.click();
  });

  window.Orcamento = { abrir };
})();
