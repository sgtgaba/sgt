// SGT · Ciclos de Desenvolvimento (base: planilha "Ciclo de Avaliação")
// Ciclo de 4 meses: autoavaliação → barema da liderança (25 perguntas, 5 dimensões, escala 1–5) →
// roteiro da conversa de feedback → PDI combinado → histórico de evolução.
// Usa as funções globais do index.html: api, aviso, mostrar, esc, eu, pode, temModulo, fmtData, traduzErro, ocupado.
(() => {
  const $ = (id) => document.getElementById(id);
  const DIM = [
    ["AUTONOMIA E INICIATIVA", "Capacidade de agir com independência, proatividade, resiliência e visão sistêmica.", [
      "Demonstra iniciativa para antecipar demandas e propor melhorias sem necessidade de supervisão constante?",
      "Age com resiliência e inteligência emocional em situações desafiadoras ou de pressão?",
      "Consegue identificar problemas complexos e propor soluções inovadoras e alinhadas aos objetivos do Projeto?",
      "Adapta-se com agilidade a mudanças de contexto, prioridades ou fluxos de trabalho?",
      "Busca ativamente capacitações e aplica novos conhecimentos na prática?"]],
    ["CULTURA ORGANIZACIONAL", "Alinhamento aos valores institucionais, postura profissional, respeito à diversidade e integração com os parceiros.", [
      "Demonstra postura profissional ética e alinhada aos valores da instituição, do NTE e da rede?",
      "Mantém comprometimento com presença, pontualidade e engajamento nas atividades?",
      "Demonstra, em suas interações e práticas, respeito ativo e valorização da diversidade cultural e social?",
      "Adapta-se às dinâmicas e especificidades da rede pública de educação, demonstrando sensibilidade ao contexto local?",
      "Realiza visitas e acompanhamentos às escolas com planejamento prévio, frequência adequada e impacto positivo comprovado?"]],
    ["HABILIDADES TÉCNICAS", "Domínio de conhecimentos pedagógicos, ferramentas tecnológicas, análise de dados e metodologias do projeto.", [
      "Domina os procedimentos da Trilha da Gestão da Aprendizagem (TGA) e os aplica de forma adequada?",
      "Interpreta dados pedagógicos e indicadores educacionais para embasar decisões e intervenções?",
      "Conhece e aplica as políticas públicas educacionais vigentes pertinentes ao projeto?",
      "Utiliza com eficiência ferramentas tecnológicas como SGA, pacote Office e planilhas para gestão de informações?",
      "Aplica metodologias pedagógicas adequadas ao contexto das escolas e às necessidades dos gestores?"]],
    ["HABILIDADES DE EXECUÇÃO", "Capacidade de planejar, organizar, cumprir prazos e entregar resultados com qualidade.", [
      "Cumpre prazos e metas estabelecidas, mantendo padrão de qualidade nas entregas?",
      "Organiza cronogramas e planos de ação de forma clara, realista e alinhada às diretrizes do projeto?",
      "Prioriza tarefas conforme critérios de urgência, impacto e alinhamento estratégico?",
      "Utiliza métricas e indicadores estabelecidos para avaliar a efetividade das atividades e propor correções de rota?",
      "Assegura que todos os documentos, registros e relatórios sob sua responsabilidade estejam completos, atualizados e em conformidade?"]],
    ["COMPETÊNCIAS COMPORTAMENTAIS", "Habilidades interpessoais, comunicação, trabalho em equipe, mediação de conflitos e influência positiva.", [
      "Comunica-se com clareza, objetividade e respeito, adaptando a linguagem ao público?",
      "Lida com conflitos e divergências de forma equilibrada, buscando soluções construtivas?",
      "Trabalha de forma colaborativa, transparente, compartilhando informações e apoiando colegas e parceiros?",
      "Demonstra escuta ativa e assume responsabilidade por seus equívocos, usando-os como oportunidade de aprendizado?",
      "Inspira e mobiliza equipes escolares e gestores do NTE, promovendo engajamento e confiança?"]]];
  const PERG_DIM = [
    ["“Onde você tomou a frente neste ciclo sem que fosse pedido?”", "“Conte uma situação de pressão ou de mudança de prioridade. Como você reagiu?”", "“O que te daria mais segurança para decidir?”"],
    ["“Como você avalia sua integração com a equipe, as escolas e o NTE neste ciclo?”", "“Como foram suas visitas às escolas: planejamento, frequência e resultado?”", "“O que dificultou sua presença ou engajamento? O que ajudaria?”"],
    ["“Quais ferramentas ou processos (TGA, SGA, análise de dados) você domina bem?”", "“Dê um exemplo de decisão ou intervenção que você embasou em dados.”", "“Onde sente lacunas técnicas? Como prefere aprender?”"],
    ["“O que ajudou, ou atrapalhou, você a cumprir prazos e metas neste ciclo?”", "“Quando as demandas se acumulam, como decide o que fazer primeiro?”", "“O que mudaria na sua organização para manter registros em dia?”"],
    ["“Como foi lidar com conflitos ou com feedbacks recebidos neste ciclo?”", "“Conte uma situação em que mobilizou uma equipe escolar ou um gestor.”", "“Pensando em um equívoco seu: o que aprendeu e o que faria diferente?”"]];
  const ESCALA = ["", "Muito abaixo do esperado", "Abaixo do esperado", "Dentro do esperado", "Acima do esperado", "Muito acima do esperado"];
  const STATUS = ["Perfil com Alto Potencial", "Perfil Consolidado", "Perfil em Desenvolvimento", "Perfil Crítico", "Recomenda-se Rescisão"];
  const ACOES = { "Abaixo": ["Plano de Formação/Capacitação", "Mudança de Função", "Acompanhamento Próximo (PDI intensivo)", "Desligamento (último caso)"],
    "Dentro": ["Manutenção com Acompanhamento Contínuo"], "Acima": ["Reconhecimento", "Ampliação de Responsabilidades", "Preparação para Promoção"] };
  const STATUS_PDI = ["Não iniciado", "Em andamento", "Concluído", "Atrasado", "Cancelado"];
  let ciclos = [], ciclo = null, equipe = [], pessoa = null, aval = null, aba = "minha";

  const media = (n) => { const v = (n || []).filter(x => x >= 1 && x <= 5); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null; };
  const classe = (m) => m == null ? "" : m < 2 ? ESCALA[1] : m < 3 ? ESCALA[2] : m < 4 ? ESCALA[3] : m < 5 ? ESCALA[4] : ESCALA[5];
  const compat = (m) => m == null ? "" : m < 3 ? "Abaixo" : m < 4 ? "Dentro" : "Acima";
  const dims = (n) => DIM.map((_, d) => media((n || []).slice(d * 5, d * 5 + 5)));
  const num1 = (v) => v == null ? "—" : String(v.toFixed ? v.toFixed(1) : v).replace(".", ",");
  const corM = (m) => m == null ? "neutro" : m < 3 ? "erro" : m < 4 ? "info" : "ok";

  document.head.insertAdjacentHTML("beforeend", `<style>
    .cd-q{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:9px 0;border-top:1px solid var(--borda);font-size:14px}
    .cd-esc{display:flex;gap:4px} .cd-esc label{margin:0;cursor:pointer}
    .cd-esc input{position:absolute;opacity:0;pointer-events:none}
    .cd-esc span{display:grid;place-items:center;width:34px;height:34px;border-radius:8px;border:1px solid var(--borda);font-weight:700;font-size:14px;background:var(--superficie,#fff)}
    .cd-esc input:checked+span{background:var(--cor);color:#fff;border-color:var(--cor)}
    .cd-esc input:focus-visible+span{outline:2px solid var(--cor)}
    .cd-dim{margin-top:18px} .cd-dim h3{margin:0 0 2px;font-size:14px;color:var(--cor)} .cd-dim .ajuda{margin:0 0 4px}
    .cd-painel{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;margin:10px 0}
    .cd-painel div{border:1px solid var(--borda);border-radius:10px;padding:9px 11px;background:var(--superficie,#fff);font-size:12.5px}
    .cd-painel b{display:block;font-size:20px}
    .cd-bloco{border:1px solid var(--borda);border-radius:var(--raio);padding:4px 16px 16px;margin-top:14px;background:var(--superficie,#fff)}
    .cd-bloco textarea,#v-cd textarea{width:100%;min-height:64px;padding:10px 12px;font-size:14.5px;border:1px solid var(--borda);border-radius:var(--raio);font-family:inherit;background:var(--superficie,#fff);color:var(--texto)}
    .cd-guia{font-size:13px;color:var(--texto-2);background:var(--fundo);border-radius:10px;padding:9px 12px;margin:6px 0;line-height:1.45}
    .cd-pdi{display:grid;grid-template-columns:2fr 2fr 1fr 1fr;gap:8px;border:1px solid var(--borda);border-radius:10px;padding:10px;margin-top:8px;background:var(--superficie,#fff)}
    .cd-pdi label{margin:0 0 3px;font-size:12px} .cd-pdi input,.cd-pdi select{padding:8px 10px;font-size:14px}
    .cd-pdi textarea{min-height:44px!important}
    @media (max-width:760px){.cd-q{grid-template-columns:1fr}.cd-pdi{grid-template-columns:1fr}}
  </style>`);

  $("cartao").querySelector(".rodape").insertAdjacentHTML("beforebegin", `
  <section id="v-cd" class="oculto">
    <div class="topo"><div><h1>Ciclos de Desenvolvimento</h1><div class="ajuda" style="margin:0" id="cd-sub">Feedback e PDI a cada 4 meses</div></div>
      <div style="display:flex;gap:8px"><select id="cd-ciclo" style="width:auto;margin:0;padding:9px 10px;font-size:14px"></select><button class="sec" id="cd-voltar">← Início</button></div></div>
    <div class="abas" id="cd-abas"></div>
    <div id="cd-corpo"></div>
    <div class="aviso" id="a-cd"></div>
  </section>`);
  $("cd-voltar").addEventListener("click", () => { if (pessoa) { pessoa = null; return trocar("equipe"); } mostrar("v-inicio"); });
  $("cd-ciclo").addEventListener("input", () => { ciclo = ciclos.find(c => c.id === +$("cd-ciclo").value); pessoa = null; trocar(aba); });

  const souGestor = () => pode("admin", "rh") || temModulo("ciclos");
  async function abrir() {
    mostrar("v-cd");
    try {
      ciclos = await api("/rest/v1/cd_ciclo?select=*&order=numero.desc");
      const hoje = new Date().toISOString().slice(0, 10);
      ciclo = ciclos.find(c => c.aberto && c.inicio <= hoje && c.fim >= hoje) || ciclos.find(c => c.aberto) || ciclos[0] || null;
      $("cd-ciclo").innerHTML = ciclos.map(c => `<option value="${c.id}">Ciclo ${c.numero} · ${esc(c.titulo)}${c.aberto ? "" : " (encerrado)"}</option>`).join("") || `<option>Nenhum ciclo</option>`;
      if (ciclo) $("cd-ciclo").value = ciclo.id;
      equipe = ciclo ? await api("/rest/v1/rpc/cd_equipe", { method: "POST", body: JSON.stringify({ p_ciclo: ciclo.id }) }) : [];
      const abas = [["minha", "Minha autoavaliação"], ["meupdi", "Meu PDI e resultados"]];
      if (equipe.length) abas.push(["equipe", souGestor() ? "Avaliações" : "Minha equipe"]);
      if (souGestor()) abas.push(["painel", "Painel do ciclo"], ["ciclos", "Ciclos"]);
      $("cd-abas").innerHTML = abas.map(([k, t]) => `<button data-a="${k}">${t}</button>`).join("");
      $("cd-abas").querySelectorAll("button").forEach(b => b.addEventListener("click", () => { pessoa = null; trocar(b.dataset.a); }));
      pessoa = null; trocar(equipe.length && !souGestor() ? "equipe" : aba && abas.some(a => a[0] === aba) ? aba : "minha");
    } catch (e) { if (e.message !== "sessao") aviso("a-cd", traduzErro(e)); }
  }
  function trocar(a) {
    aba = a; aviso("a-cd", ""); $("cd-sub").textContent = "Feedback e PDI a cada 4 meses";
    $("cd-abas").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.a === a));
    if (!ciclo && a !== "ciclos") { $("cd-corpo").innerHTML = `<div class="resumo">Ainda não há ciclo aberto.${souGestor() ? " Abra o primeiro na aba “Ciclos”." : ""}</div>`; return; }
    ({ minha: minhaAuto, meupdi: meuPdi, equipe: listaEquipe, painel: painel, ciclos: gerirCiclos })[a]();
  }

  // ---------------------------------------------------------------- autoavaliação (colaborador)
  async function minhaAuto() {
    const c = $("cd-corpo"); c.innerHTML = `<div class="resumo">Carregando…</div>`;
    try {
      const r = (await api(`/rest/v1/cd_autoavaliacao?select=*&ciclo_id=eq.${ciclo.id}&colaborador_id=eq.${eu.id}`))[0];
      const v = (r && r.respostas) || {}, ent = v.entregas || [], dis = ciclo.aberto ? "" : " disabled";
      c.innerHTML = `<div class="cd-bloco"><h2>Relatório de autoavaliação · Ciclo ${ciclo.numero}</h2>
        <div class="ajuda">Preencha antes da conversa de feedback com a sua liderança. ${r && r.enviada_em ? `<b>Enviada em ${new Date(r.enviada_em).toLocaleDateString("pt-BR")}.</b> Você pode ajustar até o ciclo ser encerrado.` : "Você pode salvar e continuar depois."}</div>
        <form id="cd-fa" novalidate>
          <label>1. Principais entregas do período (de 3 a 5)</label>
          ${[0, 1, 2, 3, 4].map(i => `<input type="text" data-e="${i}" maxlength="300" value="${esc(ent[i] || "")}" placeholder="Entrega ${i + 1}"${dis} style="margin-top:6px">`).join("")}
          <label for="cd-f1">2. Quais foram meus principais PONTOS FORTES neste ciclo, considerando as entregas acima?</label><textarea id="cd-f1" maxlength="2000"${dis}>${esc(v.fortes || "")}</textarea>
          <label for="cd-f2">3. Quais são meus PONTOS DE MELHORIA e como pretendo evoluir até o próximo ciclo?</label><textarea id="cd-f2" maxlength="2000"${dis}>${esc(v.melhoria || "")}</textarea>
          <label for="cd-f3">4. Dificuldades ou obstáculos enfrentados no período (recursos, processos, contexto)</label><textarea id="cd-f3" maxlength="2000"${dis}>${esc(v.dificuldades || "")}</textarea>
          <label for="cd-f4">5. Expectativas e apoio desejado da liderança para o próximo ciclo</label><textarea id="cd-f4" maxlength="2000"${dis}>${esc(v.expectativas || "")}</textarea>
          <label class="check"><input type="checkbox" id="cd-flgpd"${r && r.enviada_em ? " checked" : ""}${dis}><span>Estou ciente de que minha autoavaliação será lida pela minha liderança e pela gestão do Projeto GA BA, exclusivamente para o ciclo de feedback e desenvolvimento, conforme a LGPD.</span></label>
          ${ciclo.aberto ? `<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="sec" id="cd-fsalvar" style="width:auto">Salvar rascunho</button><button type="submit" style="width:auto">Enviar à liderança</button></div>` : `<div class="resumo">Este ciclo está encerrado.</div>`}
        </form></div>`;
      if (!ciclo.aberto) return;
      const salvar = async (enviar) => {
        if (enviar && !$("cd-flgpd").checked) return aviso("a-cd", "Para enviar, marque a caixa de ciência (LGPD).");
        const resp = { entregas: [...document.querySelectorAll("#cd-fa [data-e]")].map(i => i.value.trim()), fortes: $("cd-f1").value.trim(),
          melhoria: $("cd-f2").value.trim(), dificuldades: $("cd-f3").value.trim(), expectativas: $("cd-f4").value.trim() };
        if (enviar && (resp.entregas.filter(Boolean).length < 1 || !resp.fortes || !resp.melhoria)) return aviso("a-cd", "Para enviar, informe ao menos uma entrega, seus pontos fortes e seus pontos de melhoria.");
        const corpo = { ciclo_id: ciclo.id, colaborador_id: eu.id, respostas: resp, atualizado_em: new Date().toISOString() };
        if (enviar) corpo.enviada_em = new Date().toISOString();
        try {
          await api("/rest/v1/cd_autoavaliacao?on_conflict=ciclo_id,colaborador_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(corpo) });
          if (enviar) await api("/rest/v1/consentimento", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ colaborador_id: eu.id, aceito: true, contexto: "autoavaliação do ciclo " + ciclo.numero,
            termo_id: (await api("/rest/v1/termo_consentimento?select=id&chave=eq.ciclo_autoavaliacao&vigente=eq.true"))[0]?.id }) }).catch(() => {});
          await minhaAuto(); aviso("a-cd", enviar ? "Autoavaliação enviada à sua liderança." : "Rascunho salvo.", "ok");
        } catch (e) { if (e.message !== "sessao") aviso("a-cd", traduzErro(e)); }
      };
      $("cd-fsalvar").addEventListener("click", () => salvar(false));
      $("cd-fa").addEventListener("submit", (e) => { e.preventDefault(); salvar(true); });
    } catch (e) { if (e.message !== "sessao") aviso("a-cd", traduzErro(e)); }
  }

  // ---------------------------------------------------------------- PDI (lista editável, usada pelos dois lados)
  async function desenharPdi(alvo, quem, podeEditar) {
    const itens = await api(`/rest/v1/cd_pdi?select=*&colaborador_id=eq.${quem}&order=status.asc,prazo.asc.nullslast,id.asc`);
    const campo = (x, f, rot, tipo = "text") => `<div><label>${rot}</label>${tipo === "area" ? `<textarea data-f="${f}"${podeEditar ? "" : " disabled"}>${esc(x[f] || "")}</textarea>`
      : `<input type="${tipo}" data-f="${f}" value="${esc(x[f] || "")}"${podeEditar ? "" : " disabled"}>`}</div>`;
    const bloco = (x) => `<div class="cd-pdi" data-id="${x.id || "novo"}">
      ${campo(x, "objetivo", "Objetivo de desenvolvimento", "area")}${campo(x, "acoes", "Ações combinadas", "area")}
      ${campo(x, "responsavel", "Responsável")}${campo(x, "prazo", "Prazo", "date")}
      ${campo(x, "recursos", "Recursos ou apoio necessário", "area")}${campo(x, "indicador", "Indicador de sucesso", "area")}
      <div><label>Status</label><select data-f="status"${podeEditar ? "" : " disabled"}>${STATUS_PDI.map(s => `<option${(x.status || "Não iniciado") === s ? " selected" : ""}>${s}</option>`).join("")}</select></div>
      ${campo(x, "revisao_em", "Data de revisão", "date")}
      <div style="grid-column:1/-1">${campo(x, "resultado", "Resultado da revisão", "area")}</div>
      ${podeEditar ? `<div style="grid-column:1/-1;display:flex;gap:8px"><button class="sec" data-salvar style="width:auto;margin:0">${x.id ? "Salvar" : "Adicionar objetivo"}</button>${x.id ? `<button class="perigo" data-apagar style="width:auto;margin:0">Excluir</button>` : ""}</div>` : ""}</div>`;
    alvo.innerHTML = (itens.length ? itens.map(bloco).join("") : `<div class="resumo">Nenhum objetivo registrado ainda.</div>`)
      + (podeEditar ? `<h3 style="font-size:14px;margin:16px 0 0">Novo objetivo</h3>${bloco({ responsavel: "Colaborador(a) + Liderança" })}` : "");
    alvo.querySelectorAll(".cd-pdi").forEach(el => {
      const id = el.dataset.id, s = el.querySelector("[data-salvar]"), a = el.querySelector("[data-apagar]");
      if (s) s.addEventListener("click", async () => {
        const d = {}; el.querySelectorAll("[data-f]").forEach(i => d[i.dataset.f] = i.value.trim() || null);
        if (!d.objetivo) return aviso("a-cd", "Escreva o objetivo de desenvolvimento.");
        d.status = d.status || "Não iniciado"; d.atualizado_em = new Date().toISOString();
        try {
          if (id === "novo") await api("/rest/v1/cd_pdi", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ ...d, colaborador_id: quem, ciclo_id: ciclo && ciclo.id, criado_por: eu.id }) });
          else await api(`/rest/v1/cd_pdi?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(d) });
          await desenharPdi(alvo, quem, podeEditar); aviso("a-cd", "PDI salvo.", "ok");
        } catch (e) { if (e.message !== "sessao") aviso("a-cd", traduzErro(e)); }
      });
      if (a) a.addEventListener("click", async () => { if (!confirm("Excluir este objetivo do PDI?")) return;
        try { await api(`/rest/v1/cd_pdi?id=eq.${id}`, { method: "DELETE" }); await desenharPdi(alvo, quem, podeEditar); } catch (e) { aviso("a-cd", traduzErro(e)); } });
    });
  }
  async function historico(alvo, quem) {
    const h = await api("/rest/v1/rpc/cd_historico", { method: "POST", body: JSON.stringify({ p: quem }) });
    if (!h.length) { alvo.innerHTML = `<div class="resumo">Ainda não há resultados compartilhados.</div>`; return; }
    alvo.innerHTML = `<div class="qg-tabela"><table><thead><tr><th>Ciclo</th><th>Média</th><th>Classificação</th>${DIM.map(d => `<th title="${esc(d[0])}">${esc(d[0].split(" ").map(p => p[0]).join(""))}</th>`).join("")}<th>Tendência</th></tr></thead><tbody>
      ${h.map((x, i) => { const ant = i ? h[i - 1].media : null, t = ant == null || x.media == null ? "—" : x.media > ant ? "↑ evoluiu" : x.media < ant ? "↓ regrediu" : "→ manteve";
        return `<tr><td>${x.ciclo} · ${esc(x.titulo)}</td><td class="num"><b>${num1(x.media)}</b></td><td><span class="sit ${corM(x.media)}">${esc(x.classificacao || "")}</span></td>${(x.dimensoes || []).map(m => `<td class="num">${num1(m)}</td>`).join("")}<td>${t}</td></tr>`; }).join("")}</tbody></table></div>
      <div class="ajuda">AI: Autonomia e Iniciativa · CO: Cultura Organizacional · HT: Habilidades Técnicas · HDE: Habilidades de Execução · CC: Competências Comportamentais.</div>`;
  }
  async function meuPdi() {
    $("cd-corpo").innerHTML = `<div class="cd-bloco"><h2>Meus resultados</h2><div class="ajuda">Aparecem aqui depois da conversa de feedback, quando a liderança compartilha o resultado do ciclo.</div><div id="cd-mh" class="resumo">Carregando…</div></div>
      <div class="cd-bloco"><h2>Meu Plano de Desenvolvimento Individual (PDI)</h2><div class="ajuda">Construído com a sua liderança ao final da conversa. Atualize o status e o resultado conforme avança.</div><div id="cd-mp" class="resumo">Carregando…</div></div>`;
    try { await Promise.all([historico($("cd-mh"), eu.id), desenharPdi($("cd-mp"), eu.id, true)]); } catch (e) { if (e.message !== "sessao") aviso("a-cd", traduzErro(e)); }
  }

  // ---------------------------------------------------------------- equipe (liderança e gestão)
  async function listaEquipe() {
    try { equipe = await api("/rest/v1/rpc/cd_equipe", { method: "POST", body: JSON.stringify({ p_ciclo: ciclo.id }) }); } catch {}
    const t = (x) => x.avaliacao_media == null ? `<span class="sit neutro">Barema pendente</span>` : `<span class="sit ${corM(x.avaliacao_media)}">${num1(x.avaliacao_media)} · ${esc(x.classificacao)}</span>`;
    $("cd-corpo").innerHTML = `<div class="qg-barra"><input type="search" id="cd-busca" placeholder="Buscar pessoa"><span class="resumo" style="margin:0" id="cd-res"></span></div>
      <div class="qg-tabela"><table><thead><tr><th>Pessoa</th><th>Vaga</th><th>Liderança</th><th>Autoavaliação</th><th>Barema</th><th>Conversa</th><th>PDI aberto</th><th>Ciclo anterior</th></tr></thead><tbody id="cd-eq"></tbody></table></div>`;
    const desenhar = () => {
      const q = $("cd-busca").value.trim().toLowerCase(), l = equipe.filter(x => !q || x.nome.toLowerCase().includes(q));
      $("cd-res").textContent = `${l.length} pessoa(s) · ${equipe.filter(x => x.avaliacao_media != null).length} avaliada(s) · ${equipe.filter(x => x.conversa_em).length} conversa(s) feita(s)`;
      $("cd-eq").innerHTML = l.map(x => `<tr data-id="${x.colaborador_id}"><td><b>${esc(x.nome)}</b></td><td>${esc(x.vaga || "")}</td><td>${esc(x.lider || "")}</td>
        <td>${x.auto_enviada ? `<span class="sit ok">enviada</span>` : `<span class="sit neutro">pendente</span>`}</td><td>${t(x)}</td>
        <td>${x.conversa_em ? fmtData(x.conversa_em) : "—"}</td><td class="num">${x.pdi_abertos || "—"}</td><td class="num">${num1(x.media_anterior)}</td></tr>`).join("")
        || `<tr><td colspan="8">Ninguém para avaliar neste ciclo. A equipe vem do cadastro (liderança imediata de cada pessoa).</td></tr>`;
    };
    $("cd-busca").addEventListener("input", desenhar); desenhar();
    $("cd-eq").addEventListener("click", (e) => { const tr = e.target.closest("tr[data-id]"); if (tr) abrirPessoa(tr.dataset.id); });
  }

  async function abrirPessoa(id, sub = "barema") {
    pessoa = equipe.find(x => x.colaborador_id === id); if (!pessoa) return;
    $("cd-sub").textContent = `${pessoa.nome} · Ciclo ${ciclo.numero}`;
    const r = await api(`/rest/v1/cd_avaliacao?select=*&ciclo_id=eq.${ciclo.id}&colaborador_id=eq.${id}`);
    aval = r[0] || { notas: [], roteiro: {} };
    $("cd-corpo").innerHTML = `<div class="abas" id="cd-pabas">${[["auto", "Autoavaliação"], ["barema", "Barema"], ["roteiro", "Roteiro da conversa"], ["pdi", "PDI"], ["hist", "Histórico"]]
      .map(([k, t]) => `<button data-p="${k}">${t}</button>`).join("")}</div><div id="cd-pc"></div>`;
    $("cd-pabas").querySelectorAll("button").forEach(b => b.addEventListener("click", () => sub2(b.dataset.p)));
    sub2(sub);
  }
  async function sub2(p) {
    $("cd-pabas").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.p === p));
    const c = $("cd-pc"); c.innerHTML = `<div class="resumo">Carregando…</div>`;
    try {
      if (p === "auto") {
        const r = (await api(`/rest/v1/cd_autoavaliacao?select=*&ciclo_id=eq.${ciclo.id}&colaborador_id=eq.${pessoa.colaborador_id}`))[0];
        const v = (r && r.enviada_em && r.respostas) || null;
        c.innerHTML = !v ? `<div class="resumo">${esc(pessoa.nome)} ainda não enviou a autoavaliação deste ciclo.</div>` : `<div class="cd-bloco">
          <h2>Principais entregas</h2><ol>${(v.entregas || []).filter(Boolean).map(x => `<li>${esc(x)}</li>`).join("")}</ol>
          <h2>Pontos fortes</h2><p style="white-space:pre-wrap">${esc(v.fortes || "—")}</p><h2>Pontos de melhoria</h2><p style="white-space:pre-wrap">${esc(v.melhoria || "—")}</p>
          <h2>Dificuldades</h2><p style="white-space:pre-wrap">${esc(v.dificuldades || "—")}</p><h2>Expectativas e apoio desejado</h2><p style="white-space:pre-wrap">${esc(v.expectativas || "—")}</p>
          <div class="ajuda">Enviada em ${new Date(r.enviada_em).toLocaleDateString("pt-BR")}.</div></div>`;
      } else if (p === "barema") barema(c);
      else if (p === "roteiro") roteiro(c);
      else if (p === "pdi") { c.innerHTML = `<div class="cd-bloco"><h2>PDI de ${esc(pessoa.nome)}</h2><div class="ajuda">Registre ao final da conversa, em conjunto. Cada objetivo com ação, responsável, apoio, prazo e indicador.</div><div id="cd-pp"></div></div>`; await desenharPdi($("cd-pp"), pessoa.colaborador_id, true); }
      else { c.innerHTML = `<div class="cd-bloco"><h2>Histórico de evolução</h2><div id="cd-ph"></div></div>`; await historico($("cd-ph"), pessoa.colaborador_id); }
    } catch (e) { if (e.message !== "sessao") aviso("a-cd", traduzErro(e)); }
  }
  async function salvarAval(extra, msg) {
    const d = { ciclo_id: ciclo.id, colaborador_id: pessoa.colaborador_id, avaliador_id: aval.avaliador_id || eu.id, notas: aval.notas || [],
      pontos_positivos: aval.pontos_positivos || null, pontos_criticos: aval.pontos_criticos || null, status: aval.status || null, acao: aval.acao || null,
      roteiro: aval.roteiro || {}, conversa_em: aval.conversa_em || null, compartilhada: !!aval.compartilhada, ...extra };
    if (aval.validacao_rescisao !== undefined) d.validacao_rescisao = aval.validacao_rescisao || null;
    try {
      const r = await api("/rest/v1/cd_avaliacao?on_conflict=ciclo_id,colaborador_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(d) });
      aval = r[0]; aviso("a-cd", msg, "ok");
    } catch (e) { if (e.message !== "sessao") aviso("a-cd", traduzErro(e)); }
  }
  function barema(c) {
    const n = aval.notas || [];
    c.innerHTML = `<form id="cd-fb" novalidate>
      <div class="cd-guia">Baseie cada nota em fatos observados no período e use toda a escala: <b>1</b> muito abaixo · <b>2</b> abaixo · <b>3</b> dentro · <b>4</b> acima · <b>5</b> muito acima do esperado. Justifique sempre as notas 1 e 5 com exemplos concretos.</div>
      <div class="cd-painel" id="cd-res-b"></div>
      ${DIM.map(([t, d, qs], di) => `<div class="cd-dim"><h3>${t}</h3><div class="ajuda">${d}</div>${qs.map((q, qi) => { const k = di * 5 + qi;
        return `<div class="cd-q"><span>${qi + 1}. ${esc(q)}</span><div class="cd-esc" role="radiogroup" aria-label="Nota da pergunta ${k + 1}">${[1, 2, 3, 4, 5].map(v => `<label title="${ESCALA[v]}"><input type="radio" name="q${k}" value="${v}"${n[k] === v ? " checked" : ""}><span>${v}</span></label>`).join("")}</div></div>`; }).join("")}</div>`).join("")}
      <div class="cd-bloco"><h2>Observações</h2>
        <label for="cd-bp">Pontos positivos (contribuições e exemplos de atuação destacada)</label><textarea id="cd-bp">${esc(aval.pontos_positivos || "")}</textarea>
        <label for="cd-bc">Pontos críticos (oportunidades de melhoria, dificuldades e sugestões)</label><textarea id="cd-bc">${esc(aval.pontos_criticos || "")}</textarea></div>
      <div class="cd-bloco"><h2>Desdobramentos</h2>
        <div class="grade2"><div><label for="cd-bs">Status</label><select id="cd-bs"><option value=""></option>${STATUS.map(s => `<option${aval.status === s ? " selected" : ""}>${s}</option>`).join("")}</select></div>
          <div><label for="cd-ba">Ação recomendada / encaminhamento</label><select id="cd-ba"></select></div></div>
        <div id="cd-bval"></div></div>
      <button type="submit" style="width:auto">Salvar barema</button></form>`;
    const atual = () => DIM.flatMap((_, di) => [0, 1, 2, 3, 4].map(qi => { const r = c.querySelector(`input[name="q${di * 5 + qi}"]:checked`); return r ? +r.value : null; }));
    const resumo = () => {
      const ns = atual(), m = media(ns), ds = dims(ns), preenchidas = ns.filter(Boolean).length, cp = compat(m);
      $("cd-res-b").innerHTML = `<div><b>${num1(m)}</b>Média · ${preenchidas}/25 respondidas</div><div><b style="font-size:15px">${esc(classe(m) || "—")}</b>Classificação</div>
        <div><b style="font-size:15px">${cp ? cp + " do esperado" : "—"}</b>Compatibilidade cargo x entregas</div>
        <div><b>${num1(pessoa.media_anterior)}</b>Ciclo anterior${m != null && pessoa.media_anterior != null ? ` · ${m > pessoa.media_anterior ? "↑ evoluiu" : m < pessoa.media_anterior ? "↓ regrediu" : "→ manteve"}` : ""}</div>`
        + ds.map((x, i) => `<div><b>${num1(x)}</b>${esc(DIM[i][0].toLowerCase())}</div>`).join("");
      const sel = $("cd-ba"), v = sel.value || aval.acao || "", ops = cp ? ACOES[cp] : [].concat(...Object.values(ACOES));
      sel.innerHTML = `<option value=""></option>` + ops.map(o => `<option${v === o ? " selected" : ""}>${o}</option>`).join("") + (v && !ops.includes(v) ? `<option selected>${esc(v)}</option>` : "");
      const resc = $("cd-bs").value === "Recomenda-se Rescisão";
      $("cd-bval").innerHTML = resc ? `<div class="aviso alerta" style="display:block">Recomendação de rescisão: só segue depois de esgotados feedback e planos de melhoria, ou em caso grave documentado. A validação é da gerência ou da administração.</div>
        ${pode("admin") ? `<label for="cd-bv">Validação da liderança para caso de rescisão</label><select id="cd-bv"><option value=""></option><option value="deferida"${aval.validacao_rescisao === "deferida" ? " selected" : ""}>Deferida</option><option value="indeferida"${aval.validacao_rescisao === "indeferida" ? " selected" : ""}>Indeferida</option></select>`
          : `<div class="ajuda">Validação: ${aval.validacao_rescisao ? esc(aval.validacao_rescisao) : "aguardando a gerência"}.</div>`}` : "";
    };
    c.querySelectorAll(".cd-esc input").forEach(i => i.addEventListener("change", resumo)); $("cd-bs").addEventListener("change", resumo); resumo();
    $("cd-fb").addEventListener("submit", async (e) => {
      e.preventDefault();
      const ns = atual();
      const extremos = ns.some(x => x === 1 || x === 5);
      if (extremos && !$("cd-bp").value.trim() && !$("cd-bc").value.trim()) return aviso("a-cd", "Há notas 1 ou 5: justifique com exemplos concretos nos pontos positivos ou críticos.");
      Object.assign(aval, { notas: ns, pontos_positivos: $("cd-bp").value.trim(), pontos_criticos: $("cd-bc").value.trim(), status: $("cd-bs").value || null, acao: $("cd-ba").value || null });
      if ($("cd-bv")) aval.validacao_rescisao = $("cd-bv").value || null;
      await salvarAval({}, ns.filter(Boolean).length < 25 ? `Barema salvo com ${ns.filter(Boolean).length} de 25 respostas.` : "Barema salvo.");
      pessoa.avaliacao_media = media(ns); pessoa.classificacao = classe(media(ns));
    });
  }
  function roteiro(c) {
    const n = aval.notas || [], m = media(n), ds = dims(n), R = aval.roteiro || {};
    if (m == null) { c.innerHTML = `<div class="resumo">Preencha o barema primeiro: o painel do roteiro usa as médias do ciclo.</div>`; return; }
    const validos = ds.map((x, i) => [x, i]).filter(x => x[0] != null), maior = Math.max(...validos.map(x => x[0])), menor = Math.min(...validos.map(x => x[0]));
    const leitura = (x) => x == null ? "—" : x === menor && x < 4 ? "Prioridade: desenvolver (menor média)" : x === maior && x >= 3 ? "Ponto forte: reconhecer e ampliar (maior média)" : x >= 4 ? "Ponto forte: reconhecer e ampliar" : x < 3 ? "Prioridade: desenvolver" : "Dentro do esperado: manter";
    const foco = m < 3 ? "Foco da conversa: deixar claro o que precisa mudar, com prazos curtos e check-ins quinzenais." : m < 4 ? "Foco da conversa: valorizar a consistência e escolher 1 ou 2 pontos que levem ao próximo patamar." : "Foco da conversa: reconhecer com fatos e combinar como ampliar responsabilidades.";
    const area = (k, rot, ph = "") => `<label for="cdr-${k}">${rot}</label><textarea id="cdr-${k}" data-r="${k}" placeholder="${esc(ph)}">${esc(R[k] || "")}</textarea>`;
    c.innerHTML = `<div class="cd-bloco"><h2>Painel do ciclo</h2>
        <div class="qg-tabela"><table><thead><tr><th>Dimensão</th><th>Média</th><th>Leitura</th></tr></thead><tbody>
        <tr><td><b>RESULTADO GERAL</b></td><td class="num"><b>${num1(m)}</b></td><td>${esc(classe(m))}. ${foco}</td></tr>
        ${DIM.map((d, i) => `<tr><td>${d[0]}</td><td class="num">${num1(ds[i])}</td><td>${leitura(ds[i])}</td></tr>`).join("")}</tbody></table></div>
        ${aval.pontos_positivos ? `<p><b>Pontos positivos (barema):</b> ${esc(aval.pontos_positivos)}</p>` : ""}${aval.pontos_criticos ? `<p><b>Pontos críticos (barema):</b> ${esc(aval.pontos_criticos)}</p>` : ""}</div>
      <form id="cd-fr" novalidate>
      <div class="cd-bloco"><h2>Preparação (20 a 30 min, de preferência na véspera)</h2>
        <div class="cd-guia">Leia a autoavaliação e compare com o painel: onde as visões divergem? Confira o PDI do ciclo anterior. Use o modelo SCI — <b>S</b>ituação, <b>C</b>omportamento, <b>I</b>mpacto. Agende com 3 dias de antecedência, em local reservado.${m < 3 ? " Como a classificação está abaixo do esperado, alinhe antes com a coordenação os encaminhamentos possíveis." : ""}</div>
        ${area("prep_reconhecimento", "1 reconhecimento, com fato (SCI)", "Ex.: Na visita à escola X, você levou a análise dos indicadores pronta; a gestão definiu as ações na mesma reunião.")}
        ${area("prep_prioridades", "1 ou 2 prioridades de desenvolvimento, com fato (SCI)")}
        ${area("prep_mensagem", "Mensagem principal (se a pessoa lembrar de uma única frase, qual deve ser?)")}</div>
      <div class="cd-bloco"><h2>Durante a conversa (cerca de 1 hora)</h2>
        <div class="cd-guia"><b>Etapa 1 · Abertura (5 min):</b> “Esta conversa é sobre o seu desenvolvimento: quero reconhecer o que funcionou, alinhar o que pode melhorar e sair daqui com um plano que faça sentido para você.”</div>
        <div class="cd-guia"><b>Etapa 2 · Escuta (5 min):</b> “Olhando para estes quatro meses, como você avalia o seu ciclo? Do que mais se orgulha? O que foi mais difícil?” Não rebata agora; resuma o que ouviu.</div>
        ${area("e2_visao", "Registro: como a pessoa avalia o próprio ciclo")}
        <div class="cd-guia"><b>Etapa 3 · Perguntas por dimensão (15 min):</b> comece pelas prioridades e pelo ponto forte.<br>${DIM.map((d, i) => `<b>${d[0]}</b>${ds[i] != null ? ` (${num1(ds[i])})` : ""}: ${PERG_DIM[i].join(" · ")}`).join("<br>")}</div>
        ${area("e3_respostas", "Registro: o que respondeu em cada dimensão (exemplos e fatos)")}
        <div class="cd-guia"><b>Etapa 4 · Reconhecimento (5 min):</b> “Em [situação], você [comportamento]. Isso fez com que [impacto].” Pergunte como ampliar essa força.</div>
        ${area("e4_forte", "Registro: ponto forte reconhecido e como ampliar")}
        <div class="cd-guia"><b>Etapa 5 · Desenvolvimento (15 min):</b> apresente o ponto com fato, sem “mas”; ouça; investigue a causa — falta <b>saber</b> (conhecimento), <b>poder</b> (tempo, recursos) ou <b>querer</b> (clareza de prioridade)? Alinhe a expectativa com prazo.</div>
        ${area("e5_prioridades", "Registro: prioridade(s), visão da pessoa e causa (saber, poder ou querer)")}
        <div class="cd-guia"><b>Etapa 6 · Plano (10 min):</b> deixe a pessoa propor primeiro; feche de 1 a 3 objetivos com ação, prazo e evidência na aba PDI.${m < 3 ? " <b>Classificação abaixo do esperado:</b> “O resultado deste ciclo ficou abaixo do esperado para a função. Precisamos ver evolução em [ponto] até [data].”" : ""}</div>
        ${area("e6_compromisso", "Registro: o que a liderança se compromete a fazer")}
        <div class="cd-guia"><b>Etapa 7 · Fechamento (5 min):</b> peça que a pessoa resuma os combinados; peça feedback para você; marque o check-in.</div>
        ${area("e7_combinados", "Registro: resumo dos combinados e o feedback que você recebeu")}</div>
      <div class="cd-bloco"><h2>Depois da conversa (em até 2 dias úteis)</h2>
        <div class="cd-guia">Complete o PDI, envie o resumo com a data do check-in e atualize o encaminhamento no barema. No check-in: o que avançou, o que travou e o que precisa ser ajustado.</div>
        <div class="grade2"><div><label for="cd-rc">Data da conversa</label><input type="date" id="cd-rc" value="${esc(aval.conversa_em || "")}"></div>
          <div><label for="cd-rk">Data do próximo check-in</label><input type="date" id="cd-rk" data-r="checkin" value="${esc(R.checkin || "")}"></div></div>
        <label class="check"><input type="checkbox" id="cd-rsh"${aval.compartilhada ? " checked" : ""}><span>Compartilhar as médias do ciclo com ${esc(pessoa.nome)} (a pessoa vê média, classificação e dimensões; nunca o status nem a validação de rescisão)</span></label></div>
      <button type="submit" style="width:auto">Salvar roteiro</button></form>`;
    $("cd-fr").addEventListener("submit", async (e) => {
      e.preventDefault();
      const r = {}; c.querySelectorAll("[data-r]").forEach(i => r[i.dataset.r] = i.value.trim());
      Object.assign(aval, { roteiro: r, conversa_em: $("cd-rc").value || null, compartilhada: $("cd-rsh").checked });
      await salvarAval({}, "Roteiro salvo.");
      pessoa.conversa_em = aval.conversa_em;
    });
  }

  // ---------------------------------------------------------------- painel da gestão
  async function painel() {
    const c = $("cd-corpo"); c.innerHTML = `<div class="resumo">Carregando…</div>`;
    try {
      const l = await api("/rest/v1/rpc/cd_painel", { method: "POST", body: JSON.stringify({ p_ciclo: ciclo.id }) });
      const cont = (f) => l.filter(f).length, ms = l.map(x => +x.media).filter(x => x > 0);
      c.innerHTML = `<div class="qg-kpis">
        <div class="qg-kpi" style="cursor:default"><b>${l.length}</b><span>Avaliações no ciclo</span></div>
        <div class="qg-kpi" style="cursor:default"><b>${ms.length ? num1(Math.round(ms.reduce((a, b) => a + b, 0) / ms.length * 10) / 10) : "—"}</b><span>Média geral</span></div>
        <div class="qg-kpi" style="cursor:default"><b>${cont(x => x.media != null && x.media < 3)}</b><span>Abaixo do esperado</span></div>
        <div class="qg-kpi" style="cursor:default"><b>${cont(x => x.media >= 4)}</b><span>Acima do esperado</span></div>
        <div class="qg-kpi" style="cursor:default"><b>${cont(x => x.conversa_em)}</b><span>Conversas feitas</span></div>
        <div class="qg-kpi" style="cursor:default"><b>${cont(x => x.status === "Recomenda-se Rescisão")}</b><span>Rescisão recomendada</span></div></div>
        <div class="qg-barra"><button class="sec" id="cd-csv">Baixar planilha</button></div>
        <div class="qg-tabela"><table><thead><tr><th>Pessoa</th><th>Liderança</th><th>Avaliador(a)</th><th>Média</th><th>Classificação</th>${DIM.map(d => `<th title="${esc(d[0])}">${esc(d[0].split(" ").map(p => p[0]).join(""))}</th>`).join("")}<th>Status</th><th>Encaminhamento</th><th>Validação</th><th>Conversa</th><th>Auto</th></tr></thead><tbody>
        ${l.map(x => `<tr><td><b>${esc(x.nome)}</b></td><td>${esc(x.lider || "")}</td><td>${esc(x.avaliador || "")}</td><td class="num"><b>${num1(x.media)}</b></td><td><span class="sit ${corM(x.media)}">${esc(x.classificacao || "")}</span></td>
          ${(x.dimensoes || [null, null, null, null, null]).map(m => `<td class="num">${num1(m)}</td>`).join("")}<td>${esc(x.status || "")}</td><td>${esc(x.acao || "")}</td><td>${esc(x.validacao || "")}</td><td>${fmtData(x.conversa_em)}</td><td>${x.auto_enviada ? "✓" : "—"}</td></tr>`).join("")
          || `<tr><td colspan="15">Nenhuma avaliação neste ciclo ainda.</td></tr>`}</tbody></table></div>`;
      $("cd-csv").addEventListener("click", () => {
        const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`, n = (v) => v == null ? "" : String(v).replace(".", ",");
        const linhas = [["Colaborador(a)", "Vaga", "Liderança", "Avaliador(a)", "Média", "Classificação", ...DIM.map(d => d[0]), "Status", "Encaminhamento", "Validação da rescisão", "Data da conversa", "Autoavaliação enviada"].map(q).join(";"),
          ...l.map(x => [x.nome, x.vaga, x.lider, x.avaliador, n(x.media), x.classificacao, ...(x.dimensoes || []).map(n), x.status, x.acao, x.validacao, fmtData(x.conversa_em), x.auto_enviada ? "Sim" : "Não"].map(q).join(";"))];
        const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + linhas.join("\r\n")], { type: "text/csv;charset=utf-8" }));
        a.download = `ciclo-${ciclo.numero}-avaliacoes.csv`; a.click();
      });
    } catch (e) { if (e.message !== "sessao") aviso("a-cd", traduzErro(e)); }
  }

  // ---------------------------------------------------------------- abrir e encerrar ciclos
  function gerirCiclos() {
    const prox = (ciclos[0] ? ciclos[0].numero : 0) + 1, hoje = new Date();
    const q = Math.floor(hoje.getMonth() / 4), ini = new Date(hoje.getFullYear(), q * 4, 1), fim = new Date(hoje.getFullYear(), q * 4 + 4, 0);
    const iso = (d) => d.toISOString().slice(0, 10), nomes = ["Jan–Abr", "Mai–Ago", "Set–Dez"];
    $("cd-corpo").innerHTML = `<div class="cd-guia">O ciclo se repete a cada 4 meses (Jan–Abr, Mai–Ago, Set–Dez). A numeração é contínua ano após ano, o que permite comparar a evolução de cada pessoa.</div>
      <div class="qg-tabela"><table><thead><tr><th>Nº</th><th>Título</th><th>Início</th><th>Fim</th><th>Situação</th><th></th></tr></thead><tbody>
      ${ciclos.map(c => `<tr><td>${c.numero}</td><td>${esc(c.titulo)}</td><td>${fmtData(c.inicio)}</td><td>${fmtData(c.fim)}</td><td>${c.aberto ? `<span class="sit ok">aberto</span>` : `<span class="sit neutro">encerrado</span>`}</td>
        <td><button class="sec" data-alt="${c.id}" style="width:auto;margin:0;padding:6px 10px;font-size:13px">${c.aberto ? "Encerrar" : "Reabrir"}</button></td></tr>`).join("") || `<tr><td colspan="6">Nenhum ciclo criado.</td></tr>`}</tbody></table></div>
      <h2>Abrir novo ciclo</h2><form id="cd-fc" novalidate><div class="grade2">
        <div><label for="cd-cn">Número</label><input id="cd-cn" type="text" inputmode="numeric" value="${prox}"></div>
        <div><label for="cd-ct">Título</label><input id="cd-ct" type="text" value="${nomes[q]} ${hoje.getFullYear()}"></div>
        <div><label for="cd-ci">Início</label><input id="cd-ci" type="date" value="${iso(ini)}"></div>
        <div><label for="cd-cf">Fim</label><input id="cd-cf" type="date" value="${iso(fim)}"></div></div>
        <button type="submit" style="width:auto">Abrir ciclo</button></form>`;
    $("cd-corpo").querySelectorAll("[data-alt]").forEach(b => b.addEventListener("click", async () => {
      const c = ciclos.find(x => x.id === +b.dataset.alt);
      try { await api(`/rest/v1/cd_ciclo?id=eq.${c.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ aberto: !c.aberto }) }); aba = "ciclos"; await abrir(); aviso("a-cd", c.aberto ? "Ciclo encerrado." : "Ciclo reaberto.", "ok"); }
      catch (e) { aviso("a-cd", traduzErro(e)); } }));
    $("cd-fc").addEventListener("submit", async (e) => {
      e.preventDefault();
      const d = { numero: parseInt($("cd-cn").value, 10), titulo: $("cd-ct").value.trim(), inicio: $("cd-ci").value, fim: $("cd-cf").value, aberto: true };
      if (!d.numero || !d.titulo || !d.inicio || !d.fim) return aviso("a-cd", "Preencha número, título, início e fim.");
      try { await api("/rest/v1/cd_ciclo", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(d) }); aba = "ciclos"; await abrir(); aviso("a-cd", "Ciclo aberto. A equipe já pode preencher a autoavaliação.", "ok"); }
      catch (er) { aviso("a-cd", /duplicate|unique/i.test(er.message) ? "Já existe um ciclo com este número." : traduzErro(er)); }
    });
  }

  window.Ciclos = { abrir };
})();
