// SGT · Relatórios de Atividades RPA
// Gera o relatório de cada RPA a partir da planilha, envia para assinatura, acompanha a conferência
// e prepara a submissão ao formulário do monday. Dados no Supabase do SGT (tabelas rpa_*); PDF, e-mails (Brevo),
// conferência e backup no Drive ficam na função "rpa". Usa as funções globais do index.html: $, mostrar, aviso,
// esc, api, lerSessao, renovar, carregarSheetJS, paraISO, semAcento, cpfValido, emailValido, SUPABASE_URL, CHAVE_PUBLICA.
(() => {
  const FUNCAO_RPA = SUPABASE_URL + "/functions/v1/rpa";
  const FORM_MONDAY = "https://forms.monday.com/forms/4931312259ca5a0b35baaee3f3ee64c1?r=use1";
  const ORIGEM_MONDAY = "https://forms.monday.com";
  const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const ST = {
    rascunho: ["Rascunho", "cinza"], na_fila: ["Na fila de e-mail", "cinza"], aguardando_assinatura: ["Aguardando assinatura", "lar"],
    com_erro: ["Com erro", "verm"], aguardando_confirmacao: ["Conferir assinatura", "lar"], validado: ["Validado", "verde"],
    submetido: ["Submetido ao monday", "verde"], arquivado: ["Arquivado no Drive", "verde"], concluido: ["Concluído", "cinza"], cancelado: ["Cancelado", "cinza"] };
  const ETAPAS = [["rascunho","Gerado"],["aguardando_assinatura","Enviado"],["recebido","Recebido"],["validado","Validado"],["submetido","monday"],["arquivado","Drive"],["concluido","Concluído"]];
  const ORDEM = { rascunho: 0, na_fila: 0, aguardando_assinatura: 1, com_erro: 2, aguardando_confirmacao: 2, validado: 3, submetido: 4, arquivado: 5, concluido: 6 };
  const ASS = { govbr: "gov.br (validada automaticamente)", manuscrita: "à mão (conferida pelo Ponto Focal)", govbr_outro: "gov.br de outra pessoa", outra: "Digital, mas não gov.br", nenhuma: "Sem assinatura" };
  let lista = [], comps = [], comp = mesAtual(), cota = null, sel = new Set(), atual = null, cfg = null;
  const fmtR = (v) => "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dBR = (s) => s ? String(s).slice(0, 10).split("-").reverse().join("/") : "";
  const quando = (s) => s ? new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
  const mesAno = (c) => c ? MESES[+c.slice(5, 7) - 1] + "/" + c.slice(0, 4) : "";
  function mesAtual() { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); }
  function ultimoDia(c) { return c + "-" + String(new Date(+c.slice(0, 4), +c.slice(5, 7), 0).getDate()).padStart(2, "0"); }

  // ---------- chamada à função "rpa" do servidor
  async function chamar(acao, dados = {}, tentou = false) {
    const s = lerSessao(); if (!s) throw new Error("sessao");
    let r;
    try { r = await fetch(FUNCAO_RPA, { method: "POST", headers: { "Content-Type": "application/json", apikey: CHAVE_PUBLICA, Authorization: "Bearer " + s.t }, body: JSON.stringify({ ...dados, acao }) }); }
    catch { throw new Error("Sem conexão com o servidor dos Relatórios RPA. Tente de novo."); }
    const d = await r.json().catch(() => ({ ok: false, erro: "Resposta inválida do servidor." }));
    if (!d.ok && /sess[aã]o/i.test(d.erro || "") && !tentou && await renovar()) return chamar(acao, dados, true);
    if (!d.ok) throw new Error(d.erro || "Não foi possível concluir.");
    return d;
  }
  async function rodar(btn, fn, alvo) {
    const txt = btn && btn.textContent; if (btn) { btn.disabled = true; btn.textContent = "Aguarde…"; }
    try { await fn(); } catch (e) { if (e.message !== "sessao") aviso(alvo || "a-rpa", e.message); }
    finally { if (btn) { btn.disabled = false; btn.textContent = txt; } }
  }
  const b64Bytes = (b64) => { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };

  // ---------- estilos e telas
  document.head.insertAdjacentHTML("beforeend", `<style>
    .rpa-barra{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:14px}
    .rpa-barra select,.rpa-barra input{width:auto;padding:9px 12px;font-size:14.5px}
    .rpa-barra button{width:auto;margin:0}
    .rpa-chips{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 4px}
    .rpa-chip{width:auto;margin:0;font-weight:400;border:1px solid var(--borda);border-radius:12px;padding:8px 12px;background:#fff;cursor:pointer;font-size:12.5px;color:var(--texto-2);min-width:96px;text-align:left}
    .rpa-chip b{display:block;font-size:20px;color:var(--texto)} .rpa-chip:hover{background:var(--cor-suave)} .rpa-chip.on{border-color:var(--cor);background:var(--cor-suave)}
    [id^=v-rpa] input[type=number],[id^=v-rpa] input[type=month],[id^=v-rpa] input[type=url],[id^=v-rpa] textarea{width:100%;padding:11px 13px;font-size:16px;border:1px solid var(--borda);border-radius:var(--raio);background:#fff;color:var(--texto);font-family:inherit}
    [id^=v-rpa] input:disabled,[id^=v-rpa] select:disabled,[id^=v-rpa] textarea:disabled{background:var(--fundo);color:var(--texto-2)}
    html[data-tema=escuro] .rpa-linha,html[data-tema=escuro] .rpa-chip,html[data-tema=escuro] .rpa-esc,html[data-tema=escuro] .rpa-sel,html[data-tema=escuro] #rpa-monday,html[data-tema=escuro] .rpa-ver>div{background:var(--superficie);color:var(--texto)}
    html[data-tema=escuro] [id^=v-rpa] input,html[data-tema=escuro] [id^=v-rpa] textarea{background:#2a2327;color:var(--texto)}
    .rpa-chip.alerta b{color:var(--erro)}
    .rpa-linha{display:grid;grid-template-columns:26px 1fr auto;gap:6px 12px;align-items:center;border:1px solid var(--borda);border-radius:var(--raio);padding:11px 13px;background:#fff}
    .rpa-linha:hover{border-color:var(--cor)} .rpa-linha .nm{cursor:pointer} .rpa-linha .nm b{font-size:15px}
    .rpa-linha .meta{font-size:12.5px;color:var(--texto-2);margin-top:2px} .rpa-linha .err{font-size:12.5px;color:var(--erro);margin-top:3px}
    .rpa-linha input{width:18px;height:18px;accent-color:var(--cor)}
    .rpa-mini{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;align-items:center}
    .rpa-mini button{width:auto;margin:0;padding:6px 10px;font-size:12.5px}
    .rpa-sel{position:sticky;bottom:0;background:#fff;border-top:1px solid var(--borda);padding:10px 0;margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    .rpa-sel button{width:auto;margin:0}
    .rpa-prog{display:flex;gap:4px;margin:14px 0 6px}
    .rpa-prog .p{flex:1;text-align:center;font-size:11px;color:var(--texto-2)} .rpa-prog .p i{display:block;height:8px;border-radius:6px;background:#eee;margin-bottom:6px}
    .rpa-prog .p.feito i{background:var(--verde)} .rpa-prog .p.agora i{background:var(--laranja)} .rpa-prog .p.agora{color:var(--texto);font-weight:700}
    .rpa-prog.erro .p.agora i{background:var(--erro)}
    .rpa-caixa{background:var(--fundo);border:1px solid var(--borda);border-radius:var(--raio);padding:14px;margin-top:14px;font-size:14px;line-height:1.5}
    .rpa-caixa.erro{background:var(--erro-fundo);border-color:#f5c2bd;color:var(--erro)}
    .rpa-ver{position:fixed;inset:0;background:rgba(15,10,13,.55);z-index:50;display:flex;align-items:center;justify-content:center;padding:16px}
    .rpa-ver>div{background:#fff;border-radius:14px;width:min(920px,100%);height:min(92vh,1100px);display:flex;flex-direction:column;overflow:hidden}
    .rpa-ver header{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--borda);font-size:14px}
    .rpa-ver header button,.rpa-ver header a{width:auto;margin:0;padding:7px 12px;font-size:13px}
    .rpa-ver iframe{flex:1;border:0;width:100%}
    .rpa-fav{display:inline-block;padding:10px 16px;border-radius:10px;background:#fff1e0;color:#a85500;font-weight:700;text-decoration:none;border:2px dashed #f5b06a;cursor:grab}
    .rpa-esc{border:1px solid var(--borda);border-radius:var(--raio);padding:10px 12px;margin-top:10px;background:#fff}
    .rpa-esc textarea{min-height:70px}
    #rpa-monday{position:fixed;right:16px;bottom:16px;z-index:40;width:min(380px,calc(100% - 32px));background:#fff;border:1px solid var(--borda);border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.18);padding:14px 16px;font-size:14px;line-height:1.45}
    #rpa-monday button{width:auto;margin:8px 8px 0 0;padding:8px 12px;font-size:13px}
    @media (max-width:640px){.rpa-linha{grid-template-columns:26px 1fr}.rpa-mini{grid-column:2;justify-content:flex-start}}
  </style>`);

  $("cartao").querySelector(".rodape").insertAdjacentHTML("beforebegin", `
  <section id="v-rpa" class="oculto">
    <div class="topo"><div><h1>Relatórios RPA</h1><div class="ajuda" style="margin:0">Geração, assinatura, conferência e envio ao monday dos Relatórios de Atividades</div></div><button class="sec" data-rpa-ir="v-inicio">← Início</button></div>
    <div class="rpa-barra">
      <label style="margin:0">Mês de referência</label><select id="rpa-comp"></select>
      <button id="rpa-imp">Importar planilha</button>
      <button class="sec" id="rpa-cfg">Configurações</button>
      <button class="sec" id="rpa-atualizar">↻ Atualizar</button>
    </div>
    <div class="rpa-chips" id="rpa-chips"></div>
    <div class="filtros" style="margin-top:6px"><input id="rpa-busca" type="search" placeholder="Buscar por nome, e-mail ou função">
      <select id="rpa-fst"><option value="">Todas as situações</option>${Object.entries(ST).map(([k, [n]]) => `<option value="${k}">${n}</option>`).join("")}</select>
      <select id="rpa-ffun"><option value="">Todas as funções</option></select></div>
    <div class="resumo" id="rpa-resumo"></div>
    <div class="lista" id="rpa-lista"></div>
    <div class="rpa-sel" id="rpa-selbar">
      <label class="check" style="margin:0"><input type="checkbox" id="rpa-todos"><span>Selecionar visíveis</span></label>
      <button id="rpa-enviar" disabled>Confirmar e enviar para assinatura</button>
      <button class="sec" id="rpa-mon-lote" disabled>Enviar validados ao monday</button>
      <span class="ajuda" id="rpa-cota" style="margin:0"></span>
    </div>
    <div class="aviso" id="a-rpa"></div>
  </section>

  <section id="v-rpa-imp" class="oculto">
    <div class="topo"><div><h1>Importar planilha dos RPA</h1><div class="ajuda" style="margin:0">Gera um relatório (rascunho) para cada pessoa. Nada é enviado antes da sua confirmação.</div></div><button class="sec" data-rpa-ir="v-rpa">← Voltar</button></div>
    <div class="grade2" style="margin-top:8px">
      <div><label for="ri-comp">Mês de referência</label><input type="month" id="ri-comp"></div>
      <div><label for="ri-prazo">Prazo para devolver assinado</label><input type="date" id="ri-prazo"></div>
      <div><label for="ri-ini">Início do período (padrão)</label><input type="date" id="ri-ini"></div>
      <div><label for="ri-fim">Fim do período (padrão)</label><input type="date" id="ri-fim"></div>
    </div>
    <div class="arquivo" style="margin-top:14px">Planilha em Excel (.xlsx) ou CSV com as colunas <b>Nome, CPF, E-mail, Função, Valor</b><br>
      <span style="font-size:12.5px">Opcionais: Disciplina, Tipo (Fixo/Variável), Complemento, Início, Fim. A primeira linha deve ter os títulos.</span><br>
      <input type="file" id="ri-arq" accept=".xlsx,.xls,.csv"></div>
    <a class="baixar" id="ri-modelo" style="display:inline-block;margin-top:8px;cursor:pointer">⬇ Baixar planilha modelo</a>
    <div id="ri-prev"></div>
    <div class="aviso" id="a-ri"></div>
  </section>

  <section id="v-rpa-det" class="oculto">
    <div class="topo"><div><h1 id="rd-nome"></h1><div class="ajuda" style="margin:0" id="rd-sub"></div></div><button class="sec" data-rpa-ir="v-rpa">← Voltar</button></div>
    <div id="rd-corpo"></div>
    <div class="aviso" id="a-rd"></div>
  </section>

  <section id="v-rpa-cfg" class="oculto">
    <div class="topo"><div><h1>Configurações · Relatórios RPA</h1><div class="ajuda" style="margin:0" id="rc-sub"></div></div><button class="sec" data-rpa-ir="v-rpa">← Voltar</button></div>
    <h2>Quem submete no monday</h2>
    <div class="grade2">
      <div><label for="rc-resp">Nome do responsável</label><input id="rc-resp" type="text"></div>
      <div><label for="rc-cargo">Cargo</label><select id="rc-cargo"><option>Ponto Focal do Projeto</option><option>Gerente do Projeto</option><option>Consultor das Superintendências</option></select></div>
      <div><label for="rc-tel">Telefone (com DDD)</label><input id="rc-tel" type="tel" placeholder="71 99999-9999"></div>
    </div>
    <h2>E-mails</h2>
    <div class="grade2">
      <div><label for="rc-teto">Teto de e-mails por dia</label><input id="rc-teto" type="number" min="10" max="300"><div class="ajuda">O Brevo do SGT envia até 300 por dia, somando os códigos de acesso e os avisos. Deixe uma folga.</div></div>
      <div><label for="rc-rem">Nome do remetente</label><input id="rc-rem" type="text"></div>
      <div><label for="rc-resp-para">Responder para (opcional)</label><input id="rc-resp-para" type="email" placeholder="e-mail que recebe as respostas"></div>
      <div><label for="rc-gov">Link do assinador gov.br</label><input id="rc-gov" type="url"></div>
    </div>
    <button id="rc-salvar" style="width:auto">Salvar configurações</button>
    <h2>Conta de backup (Google Drive)</h2>
    <div class="ajuda">Dois dias depois da submissão ao monday, o relatório assinado é copiado para a pasta <b>Relatórios RPA / mês / função</b> no Drive desta conta. Para trocar, digite outro e-mail e clique em Conectar: o Google pede a autorização dessa conta uma vez.</div>
    <div id="rc-bk-status" class="rpa-caixa" style="margin-top:8px"></div>
    <div class="grade2" style="align-items:end"><div><label for="rc-bk">E-mail da conta Google de backup</label><input id="rc-bk" type="email" placeholder="conta@gmail.com"></div>
      <div class="acoes" style="margin:0"><button id="rc-bk-con" style="width:auto">Conectar</button><button class="sec" id="rc-bk-des" style="width:auto">Desconectar</button></div></div>
    <h2>Escopo por função</h2>
    <div class="ajuda">O texto de escopo vai na tabela "Atividades Desenvolvidas". No complemento, <b>{disciplina}</b> é trocado pela disciplina da planilha. O nome da função deve ser igual ao da planilha.</div>
    <div id="rc-escopos"></div>
    <div class="acoes" style="margin-top:10px"><button class="sec" id="rc-mais">+ Nova função</button><button id="rc-salvar-esc">Salvar escopos</button></div>
    <h2>Favorito do monday (instale uma vez)</h2>
    <div class="ajuda">Arraste o botão abaixo para a barra de favoritos do Chrome. Ao enviar um relatório ao monday, o SGT abre o formulário: clique nesse favorito e ele preenche tudo e anexa o PDF. Você só confere e clica em <b>Enviar</b>.</div>
    <p><a class="rpa-fav" id="rc-fav" href="#">★ Preencher RPA no monday</a></p>
    <h2>Rotina automática</h2>
    <div class="ajuda">A cada hora o servidor envia a fila de e-mails, os lembretes (a cada 6 horas), copia para o Drive o que foi submetido há 2 dias e apaga da ferramenta o que foi submetido há 8 dias.</div>
    <div class="ajuda" id="rc-ultima"></div>
    <button class="sec" id="rc-rotina" style="width:auto">Rodar a rotina agora</button>
    <div class="aviso" id="a-rc"></div>
  </section>`);
  document.querySelectorAll("[data-rpa-ir]").forEach(b => b.addEventListener("click", () => b.dataset.rpaIr === "v-rpa" ? abrir() : mostrar(b.dataset.rpaIr)));

  // ---------- painel principal
  async function abrir(manterComp) {
    mostrar("v-rpa"); if (!manterComp) sel.clear();
    $("rpa-lista").innerHTML = `<div class="resumo">Carregando…</div>`;
    try {
      const [l, cs, c] = await Promise.all([api(`/rest/v1/rpa_relatorio?competencia=eq.${comp}&select=*&order=nome`),
        api(`/rest/v1/rpa_relatorio?select=competencia&order=competencia.desc`), chamar("cota").catch(() => null)]);
      lista = l.map(r => ({ ...r, valor: Number(r.valor) })); cota = c && c.cota;
      comps = [...new Set([mesAtual(), comp, ...cs.map(x => x.competencia)])].sort().reverse();
      $("rpa-comp").innerHTML = comps.map(c => `<option value="${c}"${c === comp ? " selected" : ""}>${mesAno(c)}</option>`).join("");
      const funs = [...new Set(lista.map(r => r.funcao).filter(Boolean))].sort();
      const fsel = $("rpa-ffun").value;
      $("rpa-ffun").innerHTML = `<option value="">Todas as funções</option>` + funs.map(f => `<option${f === fsel ? " selected" : ""}>${esc(f)}</option>`).join("");
      desenhar();
    } catch (e) { $("rpa-lista").innerHTML = ""; if (e.message !== "sessao") aviso("a-rpa", e.message); }
  }
  $("rpa-comp").addEventListener("change", () => { comp = $("rpa-comp").value; abrir(); });
  $("rpa-atualizar").addEventListener("click", () => abrir(true));
  ["rpa-busca", "rpa-fst", "rpa-ffun"].forEach(id => $(id).addEventListener("input", desenhar));

  function visiveis() {
    const q = semAcento($("rpa-busca").value.trim()), st = $("rpa-fst").value, fn = $("rpa-ffun").value;
    return lista.filter(r => (!q || semAcento(`${r.nome} ${r.email} ${r.funcao}`).includes(q)) && (!fn || r.funcao === fn)
      && (st ? r.status === st : r.status !== "cancelado"));
  }
  function desenhar() {
    const cont = (k) => lista.filter(r => r.status === k).length;
    const chips = [["", "Todos", lista.filter(r => r.status !== "cancelado").length], ["rascunho", "Rascunhos", cont("rascunho") + cont("na_fila")],
      ["aguardando_assinatura", "Aguardando assinatura", cont("aguardando_assinatura")], ["com_erro", "Com erro", cont("com_erro"), 1],
      ["aguardando_confirmacao", "Conferir assinatura", cont("aguardando_confirmacao"), 1], ["validado", "Prontos p/ monday", cont("validado")],
      ["submetido", "Submetidos", cont("submetido") + cont("arquivado") + cont("concluido")]];
    const st = $("rpa-fst").value;
    $("rpa-chips").innerHTML = chips.map(([k, n, c, al]) => `<button class="rpa-chip${st === k ? " on" : ""}${al && c ? " alerta" : ""}" data-st="${k}"><b>${c}</b>${n}</button>`).join("");
    $("rpa-chips").querySelectorAll("[data-st]").forEach(b => b.addEventListener("click", () => { $("rpa-fst").value = b.dataset.st; desenhar(); }));
    const v = visiveis();
    const total = lista.filter(r => r.status !== "cancelado").reduce((s, r) => s + r.valor, 0);
    $("rpa-resumo").textContent = `${mesAno(comp)} · ${v.length} relatório(s) na lista · total bruto do mês ${fmtR(total)}`;
    $("rpa-lista").innerHTML = v.length ? v.map(r => {
      const [nst, cor] = ST[r.status] || [r.status, "cinza"];
      const extra = r.status === "aguardando_assinatura" ? ` · enviado ${quando(r.enviado_em)}${r.lembretes ? ` · ${r.lembretes} lembrete(s)` : ""}`
        : r.status === "submetido" ? ` · monday em ${quando(r.monday_em)}` : r.recebido_em && ORDEM[r.status] >= 2 ? ` · recebido ${quando(r.recebido_em)}` : "";
      const vencido = r.prazo && ORDEM[r.status] <= 2 && r.status !== "rascunho" && new Date().toISOString().slice(0, 10) > r.prazo;
      return `<div class="rpa-linha" data-id="${r.id}"><input type="checkbox" data-sel="${r.id}"${sel.has(r.id) ? " checked" : ""}>
        <div class="nm" data-abrir="${r.id}"><b>${esc(r.nome)}</b><div class="meta">${esc(r.funcao || "—")}${r.disciplina ? " · " + esc(r.disciplina) : ""} · ${fmtR(r.valor)}${r.tipo === "Variável" ? " (variável)" : ""}${extra}</div>
          ${r.status === "com_erro" && r.erro ? `<div class="err">⚠ ${esc(r.erro)}</div>` : ""}</div>
        <div class="rpa-mini"><span class="tag ${cor}">${nst}</span>${vencido ? `<span class="tag verm">Prazo vencido</span>` : ""}
          ${r.pdf_path ? `<button class="sec" data-ver="${r.id}" data-q="gerado" title="Ver o relatório gerado">PDF</button>` : ""}
          ${r.recebido_path ? `<button class="sec" data-ver="${r.id}" data-q="recebido" title="Ver o documento recebido">Assinado</button>` : ""}
          ${r.status === "validado" ? `<button data-mon="${r.id}">monday</button>` : ""}</div></div>`;
    }).join("") : `<div class="resumo">${lista.length ? "Nenhum relatório com esses filtros." : "Nenhum relatório neste mês. Use “Importar planilha” para gerar."}</div>`;
    $("rpa-lista").querySelectorAll("[data-abrir]").forEach(el => el.addEventListener("click", () => detalhe(el.dataset.abrir)));
    $("rpa-lista").querySelectorAll("[data-sel]").forEach(cb => cb.addEventListener("change", () => { cb.checked ? sel.add(cb.dataset.sel) : sel.delete(cb.dataset.sel); barraSel(); }));
    $("rpa-lista").querySelectorAll("[data-ver]").forEach(b => b.addEventListener("click", () => rodar(b, () => verArquivo(b.dataset.ver, b.dataset.q))));
    $("rpa-lista").querySelectorAll("[data-mon]").forEach(b => b.addEventListener("click", () => monday([b.dataset.mon])));
    barraSel();
  }
  function barraSel() {
    const s = lista.filter(r => sel.has(r.id));
    const rasc = s.filter(r => r.status === "rascunho"), val = s.filter(r => r.status === "validado");
    $("rpa-enviar").disabled = !rasc.length; $("rpa-enviar").textContent = `Confirmar e enviar para assinatura (${rasc.length})`;
    $("rpa-mon-lote").disabled = !val.length; $("rpa-mon-lote").textContent = `Enviar validados ao monday (${val.length})`;
    const v = visiveis(); $("rpa-todos").checked = v.length > 0 && v.every(r => sel.has(r.id));
    $("rpa-cota").textContent = cota ? `E-mails hoje: ${cota.usado} de ${cota.teto}` : "";
  }
  $("rpa-todos").addEventListener("change", () => { visiveis().forEach(r => $("rpa-todos").checked ? sel.add(r.id) : sel.delete(r.id)); desenhar(); });
  $("rpa-enviar").addEventListener("click", (e) => {
    const ids = lista.filter(r => sel.has(r.id) && r.status === "rascunho").map(r => r.id);
    const semPrazo = lista.filter(r => ids.includes(r.id) && !r.prazo).length;
    if (!confirm(`Enviar ${ids.length} relatório(s) por e-mail para assinatura?${semPrazo ? `\n\nAtenção: ${semPrazo} sem prazo definido.` : ""}\n\nSe a cota de e-mails do dia acabar, o restante fica na fila e sai automaticamente nas próximas horas.`)) return;
    rodar(e.target, async () => {
      const d = await chamar("enviar", { ids });
      sel.clear(); await abrir(true);
      aviso("a-rpa", `${d.enviados} e-mail(s) enviados agora.` + (d.na_fila ? ` ${d.na_fila} ficaram na fila (cota do dia) e saem automaticamente.` : ""), "ok");
    });
  });
  $("rpa-mon-lote").addEventListener("click", () => monday(lista.filter(r => sel.has(r.id) && r.status === "validado").map(r => r.id)));

  // ---------- visualizar arquivo
  async function verArquivo(id, qual) {
    const d = await chamar("arquivo", { id, qual });
    const url = URL.createObjectURL(new Blob([b64Bytes(d.base64)], { type: d.tipo || "application/pdf" }));
    const ov = document.createElement("div"); ov.className = "rpa-ver";
    ov.innerHTML = `<div><header><b style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(d.nome)}</b><span style="display:flex;gap:8px">
      <a class="sec" href="${url}" download="${esc(d.nome)}" style="border:1px solid var(--borda);border-radius:10px;color:var(--cor);text-decoration:none;font-weight:600">⬇ Baixar</a>
      <button class="sec" id="rpa-fechar">Fechar</button></span></header><iframe src="${url}" title="Visualização do PDF"></iframe></div>`;
    document.body.appendChild(ov);
    const fechar = () => { ov.remove(); URL.revokeObjectURL(url); };
    ov.querySelector("#rpa-fechar").addEventListener("click", fechar);
    ov.addEventListener("click", (e) => { if (e.target === ov) fechar(); });
  }

  // ---------- detalhe e edição
  function progresso(r) {
    const i = ORDEM[r.status] ?? 0, erro = r.status === "com_erro";
    return `<div class="rpa-prog${erro ? " erro" : ""}">` + ETAPAS.map(([, n], j) =>
      `<div class="p ${r.status === "concluido" || j < i ? "feito" : j === i ? "agora" : ""}"><i></i>${j === 2 && erro ? "Com erro" : j === 2 && r.status === "aguardando_confirmacao" ? "Conferir" : n}</div>`).join("") + `</div>`;
  }
  async function detalhe(id) {
    try { if (!lista.find(r => r.id === id)) await abrir(true); } catch {}
    atual = lista.find(r => r.id === id); if (!atual) return;
    const r = atual, ed = ["rascunho", "na_fila", "aguardando_assinatura", "com_erro", "aguardando_confirmacao"].includes(r.status);
    $("rd-nome").textContent = r.nome;
    $("rd-sub").textContent = `${mesAno(r.competencia)} · ${r.funcao || "sem função"} · código ${r.codigo}`;
    const v = r.verificacao;
    const it = v && v.itens ? Object.entries({ modelo: "Modelo do relatório", codigo: "Código de conferência", nome: "Nome", cpf: "CPF", mes: "Mês de referência", valor: "Valor" })
      .map(([k, n]) => `<span class="tag ${v.itens[k] ? "verde" : "cinza"}">${v.itens[k] ? "✓" : "–"} ${n}</span>`).join(" ") : "";
    const campo = (k, rot, tipo = "text", extra = "") => `<div><label for="rd-${k}">${rot}</label><input id="rd-${k}" type="${tipo}" value="${esc(r[k] ?? "")}"${ed ? "" : " disabled"} ${extra}></div>`;
    $("rd-corpo").innerHTML = `${progresso(r)}
      <div class="tags" style="justify-content:flex-start;margin-top:4px"><span class="tag ${(ST[r.status] || [])[1]}">${(ST[r.status] || [r.status])[0]}</span>
        ${r.prazo ? `<span class="tag cinza">Prazo ${dBR(r.prazo)}</span>` : ""}${r.lembretes ? `<span class="tag cinza">${r.lembretes} lembrete(s)</span>` : ""}</div>
      ${r.status === "com_erro" ? `<div class="rpa-caixa erro"><b>Erro informado ao RPA:</b> ${esc(r.erro)}<br><span style="font-size:12.5px">Ele recebe um aviso a cada 6 horas até enviar o documento correto.</span></div>` : ""}
      ${r.status === "aguardando_confirmacao" ? `<div class="rpa-caixa"><b>Assinatura à mão recebida.</b> O modelo e os dados foram conferidos automaticamente. Abra o documento, confira a assinatura e aprove ou recuse.
        <div class="acoes" style="margin-top:10px"><button id="rd-ver-rec">Ver documento assinado</button><button id="rd-aprovar">✓ Aprovar</button><button class="sec" id="rd-recusar">Recusar e pedir correção</button></div></div>` : ""}
      ${v ? `<div class="rpa-caixa"><b>Última verificação:</b> assinatura ${esc(ASS[v.assinatura] || v.assinatura)}${v.signatario ? ` · ${esc(v.signatario)}` : ""}${v.ocr ? " · texto lido por OCR" : ""}
        ${v.conteudo_manual ? `<div style="margin-top:6px">Documento escaneado sem leitura automática: confira também nome, CPF, mês e valor.</div>` : `<div style="margin-top:6px">${it}</div>`}</div>` : ""}
      <div class="acoes" style="margin-top:14px">
        ${r.pdf_path ? `<button class="sec" id="rd-ver-pdf">Visualizar relatório gerado</button>` : ""}
        ${r.recebido_path && r.status !== "aguardando_confirmacao" ? `<button class="sec" id="rd-ver-rec2">Ver documento recebido</button>` : ""}
        ${r.arquivo_drive_url ? `<a class="sec" href="${esc(r.arquivo_drive_url)}" target="_blank" rel="noopener" style="display:inline-block;padding:10px 16px;border:1px solid var(--borda);border-radius:var(--raio);color:var(--cor);text-decoration:none;font-weight:600">Ver cópia no Drive</a>` : ""}
        ${r.status === "rascunho" ? `<button id="rd-enviar">Confirmar e enviar para assinatura</button>` : ""}
        ${["aguardando_assinatura", "com_erro"].includes(r.status) ? `<button class="sec" id="rd-reavisar">Reenviar aviso agora</button>` : ""}
        ${r.status === "validado" ? `<button id="rd-monday">Enviar ao monday</button><button class="sec" id="rd-marcar">Já submeti: marcar como submetido</button>` : ""}
        ${r.status === "com_erro" && r.recebido_path ? `<button class="sec" id="rd-aprovar2">Aprovar mesmo assim</button>` : ""}
      </div>
      <h2>Dados do relatório</h2>
      ${ed ? "" : `<div class="ajuda">Relatório já validado: os dados não podem mais ser alterados.</div>`}
      <div class="grade2">${campo("nome", "Nome completo")}${campo("cpf", "CPF", "text", 'inputmode="numeric"')}${campo("email", "E-mail", "email")}${campo("funcao", "Função")}
        ${campo("disciplina", "Disciplina (opcional)")}${campo("valor", "Valor bruto (R$)", "number", 'step="0.01" min="0"')}
        <div><label for="rd-tipo">Tipo de remuneração</label><select id="rd-tipo"${ed ? "" : " disabled"}><option${r.tipo !== "Variável" ? " selected" : ""}>Fixo</option><option${r.tipo === "Variável" ? " selected" : ""}>Variável</option></select></div>
        ${campo("prazo", "Prazo para devolver", "date")}${campo("periodo_ini", "Início do período", "date")}${campo("periodo_fim", "Fim do período", "date")}</div>
      <label for="rd-escopo">Escopo (vazio = texto padrão da função)</label><textarea id="rd-escopo" rows="3" style="width:100%"${ed ? "" : " disabled"}>${esc(r.escopo || "")}</textarea>
      <label for="rd-complemento">Complemento (vazio = padrão da função)</label><input id="rd-complemento" type="text" value="${esc(r.complemento || "")}"${ed ? "" : " disabled"}>
      ${ed ? `<button id="rd-salvar" style="width:auto">Salvar e atualizar o PDF</button>
        ${r.status !== "rascunho" ? `<div class="ajuda">Se você mudar dados do relatório depois do envio, a versão corrigida é enviada de novo ao RPA.</div>` : ""}` : ""}
      <h2>Histórico</h2>
      <div style="border-left:3px solid var(--cor-suave);margin:8px 0 0 6px;padding-left:14px">${(r.historico || []).slice().reverse().map(h =>
        `<div style="font-size:13px;margin-bottom:9px">${esc(h.txt)}<small style="display:block;color:var(--texto-2)">${quando(h.em)}</small></div>`).join("") || `<div class="resumo">Sem registros.</div>`}</div>
      <div class="acoes" style="margin-top:18px">${["rascunho", "cancelado"].includes(r.status) ? `<button class="sec" id="rd-excluir">Excluir</button>` : ""}
        ${!["cancelado", "submetido", "arquivado", "concluido", "rascunho"].includes(r.status) ? `<button class="sec" id="rd-cancelar">Cancelar este relatório</button>` : ""}</div>`;
    mostrar("v-rpa-det");
    const on = (id, fn) => { const b = $(id); if (b) b.addEventListener("click", () => rodar(b, fn, "a-rd")); };
    on("rd-ver-pdf", () => verArquivo(r.id, "gerado"));
    on("rd-ver-rec", () => verArquivo(r.id, "recebido")); on("rd-ver-rec2", () => verArquivo(r.id, "recebido"));
    on("rd-aprovar", async () => { await chamar("aprovar", { id: r.id }); await recarregar(r.id, "Assinatura aprovada. O relatório está pronto para o monday."); });
    on("rd-aprovar2", async () => { if (!confirm("Aprovar o documento mesmo com o erro apontado na verificação?")) return; await chamar("aprovar", { id: r.id }); await recarregar(r.id, "Documento aprovado."); });
    on("rd-recusar", async () => { const m = prompt("O que o RPA precisa corrigir? (vai no e-mail para ele)", "A assinatura não está legível ou não confere. Assine novamente e envie a digitalização completa.");
      if (!m) return; await chamar("recusar", { id: r.id, motivo: m }); await recarregar(r.id, "Correção pedida ao RPA por e-mail."); });
    on("rd-enviar", async () => { if (!confirm(`Enviar o relatório para ${r.email}?`)) return; const d = await chamar("enviar", { ids: [r.id] });
      await recarregar(r.id, d.enviados ? "E-mail enviado." : "Entrou na fila: a cota de e-mails de hoje acabou."); });
    on("rd-reavisar", async () => { await chamar("reavisar", { id: r.id }); await recarregar(r.id, "Aviso reenviado."); });
    on("rd-monday", () => monday([r.id]));
    on("rd-marcar", async () => { if (!confirm("Confirma que este relatório já foi enviado no formulário do monday?")) return; await chamar("marcar_monday", { id: r.id }); await recarregar(r.id, "Marcado como submetido."); });
    on("rd-cancelar", async () => { if (!confirm("Cancelar este relatório? Os lembretes param.")) return; await chamar("cancelar", { id: r.id }); await recarregar(r.id, "Relatório cancelado."); });
    on("rd-excluir", async () => { if (!confirm("Excluir este relatório e o PDF gerado?")) return; await chamar("excluir", { id: r.id }); await abrir(true); aviso("a-rpa", "Relatório excluído.", "ok"); });
    on("rd-salvar", async () => {
      const g = (k) => $("rd-" + k).value.trim();
      const cpf = g("cpf").replace(/\D/g, "");
      if (cpf && !cpfValido(cpf)) throw new Error("CPF inválido.");
      if (!emailValido(g("email"))) throw new Error("E-mail inválido.");
      if (!(Number(g("valor")) > 0)) throw new Error("Informe o valor.");
      const campos = { nome: g("nome"), cpf, email: g("email").toLowerCase(), funcao: g("funcao"), disciplina: g("disciplina"), valor: Number(g("valor")),
        tipo: $("rd-tipo").value, prazo: g("prazo"), periodo_ini: g("periodo_ini"), periodo_fim: g("periodo_fim"), escopo: $("rd-escopo").value.trim(), complemento: g("complemento") };
      const d = await chamar("salvar", { id: r.id, campos });
      await recarregar(r.id, d.relatorio && d.relatorio.status === "na_fila" ? "Salvo. A versão corrigida entrou na fila e será enviada ao RPA." : "Salvo. PDF atualizado.");
    });
  }
  async function recarregar(id, msg) { await abrir(true); await detalhe(id); if (msg) aviso("a-rd", msg, "ok"); }

  // ---------- importação da planilha
  let linhasImp = [];
  function abrirImportar() {
    mostrar("v-rpa-imp"); $("ri-prev").innerHTML = ""; $("ri-arq").value = ""; linhasImp = [];
    $("ri-comp").value = comp; $("ri-ini").value = comp + "-01"; $("ri-fim").value = ultimoDia(comp);
  }
  $("rpa-imp").addEventListener("click", abrirImportar);
  $("ri-comp").addEventListener("change", () => { const c = $("ri-comp").value; if (c) { $("ri-ini").value = c + "-01"; $("ri-fim").value = ultimoDia(c); } });
  $("ri-modelo").addEventListener("click", () => {
    const csv = "\ufeffNome;CPF;E-mail;Função;Disciplina;Valor;Tipo;Complemento;Início;Fim\nFulana de Tal;000.000.000-00;fulana@email.com;Tutor(a) EAD;Física;1500,00;Fixo;;;\n";
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "modelo_relatorios_rpa.csv"; document.body.appendChild(a); a.click(); a.remove();
  });
  const nh = (h) => semAcento(String(h)).replace(/[^a-z0-9]/g, "");
  function numero(v) {
    if (typeof v === "number") return v;
    let s = String(v || "").replace(/[^\d,.-]/g, "");
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    return Number(s) || 0;
  }
  $("ri-arq").addEventListener("change", async (e) => {
    const f = e.target.files[0]; if (!f) return;
    aviso("a-ri", "");
    try {
      await carregarSheetJS();
      const csv = /\.csv$/i.test(f.name);
      const wb = csv ? XLSX.read(await f.text(), { type: "string", raw: true }) : XLSX.read(await f.arrayBuffer(), { type: "array" });
      let todas = [];
      wb.SheetNames.forEach(nome => {
        const l = XLSX.utils.sheet_to_json(wb.Sheets[nome], { raw: true, defval: "" }); if (!l.length) return;
        const cab = Object.keys(l[0]), acha = (...ops) => cab.find(h => ops.some(o => nh(h) === o || nh(h).startsWith(o)));
        const col = { nome: acha("nome", "nomecompleto"), cpf: acha("cpf"), email: acha("email", "emailcadastrado"), funcao: acha("funcao", "cargo"),
          disc: acha("disciplina", "componente"), valor: acha("valor", "valorbruto", "valorbase", "remuneracao"), tipo: acha("tipo", "tipoderemuneracao"),
          compl: acha("complemento", "descricao"), ini: acha("inicio", "datainicio"), fim: acha("fim", "datafim", "termino") };
        if (!col.nome || !col.email) return;
        todas = todas.concat(l.map(x => ({ nome: String(x[col.nome]).trim(), cpf: String(col.cpf ? x[col.cpf] : "").replace(/\D/g, "").padStart(col.cpf && x[col.cpf] ? 11 : 0, "0"),
          email: String(x[col.email]).trim().toLowerCase(), funcao: String(col.funcao ? x[col.funcao] : "").trim() || (wb.SheetNames.length > 1 ? nome : ""),
          disciplina: col.disc ? String(x[col.disc]).trim() : "", valor: numero(col.valor ? x[col.valor] : ""), tipo: col.tipo ? String(x[col.tipo]) : "",
          complemento: col.compl ? String(x[col.compl]).trim() : "", inicio: col.ini ? paraISO(x[col.ini]) : "", fim: col.fim ? paraISO(x[col.fim]) : "" })).filter(x => x.nome));
      });
      if (!todas.length) throw new Error("Não encontrei as colunas Nome e E-mail na primeira linha.");
      linhasImp = todas.map(x => {
        const p = [];
        if (!x.cpf) p.push("sem CPF"); else if (!cpfValido(x.cpf)) p.push("CPF inválido");
        if (!emailValido(x.email)) p.push("e-mail inválido");
        if (!(x.valor > 0)) p.push("sem valor");
        if (!x.funcao) p.push("sem função");
        return { ...x, problemas: p, bloqueia: !emailValido(x.email) || !(x.valor > 0) };
      });
      const ok = linhasImp.filter(x => !x.bloqueia).length;
      $("ri-prev").innerHTML = `<div class="resumo">${linhasImp.length} pessoa(s) na planilha · ${ok} prontas para gerar${linhasImp.length - ok ? ` · ${linhasImp.length - ok} com e-mail ou valor faltando (serão ignoradas)` : ""}</div>
        <div class="rolar"><table class="prev"><tr><th>Nome</th><th>Função</th><th>Valor</th><th>E-mail</th><th>Conferir</th></tr>
        ${linhasImp.map(x => `<tr><td>${esc(x.nome)}</td><td>${esc(x.funcao)}${x.disciplina ? " · " + esc(x.disciplina) : ""}</td><td>${fmtR(x.valor)}</td><td>${esc(x.email)}</td>
          <td style="color:${x.bloqueia ? "var(--erro)" : x.problemas.length ? "var(--alerta)" : "var(--ok)"}">${x.problemas.join(", ") || "ok"}</td></tr>`).join("")}</table></div>
        <button id="ri-gerar" style="width:auto;margin-top:12px">Gerar ${ok} relatório(s) como rascunho</button>`;
      $("ri-gerar").addEventListener("click", (ev) => rodar(ev.target, async () => {
        const c = $("ri-comp").value; if (!c) throw new Error("Informe o mês de referência.");
        const linhas = linhasImp.filter(x => !x.bloqueia).map(({ problemas, bloqueia, ...x }) => x);
        let novos = 0, atual = 0, ign = [];
        for (let i = 0; i < linhas.length; i += 15) {          // em partes, para não estourar o tempo do servidor
          ev.target.textContent = `Gerando ${Math.min(i + 15, linhas.length)} de ${linhas.length}…`;
          const d = await chamar("importar", { competencia: c, prazo: $("ri-prazo").value, inicio: $("ri-ini").value, fim: $("ri-fim").value, linhas: linhas.slice(i, i + 15) });
          novos += d.novos; atual += d.atualizados; ign = ign.concat(d.ignorados);
        }
        comp = c; await abrir();
        aviso("a-rpa", `${novos} relatório(s) gerado(s)${atual ? `, ${atual} atualizado(s)` : ""}. Confira e use “Confirmar e enviar”.` + (ign.length ? `\nIgnorados: ${ign.join("; ")}` : ""), ign.length ? "alerta" : "ok");
      }, "a-ri"));
    } catch (err) { aviso("a-ri", err.message || "Não consegui ler o arquivo."); }
  });

  // ---------- configurações e escopos
  async function abrirConfig() {
    mostrar("v-rpa-cfg");
    $("rc-fav").href = favorito();
    try {
      const [linhas, esc0, c] = await Promise.all([api("/rest/v1/rpa_config?select=chave,valor"), api("/rest/v1/rpa_escopo?select=*&order=ordem,funcao"), chamar("cota")]);
      cfg = {}; linhas.forEach(l => cfg[l.chave] = l.valor || "");
      const e = { escopos: esc0 };
      $("rc-sub").textContent = `Remetente dos e-mails: ${c.remetente || "conta do projeto"} · e-mails hoje: ${c.cota.usado} de ${c.cota.teto}`;
      desenharBackup();
      try { const u = JSON.parse(cfg.ultima_rotina || "null"); $("rc-ultima").textContent = u ? `Última rotina: ${quando(u.em)} · ${u.fila.enviados} da fila, ${u.lembretes} lembrete(s), ${u.arquivados} no Drive, ${u.limpos} limpo(s)${u.avisos && u.avisos.length ? " · ⚠ " + u.avisos.join("; ") : ""}` : ""; } catch {}
      $("rc-resp").value = cfg.responsavel; $("rc-cargo").value = cfg.cargo; $("rc-tel").value = cfg.telefone; $("rc-teto").value = cfg.teto_diario;
      $("rc-rem").value = cfg.remetente; $("rc-resp-para").value = cfg.resposta_para; $("rc-gov").value = cfg.link_govbr;
      desenharEscopos(e.escopos);
    } catch (err) { if (err.message !== "sessao") aviso("a-rc", err.message); }
  }
  function desenharEscopos(l) {
    $("rc-escopos").innerHTML = l.map((e, i) => `<div class="rpa-esc" data-i="${i}"><div class="grade2"><div><label>Função</label><input data-k="funcao" value="${esc(e.funcao)}"></div>
      <div><label>Complemento padrão</label><input data-k="complemento" value="${esc(e.complemento)}"></div></div>
      <label>Escopo</label><textarea data-k="escopo" style="width:100%">${esc(e.escopo)}</textarea>
      <button class="sec" data-tirar style="width:auto;margin-top:6px;padding:6px 12px;font-size:13px">Remover</button></div>`).join("");
    $("rc-escopos").querySelectorAll("[data-tirar]").forEach(b => b.addEventListener("click", () => b.closest(".rpa-esc").remove()));
  }
  const lerEscopos = () => [...$("rc-escopos").querySelectorAll(".rpa-esc")].map(d => ({ funcao: d.querySelector("[data-k=funcao]").value.trim(),
    complemento: d.querySelector("[data-k=complemento]").value.trim(), escopo: d.querySelector("[data-k=escopo]").value.trim() }));
  $("rpa-cfg").addEventListener("click", abrirConfig);
  $("rc-mais").addEventListener("click", () => desenharEscopos(lerEscopos().concat([{ funcao: "", complemento: "", escopo: "" }])));
  $("rc-salvar-esc").addEventListener("click", (e) => rodar(e.target, async () => {
    const l = lerEscopos().filter(x => x.funcao).map((x, i) => ({ ...x, ordem: i + 1 }));
    if (new Set(l.map(x => x.funcao)).size !== l.length) throw new Error("Há funções repetidas.");
    const antes = await api("/rest/v1/rpa_escopo?select=funcao");
    const sair = antes.map(x => x.funcao).filter(f => !l.some(x => x.funcao === f));
    if (l.length) await api("/rest/v1/rpa_escopo", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(l) });
    for (const f of sair) await api(`/rest/v1/rpa_escopo?funcao=eq.${encodeURIComponent(f)}`, { method: "DELETE" });
    aviso("a-rc", "Escopos salvos. Os próximos PDFs já usam o texto novo.", "ok");
  }, "a-rc"));
  function desenharBackup() {
    const email = cfg.backup_email, ligado = !!cfg.backup_conectado_em;
    $("rc-bk").value = email || "";
    $("rc-bk-status").className = "rpa-caixa" + (cfg.google_erro ? " erro" : "");
    $("rc-bk-status").innerHTML = cfg.google_erro ? `⚠ ${esc(cfg.google_erro)}` : ligado
      ? `✓ Conectada: <b>${esc(email)}</b> · desde ${quando(cfg.backup_conectado_em)}${cfg.backup_conectado_por ? ` por ${esc(cfg.backup_conectado_por)}` : ""}`
      : `Nenhuma conta conectada. Sem ela, os relatórios submetidos ficam esperando a cópia para o Drive e não são apagados da ferramenta.`;
    $("rc-bk-des").disabled = !ligado;
  }
  $("rc-bk-con").addEventListener("click", (e) => rodar(e.target, async () => {
    const email = $("rc-bk").value.trim().toLowerCase(); if (!emailValido(email)) throw new Error("Informe o e-mail da conta Google de backup.");
    if (cfg.backup_conectado_em && email !== cfg.backup_email && !confirm(`Trocar a conta de backup de ${cfg.backup_email} para ${email}? Os próximos relatórios vão para o Drive da nova conta.`)) return;
    const janela = window.open("", "rpa_google");
    try { const d = await chamar("google_iniciar", { email }); if (janela) janela.location = d.url; else location.assign(d.url); }
    catch (err) { if (janela) janela.close(); throw err; }
    aviso("a-rc", "Autorize na janela do Google e volte para esta aba.", "alerta");
  }, "a-rc"));
  $("rc-bk-des").addEventListener("click", (e) => rodar(e.target, async () => {
    if (!confirm(`Desconectar ${cfg.backup_email}? As cópias para o Drive param até você conectar uma conta.`)) return;
    await chamar("google_desconectar"); await abrirConfig(); aviso("a-rc", "Conta de backup desconectada.", "ok");
  }, "a-rc"));
  window.addEventListener("message", (e) => { if (e.data && e.data.rpaGoogle !== undefined && /supabase\.co$/.test(new URL(e.origin).host)) abrirConfig().then(() => aviso("a-rc", e.data.rpaGoogle ? "Conta de backup conectada." : "A conexão não foi concluída. Veja a mensagem na janela do Google.", e.data.rpaGoogle ? "ok" : "erro")); });
  $("rc-salvar").addEventListener("click", (e) => rodar(e.target, async () => {
    const tel = $("rc-tel").value.replace(/\D/g, ""); if (tel.length < 10) throw new Error("Informe o telefone com DDD.");
    const teto = Math.min(300, Math.max(10, Number($("rc-teto").value) || 250));
    const v = { responsavel: $("rc-resp").value.trim(), cargo: $("rc-cargo").value, telefone: tel, teto_diario: String(teto),
      remetente: $("rc-rem").value.trim(), resposta_para: $("rc-resp-para").value.trim(), link_govbr: $("rc-gov").value.trim() };
    if (v.resposta_para && !emailValido(v.resposta_para)) throw new Error("Confira o e-mail de resposta.");
    await api("/rest/v1/rpa_config", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(Object.entries(v).map(([chave, valor]) => ({ chave, valor }))) });
    aviso("a-rc", "Configurações salvas.", "ok");
  }, "a-rc"));
  $("rc-rotina").addEventListener("click", (e) => rodar(e.target, async () => {
    const d = await chamar("rodar_rotina");
    aviso("a-rc", `Rotina concluída: ${d.fila.enviados} e-mail(s) da fila, ${d.lembretes} lembrete(s), ${d.arquivados} arquivado(s) no Drive, ${d.limpos} limpo(s).`, "ok");
  }, "a-rc"));
  $("rc-fav").addEventListener("click", (e) => { e.preventDefault(); aviso("a-rc", "Não clique aqui: arraste o botão para a barra de favoritos do Chrome (Ctrl+Shift+B mostra a barra).", "alerta"); });

  // ---------- envio ao monday (o favorito pede os dados a esta aba por postMessage)
  let fila = [], janela = null, emAndamento = null;
  function painelMonday(html) {
    let p = $("rpa-monday");
    if (!p) { p = document.createElement("div"); p.id = "rpa-monday"; document.body.appendChild(p); }
    p.innerHTML = html;
    return p;
  }
  function atualizarPainel(msg) {
    const r = lista.find(x => x.id === fila[0]);
    const p = painelMonday(`<b>Envio ao monday</b> · ${fila.length} na fila<br>${r ? `Agora: <b>${esc(r.nome)}</b><br>` : ""}
      <span style="font-size:13px;color:var(--texto-2)">${msg || "Na aba do monday, clique no favorito <b>★ Preencher RPA no monday</b>. Depois confira e clique em <b>Enviar</b>."}</span><br>
      ${r ? `<button id="rm-marcar">Já enviei este</button><button class="sec" id="rm-pular">Pular</button>` : ""}<button class="sec" id="rm-parar">Fechar</button>`);
    const b = (id, fn) => { const x = p.querySelector("#" + id); if (x) x.addEventListener("click", fn); };
    b("rm-marcar", () => concluirAtual());
    b("rm-pular", () => { fila.shift(); proximo(); });
    b("rm-parar", () => { fila = []; p.remove(); abrir(true); });
  }
  async function concluirAtual() {
    const id = fila[0]; if (!id) return;
    try { await chamar("marcar_monday", { id }); } catch (e) { if (!/validados/.test(e.message)) return atualizarPainel("⚠ " + esc(e.message)); }
    fila.shift(); proximo();
  }
  function proximo() {
    if (!fila.length) { painelMonday(`<b>Envio ao monday concluído.</b><br><button id="rm-ok">OK</button>`).querySelector("#rm-ok").addEventListener("click", () => { $("rpa-monday").remove(); });
      abrir(true); return; }
    atualizarPainel();
  }
  function monday(ids) {
    if (!ids.length) return;
    fila = ids.slice();
    janela = window.open(FORM_MONDAY, "monday_rpa");
    if (!janela) return aviso("a-rpa", "O navegador bloqueou a nova aba. Permita pop-ups para o SGT e tente de novo.");
    atualizarPainel();
  }
  window.addEventListener("message", async (e) => {
    if (e.origin !== ORIGEM_MONDAY || !e.data || typeof e.data !== "object" || !String(e.data.rpa || "").length) return;
    const resp = (dados, transf) => e.source.postMessage(dados, ORIGEM_MONDAY, transf || []);
    if (e.data.rpa === "pedir") {
      if (!fila.length) return resp({ rpa: "fim" });
      if (emAndamento) return;
      emAndamento = fila[0];
      try {
        atualizarPainel("Buscando os dados e o PDF…");
        const d = await chamar("monday_dados", { id: fila[0] });
        const arq = b64Bytes(d.arquivo.base64).buffer, ent = d.entrega ? b64Bytes(d.entrega.base64).buffer : null;
        const dados = { ...d, arquivo: { nome: d.arquivo.nome, bytes: arq }, entrega: ent ? { nome: d.entrega.nome, bytes: ent } : null };
        resp({ rpa: "dados", d: dados, restantes: fila.length - 1 }, ent ? [arq, ent] : [arq]);
        atualizarPainel("Formulário sendo preenchido. Confira na aba do monday e clique em <b>Enviar</b>.");
      } catch (err) { resp({ rpa: "erro", erro: err.message }); atualizarPainel("⚠ " + esc(err.message)); }
      finally { emAndamento = null; }
    } else if (e.data.rpa === "enviado" && e.data.id === fila[0]) {
      await concluirAtual();
    }
  });

  // Favorito (bookmarklet) que roda dentro do formulário do monday
  function favorito() {
    const codigo = `(async()=>{const O=${JSON.stringify(location.origin)};if(!/forms\\.monday\\.com$/.test(location.host)){alert("Use este favorito na página do formulário do monday aberta pelo SGT.");return}if(!window.opener){alert("Abra o formulário pelo botão “Enviar ao monday” do SGT e clique no favorito de novo.");return}if(window.__rpaAtivo)return;window.__rpaAtivo=1;
const P=document.createElement("div");P.style.cssText="position:fixed;right:14px;bottom:14px;z-index:99999;background:#fff;border:2px solid #e71181;border-radius:12px;padding:12px 14px;font:14px/1.4 Arial,sans-serif;max-width:340px;box-shadow:0 6px 24px rgba(0,0,0,.2)";document.body.appendChild(P);const st=t=>P.innerHTML="<b>SGT · RPA</b><br>"+t;
const pedir=()=>new Promise((ok,fa)=>{const h=e=>{if(e.origin!==O||!e.data||!/^(dados|fim|erro)$/.test(e.data.rpa))return;removeEventListener("message",h);ok(e.data)};addEventListener("message",h);window.opener.postMessage({rpa:"pedir"},O);setTimeout(()=>{removeEventListener("message",h);fa(new Error("O SGT não respondeu. Deixe a aba do SGT aberta."))},60000)});
${preencherFonte()}
const dorme=ms=>new Promise(r=>setTimeout(r,ms));
try{for(;;){st("Buscando dados no SGT…");const m=await pedir();if(m.rpa==="fim"){st("Nada na fila do SGT.");break}if(m.rpa==="erro")throw new Error(m.erro);const d=m.d;st("Preenchendo: <b>"+d.nome+"</b>…");
const r=await rpaPreencher(d,t=>st("Preenchendo: <b>"+d.nome+"</b><br><small>"+t+"</small>"));if(r!=="fim")throw new Error("Não consegui chegar ao fim do formulário. Confira as perguntas.");
st("<b>"+d.nome+"</b><br>Tudo preenchido. Confira e clique em <b>Enviar</b>.");
let ok=false;for(let i=0;i<3600&&!ok;i++){await dorme(1000);const tem=[...document.querySelectorAll("button")].some(b=>/^enviar$/i.test((b.innerText||"").trim()));ok=!tem&&!document.querySelector("form input[type=file]")&&!/obrigat/i.test(document.body.innerText.slice(0,2000))}
if(!ok)break;window.opener.postMessage({rpa:"enviado",id:d.id},O);await dorme(1500);
const nova=[...document.querySelectorAll("button,a")].find(b=>/outra resposta|nova resposta|enviar outr|submit another/i.test(b.innerText||""));
if(m.restantes>0&&nova){nova.click();await dorme(2500);continue}
st(m.restantes>0?"Enviado! Recarregue esta página (F5) e clique no favorito para o próximo.":"Enviado! Lote concluído.");window.__rpaAtivo=0;break}}catch(e){st("⚠ "+e.message);window.__rpaAtivo=0}})()`;
    return "javascript:" + encodeURIComponent(codigo.replace(/\n/g, ""));
  }
  // Mesmo código testado no formulário (preenche página a página, sem clicar em Enviar)
  function preencherFonte() {
    return `async function rpaPreencher(d,log){const dorme=ms=>new Promise(r=>setTimeout(r,ms));const txt=el=>(el.innerText||el.textContent||"").trim();const norm=s=>String(s||"").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase().replace(/\\s+/g," ").trim();
async function espera(fn,ms=8000){const t=Date.now();while(Date.now()-t<ms){const v=fn();if(v)return v;await dorme(120)}return null}
const botao=rot=>[...document.querySelectorAll("button")].find(b=>norm(txt(b))===norm(rot)&&!b.disabled);const titulo=()=>{const h=document.querySelector("form h2, form [role=heading], form h3");return h?txt(h):""};
function digitar(el,v){const pr=el.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(pr,"value").set.call(el,String(v));["input","change","blur"].forEach(n=>el.dispatchEvent(new Event(n,{bubbles:true})))}
async function escolher(texto){const cb=document.querySelector("form [role=combobox]");if(!cb)throw new Error("Lista não encontrada");cb.click();cb.dispatchEvent(new MouseEvent("mousedown",{bubbles:true}));const a=norm(texto);const op=await espera(()=>{const o=[...document.querySelectorAll("[role=option]")];return o.find(x=>norm(txt(x))===a)||o.find(x=>norm(txt(x)).startsWith(a))||o.find(x=>norm(txt(x)).includes(a))},5000);if(!op)throw new Error('Opção "'+texto+'" não encontrada');op.click();await dorme(250)}
async function anexar(arq){const inp=await espera(()=>document.querySelector("form input[type=file]"),5000);if(!inp)throw new Error("Campo de arquivo não encontrado");const f=new File([arq.bytes],arq.nome,{type:arq.nome.toLowerCase().endsWith(".pdf")?"application/pdf":"application/octet-stream"});const dt=new DataTransfer();dt.items.add(f);inp.files=dt.files;["input","change"].forEach(n=>inp.dispatchEvent(new Event(n,{bubbles:true})));await espera(()=>norm(document.querySelector("form").innerText).includes(norm(arq.nome).slice(0,12)),15000);await dorme(800)}
async function proximo(){const antes=titulo();const b=await espera(()=>botao("Próximo"),5000);if(!b)return false;b.click();await espera(()=>titulo()&&titulo()!==antes,6000);await dorme(300);return true}
const redef=botao("Redefinir");if(redef){redef.click();await dorme(800)}const ini=botao("Iniciar");if(ini){ini.click();await espera(()=>document.querySelector("form"),6000);await dorme(400)}
for(let p=0;p<20;p++){const t=norm(titulo());log(titulo());
if(t.includes("nome do profissional"))digitar(document.querySelector("form input[type=text]"),d.nome);else if(/\\bprojeto\\b/.test(t))await escolher(d.projeto);else if(t.includes("mes de referencia"))await escolher(d.mes);else if(t.includes("tipo de remuneracao"))await escolher(d.tipo);
else if(t.includes("valor da remuneracao")){const i=document.querySelector("form input");i.focus();digitar(i,d.valor)}else if(t.includes("entrega")){if(d.entrega)await anexar(d.entrega)}else if(t.includes("relatorio de atividades"))await anexar(d.arquivo);
else if(t.includes("nome do responsavel"))digitar(document.querySelector("form input[type=text]"),d.responsavel);else if(t.includes("cargo"))await escolher(d.cargo);
else if(t.includes("telefone")){const i=document.querySelector("form input[id$='phone-number-input'], form input[type=tel]");digitar(i,String(d.telefone).replace(/\\D/g,"").replace(/^55(?=\\d{10,11}$)/,""))}
await dorme(250);if(!botao("Próximo"))return"fim";if(!(await proximo()))return"parou"}return"limite"}`;
  }

  window.RelatoriosRPA = { abrir: () => abrir(), cartao: () =>
    `<button class="ferr" id="ir-rpa"><span class="ico">✍</span><span>Relatórios RPA<small>Gerar, colher assinaturas e enviar ao monday</small></span></button>` };
})();
