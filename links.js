// SGT · Links do Projeto (página pública em links/; edição para quem tem a ferramenta ou é administrador)
(() => {
  const $ = (id) => document.getElementById(id);
  let itens = [], editor = false;

  document.head.insertAdjacentHTML("beforeend", `<style>
    .lnk-item{display:grid;grid-template-columns:52px 1.3fr 2fr 1fr 70px 90px auto;gap:8px;align-items:end;border:1px solid var(--borda);border-radius:var(--raio);padding:10px;margin-top:8px;background:#fff}
    .lnk-item label{margin:0 0 4px;font-size:12px}
    .lnk-item input,.lnk-item select{padding:9px 10px;font-size:14px}
    .lnk-item button{width:auto;margin:0;padding:9px 12px;font-size:14px}
    .lnk-ver a{display:flex;gap:12px;align-items:center;border:1px solid var(--borda);border-radius:var(--raio);padding:12px 14px;margin-top:8px;text-decoration:none;color:var(--texto)}
    .lnk-ver a:hover{background:var(--cor-suave)} .lnk-ver small{display:block;color:var(--texto-2);font-size:12.5px}
    @media (max-width:760px){.lnk-item{grid-template-columns:1fr 1fr}}
  </style>`);
  $("cartao").querySelector(".rodape").insertAdjacentHTML("beforebegin", `
  <section id="v-lnk" class="oculto">
    <div class="topo"><div><h1>Links do Projeto</h1><div class="ajuda" style="margin:0">Página pública: <a href="links/" target="_blank" id="lnk-pub"></a></div></div><button class="sec" data-ir="v-inicio">← Início</button></div>
    <div id="lnk-corpo" style="margin-top:14px"></div>
    <div class="aviso" id="a-lnk"></div>
  </section>`);
  $("v-lnk").querySelector("[data-ir]").addEventListener("click", () => mostrar("v-inicio"));
  $("lnk-pub").textContent = new URL("links/", location.href).href; $("lnk-pub").href = $("lnk-pub").textContent;

  const campos = (x) => `
    <div><label>Ícone</label><input type="text" data-f="icone" maxlength="4" value="${esc(x.icone || "")}" placeholder="🔗"></div>
    <div><label>Título</label><input type="text" data-f="titulo" maxlength="120" value="${esc(x.titulo || "")}"></div>
    <div><label>Endereço (https://…)</label><input type="text" data-f="url" value="${esc(x.url || "")}"></div>
    <div><label>Grupo</label><input type="text" data-f="grupo" list="lnk-grupos" value="${esc(x.grupo || "Geral")}"></div>
    <div><label>Ordem</label><input type="text" inputmode="numeric" data-f="ordem" value="${x.ordem ?? 0}"></div>
    <div><label>Situação</label><select data-f="ativo"><option value="true"${x.ativo !== false ? " selected" : ""}>Publicado</option><option value="false"${x.ativo === false ? " selected" : ""}>Oculto</option></select></div>`;

  async function abrir() {
    mostrar("v-lnk");
    editor = pode("admin") || temModulo("linktree");
    $("lnk-corpo").innerHTML = `<div class="resumo">Carregando…</div>`;
    try {
      itens = await api("/rest/v1/link_item?select=*&order=grupo.asc,ordem.asc,titulo.asc");
      desenhar();
    } catch (e) { if (e.message !== "sessao") aviso("a-lnk", traduzErro(e)); }
  }
  function desenhar() {
    if (!editor) {
      $("lnk-corpo").innerHTML = itens.length ? `<div class="lnk-ver">${itens.map(x => `<a href="${esc(x.url)}" target="_blank" rel="noopener"><span style="font-size:20px">${esc(x.icone || "🔗")}</span><span><b>${esc(x.titulo)}</b>${x.descricao ? `<small>${esc(x.descricao)}</small>` : ""}</span></a>`).join("")}</div>`
        : `<div class="resumo">Nenhum link publicado ainda.</div>`;
      return;
    }
    const grupos = [...new Set(itens.map(x => x.grupo))];
    $("lnk-corpo").innerHTML = `<datalist id="lnk-grupos">${grupos.map(g => `<option value="${esc(g)}">`).join("")}</datalist>
      <p class="sub">Edite e clique em Salvar na linha. Links ocultos não aparecem na página pública.</p>
      ${itens.map(x => `<div class="lnk-item" data-id="${x.id}">${campos(x)}
        <div style="display:flex;gap:6px"><button data-salvar>Salvar</button><button class="perigo" data-apagar title="Excluir">×</button></div>
        <div style="grid-column:1/-1"><input type="text" data-f="descricao" maxlength="200" value="${esc(x.descricao || "")}" placeholder="Descrição curta (opcional)"></div></div>`).join("")}
      <h2>Novo link</h2>
      <div class="lnk-item" data-id="novo">${campos({ grupo: grupos[0] || "Geral", ordem: (itens.length + 1) * 10 })}
        <div><button data-salvar>Adicionar</button></div>
        <div style="grid-column:1/-1"><input type="text" data-f="descricao" maxlength="200" placeholder="Descrição curta (opcional)"></div></div>`;
    $("lnk-corpo").querySelectorAll(".lnk-item").forEach(el => {
      const id = el.dataset.id, f = (n) => el.querySelector(`[data-f="${n}"]`).value.trim();
      el.querySelector("[data-salvar]").addEventListener("click", async () => {
        const d = { titulo: f("titulo"), url: f("url"), grupo: f("grupo") || "Geral", icone: f("icone") || null, descricao: f("descricao") || null,
          ordem: parseInt(f("ordem"), 10) || 0, ativo: f("ativo") === "true", atualizado_por: eu.id, atualizado_em: new Date().toISOString() };
        if (!d.titulo) return aviso("a-lnk", "Informe o título.");
        if (!/^https?:\/\/\S+\.\S+/i.test(d.url)) return aviso("a-lnk", "O endereço precisa começar com https:// (ou http://).");
        try {
          if (id === "novo") await api("/rest/v1/link_item", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(d) });
          else await api(`/rest/v1/link_item?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(d) });
          await abrir(); aviso("a-lnk", id === "novo" ? "Link adicionado." : "Link salvo.", "ok");
        } catch (e) { if (e.message !== "sessao") aviso("a-lnk", traduzErro(e)); }
      });
      const ap = el.querySelector("[data-apagar]");
      if (ap) { let conf = false; ap.addEventListener("click", async () => {
        if (!conf) { conf = true; ap.textContent = "Excluir?"; setTimeout(() => { conf = false; ap.textContent = "×"; }, 5000); return; }
        try { await api(`/rest/v1/link_item?id=eq.${id}`, { method: "DELETE" }); await abrir(); aviso("a-lnk", "Link excluído.", "ok"); }
        catch (e) { if (e.message !== "sessao") aviso("a-lnk", traduzErro(e)); }
      }); }
    });
  }

  window.Links = { abrir };
})();
