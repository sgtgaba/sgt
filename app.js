// SGT · App no celular (só para quem já entrou no SGT)
// Android: APK gratuito hospedado no próprio site (sem loja paga). iPhone e computador: instalar pelo navegador.
(() => {
  const $ = (id) => document.getElementById(id);
  const APK = "app/SGT.apk", VERSAO = "1.0 · 17/11/2026";
  let pedido = null;
  const instalado = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone || document.referrer.startsWith("android-app://");
  const ehAndroid = /android/i.test(navigator.userAgent), ehIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); pedido = e; const b = $("app-pwa"); if (b) b.classList.remove("oculto"); });

  document.head.insertAdjacentHTML("beforeend", `<style>
    .app-bloco{border:1px solid var(--borda);border-radius:var(--raio);padding:4px 16px 16px;margin-top:14px;background:#fff}
    .app-bloco h2{margin-top:14px}
    .app-bloco ol{margin:8px 0 0;padding-left:20px;font-size:14px;line-height:1.6}
    a.app-baixar{display:inline-flex;align-items:center;gap:10px;margin-top:10px;padding:13px 18px;border-radius:var(--raio);background:var(--cor);color:#fff;font-weight:600;text-decoration:none}
    a.app-baixar:hover{background:var(--cor-forte)}
    .app-link{display:flex;gap:8px;margin-top:10px}
    .app-link input{font-size:14px!important;padding:10px 12px!important}
    .app-link button{width:auto;margin:0;padding:10px 14px;font-size:14px;white-space:nowrap}
  </style>`);

  $("cartao").querySelector(".rodape").insertAdjacentHTML("beforebegin", `
  <section id="v-app" class="oculto">
    <div class="topo"><div><h1>App no celular</h1><div class="ajuda" style="margin:0">Gratuito · versão ${VERSAO}</div></div><button class="sec" id="app-voltar">← Início</button></div>
    <div class="oculto" id="app-ja" style="margin-top:14px;border-radius:10px;padding:10px 12px;font-size:13.5px;background:var(--ok-fundo);color:var(--ok)">Você já está usando o SGT como aplicativo neste aparelho.</div>
    <div class="app-bloco" id="app-android">
      <h2>Android</h2>
      <div class="ajuda">Baixe e instale o aplicativo do SGT. Ele abre direto no portal, com o ícone do projeto.</div>
      <a class="app-baixar" href="${APK}" download="SGT.apk">⬇ Baixar o app para Android (1,4 MB)</a>
      <ol>
        <li>Toque em <b>Baixar</b> e, quando o download terminar, abra o arquivo <b>SGT.apk</b>.</li>
        <li>Se o celular avisar sobre "fontes desconhecidas", toque em <b>Configurações</b> e ative <b>Permitir desta fonte</b> para o navegador. Depois volte e toque em <b>Instalar</b>.</li>
        <li>Se aparecer um alerta do Play Protect, toque em <b>Mais detalhes → Instalar mesmo assim</b>. O aviso aparece porque o app não está na loja do Google.</li>
        <li>Abra o <b>SGT</b> e entre com seu CPF e senha.</li>
      </ol>
    </div>
    <div class="app-bloco" id="app-ios">
      <h2>iPhone</h2>
      <ol>
        <li>Abra <b>${esc(new URL("./", location.href).href)}</b> no <b>Safari</b>.</li>
        <li>Toque em <b>Compartilhar</b> (o quadrado com a seta para cima).</li>
        <li>Toque em <b>Adicionar à Tela de Início</b> e depois em <b>Adicionar</b>.</li>
      </ol>
    </div>
    <div class="app-bloco">
      <h2>Computador</h2>
      <div class="ajuda">No Chrome ou no Edge, o SGT pode ser instalado como programa, com atalho na área de trabalho.</div>
      <button id="app-pwa" class="oculto" style="width:auto">Instalar o SGT neste aparelho</button>
      <div class="ajuda" id="app-pwa-txt">Se o botão não aparecer, use o ícone de instalar na barra de endereço do navegador.</div>
    </div>
    <div class="app-bloco">
      <h2>Enviar o link a um colega</h2>
      <div class="ajuda">Só quem tem cadastro no quadro do projeto consegue entrar no app.</div>
      <div class="app-link"><input type="text" id="app-url" readonly><button class="sec" id="app-copiar">Copiar link</button></div>
    </div>
    <div class="aviso" id="a-app"></div>
  </section>`);

  $("app-voltar").addEventListener("click", () => mostrar("v-inicio"));
  $("app-url").value = new URL(APK, location.href).href;
  $("app-copiar").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("app-url").value); aviso("a-app", "Link copiado.", "ok"); }
    catch { $("app-url").select(); aviso("a-app", "Selecione o link e copie.", "alerta"); }
  });
  $("app-pwa").addEventListener("click", async () => {
    if (!pedido) return;
    pedido.prompt(); const r = await pedido.userChoice; pedido = null;
    if (r.outcome === "accepted") { $("app-pwa").classList.add("oculto"); aviso("a-app", "SGT instalado neste aparelho.", "ok"); }
  });

  function abrir(){
    mostrar("v-app");
    $("app-ja").classList.toggle("oculto", !instalado());
    $("app-pwa").classList.toggle("oculto", !pedido);
    // mostra primeiro o que vale para este aparelho
    const corpo = $("v-app"), and = $("app-android"), ios = $("app-ios");
    if (ehIOS) corpo.insertBefore(ios, and); else corpo.insertBefore(and, ios);
  }

  window.App = { abrir, cartao: () => instalado() ? "" :
    `<button class="ferr" id="ir-app"><span class="ico">📱</span><span>App no celular<small>Baixar e instalar o SGT no seu aparelho</small></span></button>` };
})();
