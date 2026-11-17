// SGT · Segurança
//  - Verificação em 2 fatores (aplicativo autenticador) para Administrador(a) e Programador(a)
//  - Confirmação das mudanças de acesso por quem as fez
//  - Troca de senha (código por e-mail) e lembrete semestral
//  - Dispositivos conectados (ADM e Programador(a))
(function(){
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  const rpc = (f, corpo = {}) => api("/rest/v1/rpc/" + f, { method: "POST", body: JSON.stringify(corpo) });
  const jwt = () => { try { const s = lerSessao(); return JSON.parse(atob(s.t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); } catch { return {}; } };
  const dataHora = (d) => d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "";
  let info = null, fator = null, depois = null, pendenteAtual = null;

  document.head.insertAdjacentHTML("beforeend", `<style>
    .seg-qr{display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin:10px 0}
    .seg-qr img{width:190px;height:190px;background:#fff;border-radius:10px;padding:8px;border:1px solid var(--borda)}
    .seg-chave{font-family:ui-monospace,Consolas,monospace;font-size:13px;word-break:break-all;background:var(--fundo);padding:8px 10px;border-radius:8px}
    .seg-banner{border-radius:12px;padding:12px 14px;margin:0 0 14px;font-size:14px;line-height:1.45;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}
    .seg-banner.alerta{background:var(--alerta-fundo);color:var(--alerta)}
    .seg-banner button{width:auto;margin:0;padding:8px 14px;font-size:14px}
    .seg-item{border:1px solid var(--borda);border-radius:var(--raio);padding:12px 14px;margin-bottom:10px;font-size:14px;line-height:1.5}
    .seg-item .acoes{margin-top:6px}
    .seg-item .acoes button{margin-top:6px}
    table.seg{width:100%;border-collapse:collapse;font-size:13.5px}
    table.seg th,table.seg td{border-bottom:1px solid var(--borda);padding:8px;text-align:left;vertical-align:top}
    table.seg th{background:var(--cor-suave);color:var(--cor);font-weight:600}
    table.seg button{width:auto;margin:0;padding:6px 10px;font-size:13px}
    .seg-modal{position:fixed;inset:0;background:rgba(0,0,0,.45);display:grid;place-items:center;z-index:50;padding:16px}
    .seg-modal > div{background:var(--superficie,#fff);border-radius:16px;max-width:420px;width:100%;padding:22px}
  </style>`);

  $("cartao").querySelector(".rodape").insertAdjacentHTML("beforebegin", `
  <section id="v-2fa" class="oculto">
    <h1>Verificação em 2 fatores</h1>
    <div id="s2-cadastro" class="oculto">
      <p class="sub">Seu nível de acesso exige uma segunda confirmação além da senha. Faça isto uma única vez:</p>
      <ol style="font-size:14px;line-height:1.55;padding-left:20px;margin:0">
        <li>Instale no celular um aplicativo autenticador (Google Authenticator, Microsoft Authenticator ou similar).</li>
        <li>No aplicativo, toque em <b>+</b> e leia o QR Code abaixo. Se preferir, digite a chave.</li>
        <li>Digite o código de 6 dígitos que aparecer no aplicativo.</li>
      </ol>
      <div class="seg-qr"><img id="s2-qr" alt="QR Code para o autenticador"><div style="flex:1;min-width:180px"><div class="ajuda">Chave para digitar:</div><div class="seg-chave" id="s2-chave"></div></div></div>
    </div>
    <p class="sub" id="s2-sub-login">Abra o aplicativo autenticador no celular e digite o código de 6 dígitos do SGT.</p>
    <form id="f-2fa" novalidate>
      <label for="s2-cod">Código do autenticador</label>
      <input id="s2-cod" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" class="codigo">
      <button type="submit">Confirmar</button>
    </form>
    <div class="aviso" id="a-2fa"></div>
    <div class="ajuda" style="margin-top:14px">Perdeu o celular? Peça a outro(a) Administrador(a) ou Programador(a) para redefinir a sua verificação em 2 fatores.</div>
    <button class="link" id="s2-sair">Sair</button>
  </section>

  <section id="v-seg" class="oculto">
    <div class="topo"><div><h1>Segurança</h1><div class="ajuda" style="margin:0">Senha, verificação em 2 fatores e acessos</div></div><button class="sec" data-ir="v-inicio">← Início</button></div>
    <div class="abas" id="seg-abas">
      <button data-seg="seg-senha" class="on">Trocar senha</button>
      <button data-seg="seg-conf" class="seg-adm">Confirmações de acesso</button>
      <button data-seg="seg-disp" class="seg-adm">Dispositivos conectados</button>
    </div>

    <div id="seg-senha">
      <p class="sub" id="seg-senha-info"></p>
      <div id="seg-t1">
        <p class="sub">Para trocar a senha, enviaremos um código de 6 dígitos para o seu e-mail cadastrado.</p>
        <button id="seg-enviar" style="max-width:360px">Enviar código para o meu e-mail</button>
      </div>
      <form id="f-trocar" class="oculto" novalidate style="max-width:420px">
        <p class="sub" id="seg-t2-sub"></p>
        <label for="t-cod">Código recebido por e-mail</label>
        <input id="t-cod" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" class="codigo">
        <label for="t-senha">Nova senha</label>
        <input id="t-senha" type="password" autocomplete="new-password">
        <div class="ajuda">${SENHA_REGRA}</div>
        <label for="t-senha2">Repita a nova senha</label>
        <input id="t-senha2" type="password" autocomplete="new-password">
        <button type="submit">Salvar nova senha</button>
        <button type="button" class="link" id="t-reenviar">Reenviar código</button>
      </form>
      <div class="aviso" id="a-trocar"></div>
    </div>

    <div id="seg-conf" class="oculto">
      <p class="sub">Toda mudança de nível de acesso ou de ferramenta só passa a valer depois que quem a fez confirmar aqui, com o código do autenticador. Pedidos não confirmados vencem em 48 horas.</p>
      <div id="seg-conf-lista"></div>
      <div class="aviso" id="a-conf"></div>
    </div>

    <div id="seg-disp" class="oculto">
      <p class="sub">Aparelhos e navegadores com sessão aberta no SGT. Se algum parecer estranho, encerre a sessão: a pessoa precisará entrar de novo com a senha.</p>
      <input type="search" id="seg-disp-busca" placeholder="Buscar por nome, aparelho ou IP" style="max-width:420px">
      <div class="resumo" id="seg-disp-resumo"></div>
      <div style="overflow:auto"><table class="seg"><thead><tr><th>Pessoa</th><th>Aparelho</th><th>IP</th><th>Entrou em</th><th>Último uso</th><th></th></tr></thead><tbody id="seg-disp-lista"></tbody></table></div>
      <div class="aviso" id="a-disp"></div>
    </div>
  </section>`);

  // ------------------------------------------------------------ 2 fatores
  async function fatores(){
    const u = await api("/auth/v1/user");
    return (u.factors || []).filter(f => f.factor_type === "totp");
  }
  async function verificar(fid, codigo){
    const ch = await api(`/auth/v1/factors/${fid}/challenge`, { method: "POST", body: "{}" });
    const s = await api(`/auth/v1/factors/${fid}/verify`, { method: "POST", body: JSON.stringify({ challenge_id: ch.id, code: codigo }) });
    guardarSessao(s);
  }
  // Devolve true se a pessoa pode seguir para o início; senão abre a tela do 2 fatores
  async function exigir(continuar){
    info = await rpc("minha_seguranca").catch(() => null);
    if (!info || !info.precisa_2fa || jwt().aal === "aal2") return true;
    depois = continuar;
    const fs = await fatores();
    fator = fs.find(f => f.status === "verified");
    $("s2-cadastro").classList.add("oculto"); $("s2-sub-login").classList.remove("oculto");
    if (!fator) {
      for (const f of fs) await api(`/auth/v1/factors/${f.id}`, { method: "DELETE" }).catch(() => {});
      const n = await api("/auth/v1/factors", { method: "POST", body: JSON.stringify({ factor_type: "totp", friendly_name: "SGT " + new Date().toISOString().slice(0, 16), issuer: "SGT GA BA" }) });
      fator = { id: n.id, novo: true };
      $("s2-qr").src = n.totp.qr_code.startsWith("data:") ? n.totp.qr_code : "data:image/svg+xml;utf8," + encodeURIComponent(n.totp.qr_code);
      $("s2-chave").textContent = n.totp.secret;
      $("s2-cadastro").classList.remove("oculto"); $("s2-sub-login").classList.add("oculto");
    }
    mostrar("v-2fa"); $("s2-cod").value = ""; $("s2-cod").focus();
    return false;
  }
  $("f-2fa").addEventListener("submit", async (e) => {
    e.preventDefault();
    const codigo = $("s2-cod").value.replace(/\D/g, "");
    if (codigo.length !== 6) return aviso("a-2fa", "O código tem 6 dígitos.");
    ocupado(e.target, true);
    try {
      await verificar(fator.id, codigo);
      if (fator.novo) sessionStorage.setItem("sgt-aviso-ok", "Verificação em 2 fatores cadastrada. Nos próximos acessos, o SGT vai pedir o código do aplicativo.");
      if (depois) await depois();
    } catch (err) {
      if (err.message !== "sessao") aviso("a-2fa", /invalid|expired|incorrect/i.test(err.message) ? "Código incorreto ou vencido. Confira o código atual no aplicativo." : traduzErro(err));
    } finally { ocupado(e.target, false); }
  });
  $("s2-sair").addEventListener("click", () => $("sair").click());

  // Confirma de novo com o autenticador (vale por 10 minutos para ações sensíveis)
  function pedirCodigo(titulo, texto){
    return new Promise((ok) => {
      const m = document.createElement("div"); m.className = "seg-modal";
      m.innerHTML = `<div><h1 style="font-size:18px">${esc(titulo)}</h1><p class="sub">${esc(texto)}</p>
        <form novalidate><label>Código do autenticador</label><input type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" class="codigo">
        <div class="aviso" id="a-modal"></div><div class="acoes"><button type="button" class="sec">Cancelar</button><button type="submit">Confirmar</button></div></form></div>`;
      document.body.appendChild(m);
      const inp = m.querySelector("input"); inp.focus();
      m.querySelector("button.sec").onclick = () => { m.remove(); ok(false); };
      m.querySelector("form").onsubmit = async (e) => {
        e.preventDefault();
        const c = inp.value.replace(/\D/g, "");
        if (c.length !== 6) return aviso("a-modal", "O código tem 6 dígitos.");
        ocupado(e.target, true);
        try {
          const f = (await fatores()).find(x => x.status === "verified");
          if (!f) throw new Error("Cadastre a verificação em 2 fatores: saia e entre de novo.");
          await verificar(f.id, c); m.remove(); ok(true);
        } catch (err) { aviso("a-modal", /invalid|expired|incorrect/i.test(err.message) ? "Código incorreto ou vencido." : traduzErro(err)); ocupado(e.target, false); }
      };
    });
  }
  const totpRecente = () => (jwt().amr || []).some(a => a.method === "totp" && a.timestamp > Date.now() / 1000 - 540);

  // ------------------------------------------------------------ Confirmação de acessos
  async function responder(id, aceitar){
    if (aceitar && !totpRecente() && !(await pedirCodigo("Confirmar mudança de acesso", "Digite o código do aplicativo autenticador para confirmar."))) return false;
    await rpc("acesso_responder", { p_id: id, p_aceitar: aceitar });
    return true;
  }
  async function carregarPendentes(){
    $("seg-conf-lista").innerHTML = `<div class="resumo">Carregando…</div>`;
    try {
      const ps = await rpc("acesso_pendentes");
      $("seg-conf-lista").innerHTML = ps.length ? ps.map(p => `<div class="seg-item">
        <b>${esc(p.nome)}</b> · <span class="ajuda">pedido em ${dataHora(p.criado_em)}</span>
        ${p.dar_papeis ? `<div>Dar o nível: <b>${esc(p.dar_papeis)}</b></div>` : ""}
        ${p.tirar_papeis ? `<div>Tirar o nível: <b>${esc(p.tirar_papeis)}</b></div>` : ""}
        ${p.dar_modulos ? `<div>Liberar: <b>${esc(p.dar_modulos)}</b></div>` : ""}
        ${p.tirar_modulos ? `<div>Retirar: <b>${esc(p.tirar_modulos)}</b></div>` : ""}
        <div class="acoes"><button class="perigo" data-rec="${p.id}">Não liberar</button><button data-conf="${p.id}">Sim, confirmar</button></div></div>`).join("")
        : `<div class="resumo">Nenhuma mudança esperando a sua confirmação.</div>`;
      $("seg-conf-lista").querySelectorAll("[data-conf],[data-rec]").forEach(b => b.onclick = async () => {
        const aceitar = !!b.dataset.conf;
        try {
          if (await responder(+(b.dataset.conf || b.dataset.rec), aceitar)) {
            aviso("a-conf", aceitar ? "Mudança confirmada. Ela já está valendo." : "Pedido recusado. Nada foi alterado.", "ok");
            await carregarPendentes();
          }
        } catch (err) { if (err.message !== "sessao") aviso("a-conf", traduzErro(err)); }
      });
    } catch (err) { if (err.message !== "sessao") aviso("a-conf", traduzErro(err)); $("seg-conf-lista").innerHTML = ""; }
  }

  // Chamado pelo Painel dos ADM ao salvar: registra o pedido e já oferece a confirmação
  async function solicitar(colab, dar, tirar, modDar, modTirar){
    const id = await rpc("acesso_solicitar", { p_colaborador: colab, p_dar_papeis: dar, p_tirar_papeis: tirar, p_dar_modulos: modDar, p_tirar_modulos: modTirar });
    if (!id) return "nada";
    const ok = totpRecente() || await pedirCodigo("Confirmar mudança de acesso",
      "Você pediu uma mudança de nível ou de ferramenta. Ela só vale depois de confirmada com o código do autenticador. Se cancelar agora, pode confirmar depois em Segurança → Confirmações de acesso (prazo de 48 horas).");
    if (!ok) return "pendente";
    await rpc("acesso_responder", { p_id: id, p_aceitar: true });
    return "confirmado";
  }

  // ------------------------------------------------------------ Dispositivos
  function aparelho(ua){
    ua = ua || "";
    const so = /Android/i.test(ua) ? "Android" : /iPhone|iPad|iOS/i.test(ua) ? "iPhone/iPad" : /Windows/i.test(ua) ? "Windows" : /Mac OS/i.test(ua) ? "Mac" : /Linux/i.test(ua) ? "Linux" : "";
    const nav = /wv\)|; wv/i.test(ua) ? "App SGT" : /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
    return [nav, so].filter(Boolean).join(" · ") || (ua ? ua.slice(0, 60) : "Não identificado");
  }
  let sessoes = [];
  function desenharSessoes(){
    const q = $("seg-disp-busca").value.trim().toLowerCase();
    const minha = jwt().session_id;
    const l = sessoes.filter(s => !q || [s.nome, aparelho(s.aparelho), s.ip].join(" ").toLowerCase().includes(q));
    $("seg-disp-resumo").textContent = `${l.length} sessões abertas · ${new Set(l.map(s => s.colaborador_id)).size} pessoas`;
    $("seg-disp-lista").innerHTML = l.map(s => `<tr><td>${esc(s.nome)}${s.aal === "aal2" ? ' <span class="tag verde">2 fatores</span>' : ""}</td>
      <td title="${esc(s.aparelho)}">${esc(aparelho(s.aparelho))}</td><td>${esc(s.ip || "")}</td><td>${dataHora(s.criada_em)}</td><td>${dataHora(s.ultimo_uso)}</td>
      <td>${s.id === minha ? '<span class="tag">Esta sessão</span>' : `<button class="perigo" data-enc="${s.id}">Encerrar</button>`}</td></tr>`).join("");
    $("seg-disp-lista").querySelectorAll("[data-enc]").forEach(b => b.onclick = async () => {
      if (b.dataset.ok !== "1") { b.dataset.ok = "1"; b.textContent = "Confirmar"; setTimeout(() => { b.dataset.ok = ""; b.textContent = "Encerrar"; }, 6000); return; }
      try { await rpc("sessao_encerrar", { p_sessao: b.dataset.enc }); aviso("a-disp", "Sessão encerrada.", "ok"); await carregarSessoes(); }
      catch (err) { if (err.message !== "sessao") aviso("a-disp", traduzErro(err)); }
    });
  }
  async function carregarSessoes(){
    $("seg-disp-resumo").textContent = "Carregando…";
    try { sessoes = await rpc("sessoes_listar"); desenharSessoes(); }
    catch (err) { if (err.message !== "sessao") aviso("a-disp", traduzErro(err)); }
  }
  $("seg-disp-busca").addEventListener("input", desenharSessoes);

  // ------------------------------------------------------------ Trocar senha
  async function funcaoLogado(corpo){
    const s = lerSessao();
    const r = await fetch(FUNCAO, { method: "POST", headers: { "Content-Type": "application/json", "apikey": CHAVE_PUBLICA, "Authorization": "Bearer " + s.t }, body: JSON.stringify(corpo) });
    let d = {}; try { d = await r.json(); } catch {}
    if (r.status === 401 && !corpo._tentou && await renovar()) return funcaoLogado({ ...corpo, _tentou: true });
    return { ok: r.ok, ...d };
  }
  async function enviarCodigoTroca(avisoOk){
    const d = await funcaoLogado({ acao: "trocar_codigo" });
    if (!d.ok) { aviso("a-trocar", d.erro || "Não foi possível enviar o código agora."); return; }
    $("seg-t2-sub").textContent = `Enviamos um código para ${d.enviado_para}. Ele vale por ${d.validade_min} minutos. Confira também a caixa de spam.`;
    $("seg-t1").classList.add("oculto"); $("f-trocar").classList.remove("oculto"); $("t-cod").focus();
    if (avisoOk) aviso("a-trocar", "Novo código enviado.", "ok");
  }
  $("seg-enviar").addEventListener("click", async (e) => { e.target.disabled = true; try { await enviarCodigoTroca(); } catch { aviso("a-trocar", "Sem conexão com o SGT."); } finally { e.target.disabled = false; } });
  $("t-reenviar").addEventListener("click", () => enviarCodigoTroca(true).catch(() => aviso("a-trocar", "Sem conexão com o SGT.")));
  $("f-trocar").addEventListener("submit", async (e) => {
    e.preventDefault();
    const codigo = $("t-cod").value.replace(/\D/g, ""), senha = $("t-senha").value;
    if (codigo.length !== 6) return aviso("a-trocar", "O código tem 6 dígitos.");
    if (!senhaForte(senha)) return aviso("a-trocar", "A senha não atende às regras: " + SENHA_REGRA);
    if (senha !== $("t-senha2").value) return aviso("a-trocar", "As senhas não são iguais.");
    ocupado(e.target, true);
    try {
      const d = await funcaoLogado({ acao: "trocar", codigo, senha });
      if (!d.ok) return aviso("a-trocar", d.erro || "Não foi possível salvar a nova senha agora.");
      e.target.reset(); $("f-trocar").classList.add("oculto"); $("seg-t1").classList.remove("oculto");
      if (info) { info.senha_vencida = false; info.senha_alterada_em = new Date().toISOString(); }
      infoSenha();
      aviso("a-trocar", "Senha alterada! As sessões abertas em outros aparelhos foram encerradas.", "ok");
    } catch { aviso("a-trocar", "Sem conexão com o SGT. Verifique sua internet."); }
    finally { ocupado(e.target, false); }
  });
  function infoSenha(){
    const d = info && info.senha_alterada_em;
    $("seg-senha-info").textContent = (d ? `Sua senha foi definida em ${new Date(d).toLocaleDateString("pt-BR")}. ` : "") +
      "Por segurança, troque a senha a cada 6 meses. " + (info && info.senha_vencida ? "Sua senha já passou desse prazo." : "");
  }

  // ------------------------------------------------------------ Tela e abas
  function aba(id){
    document.querySelectorAll("#seg-abas button").forEach(b => b.classList.toggle("on", b.dataset.seg === id));
    ["seg-senha","seg-conf","seg-disp"].forEach(a => $(a).classList.toggle("oculto", a !== id));
    if (id === "seg-conf") carregarPendentes();
    if (id === "seg-disp") carregarSessoes();
  }
  document.querySelectorAll("#seg-abas button").forEach(b => b.addEventListener("click", () => aba(b.dataset.seg)));
  function abrir(qual = "seg-senha"){
    const adm = defineAcessos();
    document.querySelectorAll(".seg-adm").forEach(b => b.classList.toggle("oculto", !adm));
    $("f-trocar").classList.add("oculto"); $("seg-t1").classList.remove("oculto");
    infoSenha(); mostrar("v-seg"); aba(adm ? qual : "seg-senha");
  }

  // Avisos no início (senha vencida, confirmações pendentes) e atalhos dos e-mails
  function avisosInicio(){
    const box = $("seg-avisos") || (() => { $("ferramentas").insertAdjacentHTML("beforebegin", `<div id="seg-avisos"></div>`); return $("seg-avisos"); })();
    const h = [];
    if (info && info.pendentes > 0) h.push(`<div class="seg-banner alerta"><span>Você tem ${info.pendentes} mudança(s) de acesso esperando a sua confirmação.</span><button id="seg-b-conf">Revisar</button></div>`);
    if (info && info.senha_vencida) h.push(`<div class="seg-banner alerta"><span>Sua senha tem mais de 6 meses. Troque agora para manter seu acesso seguro.</span><button id="seg-b-senha">Trocar senha</button></div>`);
    let ok = ""; try { ok = sessionStorage.getItem("sgt-aviso-ok") || ""; sessionStorage.removeItem("sgt-aviso-ok"); } catch {}
    if (ok) h.push(`<div class="aviso ok" style="margin:0 0 14px">${esc(ok)}</div>`);
    box.innerHTML = h.join("");
    if ($("seg-b-conf")) $("seg-b-conf").onclick = () => abrir("seg-conf");
    if ($("seg-b-senha")) $("seg-b-senha").onclick = () => abrir("seg-senha");
    const q = location.search;
    if (/trocar-senha/.test(q)) { history.replaceState(null, "", location.pathname); abrir("seg-senha"); }
    else if (/acessos/.test(q)) { history.replaceState(null, "", location.pathname); abrir("seg-conf"); }
  }
  function cartao(){
    return `<button class="ferr" id="ir-seg"><span class="ico">🔒</span><span>Segurança<small>${defineAcessos() ? "Senha, confirmações de acesso e dispositivos conectados" : "Trocar minha senha"}</small></span></button>`;
  }

  window.Seguranca = { exigir, abrir, cartao, avisosInicio, solicitar, pedirCodigo, totpRecente };
})();
