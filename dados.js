// SGT · Dados e Contatos
// O colaborador confere os dados do quadro e confirma os próprios contatos (a cada 180 dias).
// Gestão (admin, gerência, RH, ferramenta "dados_contatos") e liderança (própria equipe) consultam e exportam.
(() => {
  const $ = (id) => document.getElementById(id);
  let meus = null, equipe = [], abaAtual = "meus";

  document.head.insertAdjacentHTML("beforeend", `<style>
    .dad-bloco{border:1px solid var(--borda);border-radius:var(--raio);padding:4px 16px 16px;margin-top:14px;background:#fff}
    .dad-bloco h2{margin-top:14px}
    .dad-ler{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px 16px;font-size:14px}
    .dad-ler small{display:block;color:var(--texto-2);font-size:12px}
    .dad-g3{display:grid;grid-template-columns:2fr 1fr 1fr;gap:0 14px}
    .dad-g2{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}
    #v-dad textarea{width:100%;min-height:70px;padding:12px 14px;font-size:15px;border:1px solid var(--borda);border-radius:var(--raio);font-family:inherit}
    .dad-alerta{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;background:var(--alerta-fundo);color:var(--alerta);border-radius:var(--raio);padding:12px 14px;margin:0 0 14px;font-size:14px}
    .dad-alerta button{width:auto;margin:0;padding:9px 14px;font-size:14px}
    .dad-tab td small{color:var(--texto-2)}
    @media (max-width:640px){.dad-g3,.dad-g2{grid-template-columns:1fr}}
  </style>`);

  $("cartao").querySelector(".rodape").insertAdjacentHTML("beforebegin", `
  <section id="v-dad" class="oculto">
    <div class="topo"><div><h1>Dados e Contatos</h1><div class="ajuda" style="margin:0" id="dad-status"></div></div><button class="sec" id="dad-voltar">← Início</button></div>
    <div class="abas oculto" id="dad-abas">
      <button data-dab="meus" class="on">Meus dados</button>
      <button data-dab="equipe">Contatos da equipe</button>
    </div>
    <div id="dad-meus"></div>
    <div id="dad-equipe" class="oculto"></div>
    <div class="aviso" id="a-dad"></div>
  </section>`);
  $("dad-voltar").addEventListener("click", () => mostrar("v-inicio"));
  $("v-dad").querySelectorAll("[data-dab]").forEach(b => b.addEventListener("click", () => trocar(b.dataset.dab)));

  const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
  const fmtTel = (t) => { const n = so_numeros(t); return n.length === 11 ? n.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3") : n.length === 10 ? n.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3") : (t || ""); };
  const fmtCEP = (c) => { const n = so_numeros(c); return n.length === 8 ? n.replace(/(\d{5})(\d{3})/, "$1-$2") : (c || ""); };
  const quando = (d) => d ? new Date(d).toLocaleDateString("pt-BR") : "";
  function mascaraTel(el){ el.addEventListener("input", () => { const n = so_numeros(el.value).slice(0, 11);
    el.value = n.length > 10 ? n.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3") : n.replace(/(\d{2})(\d{0,4})(\d{0,4})/, (m, a, b, c) => `(${a}) ${b}${c ? "-" + c : ""}`).replace(/^\(\) $/, ""); }); }

  function trocar(aba){
    abaAtual = aba;
    $("v-dad").querySelectorAll("[data-dab]").forEach(b => b.classList.toggle("on", b.dataset.dab === aba));
    $("dad-meus").classList.toggle("oculto", aba !== "meus");
    $("dad-equipe").classList.toggle("oculto", aba !== "equipe");
    aviso("a-dad", "");
  }

  async function carregarMeus(){ meus = await api("/rest/v1/rpc/dados_meus", { method: "POST", body: "{}" }); return meus; }

  async function abrir(){
    mostrar("v-dad"); trocar("meus");
    $("dad-meus").innerHTML = `<div class="resumo">Carregando…</div>`;
    try {
      const [m, eq] = await Promise.all([carregarMeus(), api("/rest/v1/rpc/dados_painel", { method: "POST", body: "{}" }).catch(() => [])]);
      equipe = (eq || []).filter(x => x.id !== eu.id);
      $("dad-abas").classList.toggle("oculto", !equipe.length && !(pode("admin","rh","gerencia") || temModulo("dados_contatos")));
      desenharMeus(); desenharEquipe();
    } catch (e) { if (e.message !== "sessao") aviso("a-dad", traduzErro(e)); $("dad-meus").innerHTML = ""; }
  }

  function desenharMeus(){
    const m = meus || {}, k = m.contato || {};
    $("dad-status").textContent = m.pendente
      ? (k.confirmado_em ? `Última confirmação em ${quando(k.confirmado_em)}. Confira e confirme de novo.` : "Você ainda não confirmou seus dados.")
      : `Confirmados em ${quando(k.confirmado_em)}. Próxima confirmação em até 6 meses.`;
    const ler = (rot, val) => `<div><small>${rot}</small>${esc(val) || "—"}</div>`;
    $("dad-meus").innerHTML = `
      ${m.pendente ? `<div class="aviso alerta" style="margin-top:0">Confira os dados abaixo, complete o que faltar e clique em <b>Confirmar meus dados</b>. Você recebe um lembrete enquanto não confirmar.</div>` : ""}
      <div class="dad-bloco">
        <h2>Dados do quadro do projeto</h2>
        <div class="ajuda" style="margin:-4px 0 12px">Estes dados vêm do cadastro do RH e não podem ser alterados aqui. Se algo estiver errado, descreva no campo de correção mais abaixo.</div>
        <div class="dad-ler">
          ${ler("Nome", m.nome)}${ler("CPF", fmtCPF(m.cpf))}${ler("E-mail de acesso", m.email)}${ler("Data de nascimento", fmtData(m.data_nascimento))}
          ${ler("Data de admissão", fmtData(m.data_admissao))}${ler("Vaga", m.vaga)}${ler("Cargo", m.cargo)}${ler("NTE", m.nte)}${ler("Liderança imediata", m.lider)}
        </div>
      </div>
      <div class="dad-bloco">
        <h2>Minha foto no Carômetro</h2>
        <div class="ajuda" style="margin:-4px 0 10px">A foto aparece no Carômetro do projeto. Use uma foto recente, nítida, com boa luz e perfil profissional.</div>
        <button type="button" class="sec" id="d-foto" style="width:auto;margin:0">Enviar ou trocar minha foto</button>
      </div>
      <form id="f-dad" novalidate>
        <div class="dad-bloco">
          <h2>Meus contatos</h2>
          <div class="dad-g2">
            <div><label for="d-cel">Celular (com DDD) *</label><input id="d-cel" type="text" inputmode="tel" value="${esc(fmtTel(k.celular))}" placeholder="(71) 99999-9999"></div>
            <div><label for="d-rec">Outro telefone ou recado</label><input id="d-rec" type="text" inputmode="tel" value="${esc(fmtTel(k.telefone_recado))}"></div>
          </div>
          <label class="check" style="margin-top:10px"><input type="checkbox" id="d-zap" ${k.whatsapp === false ? "" : "checked"}><span>Este celular tem WhatsApp</span></label>
          <label for="d-mail">E-mail pessoal</label><input id="d-mail" type="email" value="${esc(k.email_pessoal || "")}" placeholder="opcional">
        </div>
        <div class="dad-bloco">
          <h2>Endereço</h2>
          <div class="dad-g3">
            <div><label for="d-cep">CEP</label><input id="d-cep" type="text" inputmode="numeric" maxlength="9" value="${esc(fmtCEP(k.cep))}"><div class="ajuda" id="d-cep-aj">Digite o CEP para preencher o endereço.</div></div>
            <div><label for="d-mun">Município *</label><input id="d-mun" type="text" value="${esc(k.municipio || "")}"></div>
            <div><label for="d-uf">UF *</label><select id="d-uf"><option value=""></option>${UFS.map(u => `<option${(k.uf || "") === u ? " selected" : ""}>${u}</option>`).join("")}</select></div>
          </div>
          <div class="dad-g3">
            <div><label for="d-log">Logradouro</label><input id="d-log" type="text" value="${esc(k.logradouro || "")}"></div>
            <div><label for="d-num">Número</label><input id="d-num" type="text" value="${esc(k.numero || "")}"></div>
            <div><label for="d-comp">Complemento</label><input id="d-comp" type="text" value="${esc(k.complemento || "")}"></div>
          </div>
          <label for="d-bai">Bairro</label><input id="d-bai" type="text" value="${esc(k.bairro || "")}">
        </div>
        <div class="dad-bloco">
          <h2>Contato de emergência</h2>
          <div class="ajuda" style="margin:-4px 0 4px">Pessoa que a equipe pode chamar se acontecer algo com você durante o trabalho.</div>
          <div class="dad-g3">
            <div><label for="d-enome">Nome *</label><input id="d-enome" type="text" value="${esc(k.emerg_nome || "")}"></div>
            <div><label for="d-epar">Parentesco ou relação *</label><input id="d-epar" type="text" list="d-pars" value="${esc(k.emerg_parentesco || "")}">
              <datalist id="d-pars">${["Mãe","Pai","Cônjuge","Companheiro(a)","Filho(a)","Irmão(ã)","Amigo(a)","Outro"].map(p => `<option value="${p}">`).join("")}</datalist></div>
            <div><label for="d-etel">Telefone *</label><input id="d-etel" type="text" inputmode="tel" value="${esc(fmtTel(k.emerg_telefone))}"></div>
          </div>
        </div>
        <div class="dad-bloco">
          <h2>Algo errado nos dados do quadro?</h2>
          <textarea id="d-corr" maxlength="1000" placeholder="Opcional. Ex.: meu nome está sem o segundo sobrenome; minha data de nascimento é 12/03/1990."></textarea>
          <div class="ajuda">O pedido vai para a equipe responsável, que corrige o cadastro.</div>
        </div>
        <label class="check"><input type="checkbox" id="d-lgpd"><span>Autorizo o uso dos meus contatos, endereço e contato de emergência exclusivamente para comunicação de trabalho e para situações de emergência no Projeto GA BA, por quem tem permissão no SGT, conforme a LGPD. Posso atualizar ou corrigir esses dados a qualquer momento. Declaro que o contato de emergência concordou em ter o número informado.</span></label>
        <button type="submit">Confirmar meus dados</button>
      </form>`;
    ["d-cel","d-rec","d-etel"].forEach(id => mascaraTel($(id)));
    $("d-cep").addEventListener("input", async (e) => {
      const n = so_numeros(e.target.value).slice(0, 8); e.target.value = n.length > 5 ? n.slice(0, 5) + "-" + n.slice(5) : n;
      if (n.length !== 8) return;
      $("d-cep-aj").textContent = "Buscando endereço…";
      try {
        const r = await fetch(`https://viacep.com.br/ws/${n}/json/`); const d = await r.json();
        if (d.erro) { $("d-cep-aj").textContent = "CEP não encontrado. Preencha o endereço à mão."; return; }
        $("d-log").value = d.logradouro || $("d-log").value; $("d-bai").value = d.bairro || $("d-bai").value;
        $("d-mun").value = d.localidade || $("d-mun").value; if (d.uf) $("d-uf").value = d.uf;
        $("d-cep-aj").textContent = "Endereço preenchido. Confira e informe o número."; $("d-num").focus();
      } catch { $("d-cep-aj").textContent = "Não consegui buscar o CEP agora. Preencha à mão."; }
    });
    $("f-dad").addEventListener("submit", salvar);
    $("d-foto").addEventListener("click", () => window.Carometro && Carometro.minhaFoto());
  }

  async function salvar(e){
    e.preventDefault();
    const v = (id) => $(id).value.trim();
    const cel = so_numeros(v("d-cel")), etel = so_numeros(v("d-etel"));
    if (cel.length < 10) return aviso("a-dad", "Informe o celular com DDD.");
    if (!v("d-mun") || !v("d-uf")) return aviso("a-dad", "Informe o município e a UF.");
    if (!v("d-enome") || !v("d-epar") || etel.length < 10) return aviso("a-dad", "Preencha nome, parentesco e telefone (com DDD) do contato de emergência.");
    if (etel === cel) return aviso("a-dad", "O contato de emergência precisa ser outro número, de outra pessoa.");
    if (v("d-mail") && !emailValido(v("d-mail"))) return aviso("a-dad", "Confira o e-mail pessoal.");
    if (!$("d-lgpd").checked) return aviso("a-dad", "Para salvar, marque a caixa de autorização de uso dos dados (LGPD).");
    const p = { celular: cel, whatsapp: $("d-zap").checked, telefone_recado: so_numeros(v("d-rec")), email_pessoal: v("d-mail"),
      cep: so_numeros(v("d-cep")), logradouro: v("d-log"), numero: v("d-num"), complemento: v("d-comp"), bairro: v("d-bai"),
      municipio: v("d-mun"), uf: v("d-uf"), emerg_nome: v("d-enome"), emerg_parentesco: v("d-epar"), emerg_telefone: etel };
    const f = $("f-dad"); ocupado(f, true);
    try {
      await api("/rest/v1/rpc/dados_salvar", { method: "POST", body: JSON.stringify({ p, p_aceite: true, p_correcao: v("d-corr") || null }) });
      const pediu = !!v("d-corr");
      await carregarMeus(); desenharMeus();
      aviso("a-dad", "Dados confirmados. Obrigado!" + (pediu ? "\nSeu pedido de correção foi enviado à equipe responsável." : ""), "ok");
      const b = $("dad-banner"); if (b) b.remove();
      window.scrollTo(0, 0);
    } catch (er) { if (er.message !== "sessao") aviso("a-dad", traduzErro(er)); ocupado(f, false); }
  }

  // ---------------- Contatos da equipe (gestão e liderança)
  function desenharEquipe(){
    const pend = equipe.filter(x => x.pendente).length;
    $("dad-equipe").innerHTML = `
      <div class="filtros" style="grid-template-columns:1fr 200px 160px">
        <input id="dq-busca" type="search" placeholder="Buscar por nome, vaga, município ou telefone">
        <select id="dq-sit"><option value="">Todos</option><option value="pend">Só pendentes</option><option value="ok">Só confirmados</option></select>
        <button class="sec" id="dq-csv" style="margin:0">Baixar planilha</button>
      </div>
      <div class="resumo" id="dq-resumo"></div>
      <div class="rolar" style="max-height:none"><table class="prev dad-tab"><thead><tr><th>Nome</th><th>Vaga · NTE</th><th>Contatos</th><th>Município</th><th>Emergência</th><th>Situação</th></tr></thead><tbody id="dq-lista"></tbody></table></div>`;
    const filtrar = () => {
      const q = semAcento($("dq-busca").value.trim()), qn = so_numeros($("dq-busca").value), s = $("dq-sit").value;
      const l = equipe.filter(x => (!s || (s === "pend") === !!x.pendente)
        && (!q || semAcento([x.nome, x.vaga, x.nte, x.municipio, x.email].join(" ")).includes(q) || (qn.length >= 4 && (x.celular || "").includes(qn))));
      $("dq-resumo").textContent = `${equipe.length} pessoas · ${pend} com dados pendentes · mostrando ${l.length}`;
      $("dq-lista").innerHTML = l.map(x => `<tr>
        <td><b>${esc(x.nome)}</b><br><small>${esc(x.email)}</small></td>
        <td>${esc(x.vaga || "—")}<br><small>${esc(x.nte || "")}</small></td>
        <td>${x.celular ? esc(fmtTel(x.celular)) + (x.whatsapp ? " <small>WhatsApp</small>" : "") : "—"}${x.telefone_recado ? `<br><small>${esc(fmtTel(x.telefone_recado))}</small>` : ""}${x.email_pessoal ? `<br><small>${esc(x.email_pessoal)}</small>` : ""}</td>
        <td>${esc([x.municipio, x.uf].filter(Boolean).join("/") || "—")}</td>
        <td>${x.emerg_nome ? `${esc(x.emerg_nome)} <small>(${esc(x.emerg_parentesco)})</small><br>${esc(fmtTel(x.emerg_telefone))}` : "—"}</td>
        <td>${x.pendente ? `<span class="tag lar">${x.confirmado_em ? "Vencido" : "Pendente"}</span>` : `<span class="tag verde">Confirmado</span><br><small>${quando(x.confirmado_em)}</small>`}</td></tr>`).join("")
        || `<tr><td colspan="6" class="resumo">Ninguém encontrado.</td></tr>`;
    };
    $("dq-busca").addEventListener("input", filtrar); $("dq-sit").addEventListener("change", filtrar);
    $("dq-csv").addEventListener("click", baixarCSV);
    filtrar();
  }

  function baixarCSV(){
    const cols = [["nome","Nome"],["email","E-mail de acesso"],["vaga","Vaga"],["nte","NTE"],["lider","Liderança"],["celular","Celular"],["whatsapp","WhatsApp"],
      ["telefone_recado","Outro telefone"],["email_pessoal","E-mail pessoal"],["cep","CEP"],["logradouro","Logradouro"],["numero","Número"],["complemento","Complemento"],
      ["bairro","Bairro"],["municipio","Município"],["uf","UF"],["emerg_nome","Emergência: nome"],["emerg_parentesco","Emergência: parentesco"],
      ["emerg_telefone","Emergência: telefone"],["confirmado_em","Confirmado em"],["pendente","Situação"]];
    const val = (x, c) => c === "whatsapp" ? (x.whatsapp == null ? "" : x.whatsapp ? "Sim" : "Não")
      : c === "pendente" ? (x.pendente ? "Pendente" : "Confirmado") : c === "confirmado_em" ? quando(x.confirmado_em)
      : /celular|telefone/.test(c) ? fmtTel(x[c]) : c === "cep" ? fmtCEP(x.cep) : (x[c] ?? "");
    const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
    const linhas = [cols.map(c => q(c[1])).join(";"), ...equipe.map(x => cols.map(c => q(val(x, c[0]))).join(";"))];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + linhas.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    a.download = `contatos-equipe-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    aviso("a-dad", "Planilha baixada. Ela contém dados pessoais: guarde em local seguro e não encaminhe a quem não precisa.", "alerta");
  }

  // ---------------- Aviso na tela inicial quando houver pendência
  async function checar(){
    try {
      const m = await carregarMeus();
      const ant = $("dad-banner"); if (ant) ant.remove();
      if (m && m.pendente) $("ferramentas").insertAdjacentHTML("beforebegin",
        `<div class="dad-alerta" id="dad-banner"><span><b>Confirme seus dados e contatos.</b> ${m.contato ? "Já se passaram 6 meses desde a última confirmação." : "Leva 2 minutos e ajuda a equipe a falar com você."}</span><button id="dad-banner-ir">Confirmar agora</button></div>`);
      const b = $("dad-banner-ir"); if (b) b.addEventListener("click", abrir);
    } catch {}
  }

  window.Dados = { abrir, checar };
})();
