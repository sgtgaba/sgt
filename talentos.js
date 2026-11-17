// SGT · Módulo Banco de Talentos (gestão)
// Usa as funções globais do index.html: api, aviso, mostrar, esc, eu, pode, traduzErro.
(() => {
  const $ = (id) => document.getElementById(id);
  const PORTAL = "https://sgtgaba.github.io/sgt/talentos/";
  const COMP = { comunicacao: "Comunicação", organizacao: "Organização", equipe: "Trabalho em equipe", resolucao: "Resolução de problemas",
    resultados: "Foco em resultados", escuta: "Escuta e postura democrática", dados: "Análise de dados", tecnologia: "Tecnologia",
    pedagogico: "Visão pedagógica", interpretacao: "Interpretação (teste 1)", logica: "Raciocínio lógico (teste 2)" };
  const ETAPA_RH = { nova: "Nova", em_analise: "Em análise", entrevista: "Entrevista", aprovada: "Aprovada", reprovada: "Não selecionada", banco: "Banco de talentos" };
  let vagas = [], ranking = [], questoes = [], situacoes = [], cand = null, editQ = null, editS = null, editV = null;

  document.head.insertAdjacentHTML("beforeend", `<style>
    .abas{display:flex;gap:6px;flex-wrap:wrap;margin:14px 0 4px}
    .abas button{width:auto;margin:0;padding:8px 14px;font-size:14px;background:#fff;color:var(--texto);border:1px solid var(--borda)}
    .abas button.on{background:var(--cor);color:#fff;border-color:var(--cor)}
    .tab{width:100%;border-collapse:collapse;font-size:13.5px;margin-top:12px}
    .tab th{text-align:left;font-size:12px;color:var(--texto-2);font-weight:600;padding:8px 6px;border-bottom:1px solid var(--borda);white-space:nowrap}
    .tab td{padding:9px 6px;border-bottom:1px solid #f1eaee;vertical-align:top}
    .tab tr.cl{cursor:pointer} .tab tr.cl:hover td{background:var(--cor-suave)}
    .nota{display:inline-block;min-width:42px;text-align:center;font-weight:700;border-radius:999px;padding:2px 8px;font-size:12.5px}
    .n-a{background:var(--ok-fundo);color:var(--ok)} .n-m{background:var(--alerta-fundo);color:var(--alerta)} .n-b{background:var(--erro-fundo);color:var(--erro)}
    .barra{height:8px;background:#f1eaee;border-radius:6px;overflow:hidden;margin-top:4px} .barra i{display:block;height:100%;background:linear-gradient(90deg,var(--magenta),var(--laranja))}
    .comps{display:grid;grid-template-columns:1fr 1fr;gap:10px 22px;margin-top:8px;font-size:13px}
    .persona{border:1px solid var(--borda);border-radius:var(--raio);padding:18px;margin-top:12px}
    .persona .cab{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start}
    .grande{font-size:34px;font-weight:800;color:var(--cor);line-height:1}
    .kv{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;margin-top:14px}
    .kv div{background:var(--fundo);border-radius:10px;padding:10px;font-size:13px} .kv b{display:block;font-size:15px;margin-top:2px}
    .texto{font-size:14px;line-height:1.55;white-space:pre-wrap;margin:4px 0 0}
    .qlinha{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--borda);border-radius:var(--raio);padding:12px;margin-top:8px;cursor:pointer;font-size:14px;line-height:1.45}
    .qlinha:hover{background:var(--cor-suave)} .qlinha .tags{flex:none}
    .altl{display:grid;grid-template-columns:24px 1fr;gap:8px;align-items:center;margin-top:6px} .altl input[type=radio]{accent-color:var(--cor);width:18px;height:18px}
    .prev svg{max-width:100%;height:auto;border:1px solid var(--borda);border-radius:10px;margin-top:8px}
    textarea.cod{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;min-height:90px}
    #v-tal textarea,#v-tal-cand textarea,#v-tal-q textarea,#v-tal-s textarea,#v-tal-v textarea{width:100%;padding:10px 12px;font-size:15px;border:1px solid var(--borda);border-radius:var(--raio);font-family:inherit}
    #v-tal input[type=number],#v-tal-v input[type=number]{width:100%;padding:12px 14px;font-size:16px;border:1px solid var(--borda);border-radius:var(--raio)}
    @media print{body{background:#fff;padding:0}.cartao{box-shadow:none;max-width:none!important}.cartao>*:not(#v-tal-cand),#v-tal-cand .topo button,#v-tal-cand .naoimp{display:none!important}}
    @media (max-width:640px){.comps{grid-template-columns:1fr}.tab .esc{display:none}}
  </style>`);

  const voltar = (alvo) => `<button class="sec" data-ir="${alvo}">← Voltar</button>`;
  $("cartao").querySelector(".rodape").insertAdjacentHTML("beforebegin", `
  <section id="v-tal" class="oculto">
    <div class="topo"><div><h1>Banco de Talentos</h1><div class="ajuda" style="margin:0">Inscrições, ranking e aderência às vagas · <a href="${PORTAL}" target="_blank" rel="noopener" style="color:var(--cor);font-weight:600">abrir portal de inscrição</a></div></div>${voltar("v-inicio")}</div>
    <div class="abas" id="tal-abas">
      <button data-aba="rank" class="on">Ranking</button><button data-aba="quest">Questões</button><button data-aba="sit">Perfil comportamental</button><button data-aba="vagas">Vagas e personas</button>
    </div>
    <div class="aviso" id="a-tal"></div>
    <div id="tal-rank">
      <div class="grade2" style="margin-top:6px">
        <div><label for="tal-vaga">Vaga</label><select id="tal-vaga"></select></div>
        <div><label for="tal-status">Mostrar</label><select id="tal-status"><option value="concluida">Inscrições concluídas</option><option value="em_andamento">Em andamento</option><option value="">Todas</option></select></div>
      </div>
      <div class="btns"><button class="sec" id="tal-csv">Baixar planilha (CSV)</button><button class="sec" id="tal-outras">Ver quem aceita outras vagas com boa aderência</button></div>
      <div id="tal-tabela"></div>
    </div>
    <div id="tal-quest" class="oculto">
      <div class="grade2" style="margin-top:6px">
        <div><label for="tq-area">Teste</label><select id="tq-area"><option value="">Todos</option><option value="interpretacao">Teste 1 · Interpretação</option><option value="logica">Teste 2 · Raciocínio lógico</option></select></div>
        <div><label for="tq-nivel">Nível</label><select id="tq-nivel"><option value="">Todos</option><option value="padrao">Padrão (articuladores)</option><option value="estagio">Estágio (mais simples)</option></select></div>
      </div>
      <p class="ajuda">Cada teste sorteia 10 questões ativas do nível da vaga (completando com o outro nível, se faltar), em ordem e alternativas embaralhadas a cada acesso. Mantenha pelo menos 10 ativas por teste e nível.</p>
      <div id="tq-cont" class="ajuda"></div>
      <div class="btns"><button id="tq-nova">Nova questão</button></div>
      <div id="tq-lista"></div>
    </div>
    <div id="tal-sit" class="oculto">
      <p class="ajuda">Situações do bloco 3. Cada alternativa soma pontos nas competências (0 a 3). A nota de cada competência é o percentual do máximo possível.</p>
      <div class="btns"><button id="ts-nova">Nova situação</button></div>
      <div id="ts-lista"></div>
    </div>
    <div id="tal-vagas" class="oculto">
      <p class="ajuda">As descrições padronizadas são as personas usadas na aderência: 70% desempenho (testes e competências, com os pesos da vaga) e 30% requisitos atendidos.</p>
      <div class="btns"><button id="tv-nova">Nova vaga</button></div>
      <div id="tv-lista"></div>
    </div>
  </section>

  <section id="v-tal-cand" class="oculto">
    <div class="topo"><div><h1>Relatório do candidato</h1><div class="ajuda" style="margin:0">Aderência à persona da vaga</div></div><div style="display:flex;gap:8px"><button class="sec" id="tc-imprimir" style="margin:0;width:auto;padding:9px 14px;font-size:14px">Imprimir / PDF</button>${voltar("v-tal")}</div></div>
    <div id="tc-corpo"></div>
    <div class="naoimp">
      <h2>Andamento no RH</h2>
      <div class="grade2"><div><label for="tc-etapa">Etapa</label><select id="tc-etapa">${Object.entries(ETAPA_RH).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></div></div>
      <label for="tc-obs">Observações internas</label><textarea id="tc-obs" rows="3"></textarea>
      <div class="aviso" id="a-tc"></div>
      <button id="tc-salvar">Salvar andamento</button>
    </div>
  </section>

  <section id="v-tal-q" class="oculto">
    <div class="topo"><div><h1 id="tq-tit">Questão</h1></div>${voltar("v-tal")}</div>
    <div class="grade2">
      <div><label for="eq-area">Teste</label><select id="eq-area"><option value="interpretacao">Teste 1 · Interpretação</option><option value="logica">Teste 2 · Raciocínio lógico</option></select></div>
      <div><label for="eq-nivel">Nível</label><select id="eq-nivel"><option value="padrao">Padrão</option><option value="estagio">Estágio</option></select></div>
    </div>
    <label for="eq-enun">Enunciado</label><textarea id="eq-enun" rows="4"></textarea>
    <label for="eq-fig">Figura (opcional, código SVG)</label><textarea id="eq-fig" class="cod" placeholder="<svg ...>...</svg>"></textarea>
    <div class="prev" id="eq-prev"></div>
    <label>Alternativas <span class="ajuda">(marque a correta)</span></label>
    <div id="eq-alts"></div>
    <button class="link" id="eq-mais" style="width:auto">+ alternativa</button>
    <label for="eq-exp">Explicação do gabarito (só a equipe vê)</label><textarea id="eq-exp" rows="2"></textarea>
    <label class="check"><input type="checkbox" id="eq-ativa" checked> Questão ativa (pode ser sorteada)</label>
    <div class="aviso" id="a-eq"></div>
    <div class="btns"><button id="eq-salvar">Salvar questão</button></div>
  </section>

  <section id="v-tal-s" class="oculto">
    <div class="topo"><div><h1 id="es-tit">Situação</h1></div>${voltar("v-tal")}</div>
    <label for="es-enun">Situação apresentada</label><textarea id="es-enun" rows="3"></textarea>
    <p class="ajuda">Em cada alternativa, informe os pontos assim: <b>comunicacao:3, equipe:1</b>. Competências: ${Object.keys(COMP).filter(k => !["interpretacao", "logica"].includes(k)).join(", ")}.</p>
    <div id="es-ops"></div>
    <button class="link" id="es-mais" style="width:auto">+ alternativa</button>
    <label class="check"><input type="checkbox" id="es-ativa" checked> Situação ativa</label>
    <div class="aviso" id="a-es"></div>
    <div class="btns"><button id="es-salvar">Salvar situação</button></div>
  </section>

  <section id="v-tal-v" class="oculto">
    <div class="topo"><div><h1 id="ev-tit">Vaga</h1></div>${voltar("v-tal")}</div>
    <div class="grade2">
      <div><label for="ev-id">Código</label><input id="ev-id" type="text" placeholder="ex.: art-senior"></div>
      <div><label for="ev-titulo">Título</label><input id="ev-titulo" type="text"></div>
      <div><label for="ev-qtd">Vagas abertas</label><input id="ev-qtd" type="number" min="0"></div>
      <div><label for="ev-nivel">Nível dos testes</label><select id="ev-nivel"><option value="padrao">Padrão</option><option value="estagio">Estágio (mais simples)</option></select></div>
      <div><label for="ev-jornada">Jornada</label><input id="ev-jornada" type="text"></div>
      <div><label for="ev-rem">Remuneração (opcional)</label><input id="ev-rem" type="text"></div>
    </div>
    <label for="ev-local">Local</label><input id="ev-local" type="text">
    <label for="ev-resumo">Resumo</label><textarea id="ev-resumo" rows="2"></textarea>
    <label for="ev-atrib">Atribuições (uma por linha)</label><textarea id="ev-atrib" rows="5"></textarea>
    <label for="ev-pre">Pré-requisitos (um por linha)</label><textarea id="ev-pre" rows="4"></textarea>
    <label for="ev-des">Desejável (um por linha)</label><textarea id="ev-des" rows="3"></textarea>
    <h2>Persona: pesos de cada dimensão (0 a 3)</h2>
    <div class="comps" id="ev-pesos"></div>
    <h2>Requisitos conferidos automaticamente</h2>
    <label class="check"><input type="checkbox" id="ev-r-lic"> Licenciatura</label>
    <label class="check"><input type="checkbox" id="ev-r-est"> Matrícula ativa (estágio)</label>
    <label class="check"><input type="checkbox" id="ev-r-mud"> Residir ou mudar para a sede do NTE</label>
    <label class="check"><input type="checkbox" id="ev-r-via"> Disponibilidade para viagens</label>
    <label for="ev-r-anos">Mínimo de anos na Educação Básica (vazio = não exigir)</label><input id="ev-r-anos" type="number" min="0">
    <label class="check"><input type="checkbox" id="ev-aberta"> Vaga aberta no portal</label>
    <div class="aviso" id="a-ev"></div>
    <div class="btns"><button id="ev-salvar">Salvar vaga</button></div>
  </section>`);

  ["v-tal", "v-tal-cand", "v-tal-q", "v-tal-s", "v-tal-v"].forEach(id =>
    $(id).querySelectorAll("[data-ir]").forEach(b => b.addEventListener("click", () => mostrar(b.dataset.ir))));

  const classe = (n) => n == null ? "" : n >= 70 ? "n-a" : n >= 50 ? "n-m" : "n-b";
  const nota = (n, suf = "") => n == null ? "—" : `<span class="nota ${classe(suf ? n * 10 : n)}">${n}${suf}</span>`;
  const linhas = (t) => (t || "").split("\n").map(s => s.trim()).filter(Boolean);
  const titulo = (id) => (vagas.find(v => v.id === id) || {}).titulo || id;

  // ---------- abas
  let aba = "rank";
  $("tal-abas").querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    aba = b.dataset.aba;
    $("tal-abas").querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
    ["rank", "quest", "sit", "vagas"].forEach(a => $("tal-" + a).classList.toggle("oculto", a !== aba));
    aviso("a-tal", "");
    if (aba === "quest") carregarQuestoes(); else if (aba === "sit") carregarSituacoes(); else if (aba === "vagas") listarVagas(); else carregarRanking();
  }));

  async function abrir() {
    mostrar("v-tal"); aviso("a-tal", "");
    try {
      vagas = await api("/rest/v1/tal_vaga?select=*&order=ordem");
      $("tal-vaga").innerHTML = vagas.map(v => `<option value="${esc(v.id)}">${esc(v.titulo)}${v.aberta ? "" : " (fechada)"}</option>`).join("");
      await carregarRanking();
    } catch (e) { if (e.message !== "sessao") aviso("a-tal", traduzErro(e)); }
  }

  // ---------- ranking
  async function carregarRanking() {
    const v = $("tal-vaga").value, st = $("tal-status").value;
    $("tal-tabela").innerHTML = `<p class="ajuda">Carregando…</p>`;
    try {
      ranking = await api(`/rest/v1/tal_ranking?select=*&vaga_id=eq.${encodeURIComponent(v)}${st ? "&status=eq." + st : ""}`);
      ranking.sort((a, b) => ((b.aderencia || {}).aderencia || 0) - ((a.aderencia || {}).aderencia || 0) || (a.tempo_total || 9e9) - (b.tempo_total || 9e9));
      desenharRanking();
    } catch (e) { if (e.message !== "sessao") aviso("a-tal", traduzErro(e)); }
  }
  function melhorOutra(r) {
    const o = Object.entries(r.aderencia_outras || {}).filter(([, n]) => n != null).sort((a, b) => b[1] - a[1])[0];
    return o ? `${nota(o[1])} <small class="ajuda">${esc(titulo(o[0]))}</small>` : "—";
  }
  function desenharRanking() {
    if (!ranking.length) { $("tal-tabela").innerHTML = `<p class="ajuda" style="margin-top:14px">Nenhuma inscrição por aqui ainda.</p>`; return; }
    $("tal-tabela").innerHTML = `<div style="overflow-x:auto"><table class="tab"><thead><tr><th>#</th><th>Candidato(a)</th><th class="esc">Local</th><th>Teste 1</th><th>Teste 2</th><th>Aderência</th><th class="esc">Melhor outra vaga</th><th class="esc">Etapa</th></tr></thead><tbody>${
      ranking.map((r, i) => { const a = r.aderencia || {}; return `<tr class="cl" data-id="${r.id}">
        <td>${i + 1}º</td><td><b>${esc(r.nome)}</b>${r.fora_do_tempo ? ` <span class="tag" style="background:var(--erro-fundo);color:var(--erro)">fora do tempo</span>` : ""}${r.status !== "concluida" ? ` <span class="tag">${r.status === "em_andamento" ? "em andamento" : esc(r.status)}</span>` : ""}<div class="ajuda" style="margin:0">${esc(r.email)}</div></td>
        <td class="esc">${esc([r.municipio, r.uf].filter(Boolean).join("/"))}</td>
        <td>${nota(r.teste_interpretacao, "/10")}</td><td>${nota(r.teste_logica, "/10")}</td>
        <td>${nota(a.aderencia)}${a.requisitos_total ? `<div class="ajuda" style="margin:2px 0 0">req. ${a.requisitos_ok}/${a.requisitos_total}</div>` : ""}</td>
        <td class="esc">${r.aceita_outras ? melhorOutra(r) : `<span class="ajuda">não aceita</span>`}</td>
        <td class="esc">${ETAPA_RH[r.etapa_rh] || ""}</td></tr>`; }).join("")}</tbody></table></div>`;
    $("tal-tabela").querySelectorAll("tr.cl").forEach(tr => tr.addEventListener("click", () => abrirCand(tr.dataset.id)));
  }
  $("tal-vaga").addEventListener("change", carregarRanking);
  $("tal-status").addEventListener("change", carregarRanking);

  $("tal-outras").addEventListener("click", async () => {
    // candidatos concluídos de OUTRAS vagas que aceitam ser realocados, ordenados pela aderência à vaga selecionada
    const v = $("tal-vaga").value;
    try {
      const todos = await api(`/rest/v1/tal_ranking?select=*&status=eq.concluida&aceita_outras=is.true&vaga_id=neq.${encodeURIComponent(v)}`);
      ranking = todos.map(r => ({ ...r, aderencia: { aderencia: (r.aderencia_outras || {})[v] }, aderencia_outras: { [r.vaga_id]: (r.aderencia || {}).aderencia } }))
        .sort((a, b) => (b.aderencia.aderencia || 0) - (a.aderencia.aderencia || 0));
      desenharRanking();
      aviso("a-tal", `Inscritos em outras vagas que aceitam ser considerados para "${titulo(v)}". A coluna Aderência mostra a nota para esta vaga.`, "ok");
    } catch (e) { if (e.message !== "sessao") aviso("a-tal", traduzErro(e)); }
  });

  $("tal-csv").addEventListener("click", () => {
    const cab = ["Posição", "Nome", "E-mail", "Município", "UF", "Vaga", "Status", "Etapa RH", "Teste 1 (0-10)", "Teste 2 (0-10)", "Fora do tempo", "Aderência", "Desempenho", "Requisitos", "Aceita outras vagas",
      ...vagas.map(v => "Aderência · " + v.titulo)];
    const q = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const linhasCsv = ranking.map((r, i) => { const a = r.aderencia || {};
      return [i + 1, r.nome, r.email, r.municipio, r.uf, r.vaga, r.status, ETAPA_RH[r.etapa_rh], r.teste_interpretacao, r.teste_logica, r.fora_do_tempo ? "sim" : "não",
        a.aderencia, a.desempenho, a.requisitos_total ? `${a.requisitos_ok}/${a.requisitos_total}` : "", r.aceita_outras ? "sim" : "não",
        ...vagas.map(v => v.id === r.vaga_id ? a.aderencia : (r.aderencia_outras || {})[v.id])].map(q).join(";"); });
    const blob = new Blob(["﻿" + [cab.map(q).join(";"), ...linhasCsv].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `banco_talentos_${$("tal-vaga").value}.csv`; a.click();
  });

  // ---------- relatório do candidato (persona)
  async function abrirCand(id) {
    try {
      const [i] = await api(`/rest/v1/tal_inscricao?id=eq.${id}&select=*`);
      const [cr] = await api(`/rest/v1/tal_comport_resp?inscricao_id=eq.${id}&select=pontuacao`);
      const r = ranking.find(x => x.id === id) || (await api(`/rest/v1/tal_ranking?id=eq.${id}&select=*`))[0];
      const [rr] = await api(`/rest/v1/tal_ranking?id=eq.${id}&select=aderencia,aderencia_outras,tempo_total`);
      cand = i; const d = i.dados || {}, a = rr.aderencia || {}, pts = (cr && cr.pontuacao) || {};
      const vaga = vagas.find(v => v.id === i.vaga_id) || {};
      const pesos = vaga.pesos || {};
      const dims = Object.keys(pesos).sort((x, y) => pesos[y] - pesos[x]);
      const valor = (k) => (a.notas || {})[k];
      const sim = (b) => b ? "Sim" : "Não";
      const mud = { reside: "Já reside na sede", sim: "Sim, pode se mudar", nao: "Não" }[d.mudanca] || "—";
      const outras = Object.entries(rr.aderencia_outras || {}).map(([k, n]) => `<div>${esc(titulo(k))}<b>${n ?? "—"}${n != null ? "%" : ""}</b></div>`).join("");
      $("tc-corpo").innerHTML = `<div class="persona">
        <div class="cab"><div><h2 style="margin:0">${esc(i.nome)}</h2>
          <div class="ajuda" style="margin-top:4px">${esc(titulo(i.vaga_id))} · ${esc([d.municipio, d.uf].filter(Boolean).join("/"))} · ${esc(i.email)}${d.telefone ? " · " + esc(d.telefone) : ""}</div>
          <div class="ajuda">Inscrição ${i.status === "concluida" ? "concluída em " + new Date(i.concluida_em).toLocaleString("pt-BR") : "em andamento"}${r && r.fora_do_tempo ? " · <b style='color:var(--erro)'>teste enviado fora do tempo</b>" : ""}</div></div>
          <div style="text-align:right"><div class="ajuda" style="margin:0">Aderência à vaga</div><div class="grande">${a.aderencia ?? "—"}%</div>
          <div class="ajuda">Desempenho ${a.desempenho ?? "—"} · Requisitos ${a.requisitos_ok ?? 0}/${a.requisitos_total ?? 0}</div></div></div>
        <div class="kv">
          <div>Formação<b>${esc(d.curso || "—")}</b>${esc([d.escolaridade, d.instituicao, d.ano_conclusao].filter(Boolean).join(" · "))}</div>
          <div>Licenciatura<b>${d.licenciatura == null ? "—" : sim(d.licenciatura)}</b></div>
          <div>Anos na Educação Básica<b>${d.anos_educacao_basica ?? "—"}</b></div>
          ${d.matricula_ativa != null ? `<div>Matrícula ativa<b>${sim(d.matricula_ativa)}</b>${esc([d.semestre && d.semestre + "º semestre", d.turno].filter(Boolean).join(" · "))}</div>` : ""}
          <div>Teste 1 · Interpretação<b>${r ? (r.teste_interpretacao ?? "—") : "—"}/10</b></div>
          <div>Teste 2 · Raciocínio lógico<b>${r ? (r.teste_logica ?? "—") : "—"}/10</b></div>
          <div>Tempo total nos testes<b>${rr.tempo_total ? Math.round(rr.tempo_total / 60) + " min" : "—"}</b></div>
          <div>Disponibilidade para residir fora<b>${mud}</b>${d.nte_preferencia ? "NTE: " + esc(d.nte_preferencia) : ""}</div>
          <div>Viagens<b>${d.viagens == null ? "—" : sim(d.viagens)}</b></div>
          <div>Aceita outras vagas<b>${i.aceita_outras == null ? "—" : sim(i.aceita_outras)}</b></div>
        </div>
        <h2>Perfil × persona da vaga</h2>
        <div class="comps">${dims.map(k => `<div>${esc(COMP[k] || k)} <span class="ajuda">· peso ${pesos[k]}</span><b style="float:right">${valor(k) ?? "—"}</b><div class="barra"><i style="width:${valor(k) || 0}%"></i></div></div>`).join("")}</div>
        ${Object.keys(pts).filter(k => !(k in pesos)).length ? `<p class="ajuda">Outras competências: ${Object.keys(pts).filter(k => !(k in pesos)).map(k => `${esc(COMP[k] || k)} ${pts[k]}`).join(" · ")}</p>` : ""}
        <h2>Aderência a outras vagas</h2><div class="kv" style="margin-top:6px">${outras || "<div>—</div>"}</div>
        <h2>3 principais experiências</h2>${(d.experiencias || []).length ? (d.experiencias || []).map((e, n) => `<p class="texto"><b>${n + 1}.</b> ${esc(e)}</p>`).join("") : `<p class="ajuda">Não informadas.</p>`}
        <h2>Mini currículo</h2><p class="texto">${esc(d.mini_curriculo || "—")}</p>
        <div class="grade2"><div><h2>Pontos fortes</h2><p class="texto">${esc(d.pontos_fortes || "—")}</p></div><div><h2>Pontos a desenvolver</h2><p class="texto">${esc(d.pontos_desenvolver || "—")}</p></div></div>
        ${d.link_curriculo ? `<p class="ajuda">Currículo: <a href="${esc(/^https?:\/\//.test(d.link_curriculo) ? d.link_curriculo : "https://" + d.link_curriculo)}" target="_blank" rel="noopener noreferrer">${esc(d.link_curriculo)}</a></p>` : ""}
        <h2>Declarações</h2>
        <p class="ajuda">Vínculo com o órgão parceiro: <b>${esc(d.vinculo_orgao || "—")}</b> · Vínculo com a instituição executora: <b>${esc(d.vinculo_executora || "—")}</b> · Parente no projeto: <b>${esc(d.parente_projeto || "—")}</b>${d.acessibilidade ? ` · Acessibilidade: <b>${esc(d.acessibilidade)}</b>` : ""} · Banco de talentos (12 meses): <b>${d.lgpd_banco_talentos ? "autorizou" : "não autorizou"}</b></p>
      </div>`;
      $("tc-etapa").value = i.etapa_rh; $("tc-obs").value = i.observacao_rh || ""; aviso("a-tc", "");
      mostrar("v-tal-cand");
    } catch (e) { if (e.message !== "sessao") aviso("a-tal", traduzErro(e)); }
  }
  $("tc-imprimir").addEventListener("click", () => window.print());
  $("tc-salvar").addEventListener("click", async (ev) => {
    ev.target.disabled = true;
    try {
      await api(`/rest/v1/tal_inscricao?id=eq.${cand.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ etapa_rh: $("tc-etapa").value, observacao_rh: $("tc-obs").value.trim() || null }) });
      const r = ranking.find(x => x.id === cand.id); if (r) r.etapa_rh = $("tc-etapa").value;
      aviso("a-tc", "Andamento salvo.", "ok");
    } catch (e) { if (e.message !== "sessao") aviso("a-tc", traduzErro(e)); }
    finally { ev.target.disabled = false; }
  });

  // ---------- banco de questões
  async function carregarQuestoes() {
    try { questoes = await api("/rest/v1/tal_questao?select=*&order=area,nivel,id"); listarQuestoes(); }
    catch (e) { if (e.message !== "sessao") aviso("a-tal", traduzErro(e)); }
  }
  function listarQuestoes() {
    const ar = $("tq-area").value, nv = $("tq-nivel").value;
    const cont = (a, n) => questoes.filter(q => q.ativa && q.area === a && q.nivel === n).length;
    $("tq-cont").innerHTML = `Ativas: Interpretação padrão <b>${cont("interpretacao", "padrao")}</b> · Interpretação estágio <b>${cont("interpretacao", "estagio")}</b> · Lógica padrão <b>${cont("logica", "padrao")}</b> · Lógica estágio <b>${cont("logica", "estagio")}</b>`;
    const lista = questoes.filter(q => (!ar || q.area === ar) && (!nv || q.nivel === nv));
    $("tq-lista").innerHTML = lista.map(q => `<div class="qlinha" data-id="${q.id}"><div style="flex:1">${esc(q.enunciado)}${q.figura ? " <span class='tag'>figura</span>" : ""}
      <div class="ajuda" style="margin:4px 0 0">Correta: ${esc((q.alternativas || [])[q.correta])}</div></div>
      <div class="tags"><span class="tag">${q.area === "interpretacao" ? "Teste 1" : "Teste 2"}</span><span class="tag">${q.nivel}</span>${q.ativa ? "" : `<span class="tag" style="background:#eee;color:#666">inativa</span>`}</div></div>`).join("") || `<p class="ajuda">Nenhuma questão com esse filtro.</p>`;
    $("tq-lista").querySelectorAll(".qlinha").forEach(el => el.addEventListener("click", () => editarQuestao(questoes.find(q => q.id == el.dataset.id))));
  }
  $("tq-area").addEventListener("change", listarQuestoes); $("tq-nivel").addEventListener("change", listarQuestoes);
  $("tq-nova").addEventListener("click", () => editarQuestao(null));

  function altsHtml(alts, correta) {
    $("eq-alts").innerHTML = alts.map((a, k) => `<div class="altl"><input type="radio" name="eq-cor" value="${k}" ${k === correta ? "checked" : ""}><input type="text" class="eq-alt" value="${esc(a)}" placeholder="Alternativa ${"ABCDE"[k]}"></div>`).join("");
  }
  function editarQuestao(q) {
    editQ = q;
    $("tq-tit").textContent = q ? "Editar questão" : "Nova questão";
    $("eq-area").value = q ? q.area : ($("tq-area").value || "interpretacao");
    $("eq-nivel").value = q ? q.nivel : ($("tq-nivel").value || "padrao");
    $("eq-enun").value = q ? q.enunciado : ""; $("eq-fig").value = q ? (q.figura || "") : ""; $("eq-exp").value = q ? (q.explicacao || "") : "";
    $("eq-ativa").checked = q ? q.ativa : true;
    altsHtml(q ? q.alternativas : ["", "", "", ""], q ? q.correta : 0);
    previa(); aviso("a-eq", ""); mostrar("v-tal-q");
  }
  function previa() { const s = $("eq-fig").value.trim(); $("eq-prev").innerHTML = s.startsWith("<svg") && !/<script|on\w+=/i.test(s) ? s : ""; }
  $("eq-fig").addEventListener("input", previa);
  $("eq-mais").addEventListener("click", () => {
    const atuais = [...document.querySelectorAll(".eq-alt")].map(i => i.value), c = +(document.querySelector('input[name="eq-cor"]:checked') || {}).value || 0;
    if (atuais.length < 5) altsHtml([...atuais, ""], c);
  });
  $("eq-salvar").addEventListener("click", async (ev) => {
    const alts = [...document.querySelectorAll(".eq-alt")].map(i => i.value.trim());
    const cor = document.querySelector('input[name="eq-cor"]:checked');
    const fig = $("eq-fig").value.trim();
    if (!$("eq-enun").value.trim()) return aviso("a-eq", "Escreva o enunciado.");
    if (!cor || !alts[+cor.value]) return aviso("a-eq", "Marque a alternativa correta (e preencha o texto dela).");
    const finais = alts.map((a, k) => ({ a, k })).filter(x => x.a);
    if (finais.length < 3) return aviso("a-eq", "Informe pelo menos 3 alternativas.");
    if (fig && (!fig.startsWith("<svg") || /<script|on\w+=/i.test(fig))) return aviso("a-eq", "A figura precisa ser um SVG simples, sem scripts.");
    const corpo = { area: $("eq-area").value, nivel: $("eq-nivel").value, enunciado: $("eq-enun").value.trim(), figura: fig || null,
      alternativas: finais.map(x => x.a), correta: finais.findIndex(x => x.k === +cor.value), explicacao: $("eq-exp").value.trim() || null,
      ativa: $("eq-ativa").checked, atualizado_em: new Date().toISOString() };
    ev.target.disabled = true;
    try {
      if (editQ) await api(`/rest/v1/tal_questao?id=eq.${editQ.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(corpo) });
      else await api("/rest/v1/tal_questao", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(corpo) });
      mostrar("v-tal"); await carregarQuestoes(); aviso("a-tal", "Questão salva.", "ok");
    } catch (e) { if (e.message !== "sessao") aviso("a-eq", traduzErro(e)); }
    finally { ev.target.disabled = false; }
  });

  // ---------- situações comportamentais
  async function carregarSituacoes() {
    try {
      situacoes = await api("/rest/v1/tal_comportamental?select=*&order=id");
      $("ts-lista").innerHTML = situacoes.map(s => `<div class="qlinha" data-id="${s.id}"><div style="flex:1">${esc(s.enunciado)}
        <div class="ajuda" style="margin:4px 0 0">${s.opcoes.length} alternativas · competências: ${[...new Set(s.opcoes.flatMap(o => Object.keys(o.pontos || {})))].map(k => COMP[k] || k).join(", ")}</div></div>
        <div class="tags">${s.ativa ? "" : `<span class="tag" style="background:#eee;color:#666">inativa</span>`}</div></div>`).join("");
      $("ts-lista").querySelectorAll(".qlinha").forEach(el => el.addEventListener("click", () => editarSit(situacoes.find(s => s.id == el.dataset.id))));
    } catch (e) { if (e.message !== "sessao") aviso("a-tal", traduzErro(e)); }
  }
  const ptsTxt = (p) => Object.entries(p || {}).map(([k, v]) => `${k}:${v}`).join(", ");
  function opsHtml(ops) {
    $("es-ops").innerHTML = ops.map((o, k) => `<div class="persona" style="padding:12px;margin-top:8px"><label style="margin-top:0">Alternativa ${"ABCDEF"[k]}</label>
      <input type="text" class="es-txt" value="${esc(o.texto)}"><input type="text" class="es-pts" value="${esc(ptsTxt(o.pontos))}" placeholder="comunicacao:3, equipe:1" style="margin-top:6px"></div>`).join("");
  }
  function editarSit(s) {
    editS = s; $("es-tit").textContent = s ? "Editar situação" : "Nova situação";
    $("es-enun").value = s ? s.enunciado : ""; $("es-ativa").checked = s ? s.ativa : true;
    opsHtml(s ? s.opcoes : [{ texto: "", pontos: {} }, { texto: "", pontos: {} }, { texto: "", pontos: {} }, { texto: "", pontos: {} }]);
    aviso("a-es", ""); mostrar("v-tal-s");
  }
  $("ts-nova").addEventListener("click", () => editarSit(null));
  $("es-mais").addEventListener("click", () => {
    const ops = [...document.querySelectorAll(".es-txt")].map((t, k) => ({ texto: t.value, pontos: lerPts(document.querySelectorAll(".es-pts")[k].value) || {} }));
    if (ops.length < 6) opsHtml([...ops, { texto: "", pontos: {} }]);
  });
  function lerPts(s) {
    const o = {};
    for (const par of s.split(",").map(x => x.trim()).filter(Boolean)) {
      const m = par.match(/^([a-z_]+)\s*:\s*(\d)$/i); if (!m) return null;
      o[m[1].toLowerCase()] = +m[2];
    }
    return o;
  }
  $("es-salvar").addEventListener("click", async (ev) => {
    const txt = [...document.querySelectorAll(".es-txt")].map(t => t.value.trim()), pts = [...document.querySelectorAll(".es-pts")].map(t => lerPts(t.value));
    if (!$("es-enun").value.trim()) return aviso("a-es", "Descreva a situação.");
    if (pts.some((p, k) => txt[k] && p === null)) return aviso("a-es", "Confira os pontos: use o formato competencia:número, separados por vírgula.");
    const ops = txt.map((t, k) => ({ texto: t, pontos: pts[k] || {} })).filter(o => o.texto);
    if (ops.length < 2) return aviso("a-es", "Informe pelo menos 2 alternativas.");
    const corpo = { enunciado: $("es-enun").value.trim(), opcoes: ops, ativa: $("es-ativa").checked };
    ev.target.disabled = true;
    try {
      if (editS) await api(`/rest/v1/tal_comportamental?id=eq.${editS.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(corpo) });
      else await api("/rest/v1/tal_comportamental", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(corpo) });
      mostrar("v-tal"); await carregarSituacoes(); aviso("a-tal", "Situação salva.", "ok");
    } catch (e) { if (e.message !== "sessao") aviso("a-es", traduzErro(e)); }
    finally { ev.target.disabled = false; }
  });

  // ---------- vagas e personas
  function listarVagas() {
    $("tv-lista").innerHTML = vagas.map(v => `<div class="qlinha" data-id="${esc(v.id)}"><div style="flex:1"><b>${esc(v.titulo)}</b><div class="ajuda" style="margin:4px 0 0">${esc(v.resumo || "")}</div></div>
      <div class="tags"><span class="tag">${v.vagas_abertas} vagas</span><span class="tag">${v.nivel_teste}</span>${v.aberta ? "" : `<span class="tag" style="background:#eee;color:#666">fechada</span>`}</div></div>`).join("");
    $("tv-lista").querySelectorAll(".qlinha").forEach(el => el.addEventListener("click", () => editarVaga(vagas.find(v => v.id === el.dataset.id))));
  }
  function editarVaga(v) {
    editV = v; $("ev-tit").textContent = v ? "Editar vaga" : "Nova vaga";
    $("ev-id").value = v ? v.id : ""; $("ev-id").disabled = !!v;
    $("ev-titulo").value = v ? v.titulo : ""; $("ev-qtd").value = v ? v.vagas_abertas : 1; $("ev-nivel").value = v ? v.nivel_teste : "padrao";
    $("ev-jornada").value = v ? v.jornada : "40 horas semanais, presencial"; $("ev-rem").value = v ? (v.remuneracao || "") : "";
    $("ev-local").value = v ? v.local : "Município sede de um dos 27 NTE da Bahia"; $("ev-resumo").value = v ? (v.resumo || "") : "";
    $("ev-atrib").value = v ? v.atribuicoes.join("\n") : ""; $("ev-pre").value = v ? v.prerequisitos.join("\n") : ""; $("ev-des").value = v ? v.desejavel.join("\n") : "";
    const p = v ? v.pesos : {}, r = v ? v.requisitos : {};
    $("ev-pesos").innerHTML = Object.keys(COMP).map(k => `<div><label style="margin:0;font-weight:500">${COMP[k]}</label><select class="ev-peso" data-k="${k}">${[0, 1, 2, 3].map(n => `<option ${(p[k] || 0) == n ? "selected" : ""}>${n}</option>`).join("")}</select></div>`).join("");
    $("ev-r-lic").checked = !!r.licenciatura; $("ev-r-est").checked = !!r.estudante; $("ev-r-mud").checked = !!r.mudanca; $("ev-r-via").checked = !!r.viagens;
    $("ev-r-anos").value = r.anos_educacao_basica ?? ""; $("ev-aberta").checked = v ? v.aberta : true;
    aviso("a-ev", ""); mostrar("v-tal-v");
  }
  $("tv-nova").addEventListener("click", () => editarVaga(null));
  $("ev-salvar").addEventListener("click", async (ev) => {
    const id = $("ev-id").value.trim().toLowerCase();
    if (!/^[a-z0-9-]{2,40}$/.test(id)) return aviso("a-ev", "Código: use letras minúsculas, números e hífen (ex.: art-senior).");
    if (!$("ev-titulo").value.trim()) return aviso("a-ev", "Informe o título.");
    const pesos = {}; document.querySelectorAll(".ev-peso").forEach(s => { if (+s.value > 0) pesos[s.dataset.k] = +s.value; });
    if (!Object.keys(pesos).length) return aviso("a-ev", "Defina peso para pelo menos uma dimensão da persona.");
    const req = {}; if ($("ev-r-lic").checked) req.licenciatura = true; if ($("ev-r-est").checked) req.estudante = true;
    if ($("ev-r-mud").checked) req.mudanca = true; if ($("ev-r-via").checked) req.viagens = true;
    if ($("ev-r-anos").value !== "") req.anos_educacao_basica = +$("ev-r-anos").value;
    const corpo = { titulo: $("ev-titulo").value.trim(), vagas_abertas: +$("ev-qtd").value || 0, nivel_teste: $("ev-nivel").value, jornada: $("ev-jornada").value.trim(),
      remuneracao: $("ev-rem").value.trim() || null, local: $("ev-local").value.trim(), resumo: $("ev-resumo").value.trim() || null,
      atribuicoes: linhas($("ev-atrib").value), prerequisitos: linhas($("ev-pre").value), desejavel: linhas($("ev-des").value),
      pesos, requisitos: req, aberta: $("ev-aberta").checked };
    ev.target.disabled = true;
    try {
      if (editV) await api(`/rest/v1/tal_vaga?id=eq.${encodeURIComponent(editV.id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(corpo) });
      else await api("/rest/v1/tal_vaga", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ id, ordem: vagas.length + 1, ...corpo }) });
      vagas = await api("/rest/v1/tal_vaga?select=*&order=ordem");
      $("tal-vaga").innerHTML = vagas.map(v => `<option value="${esc(v.id)}">${esc(v.titulo)}${v.aberta ? "" : " (fechada)"}</option>`).join("");
      mostrar("v-tal"); listarVagas(); aviso("a-tal", "Vaga salva.", "ok");
    } catch (e) { if (e.message !== "sessao") aviso("a-ev", traduzErro(e)); }
    finally { ev.target.disabled = false; }
  });

  window.Talentos = { abrir };
})();
