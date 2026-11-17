// SGT · Formulário de Relatório · CAT — montagem do relatório em Word (.docx), no próprio navegador.
// Segue o modelo enxuto aprovado: identificação, ocorrência, relato, atendimento, bem-estar,
// atuação da liderança, encaminhamentos, validação do relato e anexo fotográfico.
// Uso: CatRelatorio.gerar(docx, reg, { logo: Uint8Array, imagens: [{ dados, largura, altura, legenda }] }) -> Promise<Blob|Buffer>
(function (raiz) {
  const COR = { NAVY: "1B3B64", PINK: "E61080", GREEN: "92BB21", ORANGE: "FB7C00", TINT: "EAF0F7", GRAY: "595959", TEXT: "262626", BORDA: "C9D3E0" };
  const FONTE = "Arial";
  const NI = "Não informado";
  const SEM = "Sem registro";
  const DIAS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const FERIADOS = ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"];

  const val = (o, p) => p.split(".").reduce((a, k) => (a === undefined || a === null) ? undefined : a[k], o);
  const txt = (o, p) => { const x = val(o, p); return (x === undefined || x === null) ? "" : String(x).trim(); };
  const br = (iso) => { if (!iso) return ""; const p = String(iso).slice(0, 10).split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso; };
  const juntar = (partes, sep) => partes.filter(Boolean).join(sep);
  const hora = (h) => h ? h.replace(/^(\d{2}):(\d{2}).*$/, (m, a, b) => b === "00" ? `${+a}h` : `${+a}h${b}`) : "";
  function prazoCat(iso) {
    if (!iso) return null; const p = iso.split("-"); const d = new Date(+p[0], +p[1] - 1, +p[2]);
    let md; do { d.setDate(d.getDate() + 1); md = ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
    while (d.getDay() === 0 || d.getDay() === 6 || FERIADOS.indexOf(md) > -1);
    return d;
  }

  function gerar(D, reg, extra) {
    extra = extra || {};
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType,
      ShadingType, ImageRun, Header, Footer, PageNumber, ExternalHyperlink, VerticalAlign, TableLayoutType } = D;

    const trat = txt(reg, "identificacao.tratamento") || "Colaborador(a)";
    const art = trat === "Colaboradora" ? "a" : trat === "Colaborador" ? "o" : "o(a)";
    const nomeTrat = trat.toLowerCase();
    const aoA = art === "a" ? "à" : art === "o" ? "ao" : "ao(à)";

    const run = (t, o) => new TextRun({ text: t, font: FONTE, size: 20, color: COR.TEXT, ...(o || {}) });
    const par = (filhos, o) => new Paragraph({ children: Array.isArray(filhos) ? filhos : [filhos], spacing: { after: 100, line: 276 }, ...(o || {}) });
    const semBorda = { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } };
    const borda = { style: BorderStyle.SINGLE, size: 6, color: COR.BORDA };
    const comBorda = { top: borda, bottom: borda, left: borda, right: borda, insideHorizontal: borda, insideVertical: borda };
    const LARG = 9638; // largura útil (A4, margens de 2 cm) em twips

    function paragrafos(texto, o) {
      return String(texto).split(/\n\s*\n/).map(b => b.trim()).filter(Boolean).map(b =>
        new Paragraph({ children: b.split("\n").flatMap((l, i) => i ? [new TextRun({ break: 1 }), run(l)] : [run(l)]),
          spacing: { after: 120, line: 288 }, alignment: AlignmentType.JUSTIFIED, ...(o || {}) }));
    }
    function secao(n, titulo) {
      return new Paragraph({ spacing: { before: 320, after: 120 }, keepNext: true,
        children: [run(n + (typeof n === "number" ? ". " : " · "), { bold: true, size: 26, color: COR.PINK }), run(titulo, { bold: true, size: 26, color: COR.NAVY })] });
    }
    function sub(titulo) {
      return new Paragraph({ spacing: { before: 160, after: 80 }, keepNext: true, children: [run(titulo, { bold: true, size: 21, color: COR.PINK })] });
    }
    function kv(linhas) {
      linhas = linhas.filter(l => l && l[1] !== null && l[1] !== undefined);
      return new Table({ width: { size: LARG, type: WidthType.DXA }, columnWidths: [2700, LARG - 2700], borders: comBorda, layout: TableLayoutType.FIXED,
        rows: linhas.map(([k, v]) => new TableRow({ cantSplit: true, children: [
          new TableCell({ width: { size: 2700, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: COR.TINT, color: "auto" }, verticalAlign: VerticalAlign.CENTER,
            margins: { top: 70, bottom: 70, left: 110, right: 110 }, children: [new Paragraph({ children: [run(k, { bold: true, size: 18, color: COR.NAVY })] })] }),
          new TableCell({ width: { size: LARG - 2700, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 70, bottom: 70, left: 110, right: 110 },
            children: String(v === "" ? NI : v).split("\n").map(l => new Paragraph({ children: [run(l, { size: 19 })] })) })] })) });
    }
    const vazio = () => new Paragraph({ children: [], spacing: { after: 60 } });
    function citacao(t, contexto) {
      return new Table({ width: { size: LARG, type: WidthType.DXA }, columnWidths: [90, LARG - 90], borders: semBorda, layout: TableLayoutType.FIXED,
        rows: [new TableRow({ cantSplit: true, children: [
          new TableCell({ width: { size: 90, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: COR.GREEN, color: "auto" }, children: [new Paragraph("")] }),
          new TableCell({ width: { size: LARG - 90, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: "F6F9EC", color: "auto" }, margins: { top: 80, bottom: 80, left: 160, right: 120 },
            children: [new Paragraph({ children: [run("“" + t + "”", { italics: true, color: "333333" })] }),
              ...(contexto ? [new Paragraph({ children: [run(contexto, { size: 17, color: COR.GRAY })] })] : [])] })] })] });
    }
    const nota = (t) => new Paragraph({ spacing: { before: 60, after: 120 }, children: [run(t, { italics: true, size: 17, color: COR.GRAY })] });

    // ---------------- cabeçalho e rodapé
    const header = new Header({ children: [new Table({ width: { size: LARG, type: WidthType.DXA }, columnWidths: [4000, LARG - 4000], borders: semBorda, layout: TableLayoutType.FIXED,
      rows: [new TableRow({ children: [
        new TableCell({ width: { size: 4000, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ children: extra.logo
          ? [new ImageRun({ type: "png", data: extra.logo, transformation: { width: 128, height: 38 } })] : [run("Gestão da Aprendizagem Bahia", { bold: true, color: COR.NAVY })] })] }),
        new TableCell({ width: { size: LARG - 4000, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, children: [
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [run("Relatório de Escuta · Subsídio à CAT", { bold: true, size: 16, color: COR.NAVY })] }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [run(reg.id || "", { size: 16, color: COR.GRAY })] })] })] })] })] });
    const footer = new Footer({ children: [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [run("DOCUMENTO INTERNO · CONTÉM DADOS PESSOAIS SENSÍVEIS (LGPD) · ACESSO RESTRITO", { bold: true, size: 14, color: COR.PINK })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [run("Projeto Gestão da Aprendizagem na Bahia · Apoio à Gestão · Página ", { size: 14, color: COR.GRAY }),
        new TextRun({ children: [PageNumber.CURRENT], font: FONTE, size: 14, color: COR.GRAY })] })] });

    const C = [];
    // ---------------- capa
    C.push(new Table({ width: { size: LARG, type: WidthType.DXA }, columnWidths: [LARG], borders: semBorda, layout: TableLayoutType.FIXED, rows: [
      new TableRow({ children: [new TableCell({ width: { size: LARG, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: COR.NAVY, color: "auto" },
        margins: { top: 260, bottom: 260, left: 320, right: 320 }, children: [
          new Paragraph({ children: [run("RELATÓRIO DE ESCUTA", { bold: true, size: 20, color: COR.GREEN })] }),
          new Paragraph({ children: [run("Subsídio à Comunicação de Acidente de Trabalho (CAT)", { bold: true, size: 32, color: "FFFFFF" })] })] })] })] }));
    C.push(new Table({ width: { size: LARG, type: WidthType.DXA }, columnWidths: [3213, 3213, 3212], borders: semBorda, layout: TableLayoutType.FIXED,
      rows: [new TableRow({ height: { value: 90, rule: "exact" }, children: [COR.PINK, COR.GREEN, COR.ORANGE].map(c => new TableCell({ width: { size: 3213, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: c, color: "auto" }, children: [new Paragraph({ children: [run("", { size: 2 })] })] })) })] }));
    C.push(vazio());

    const escuta = juntar([br(txt(reg, "identificacao.dataEscuta")),
      txt(reg, "identificacao.horaInicio") && txt(reg, "identificacao.horaFim") ? `das ${hora(txt(reg, "identificacao.horaInicio"))} às ${hora(txt(reg, "identificacao.horaFim"))}`
        : hora(txt(reg, "identificacao.horaInicio")) ? `às ${hora(txt(reg, "identificacao.horaInicio"))}` : "",
      txt(reg, "identificacao.meio") ? "por " + txt(reg, "identificacao.meio").toLowerCase() : ""], ", ");
    C.push(kv([
      [trat, txt(reg, "identificacao.colaborador") || NI],
      ["Função / lotação", juntar([txt(reg, "identificacao.cargo"), txt(reg, "identificacao.lotacao")], " – ") || NI],
      ["Liderança imediata", txt(reg, "identificacao.lideranca") || NI],
      ["Escuta", escuta || NI],
      ["Responsável pela escuta e relatório", juntar([txt(reg, "identificacao.responsavel"), txt(reg, "identificacao.responsavelFuncao")], ", ") || NI],
      txt(reg, "atendimento.atestado") ? ["Atestado recebido", txt(reg, "atendimento.atestado")] : null
    ]));

    let n = 0;
    // ---------------- 1. Ocorrência
    C.push(secao(++n, "Dados da ocorrência"));
    const dOc = txt(reg, "ocorrencia.data");
    let quando = "";
    if (dOc) { const p = dOc.split("-"); const d = new Date(+p[0], +p[1] - 1, +p[2]); quando = `${DIAS[d.getDay()]}, ${br(dOc)}`; }
    if (txt(reg, "ocorrencia.hora")) quando += (quando ? ", " : "") + "por volta de " + txt(reg, "ocorrencia.hora");
    const circ = (val(reg, "ocorrencia.circunstancias") || []).slice();
    if (txt(reg, "ocorrencia.outraCircunstancia")) circ.push(txt(reg, "ocorrencia.outraCircunstancia"));
    const lesao = juntar([txt(reg, "ocorrencia.natureza"), juntar([txt(reg, "ocorrencia.parteCorpo"), txt(reg, "ocorrencia.lateralidade")], ", ")], " – ");
    const bo = txt(reg, "ocorrencia.bo");
    C.push(kv([
      ["Data e horário", quando || NI],
      ["Local", juntar([txt(reg, "ocorrencia.local"), txt(reg, "ocorrencia.municipio")], " – ") || NI],
      ["Tipo (eSocial – sugerido)", txt(reg, "ocorrencia.tipo") || NI],
      ["Circunstância", circ.length ? circ.join("; ") : NI],
      txt(reg, "ocorrencia.inicioSintomas") ? ["Início dos sintomas", br(txt(reg, "ocorrencia.inicioSintomas"))] : null,
      txt(reg, "ocorrencia.horasTrabalhadas") ? ["Horas trabalhadas antes", txt(reg, "ocorrencia.horasTrabalhadas")] : null,
      txt(reg, "ocorrencia.percursoHabitual") ? ["Percurso habitual", txt(reg, "ocorrencia.percursoHabitual")] : null,
      ["Agente causador", txt(reg, "ocorrencia.agente") || NI],
      ["Lesões relatadas", lesao || NI],
      ["Testemunhas", txt(reg, "ocorrencia.testemunhas") || SEM],
      ["Boletim de ocorrência", bo === "Sim" ? juntar(["Sim", txt(reg, "ocorrencia.boNumero") ? "nº " + txt(reg, "ocorrencia.boNumero") : ""], ", ") : bo === "Não se aplica" ? "Não se aplica" : SEM],
      ["Prazo legal da CAT", prazoCat(dOc) ? prazoCat(dOc).toLocaleDateString("pt-BR") + " (1º dia útil após a ocorrência)" : NI]
    ]));

    // ---------------- 2. Relato
    C.push(secao(++n, `Relato d${art} ${nomeTrat}`));
    C.push(...paragrafos(txt(reg, "relato.livre") || "Relato não registrado."));
    const trechos = (val(reg, "relato.trechos") || []).filter(t => t && t.texto);
    if (trechos.length) { C.push(sub("Trechos da fala")); trechos.forEach(t => { C.push(citacao(t.texto, t.contexto)); C.push(vazio()); }); }
    const comp = val(reg, "complementares") || {}, perg = extra.perguntas || {};
    const qs = Object.keys(perg).filter(k => comp[k] && String(comp[k]).trim());
    if (qs.length) {
      C.push(sub("Informações complementares"));
      qs.forEach(k => { C.push(new Paragraph({ spacing: { before: 80, after: 40 }, keepNext: true, children: [run(perg[k], { bold: true, size: 19, color: COR.NAVY })] })); C.push(...paragrafos(comp[k])); });
    }

    // ---------------- 3. Atendimento
    C.push(secao(++n, "Atendimento e afastamento"));
    const dias = txt(reg, "atendimento.diasAfastamento");
    C.push(kv([
      ["Unidade de saúde", txt(reg, "atendimento.unidade") || NI],
      txt(reg, "atendimento.data") ? ["Data do atendimento", juntar([br(txt(reg, "atendimento.data")), txt(reg, "atendimento.hora")], " às ")] : null,
      txt(reg, "atendimento.conduta") ? ["Conduta", txt(reg, "atendimento.conduta")] : null,
      ["Profissional", juntar([txt(reg, "atendimento.medico"), txt(reg, "atendimento.crm")], " – ") || NI],
      txt(reg, "atendimento.internacao") === "Sim" ? ["Internação", "Sim"] : null,
      ["Afastamento", juntar([dias ? `${dias} dia${dias === "1" ? "" : "s"}` : "", txt(reg, "atendimento.cid") ? "CID " + txt(reg, "atendimento.cid") : ""], " · ") || NI],
      ["Retorno previsto", br(txt(reg, "atendimento.retorno")) || NI]
    ]));

    // ---------------- 4. Bem-estar
    C.push(secao(++n, "Situação atual e bem-estar"));
    C.push(...paragrafos(txt(reg, "bemEstar.comoEsta") || NI));
    if (txt(reg, "bemEstar.apoioSolicitado") || txt(reg, "bemEstar.encaminhamentos")) {
      C.push(kv([
        txt(reg, "bemEstar.apoioSolicitado") ? ["Apoio solicitado", txt(reg, "bemEstar.apoioSolicitado")] : null,
        txt(reg, "bemEstar.encaminhamentos") ? ["Encaminhamentos de cuidado", txt(reg, "bemEstar.encaminhamentos")] : null]));
    }

    // ---------------- 5. Liderança
    C.push(secao(++n, "Atuação da empresa e da liderança"));
    if (txt(reg, "lideranca.sintese")) C.push(...paragrafos(txt(reg, "lideranca.sintese")));
    else {
      const apoios = (val(reg, "lideranca.apoios") || []).slice();
      if (txt(reg, "lideranca.outroApoio")) apoios.push(txt(reg, "lideranca.outroApoio"));
      C.push(kv([
        ["Primeira pessoa comunicada", txt(reg, "lideranca.primeiroComunicado") || NI],
        ["Como e quando soube", txt(reg, "lideranca.comoSoube") || NI],
        ["Tempo até o 1º contato da liderança", txt(reg, "lideranca.tempoContato") || NI],
        ["Apoio recebido", apoios.length ? apoios.join("; ") : NI],
        [`${trat === "Colaborador(a)" ? "A pessoa" : trat} se sentiu apoiad${art === "o(a)" ? "o(a)" : art}?`, txt(reg, "lideranca.sentiuApoiado") || NI]]));
      if (txt(reg, "lideranca.funcionou")) { C.push(sub("O que funcionou bem")); C.push(...paragrafos(txt(reg, "lideranca.funcionou"))); }
      if (txt(reg, "lideranca.diferente")) { C.push(sub("O que poderia ter sido diferente")); C.push(...paragrafos(txt(reg, "lideranca.diferente"))); }
    }

    // ---------------- 6. Encaminhamentos
    C.push(secao(++n, "Encaminhamentos"));
    C.push(...paragrafos(txt(reg, "controle.encaminhamentoTexto") || NI));
    const ctrl = [
      txt(reg, "controle.catEnviada") ? ["CAT enviada em", br(txt(reg, "controle.catEnviada"))] : null,
      txt(reg, "controle.recibo") ? ["Nº do recibo (eSocial S-2210)", txt(reg, "controle.recibo")] : null,
      txt(reg, "controle.copiaEntregue") ? ["Cópia da CAT entregue em", br(txt(reg, "controle.copiaEntregue"))] : null].filter(Boolean);
    if (ctrl.length) C.push(kv(ctrl));

    // ---------------- 7. Validação
    C.push(secao(++n, "Validação do relato"));
    const conf = txt(reg, "controle.resumoConfirmado");
    C.push(...paragrafos(conf === "Sim"
      ? `O conteúdo deste relatório foi apresentado ${aoA} ${nomeTrat}, que conferiu os fatos registrados e confirmou que correspondem fielmente ao relato prestado durante a escuta.`
      : conf === "Com ajustes solicitados"
        ? `O conteúdo deste relatório foi apresentado ${aoA} ${nomeTrat}, que solicitou ajustes. Os ajustes foram incorporados nesta versão.`
        : `O conteúdo deste relatório será apresentado ${aoA} ${nomeTrat} para conferência dos fatos registrados.`));
    if (txt(reg, "controle.observacoes")) { C.push(sub("Observações")); C.push(...paragrafos(txt(reg, "controle.observacoes"))); }

    // ---------------- Anexo
    const imgs = (extra.imagens || []).filter(i => i && i.dados);
    const vids = (val(reg, "evidencias.videos") || []).filter(x => x && x.url);
    const docs = (val(reg, "evidencias.documentos") || []).filter(x => x && x.url);
    if (imgs.length) {
      C.push(new Paragraph({ pageBreakBefore: true, spacing: { after: 120 }, children: [run("Anexo · ", { bold: true, size: 26, color: COR.PINK }), run("Registro fotográfico", { bold: true, size: 26, color: COR.NAVY })] }));
      C.push(nota(`Imagens cedidas voluntariamente pel${art === "o(a)" ? "o(a)" : art} ${nomeTrat}${txt(reg, "identificacao.dataEscuta") ? " em " + br(txt(reg, "identificacao.dataEscuta")) : ""}, para fins exclusivos de registro da ocorrência.`));
      const col = 3, w = Math.floor(LARG / col), linhas = [];
      for (let i = 0; i < imgs.length; i += col) linhas.push(imgs.slice(i, i + col));
      C.push(new Table({ width: { size: LARG, type: WidthType.DXA }, columnWidths: Array(col).fill(w), borders: semBorda, layout: TableLayoutType.FIXED,
        rows: linhas.map((l, li) => new TableRow({ cantSplit: true, children: Array.from({ length: col }, (_, ci) => {
          const im = l[ci];
          if (!im) return new TableCell({ width: { size: w, type: WidthType.DXA }, children: [new Paragraph("")] });
          const maxW = 190, maxH = 210, k = Math.min(maxW / im.largura, maxH / im.altura, 1);
          return new TableCell({ width: { size: w, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 60, right: 60 }, verticalAlign: VerticalAlign.BOTTOM, children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: "jpg", data: im.dados, transformation: { width: Math.round(im.largura * k), height: Math.round(im.altura * k) } })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [run(`Imagem ${li * col + ci + 1}${im.legenda ? " – " + im.legenda : ""}`, { italics: true, size: 16, color: COR.GRAY })] })] });
        }) })) }));
    }
    if (vids.length || docs.length) {
      C.push(new Paragraph({ pageBreakBefore: !imgs.length, spacing: { before: 240, after: 120 }, children: [run("Anexo · ", { bold: true, size: 26, color: COR.PINK }), run("Vídeos e documentos", { bold: true, size: 26, color: COR.NAVY })] }));
      [...vids.map(x => ["Vídeo", x]), ...docs.map(x => ["Documento", x])].forEach(([t, x]) => C.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [
        run((x.descricao || t) + ": "), new ExternalHyperlink({ link: x.url, children: [run(x.url, { color: "1155CC", underline: {} })] })] })));
    }

    const doc = new Document({
      creator: "SGT · Projeto GA BA", title: `Relatório de escuta – CAT – ${txt(reg, "identificacao.colaborador")}`, description: "Subsídio à Comunicação de Acidente de Trabalho",
      styles: { default: { document: { run: { font: FONTE, size: 20, color: COR.TEXT } } } },
      sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1300, bottom: 1200, left: 1134, right: 1134, header: 500, footer: 500 } } },
        headers: { default: header }, footers: { default: footer }, children: C }]
    });
    return extra.paraBuffer ? Packer.toBuffer(doc) : Packer.toBlob(doc);
  }

  const api = { gerar, prazoCat };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else raiz.CatRelatorio = api;
})(typeof window !== "undefined" ? window : globalThis);
