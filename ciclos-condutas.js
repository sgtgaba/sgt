// SGT · Ciclos de Desenvolvimento · Condutas de atenção (repositório e relatório de rescisão) e Gestão do ciclo
(() => {
  const C = window.CicloDados, { S, B, DEMO } = C;
  const $ = (id) => document.getElementById(id);
  const { itens, indices, fase, n1, nomeItem, souGestao, souLider, meuId, falhou, ok, dataBR, dataHora, hojeISO, MODAL, STATUS_META } = C;
  const T = () => window.CicloTelas;
  const CATEG = ["Assiduidade e pontualidade", "Prazos e entregas", "Registros no SGA", "Postura e relacionamento", "Descumprimento de orientação", "Conduta ética", "Outro"];
  const GRAV = ["Leve", "Moderada", "Grave"], PROV = ["Orientação verbal", "Feedback formal registrado", "Advertência verbal", "Advertência escrita", "Encaminhado à gestão"];
  const STC = ["Em acompanhamento", "Superada", "Encaminhada para rescisão"], DECISOES = ["Rescisão aprovada", "Manter com PDI intensivo", "Arquivar"];
  const MAX_MB = 20;
  const nomeSeguro = (n) => n.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.\-]+/g, "_").slice(-80);
  async function comToken(fn) { let r = await fn(lerSessao().t); if (r.status === 401 && await renovar()) r = await fn(lerSessao().t); return r; }

  // ------------------------------------------------------------------ dados
  Object.assign(C.REAL, {
    funcoes: () => api("/rest/v1/rpc/dc_funcoes", { method: "POST", body: "{}" }),
    previa: (f) => api("/rest/v1/rpc/dc_previa", { method: "POST", body: C.J({ p_funcoes: f }) }),
    condutasResumo: () => api("/rest/v1/rpc/dc_condutas_resumo", { method: "POST", body: "{}" }),
    monitorados: () => api("/rest/v1/rpc/dc_monitorados", { method: "POST", body: "{}" }),
    sinais: (c) => api(`/rest/v1/dc_portfolio_sinal?select=*,dc_portfolio(titulo,data)&colaborador_id=eq.${c}&order=criado_em.desc`),
    condutas: (c) => api(`/rest/v1/dc_conduta?select=*,dc_conduta_anexo(*),dc_conduta_comentario(*)&colaborador_id=eq.${c}&order=data_fato.desc,id.desc`),
    salvarConduta: (d) => d.id ? api(`/rest/v1/dc_conduta?id=eq.${d.id}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: C.J(C.semId(d)) }).then(r => r[0])
      : api("/rest/v1/dc_conduta", { method: "POST", headers: { Prefer: "return=representation" }, body: C.J({ ...d, registrado_por: eu.id }) }).then(r => r[0]),
    apagarConduta: (id) => api(`/rest/v1/dc_conduta?id=eq.${id}`, { method: "DELETE" }),
    comentarConduta: (id, texto) => api("/rest/v1/dc_conduta_comentario", { method: "POST", headers: { Prefer: "return=minimal" }, body: C.J({ conduta_id: id, texto, autor_id: eu.id }) }),
    anexar: async (colab, id, f) => {
      if (f.size > MAX_MB * 1048576) throw new Error(`O arquivo "${f.name}" passa de ${MAX_MB} MB.`);
      const caminho = `${colab}/${id}/${Date.now()}_${nomeSeguro(f.name)}`;
      const r = await comToken(t => fetch(`${SUPABASE_URL}/storage/v1/object/condutas/${caminho}`, { method: "POST",
        headers: { apikey: CHAVE_PUBLICA, Authorization: "Bearer " + t, "Content-Type": f.type || "application/octet-stream" }, body: f }));
      if (!r.ok) throw new Error(`Não foi possível enviar "${f.name}".`);
      await api("/rest/v1/dc_conduta_anexo", { method: "POST", headers: { Prefer: "return=minimal" }, body: C.J({ conduta_id: id, path: caminho, nome: f.name, tamanho: f.size, enviado_por: eu.id }) });
    },
    baixar: async (caminho) => {
      const r = await comToken(t => fetch(`${SUPABASE_URL}/storage/v1/object/sign/condutas/${caminho}`, { method: "POST",
        headers: { apikey: CHAVE_PUBLICA, Authorization: "Bearer " + t, "Content-Type": "application/json" }, body: JSON.stringify({ expiresIn: 600 }) }));
      const d = await r.json(); if (!r.ok || !d.signedURL) throw new Error("Não foi possível abrir o arquivo.");
      window.open(SUPABASE_URL + "/storage/v1" + d.signedURL, "_blank");
    },
    dossies: (c) => api(`/rest/v1/dc_dossie?select=*&colaborador_id=eq.${c}&order=enviado_em.desc`),
    enviarDossie: (c, parecer, ids) => api("/rest/v1/rpc/dc_enviar_dossie", { method: "POST", body: C.J({ p_colab: c, p_parecer: parecer, p_condutas: ids }) }),
    decidir: (id, decisao, obs) => api(`/rest/v1/dc_dossie?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" },
      body: C.J({ decisao, decisao_obs: obs || null, decidido_por: eu.id, decidido_em: new Date().toISOString() }) }),
    trajetorias: () => api("/rest/v1/dc_trajetoria?select=*&order=nte_id,nome"),
    salvarTraj: (d) => d.id ? api(`/rest/v1/dc_trajetoria?id=eq.${d.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: C.J({ ...C.semId(d), atualizado_por: eu.id, atualizado_em: new Date().toISOString() }) })
      : api("/rest/v1/dc_trajetoria", { method: "POST", headers: { Prefer: "return=minimal" }, body: C.J({ ...d, atualizado_por: eu.id }) }),
  });
  const DB = DEMO; let seq = 5000;
  DB.cond = [{ id: 1, colaborador_id: "d-bruno", data_fato: "2026-10-14", categoria: "Registros no SGA", gravidade: "Moderada", descricao: "Visitas de 3 escolas prioritárias sem registro no Formulário de Visita após 10 dias, mesmo após orientação em reunião de equipe.",
      providencia: "Feedback formal registrado", ciencia_em: "2026-10-15", links: ["https://drive.google.com/"], meta_id: null, participante_id: 12, status: "Em acompanhamento", registrado_por: "d-camila", criado_em: "2026-10-15T10:00:00",
      dc_conduta_anexo: [{ id: 1, path: "x", nome: "print-painel-sga.png", tamanho: 120000 }], dc_conduta_comentario: [{ id: 1, autor_id: "d-paulo", texto: "Acompanhar no próximo encontro. Se repetir, incluir meta no PDI.", criado_em: "2026-10-16T09:00:00" }] }];
  DB.dos = [];
  Object.assign(C.FAKE, {
    funcoes: async () => [{ funcao: "Articulador(a) da Coordenação Pedagógica", cadastrados: 62 }, { funcao: "Assistente da Coordenação Pedagógica", cadastrados: 30 },
      { funcao: "Consultor(a) da Coordenação Pedagógica - Presencial", cadastrados: 4 }, { funcao: "Estagiário(a)", cadastrados: 56 }],
    condutasResumo: async () => { const g = {}; DB.cond.forEach(c => { const p = DB.part.find(x => x.colaborador_id === c.colaborador_id); g[c.colaborador_id] = g[c.colaborador_id] || { colaborador_id: c.colaborador_id, nome: DB.nomes[c.colaborador_id], nte_id: p && p.nte_id, total: 0, graves: 0, em_aberto: 0, ultimo: c.data_fato, dossies: DB.dos.filter(d => d.colaborador_id === c.colaborador_id).length };
      g[c.colaborador_id].total++; if (c.gravidade === "Grave") g[c.colaborador_id].graves++; if (c.status === "Em acompanhamento") g[c.colaborador_id].em_aberto++; });
      return Object.values(g).filter(x => souLider() || DB.cart.some(k => !k.fim && k.coordenador_id === meuId() && k.nte_id === x.nte_id)); },
    condutas: async (c) => JSON.parse(JSON.stringify(DB.cond.filter(x => x.colaborador_id === c))),
    monitorados: async () => DB.part.filter(x => souLider() || DB.cart.some(k => !k.fim && k.coordenador_id === meuId() && k.nte_id === x.nte_id)).map(x => ({ colaborador_id: x.colaborador_id, nome: x.nome, nte_id: x.nte_id, funcao: x.cargo })),
    sinais: async () => [],
    salvarConduta: async (d) => { if (d.id) { Object.assign(DB.cond.find(x => x.id === d.id), d); return d; } const n = { ...d, id: ++seq, registrado_por: meuId(), criado_em: new Date().toISOString(), dc_conduta_anexo: [], dc_conduta_comentario: [] }; DB.cond.push(n); return n; },
    apagarConduta: async (id) => { DB.cond = DB.cond.filter(x => x.id !== id); },
    comentarConduta: async (id, texto) => { DB.cond.find(x => x.id === id).dc_conduta_comentario.push({ id: ++seq, autor_id: meuId(), texto, criado_em: new Date().toISOString() }); },
    anexar: async (colab, id, f) => { DB.cond.find(x => x.id === id).dc_conduta_anexo.push({ id: ++seq, path: "prévia", nome: f.name, tamanho: f.size }); },
    baixar: async () => { throw new Error("Na prévia os arquivos não são guardados."); },
    dossies: async (c) => DB.dos.filter(d => d.colaborador_id === c),
    enviarDossie: async (c, parecer, ids) => { DB.dos.unshift({ id: ++seq, colaborador_id: c, parecer, condutas: ids, enviado_por: meuId(), enviado_em: new Date().toISOString() }); ids.forEach(i => { const x = DB.cond.find(y => y.id === i); if (x) x.status = "Encaminhada para rescisão"; }); },
    decidir: async (id, decisao, obs) => { Object.assign(DB.dos.find(d => d.id === id), { decisao, decisao_obs: obs, decidido_em: new Date().toISOString() }); },
    trajetorias: async () => [{ id: 1, nome: "Ana Beatriz Lima (exemplo)", colaborador_id: "d-ana", funcao: "Articulador(a) Pleno (Assistente)", nivel: "Pleno 1", nte_id: 10, vaga_codigo: "AP - 010", entrada_projeto: "2024-05-27", cargo_desde: "2024-05-27", fonte: "Marco Zero / Mesmo cargo desde a entrada" },
      { id: 2, nome: "Gil Pereira (exemplo)", colaborador_id: null, funcao: "Articulador(a) Sênior", nivel: "Sênior 1", nte_id: 22, vaga_codigo: "AS - 040", entrada_projeto: "2026-01-01", cargo_desde: "2026-01-01", fonte: "Planejamento 2026" }],
    salvarTraj: async () => null,
  });

  const autorNome = (id) => S.demo ? (DB.nomes[id] || "—") : id === eu.id ? "Você" : (S.lista.find(x => x.avaliador_id === id) || {}).avaliador || "Coordenação/liderança";
  const pessoasPossiveis = () => { const me = meuId(), meusNte = new Set((S.carteira || []).filter(k => !k.fim && k.coordenador_id === me).map(k => k.nte_id));
    return S.lista.filter(x => souLider() || meusNte.has(x.nte_id)); };

  // ------------------------------------------------------------------ repositório
  async function abrir(el) {
    T().carregando(el);
    try {
      const [res, mon] = await Promise.all([B.condutasResumo(), B.monitorados().catch(() => [])]);
      const pp = mon.map(m => ({ colaborador_id: m.colaborador_id, nome: m.nome, nte: m.nte_id ? "NTE " + String(m.nte_id).padStart(2, "0") : (m.funcao || "") }));
      el.innerHTML = `<div class="dc-guia"><b>Histórico individual, fora do Ciclo de Desenvolvimento.</b> Este instrumento <b>não é pauta do ciclo</b>: não entra na avaliação, no feedback nem no PDI. Serve só para reunir fatos relevantes e graves que embasem conversas de advertência, geridos por quem acompanha a pessoa (coordenação do NTE, liderança da frente, gerência).
        <br><b>Regras (LGPD e CLT):</b> registre só fatos verificáveis (data, o que aconteceu, impacto, evidência), nunca opiniões sobre a pessoa; toda advertência exige ciência da pessoa e direito de apresentar sua versão; a pessoa pode pedir acesso aos próprios registros (art. 18 da LGPD) pela gestão do projeto; registros de quem foi desligado seguem a política de guarda do projeto.</div>
        <div class="dc-bloco"><h2>Novo registro</h2><div class="dc-barra"><select id="cn-p"><option value="">Escolha a pessoa…</option>${pp.map(x => `<option value="${x.colaborador_id}">${esc(x.nome)} · ${esc(x.nte || "")}</option>`).join("")}</select>
          <button id="cn-ir" style="width:auto;margin:0">Abrir</button></div></div>
        <div class="dc-bloco"><h2>Pessoas com registros (${res.length})</h2><div class="dc-rolar"><table class="dc-tab"><thead><tr><th>Pessoa</th><th>NTE</th><th class="num">Registros</th><th class="num">Graves</th><th class="num">Em acompanhamento</th><th>Último</th><th>Relatório de rescisão</th></tr></thead><tbody>
          ${res.map(r => `<tr data-c="${r.colaborador_id}"><td><b>${esc(r.nome)}</b></td><td>${r.nte_id ? "NTE " + String(r.nte_id).padStart(2, "0") : "—"}</td><td class="num">${r.total}</td><td class="num">${r.graves || "—"}</td><td class="num">${r.em_aberto}</td><td>${dataBR(r.ultimo)}</td>
            <td>${r.dossies ? T().sit(r.decisao || "Enviado, aguardando análise", r.decisao === "Rescisão aprovada" ? "erro" : r.decisao ? "neutro" : "alerta") : "—"}</td></tr>`).join("") || `<tr><td colspan="7">Nenhum registro.</td></tr>`}</tbody></table></div></div>`;
      $("cn-ir").addEventListener("click", () => { if ($("cn-p").value) pessoa(el, $("cn-p").value); });
      el.querySelectorAll("tr[data-c]").forEach(tr => tr.addEventListener("click", () => pessoa(el, tr.dataset.c)));
    } catch (e) { falhou(e); }
  }
  async function pessoa(el, colab) {
    T().carregando(el); S.voltar = () => abrir(el);
    try {
      const x = S.lista.find(y => y.colaborador_id === colab) || null;
      const [lst, sinais, dos, pf] = await Promise.all([B.condutas(colab), B.sinais(colab).catch(() => []), B.dossies(colab), B.perfil(colab)]);
      $("cd-sub").textContent = `Condutas de atenção · ${pf ? pf.nome : ""}`;
      const decide = souLider() || (!S.demo && pode("gerencia"));
      const form = (c) => `<div class="dc-meta" data-c="${c.id || "novo"}">
        <div class="grade2"><div><label>Data do fato</label><input type="date" data-f="data_fato" value="${esc(c.data_fato || hojeISO())}"></div>
          <div><label>Categoria</label><select data-f="categoria">${CATEG.map(t => `<option${c.categoria === t ? " selected" : ""}>${t}</option>`).join("")}</select></div>
          <div><label>Gravidade</label><select data-f="gravidade">${GRAV.map(t => `<option${(c.gravidade || "Moderada") === t ? " selected" : ""}>${t}</option>`).join("")}</select></div>
          <div><label>Providência tomada</label><select data-f="providencia"><option value="">—</option>${PROV.map(t => `<option${c.providencia === t ? " selected" : ""}>${t}</option>`).join("")}</select></div>
          <div><label>Pessoa informada em</label><input type="date" data-f="ciencia_em" value="${esc(c.ciencia_em || "")}"></div>
          <div><label>Situação</label><select data-f="status">${STC.map(t => `<option${(c.status || STC[0]) === t ? " selected" : ""}>${t}</option>`).join("")}</select></div></div>
        <label>O que aconteceu (fato, contexto, impacto)</label><textarea data-f="descricao" maxlength="4000">${esc(c.descricao || "")}</textarea>
        <label>Links de evidência (um por linha)</label><textarea data-f="links" placeholder="https://">${esc((c.links || []).join("\n"))}</textarea>
        <label>Versão da pessoa (o que ela disse ao ser informada)</label><textarea data-f="versao" maxlength="2000" placeholder="Registre a manifestação da pessoa, se houver">${esc(c.versao || "")}</textarea>
        <label>Arquivos (PDF, imagem, documento; até ${MAX_MB} MB cada)</label><input type="file" data-arq multiple>
        <div class="dc-btns"><button data-sv>${c.id ? "Salvar alterações" : "Registrar"}</button>${c.id ? `<button class="sec" data-cancel>Cancelar</button>` : ""}</div></div>`;
      const card = (c) => `<div class="dc-port" data-v="${c.id}"><div class="dc-linha"><b>${dataBR(c.data_fato)} · ${esc(c.categoria)}</b><span>${T().sit(c.gravidade, c.gravidade === "Grave" ? "erro" : c.gravidade === "Moderada" ? "alerta" : "neutro")} ${T().sit(c.status, c.status === "Superada" ? "ok" : "neutro")}</span></div>
        <div style="white-space:pre-wrap;margin:4px 0">${esc(c.descricao)}</div>
        <div class="ajuda">Providência: ${esc(c.providencia || "—")} · Pessoa informada: ${c.ciencia_em ? dataBR(c.ciencia_em) : "<b>não registrado</b>"} · Registrado por ${esc(autorNome(c.registrado_por))} em ${dataHora(c.criado_em)}
</div>${c.versao ? `<div class="dc-guia"><b>Versão da pessoa:</b> ${esc(c.versao)}</div>` : ""}
        ${(c.links || []).length ? `<div>${c.links.map(l => `<a href="${esc(l)}" target="_blank" rel="noopener">${esc(l.replace(/^https?:\/\//, "").slice(0, 50))}</a>`).join(" · ")}</div>` : ""}
        ${(c.dc_conduta_anexo || []).length ? `<div class="dc-chips">${c.dc_conduta_anexo.map(a => `<button class="sec dc-mini" data-baixar="${esc(a.path)}">📎 ${esc(a.nome)}</button>`).join("")}</div>` : ""}
        <div class="dc-fio">${(c.dc_conduta_comentario || []).sort((a, b) => a.criado_em.localeCompare(b.criado_em)).map(m => `<div class="dc-msg"><b>${esc(autorNome(m.autor_id))}</b><small>${dataHora(m.criado_em)}</small><div style="white-space:pre-wrap">${esc(m.texto)}</div></div>`).join("")}
          <div class="dc-env"><textarea placeholder="Comentário (acompanhamento, orientação da liderança…)"></textarea><button class="sec" data-com>Enviar</button></div></div>
        <div class="dc-btns"><button class="sec dc-mini" data-ed>Editar</button><label class="check" style="margin:0"><input type="checkbox" data-sel${c.status !== "Superada" ? " checked" : ""}><span>Incluir no relatório</span></label></div></div>`;
      el.innerHTML = `<div class="dc-bloco"><div class="dc-linha"><h2>${esc(pf ? pf.nome : "")}</h2><span class="ajuda">${esc((pf && (pf.funcao || pf.cargo)) || "")} ${pf && pf.nivel ? "· " + esc(pf.nivel) : ""} · no projeto desde ${dataBR(pf && pf.entrada_projeto)}</span></div></div>
        ${sinais.length ? `<div class="dc-bloco"><h2>Sinalizações do portfólio (${sinais.length})</h2><div class="ajuda">Inconsistências apontadas por quem avalia nas entregas publicadas. Verifique os fatos antes de qualquer medida.</div>
          ${sinais.map(z => `<div class="dc-port"><div class="dc-linha"><b>${esc((z.dc_portfolio && z.dc_portfolio.titulo) || "Entrega")}</b><small>${dataHora(z.criado_em)}</small></div><div style="white-space:pre-wrap">${esc(z.motivo)}</div><div class="ajuda">Por ${esc(autorNome(z.autor_id))}</div></div>`).join("")}</div>` : ""}
        <div class="dc-bloco"><h2>Novo registro</h2>${form({})}</div>
        <div class="dc-bloco"><h2>Registros (${lst.length})</h2><div id="cn-lista">${lst.map(card).join("") || `<div class="resumo">Nenhum registro ainda.</div>`}</div></div>
        <div class="dc-bloco"><h2>Relatório de rescisão</h2><div class="ajuda">Reúne os registros marcados, o histórico do Ciclo de Desenvolvimento (avaliações, PDI, encontros e efetividade) e o seu parecer. Ao enviar, a liderança do Acompanhamento Pedagógico e a gerência recebem um aviso e o relatório fica guardado aqui.</div>
          <label>Parecer (síntese dos fatos, apoios oferecidos e recomendação)</label><textarea id="cn-par" style="min-height:110px"></textarea>
          <div class="dc-btns"><button class="sec" id="cn-ver">Ver relatório completo</button><button id="cn-env">Enviar à liderança e à gerência</button></div>
          ${dos.length ? `<h3>Relatórios enviados</h3>${dos.map(d => `<div class="dc-port"><div class="dc-linha"><b>Enviado em ${dataHora(d.enviado_em)}</b>${T().sit(d.decisao || "Aguardando análise", d.decisao ? "neutro" : "alerta")}</div>
            <div style="white-space:pre-wrap">${esc(d.parecer)}</div>${d.decisao_obs ? `<div class="dc-guia"><b>Decisão:</b> ${esc(d.decisao_obs)}</div>` : ""}
            ${decide && !d.decisao ? `<div class="dc-barra"><select data-dec="${d.id}">${DECISOES.map(t => `<option>${t}</option>`).join("")}</select><input data-decobs="${d.id}" placeholder="Observação da decisão" style="flex:1"><button class="sec" data-decidir="${d.id}" style="width:auto;margin:0">Registrar decisão</button></div>` : ""}</div>`).join("")}` : ""}</div>
        <div id="cn-rel"></div>`;
      const salvarForm = async (box, id) => {
        const d = {}; box.querySelectorAll("[data-f]").forEach(i => d[i.dataset.f] = i.value.trim() || null);
        d.links = (d.links || "").split(/\s+/).filter(Boolean); if (d.links.some(l => !/^https?:\/\//i.test(l))) return aviso("a-cd", "Os links devem começar com https://");
        if (!d.descricao || d.descricao.length < 5) return aviso("a-cd", "Descreva o fato.");
        d.colaborador_id = colab; d.participante_id = x ? x.id : null; if (id) d.id = id;
        try { const r = await B.salvarConduta(d); for (const f of box.querySelector("[data-arq]").files) await B.anexar(colab, r.id || id, f); ok("Registro salvo."); pessoa(el, colab); } catch (e) { falhou(e); }
      };
      el.querySelector('[data-c="novo"] [data-sv]').addEventListener("click", (e) => salvarForm(e.target.closest(".dc-meta"), null));
      el.querySelectorAll("[data-v]").forEach(cd => { const id = +cd.dataset.v, c = lst.find(y => y.id === id);
        cd.querySelector("[data-com]").addEventListener("click", async () => { const t = cd.querySelector(".dc-env textarea").value.trim(); if (!t) return;
          try { await B.comentarConduta(id, t); pessoa(el, colab); } catch (e) { falhou(e); } });
        cd.querySelectorAll("[data-baixar]").forEach(b => b.addEventListener("click", () => B.baixar(b.dataset.baixar).catch(falhou)));
        cd.querySelector("[data-ed]").addEventListener("click", () => { cd.outerHTML = form(c); const box = el.querySelector(`[data-c="${id}"]`);
          box.querySelector("[data-sv]").addEventListener("click", () => salvarForm(box, id)); box.querySelector("[data-cancel]").addEventListener("click", () => pessoa(el, colab)); });
      });
      const selecionados = () => [...el.querySelectorAll("[data-v]")].filter(cd => cd.querySelector("[data-sel]").checked).map(cd => +cd.dataset.v);
      $("cn-ver").addEventListener("click", () => relatorio($("cn-rel"), colab, pf, lst.filter(c => selecionados().includes(c.id)), $("cn-par").value));
      $("cn-env").addEventListener("click", async () => {
        const ids = selecionados(), par = $("cn-par").value.trim();
        if (!ids.length) return aviso("a-cd", "Marque ao menos um registro para incluir no relatório.");
        if (par.length < 20) return aviso("a-cd", "Escreva o parecer antes de enviar.");
        if (!confirm("Enviar o relatório de rescisão para a liderança do Acompanhamento Pedagógico e para a gerência?")) return;
        try { await B.enviarDossie(colab, par, ids); ok("Relatório enviado. A liderança e a gerência foram avisadas."); pessoa(el, colab); } catch (e) { falhou(e); } });
      el.querySelectorAll("[data-decidir]").forEach(b => b.addEventListener("click", async () => { const id = +b.dataset.decidir;
        try { await B.decidir(id, el.querySelector(`[data-dec="${id}"]`).value, el.querySelector(`[data-decobs="${id}"]`).value.trim()); ok("Decisão registrada."); pessoa(el, colab); } catch (e) { falhou(e); } }));
    } catch (e) { falhou(e); }
  }
  async function relatorio(alvo, colab, pf, conds, parecer) {
    alvo.innerHTML = `<div class="resumo">Montando o relatório…</div>`;
    try {
      const hist = await B.historico(colab);
      const metasPorCiclo = await Promise.all(hist.map(h => B.metas(h.participante_id).catch(() => [])));
      const encPorCiclo = await Promise.all(hist.map(h => B.encontros(h.participante_id).catch(() => [])));
      alvo.innerHTML = `<div class="dc-btns dc-noprint"><button class="sec" id="cn-imp">Imprimir ou salvar em PDF</button></div>
        <div id="dc-imp" class="dc-bloco"><h2>Relatório de condutas de atenção e desenvolvimento · subsídio para análise de rescisão</h2>
        <div class="ajuda">Documento restrito à coordenação, à liderança do Acompanhamento Pedagógico e à gerência. Gerado pelo SGT em ${new Date().toLocaleString("pt-BR")}.</div>
        <h3>Identificação</h3><div>${esc(pf ? pf.nome : "")} · ${esc((pf && (pf.funcao || pf.cargo)) || "")} ${pf && pf.nivel ? "· " + esc(pf.nivel) : ""} · ${pf && pf.nte_id ? "NTE " + String(pf.nte_id).padStart(2, "0") : ""} · no projeto desde ${dataBR(pf && pf.entrada_projeto)} · no cargo desde ${dataBR(pf && pf.cargo_desde)} · coordenação: ${esc((pf && pf.coordenador) || "—")}</div>
        <h3>Parecer</h3><p style="white-space:pre-wrap">${esc(parecer || "(ainda não escrito)")}</p>
        <h3>Condutas registradas (${conds.length})</h3><div class="dc-rolar"><table class="dc-tab"><thead><tr><th>Data</th><th>Categoria</th><th>Gravidade</th><th>Fato</th><th>Providência</th><th>Pessoa informada</th><th>Evidências</th></tr></thead><tbody>
          ${conds.map(c => `<tr><td>${dataBR(c.data_fato)}</td><td>${esc(c.categoria)}</td><td>${esc(c.gravidade)}</td><td style="white-space:pre-wrap">${esc(c.descricao)}${(c.dc_conduta_comentario || []).length ? `<div class="ajuda">${c.dc_conduta_comentario.map(m => `${esc(autorNome(m.autor_id))}: ${esc(m.texto)}`).join("<br>")}</div>` : ""}</td>
            <td>${esc(c.providencia || "—")}</td><td>${c.ciencia_em ? dataBR(c.ciencia_em) : "não registrado"}</td><td>${[...(c.links || []).map(l => esc(l)), ...(c.dc_conduta_anexo || []).map(a => "📎 " + esc(a.nome))].join("<br>") || "—"}</td></tr>`).join("")}</tbody></table></div>
        <h3>Histórico no Ciclo de Desenvolvimento</h3><div style="max-width:520px">${T().graficoEvolucao(hist)}</div>
        ${hist.map((h, i) => { const c = indices(h.coord), a = indices(h.auto);
          return `<div class="dc-meta"><b>${esc(h.titulo)}</b> · avaliador(a): ${esc(h.avaliador || "—")} · DGPE ${n1(c.dgpe)} · GA 2.0 ${n1(c.ga)} · Resultados ${n1(c.res)} · autoavaliação ${n1(a.geral)} · efetividade do PDI ${n1(h.pulso_medio)}
            ${metasPorCiclo[i].length ? `<ul>${metasPorCiclo[i].map(m => `<li><b>${esc(m.objetivo)}</b> (${esc(nomeItem(m.competencia || ""))}) — ${esc(m.status)}, ${m.progresso || 0}%. Avaliado(a): ${esc(m.acao_avaliado || "")}. Coordenação: ${esc(m.apoio_avaliador || "")}.</li>`).join("")}</ul>` : `<div class="ajuda">Sem PDI registrado.</div>`}
            ${encPorCiclo[i].filter(e => e.realizado_em).length ? `<div class="ajuda">Encontros: ${encPorCiclo[i].filter(e => e.realizado_em).map(e => `${dataBR(e.realizado_em)} (${MODAL[e.modalidade] || ""})${e.registro ? ": " + esc(e.registro) : ""}`).join(" · ")}</div>` : ""}</div>`; }).join("") || `<div class="resumo">Sem participação em ciclos.</div>`}
        <div class="ajuda" style="margin-top:12px">Observação: a decisão sobre rescisão é da gerência, observadas a CLT e as normas da FGV. Este relatório reúne fatos e o histórico de desenvolvimento para subsidiar a análise.</div></div>`;
      $("cn-imp").addEventListener("click", () => window.print());
      alvo.scrollIntoView({ behavior: "smooth" });
    } catch (e) { falhou(e); }
  }

  // ------------------------------------------------------------------ GESTÃO DO CICLO: ciclos, carteiras, trajetórias, exportação
  async function gestao(el) {
    el.innerHTML = `<div class="abas" id="cg-abas">${[["ciclos", "Ciclos"], ["cart", "Carteiras de NTE"], ["traj", "Trajetórias"], ["exp", "Exportar"]].map(([k, t]) => `<button data-g="${k}">${t}</button>`).join("")}</div><div id="cg-c"></div>`;
    const ir = (g) => { el.querySelectorAll("#cg-abas button").forEach(b => b.classList.toggle("on", b.dataset.g === g)); ({ ciclos, cart, traj, exp })[g]($("cg-c")); };
    el.querySelectorAll("#cg-abas button").forEach(b => b.addEventListener("click", () => ir(b.dataset.g))); ir("ciclos");
  }
  async function ciclos(el) {
    T().carregando(el);
    try {
      const cargos = await B.funcoes(), h = new Date(), prox = S.ciclos.filter(c => c.ano === h.getFullYear()).length + 1;
      const util = (d, n) => { const x = new Date(d + "T12:00:00"); let c = 0; while (c < n) { x.setDate(x.getDate() + 1); if (x.getDay() % 6) c++; } return x.toISOString().slice(0, 10); };
      el.innerHTML = `<div class="dc-bloco"><h2>Ciclos</h2><div class="dc-rolar"><table class="dc-tab"><thead><tr><th>Ciclo</th><th>Abertura</th><th>Avaliação</th><th>Devolutiva</th><th>PDI</th><th>Fim</th><th>Situação</th><th></th></tr></thead><tbody>
          ${S.ciclos.map(c => `<tr><td><b>${esc(c.titulo)}</b></td><td>${dataBR(c.abertura)}</td><td>${dataBR(c.prazo_avaliacao)}</td><td>${dataBR(c.prazo_devolutiva)}</td><td>${dataBR(c.prazo_pdi)}</td><td>${dataBR(c.fim)}</td>
            <td>${T().sit(c.status, c.status === "encerrado" ? "neutro" : "ok")}</td><td><button class="sec dc-mini" data-st="${c.id}">${c.status === "encerrado" ? "Reabrir" : "Encerrar"}</button></td></tr>`).join("") || `<tr><td colspan="8">Nenhum ciclo.</td></tr>`}</tbody></table></div>
          <div class="ajuda">Os prazos contam dias úteis (sem fins de semana e feriados nacionais e da Bahia). Os lembretes saem sozinhos: no 3º dia útil, no prazo e depois a cada dia útil de atraso.</div></div>
        <div class="dc-bloco"><h2>Abrir novo ciclo</h2><div class="grade2">
          <div><label>Título</label><input id="cg-t" value="${prox}º ciclo · ${h.getFullYear()}"></div><div><label>Ordem no ano</label><select id="cg-o">${[1, 2, 3].map(i => `<option${i === Math.min(prox, 3) ? " selected" : ""}>${i}</option>`).join("")}</select></div>
          <div><label>Abertura</label><input type="date" id="cg-a" value="${hojeISO()}"></div><div><label>Fim do acompanhamento</label><input type="date" id="cg-f"></div></div>
          <div class="dc-guia" id="cg-pz"></div>
          <label>Funções participantes (do Quadro Geral)</label><div class="dc-chips" id="cg-cg">${cargos.map(c => `<label><input type="checkbox" value="${esc(c.funcao)}"${/articulador|assistente/i.test(c.funcao) && !/consultor|coordenador/i.test(c.funcao) ? " checked" : ""}><span>${esc(c.funcao)} · ${c.cadastrados} no SGT</span></label>`).join("")}</div>
          <label class="check"><input type="checkbox" id="cg-lid"><span>Aplicar também o bloco <b>Liderança</b> da matriz DGPE (para quem tem papel de liderança)</span></label>
          <div class="dc-btns"><button class="sec" id="cg-prev">Ver quem entra e quem avalia</button><button id="cg-abrir">Abrir ciclo</button></div><div id="cg-lista"></div></div>`;
      const calc = () => { const a = $("cg-a").value; if (!a) return; const f = new Date(a + "T12:00:00"); f.setMonth(f.getMonth() + 3); f.setDate(f.getDate() - 1);
        if (!$("cg-f").dataset.mexeu) $("cg-f").value = f.toISOString().slice(0, 10);
        $("cg-pz").innerHTML = `Prazos previstos: avaliação às cegas até <b>${dataBR(util(a, 5))}</b> · devolutiva até <b>${dataBR(util(a, 10))}</b> · conversa e PDI até <b>${dataBR(util(a, 15))}</b> · acompanhamento até <b>${dataBR($("cg-f").value)}</b>. (Feriados são descontados no banco.)`; };
      $("cg-a").addEventListener("input", calc); $("cg-f").addEventListener("input", () => { $("cg-f").dataset.mexeu = 1; calc(); }); calc();
      const cgs = () => [...$("cg-cg").querySelectorAll("input:checked")].map(i => i.value);
      $("cg-prev").addEventListener("click", async () => { try { const l = await B.previa(cgs()), sem = l.filter(p => !p.avaliador_id);
        $("cg-lista").innerHTML = `<div class="ajuda">${l.length} pessoa(s). ${sem.length ? `<b style="color:var(--erro)">${sem.length} sem coordenador(a)</b>: defina a carteira do NTE antes de abrir.` : "Todas têm coordenador(a)."}</div>
          <div class="dc-rolar"><table class="dc-tab"><thead><tr><th>Pessoa</th><th>Cargo</th><th>NTE</th><th>Avaliador(a)</th></tr></thead><tbody>${l.map(p => `<tr><td>${esc(p.nome)}</td><td>${esc(p.cargo || "")}</td><td>${p.nte_id || "—"}</td><td>${p.avaliador ? esc(p.avaliador) : T().sit("Sem coordenação", "erro")}</td></tr>`).join("")}</tbody></table></div>`; } catch (e) { falhou(e); } });
      $("cg-abrir").addEventListener("click", async () => {
        if (!cgs().length) return aviso("a-cd", "Escolha ao menos uma função.");
        if (!confirm("Abrir o ciclo agora? Todas as pessoas e coordenações recebem aviso por e-mail.")) return;
        try { await B.abrirCiclo({ p_ano: +$("cg-a").value.slice(0, 4), p_ordem: +$("cg-o").value, p_titulo: $("cg-t").value.trim(), p_abertura: $("cg-a").value, p_fim: $("cg-f").value || null,
            p_funcoes: cgs(), p_lideranca: $("cg-lid").checked, p_instrumento: window.CicloInstrumento }); S.ciclo = null; ok("Ciclo aberto. Avisos enviados."); T().abrir(); }
        catch (e) { aviso("a-cd", /duplicate|unique/i.test(e.message) ? "Já existe um ciclo com essa ordem neste ano." : S.demo ? e.message : traduzErro(e)); } });
      el.querySelectorAll("[data-st]").forEach(b => b.addEventListener("click", async () => { const c = S.ciclos.find(y => y.id === +b.dataset.st);
        try { await B.statusCiclo(c.id, c.status === "encerrado" ? "acompanhamento" : "encerrado"); T().abrir(); } catch (e) { falhou(e); } }));
    } catch (e) { falhou(e); }
  }
  async function cart(el) {
    T().carregando(el);
    try {
      const [ntes, cartL, pessoas] = await Promise.all([B.ntes(), B.carteira(), B.pessoas()]);
      const ordenadas = [...pessoas].sort((a, b) => (/coorden/i.test(b.cargo || "") - /coorden/i.test(a.cargo || "")) || a.nome.localeCompare(b.nome));
      const nome = (id) => (pessoas.find(p => p.id === id) || {}).nome || "—";
      el.innerHTML = `<div class="dc-bloco"><h2>Carteiras de NTE</h2><div class="ajuda">Mude a coordenação de um NTE e salve. Quem ainda não foi avaliado(a) no ciclo passa para a nova coordenação, que também passa a ver o histórico (ciclos anteriores) das pessoas do NTE. As avaliações de uma coordenação não ficam visíveis para as outras.</div>
        <div class="dc-rolar"><table class="dc-tab"><thead><tr><th>NTE</th><th>Coordenação</th><th>Desde</th></tr></thead><tbody>
        ${ntes.map(n => { const k = cartL.find(c => c.nte_id === n.id && !c.fim); return `<tr><td><b>NTE ${String(n.id).padStart(2, "0")}</b><br><small>${esc(n.nome || "")}</small></td>
          <td><select data-nte="${n.id}" data-orig="${k ? k.coordenador_id : ""}" style="margin:0"><option value="">— sem coordenação —</option>${ordenadas.map(p => `<option value="${p.id}"${k && k.coordenador_id === p.id ? " selected" : ""}>${esc(p.nome)}${p.cargo ? " · " + esc(p.cargo) : ""}</option>`).join("")}</select></td>
          <td>${k ? dataBR(k.inicio) : "—"}</td></tr>`; }).join("")}</tbody></table></div>
        <div class="grade2"><div><label>Vale a partir de</label><input type="date" id="cc-d" value="${hojeISO()}"></div></div><div class="dc-btns"><button id="cc-s">Salvar mudanças</button></div>
        <h3>Histórico</h3><div class="dc-rolar"><table class="dc-tab"><thead><tr><th>NTE</th><th>Coordenação</th><th>De</th><th>Até</th></tr></thead><tbody>
        ${cartL.filter(c => c.fim).map(c => `<tr><td>${c.nte_id}</td><td>${esc(nome(c.coordenador_id))}</td><td>${dataBR(c.inicio)}</td><td>${dataBR(c.fim)}</td></tr>`).join("") || `<tr><td colspan="4">Sem mudanças ainda.</td></tr>`}</tbody></table></div></div>`;
      $("cc-s").addEventListener("click", async () => {
        const mud = [...el.querySelectorAll("[data-nte]")].filter(s => s.value !== s.dataset.orig && s.value).map(s => ({ nte_id: +s.dataset.nte, coordenador_id: s.value, inicio: $("cc-d").value || hojeISO() }));
        if (!mud.length) return aviso("a-cd", "Nenhuma mudança para salvar.");
        try { await B.novaCarteira(mud); S.carteira = await B.carteira(); ok(`${mud.length} NTE atualizado(s).`); cart(el); } catch (e) { falhou(e); } });
    } catch (e) { falhou(e); }
  }
  async function traj(el) {
    T().carregando(el);
    try {
      const l = await B.trajetorias();
      el.innerHTML = `<div class="dc-bloco"><h2>Trajetórias (entrada no projeto e no cargo atual)</h2><div class="ajuda">Base inicial importada das planilhas <b>Planejamento do Projeto 2026</b> (aba 05.2 Alocação) e <b>Marco Zero</b> (aba 06. Equipe). A ligação com o cadastro é feita pelo nome; linhas sem ligação aparecem em destaque. Corrija aqui as datas quando preciso.</div>
        <div class="dc-barra"><input type="search" id="tj-b" placeholder="Buscar"><label class="check" style="margin:0"><input type="checkbox" id="tj-s"><span>Só sem ligação ou a confirmar</span></label></div>
        <div class="dc-rolar"><table class="dc-tab"><thead><tr><th>Nome</th><th>Função · nível</th><th>NTE</th><th>Entrada no projeto</th><th>No cargo desde</th><th>Fonte</th><th></th></tr></thead><tbody id="tj-l"></tbody></table></div></div>`;
      const des = () => { const q = $("tj-b").value.toLowerCase(), so = $("tj-s").checked;
        $("tj-l").innerHTML = l.filter(t => (!q || t.nome.toLowerCase().includes(q)) && (!so || !t.colaborador_id || t.entrada_projeto === "2026-01-01")).map(t => `<tr data-t="${t.id}"${t.colaborador_id ? "" : ' style="background:var(--alerta-fundo)"'}>
          <td><b>${esc(t.nome)}</b>${t.colaborador_id ? "" : "<br><small>sem ligação com o cadastro</small>"}</td><td>${esc(t.funcao || "")} · ${esc(t.nivel || "")}</td><td>${t.nte_id || "—"}</td>
          <td><input type="date" data-f="entrada_projeto" value="${esc(t.entrada_projeto || "")}" style="margin:0;padding:6px"></td><td><input type="date" data-f="cargo_desde" value="${esc(t.cargo_desde || "")}" style="margin:0;padding:6px"></td>
          <td><small>${esc(t.fonte || "")}</small></td><td><button class="sec dc-mini" data-sv>Salvar</button></td></tr>`).join("");
        $("tj-l").querySelectorAll("[data-sv]").forEach(b => b.addEventListener("click", async () => { const tr = b.closest("tr"), d = { id: +tr.dataset.t, fonte: "Ajustado no SGT" };
          tr.querySelectorAll("[data-f]").forEach(i => d[i.dataset.f] = i.value || null); try { await B.salvarTraj(d); ok("Trajetória salva."); } catch (e) { falhou(e); } })); };
      $("tj-b").addEventListener("input", des); $("tj-s").addEventListener("change", des); des();
    } catch (e) { falhou(e); }
  }
  async function exp(el) {
    el.innerHTML = `<div class="dc-bloco"><h2>Exportar ${S.ciclo ? "· " + esc(S.ciclo.titulo) : ""}</h2>
      <div class="ajuda">O formato da Superintendência traz as notas de 1 a 5 das competências da Matriz DGPE, as justificativas das notas 1 e 5 e a etapa de Resultados, como no formulário dela. Assim, os dados do ciclo podem ser reaproveitados se a Superintendência pedir a avaliação de desempenho. Planilhas baixadas saem da proteção do SGT: guarde em local restrito.</div>
      <div class="dc-btns"><button id="ex-1">Formato Superintendência · avaliação da liderança</button><button class="sec" id="ex-2">Formato Superintendência · autoavaliação</button><button class="sec" id="ex-3">Completo do ciclo (todas as etapas)</button></div></div>`;
    const baixar = (nome, linhas) => { const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + linhas.map(l => l.map(q).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" })); a.download = nome; a.click(); };
    const dgpe = () => C.blocos().filter(b => b.fonte === "dgpe" && b.id !== "res").flatMap(b => b.itens.map(i => ({ ...i, valor: b.titulo })));
    const dados = async () => { if (!S.ciclo) throw new Error("Escolha um ciclo."); return [S.lista, await B.respostasCiclo(S.ciclo.id), await B.metasCiclo(S.ciclo.id), await B.encontrosCiclo(S.ciclo.id)]; };
    const sup = async (tipo) => { try { const [L, rs] = await dados(), its = dgpe();
      const cab = ["Projeto", "Nome", "Cargo", "NTE", "Avaliador(a)", "Exerce liderança", ...its.flatMap(i => [`${i.valor} | ${i.nome}`, `Justificativa | ${i.nome}`]), "Resultados (1 a 5)", "Resultados | percepção geral", "Período avaliado"];
      const linhas = L.map(x => { const r = rs.find(y => y.participante_id === x.id && y.tipo === tipo) || { notas: {}, justificativas: {}, sintese: {} };
        return ["Gestão para Aprendizagem BA (FGV DGPE)", x.nome, x.cargo, x.nte, x.avaliador, S.ciclo.lideranca ? "Sim" : "Não", ...its.flatMap(i => [r.notas[i.k] || "", r.justificativas[i.k] || ""]), r.notas.res || "", r.sintese.res_texto || "", `${dataBR(S.ciclo.abertura)} (trimestre anterior)`]; });
      baixar(`superintendencia-${tipo === "coord" ? "lideranca" : "autoavaliacao"}-${S.ciclo.ano}-${S.ciclo.ordem}.csv`, [cab, ...linhas]); } catch (e) { falhou(e); } };
    $("ex-1").addEventListener("click", () => sup("coord")); $("ex-2").addEventListener("click", () => sup("auto"));
    $("ex-3").addEventListener("click", async () => { try { const [L, rs, ms, es] = await dados(), its = itens();
      const cab = ["Nome", "Cargo", "NTE", "Avaliador(a)", "Etapa", "Autoavaliação enviada", "Avaliação enviada", "Devolutiva", "Conversa", "Modalidade", "PDI publicado", "Ciência", "Índice DGPE (coord.)", "Índice GA (coord.)", "Resultados (coord.)", "Índice geral (auto)",
        ...its.flatMap(i => [`Auto | ${i.nome}`, `Coord. | ${i.nome}`]), "Metas", "Metas concluídas", "Progresso médio", "Encontros realizados", "Encontro síncrono", "Efetividade média"];
      const linhas = L.map(x => { const a = rs.find(y => y.participante_id === x.id && y.tipo === "auto"), c = rs.find(y => y.participante_id === x.id && y.tipo === "coord"), ic = indices(c && c.notas), ia = indices(a && a.notas);
        const m = ms.filter(y => y.participante_id === x.id), e = es.filter(y => y.participante_id === x.id), p = e.filter(y => y.pulso).map(y => (y.pulso.utilidade + y.pulso.apoio + y.pulso.aplicacao + y.pulso.progresso) / 4);
        const nn = (v) => v == null ? "" : String(Math.round(v * 100) / 100).replace(".", ",");
        return [x.nome, x.cargo, x.nte, x.avaliador, C.nomeFase(fase(x)), x.auto_enviada ? "Sim" : "Não", x.coord_enviada ? "Sim" : "Não", dataBR(x.devolutiva_em), dataBR(x.conversa_em), MODAL[x.conversa_modalidade] || "", dataBR(x.pdi_publicado_em),
          x.pdi_ciencia_em ? (x.pdi_concorda ? "De acordo" : "Com ressalvas") : "", nn(ic.dgpe), nn(ic.ga), nn(ic.res), nn(ia.geral), ...its.flatMap(i => [a && a.notas[i.k] || "", c && c.notas[i.k] || ""]),
          m.length, m.filter(y => y.status === "Concluída").length, m.length ? Math.round(m.reduce((s, y) => s + (y.progresso || 0), 0) / m.length) + "%" : "", e.filter(y => y.realizado_em).length, x.encontro_sincrono ? "Sim" : "Não", nn(p.length ? p.reduce((s, v) => s + v, 0) / p.length : null)]; });
      baixar(`ciclo-${S.ciclo.ano}-${S.ciclo.ordem}-completo.csv`, [cab, ...linhas]); } catch (e) { falhou(e); } });
  }

  window.CicloCondutas = { abrir, gestao };
})();
