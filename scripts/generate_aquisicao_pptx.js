const pptxgen = require('pptxgenjs');
const path = require('path');

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_16x9';
pptx.author = 'Hermes Agent';
pptx.company = 'Nous Research';
pptx.subject = 'Avaliação para aquisição - Estufa Pro';
pptx.title = 'Avaliação para Aquisição — Estufa Pro';
pptx.lang = 'pt-BR';
pptx.theme = {
  headFontFace: 'Aptos Display',
  bodyFontFace: 'Aptos',
  lang: 'pt-BR'
};
pptx.defineLayout({ name: 'CUSTOM', width: 13.333, height: 7.5 });
pptx.layout = 'CUSTOM';

const C = {
  bg: '0F172A',
  bg2: '111827',
  white: 'F8FAFC',
  text: '0F172A',
  muted: '475569',
  soft: 'E2E8F0',
  green: '16A34A',
  greenSoft: 'DCFCE7',
  amber: 'D97706',
  amberSoft: 'FEF3C7',
  blue: '1D4ED8',
  blueSoft: 'DBEAFE',
  red: 'DC2626',
  redSoft: 'FEE2E2',
  panel: 'F8FAFC',
  panel2: 'F1F5F9',
  line: 'CBD5E1'
};

function addBg(slide, dark=false) {
  slide.background = { color: dark ? C.bg : 'FFFFFF' };
  if (dark) {
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.bg }, line: { color: C.bg } });
    slide.addShape(pptx.ShapeType.rect, { x: 9.8, y: 0, w: 3.533, h: 7.5, fill: { color: '0B1220', transparency: 0 }, line: { color: '0B1220' } });
  }
}

function titleBlock(slide, title, subtitle, dark=false) {
  slide.addText(title, { x: 0.8, y: 0.55, w: 8.8, h: 0.7, margin: 0, fontFace: 'Aptos Display', fontSize: 26, bold: true, color: dark ? C.white : C.text });
  if (subtitle) {
    slide.addText(subtitle, { x: 0.8, y: 1.2, w: 10.8, h: 0.4, margin: 0, fontSize: 11.5, color: dark ? 'CBD5E1' : C.muted });
  }
}

function footer(slide, n, dark=false) {
  slide.addText(String(n).padStart(2,'0'), { x: 12.45, y: 7.02, w: 0.45, h: 0.2, margin: 0, align: 'right', fontSize: 9, color: dark ? '94A3B8' : '64748B' });
}

function card(slide, x, y, w, h, opts={}) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.06,
    fill: { color: opts.fill || C.panel },
    line: { color: opts.line || opts.fill || C.panel },
    shadow: { type: 'outer', color: '000000', blur: 2, angle: 45, distance: 1, opacity: 0.08 }
  });
}

function pill(slide, x, y, w, h, text, fill, color) {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.08, fill: { color: fill }, line: { color: fill } });
  slide.addText(text, { x, y: y+0.03, w, h, align: 'center', margin: 0, fontSize: 10.5, bold: true, color });
}

function bullets(slide, items, x, y, w, h, color=C.text, fontSize=17) {
  const runs = [];
  items.forEach((t, i) => runs.push({ text: t, options: { bullet: true, breakLine: i < items.length - 1 } }));
  slide.addText(runs, { x, y, w, h, margin: 0, fontSize, color, breakLine: false, paraSpaceAfterPt: 10, valign: 'top' });
}

function metricCard(slide, x, y, w, h, num, label, fill, numColor=C.text) {
  card(slide, x, y, w, h, { fill });
  slide.addText(num, { x:x+0.18, y:y+0.18, w:w-0.36, h:0.5, margin:0, fontSize: 22, bold:true, color:numColor });
  slide.addText(label, { x:x+0.18, y:y+0.78, w:w-0.36, h:0.45, margin:0, fontSize: 10.5, color: C.muted });
}

// Slide 1
{
  const s = pptx.addSlide(); addBg(s, true);
  s.addShape(pptx.ShapeType.roundRect, { x:0.8, y:0.8, w:1.55, h:0.34, rectRadius:0.08, fill:{ color:'163D2B' }, line:{ color:'163D2B' } });
  s.addText('AQUISIÇÃO', { x:0.95, y:0.87, w:1.1, h:0.14, margin:0, fontSize:10, bold:true, color:'BBF7D0', charSpacing:1.2, align:'center' });
  s.addText('Avaliação para\nAquisição', { x:0.8, y:1.45, w:5.8, h:1.5, margin:0, fontFace:'Aptos Display', fontSize:28, bold:true, color:C.white, breakLine:true });
  s.addText('Estufa Pro', { x:0.8, y:3.15, w:3.5, h:0.45, margin:0, fontSize:20, color:'86EFAC', bold:true });
  s.addText('Visão executiva sobre valor do ativo, riscos técnicos e plano de evolução', { x:0.8, y:3.78, w:5.7, h:0.55, margin:0, fontSize:15, color:'CBD5E1' });
  card(s, 8.2, 1.1, 4.15, 4.95, { fill: '0B1220', line: '1E293B' });
  metricCard(s, 8.6, 1.55, 1.55, 1.25, '7.6', 'score técnico', 'DCFCE7', '166534');
  metricCard(s, 10.3, 1.55, 1.55, 1.25, '172', 'arquivos TS/TSX', 'DBEAFE', '1D4ED8');
  metricCard(s, 8.6, 3.05, 1.55, 1.25, '42k', 'linhas aprox.', 'FEF3C7', 'B45309');
  metricCard(s, 10.3, 3.05, 1.55, 1.25, '7', 'arquivos de teste', 'FEE2E2', 'B91C1C');
  s.addText('Análise técnica independente', { x:0.8, y:6.75, w:3.6, h:0.2, margin:0, fontSize:10, color:'94A3B8' });
  footer(s, 1, true);
}

// Slide 2
{
  const s = pptx.addSlide(); addBg(s, false); titleBlock(s, 'A tese em 1 frase', 'Leitura executiva e direta para decisão', false);
  card(s, 0.85, 1.85, 11.7, 1.35, { fill: 'F8FAFC', line: C.line });
  s.addText('O projeto tem valor real como ativo de produto, mas ainda precisa de estabilização técnica antes de ser tratado como plataforma madura.', { x:1.15, y:2.23, w:11.1, h:0.6, margin:0, fontSize:22, bold:true, color:C.text, align:'center' });
  card(s, 0.95, 3.7, 3.75, 2.0, { fill:C.greenSoft, line:C.greenSoft });
  card(s, 4.8, 3.7, 3.75, 2.0, { fill:C.amberSoft, line:C.amberSoft });
  card(s, 8.65, 3.7, 3.75, 2.0, { fill:C.blueSoft, line:C.blueSoft });
  s.addText('valor de negócio alto', { x:1.2, y:4.1, w:3.2, h:0.3, margin:0, fontSize:20, bold:true, color:'166534', align:'center' });
  s.addText('engenharia ainda em evolução', { x:5.0, y:4.1, w:3.35, h:0.3, margin:0, fontSize:20, bold:true, color:'9A3412', align:'center' });
  s.addText('compra faz sentido\ncom preço certo', { x:8.95, y:4.0, w:3.15, h:0.55, margin:0, fontSize:20, bold:true, color:'1E3A8A', align:'center' });
  footer(s, 2);
}

// Slide 3
{
  const s = pptx.addSlide(); addBg(s, false); titleBlock(s, 'Nossa recomendação', 'Posicionamento objetivo sobre compra', false);
  card(s, 0.9, 1.8, 5.3, 4.7, { fill:C.panel });
  pill(s, 1.2, 2.1, 1.6, 0.32, 'RECOMENDAÇÃO', C.greenSoft, '166534');
  s.addText('Comprar, desde que o preço reflita o retrabalho técnico e a transferência inclua toda a infraestrutura.', { x:1.2, y:2.55, w:4.7, h:1.1, margin:0, fontSize:24, bold:true, color:C.text });
  s.addText('O valor está mais na regra de negócio pronta do que no acabamento final da engenharia.', { x:1.2, y:5.55, w:4.6, h:0.45, margin:0, fontSize:12, italic:true, color:C.muted });
  card(s, 6.6, 1.8, 5.85, 4.7, { fill:'F8FAFC' });
  bullets(s, [
    'comprar como base funcional estratégica',
    'não comprar como software enterprise pronto',
    'exigir handover técnico estruturado',
    'condicionar decisão ao acesso completo dos serviços externos'
  ], 6.95, 2.35, 5.0, 3.4, C.text, 18);
  footer(s, 3);
}

// Slide 4
{
  const s = pptx.addSlide(); addBg(s, false); titleBlock(s, 'Score técnico do projeto', 'Balanceamento entre valor funcional e governança técnica', false);
  card(s, 0.95, 1.85, 3.1, 4.7, { fill:'F8FAFC' });
  s.addText('7.6 / 10', { x:1.25, y:2.5, w:2.5, h:0.8, margin:0, fontSize:28, bold:true, color:'166534', align:'center' });
  s.addText('bom ativo para acelerar mercado', { x:1.2, y:3.55, w:2.6, h:0.3, margin:0, fontSize:12, color:C.muted, align:'center' });
  s.addShape(pptx.ShapeType.rect, { x:4.6, y:2.6, w:7.1, h:0.28, fill:{ color:'E2E8F0' }, line:{ color:'E2E8F0' } });
  s.addShape(pptx.ShapeType.rect, { x:4.6, y:2.6, w:5.4, h:0.28, fill:{ color:'22C55E' }, line:{ color:'22C55E' } });
  s.addShape(pptx.ShapeType.line, { x:10.0, y:2.35, w:0, h:0.8, line:{ color:'166534', width:2.2 } });
  s.addText('0–5\nrisco alto', { x:4.55, y:3.1, w:1.2, h:0.45, margin:0, fontSize:10, color:C.muted, align:'center' });
  s.addText('5–7\nfuncional porém frágil', { x:6.15, y:3.1, w:1.8, h:0.45, margin:0, fontSize:10, color:C.muted, align:'center' });
  s.addText('7–8.5\nbom ativo com dívida controlável', { x:8.2, y:3.1, w:2.35, h:0.45, margin:0, fontSize:10, color:C.muted, align:'center' });
  s.addText('8.5+\noperação madura', { x:10.9, y:3.1, w:1.2, h:0.45, margin:0, fontSize:10, color:C.muted, align:'center' });
  bullets(s, [
    'acima da média em valor funcional',
    'abaixo do ideal em governança técnica',
    'ainda não pronto para escala sem saneamento'
  ], 4.7, 4.3, 6.8, 1.6, C.text, 17);
  footer(s, 4);
}

// Slide 5
{
  const s = pptx.addSlide(); addBg(s, false); titleBlock(s, 'Por que esse projeto chama atenção', 'Não é um app simples. Há profundidade real de produto.', false);
  card(s, 0.95, 1.95, 3.9, 4.85, { fill:C.panel });
  card(s, 4.95, 1.95, 3.9, 4.85, { fill:C.panel });
  card(s, 8.95, 1.95, 3.4, 4.85, { fill:C.panel });
  pill(s, 1.2, 2.2, 1.7, 0.28, 'OPERAÇÃO', C.greenSoft, '166534');
  bullets(s, ['estufas', 'campo', 'hidroponia'], 1.2, 2.75, 3.0, 2.0, C.text, 18);
  pill(s, 5.2, 2.2, 2.3, 0.28, 'COMERCIAL / FINANCEIRO', C.blueSoft, '1D4ED8');
  bullets(s, ['vendas', 'colheitas', 'despesas', 'contas a receber', 'caixa'], 5.2, 2.75, 3.1, 2.6, C.text, 17);
  pill(s, 9.2, 2.2, 1.9, 0.28, 'PLATAFORMA', C.amberSoft, 'B45309');
  bullets(s, ['multi-tenant', 'permissões', 'rastreabilidade', 'offline', 'portal de suporte'], 9.2, 2.75, 2.6, 2.8, C.text, 16);
  s.addText('Isso encurta meses de desenvolvimento do zero.', { x:0.95, y:6.22, w:11.2, h:0.3, margin:0, fontSize:13, italic:true, color:C.muted, align:'center' });
  footer(s, 5);
}

// Slide 6
{
  const s = pptx.addSlide(); addBg(s, false); titleBlock(s, 'O que já está bem endereçado', 'Base reaproveitável com sinais reais de maturidade', false);
  metricCard(s, 0.95, 2.0, 2.1, 1.5, 'Expo', 'stack moderna', C.greenSoft, '166534');
  metricCard(s, 3.25, 2.0, 2.1, 1.5, 'RLS', 'sinais de segurança', C.blueSoft, '1D4ED8');
  metricCard(s, 5.55, 2.0, 2.1, 1.5, 'Tenant', 'modelo já presente', C.amberSoft, '92400E');
  metricCard(s, 7.85, 2.0, 2.1, 1.5, 'RBAC', 'controle por perfil', 'FCE7F3', '9D174D');
  metricCard(s, 10.15, 2.0, 2.1, 1.5, 'Offline', 'fila já pensada', 'EDE9FE', '6D28D9');
  card(s, 1.1, 4.2, 11.1, 1.55, { fill:'F8FAFC' });
  s.addText('O projeto tem base reaproveitável e não parece descartável ou improvisado.', { x:1.35, y:4.72, w:10.6, h:0.35, margin:0, fontSize:20, bold:true, color:C.text, align:'center' });
  footer(s, 6);
}

// Slide 7
{
  const s = pptx.addSlide(); addBg(s, false); titleBlock(s, 'Checks técnicos realizados', 'Evidências objetivas levantadas durante a análise', false);
  card(s, 0.95, 2.0, 3.8, 3.9, { fill:C.greenSoft });
  card(s, 4.8, 2.0, 3.8, 3.9, { fill:C.blueSoft });
  card(s, 8.65, 2.0, 3.8, 3.9, { fill:C.redSoft });
  s.addText('typecheck', { x:1.25, y:2.55, w:3.2, h:0.35, margin:0, fontSize:21, bold:true, color:'166534', align:'center' });
  s.addText('passou', { x:1.25, y:3.25, w:3.2, h:0.5, margin:0, fontSize:28, bold:true, color:'166534', align:'center' });
  s.addText('expo-doctor', { x:5.1, y:2.55, w:3.2, h:0.35, margin:0, fontSize:21, bold:true, color:'1D4ED8', align:'center' });
  s.addText('18 / 18', { x:5.1, y:3.05, w:3.2, h:0.5, margin:0, fontSize:28, bold:true, color:'1D4ED8', align:'center' });
  s.addText('checks passaram', { x:5.1, y:3.72, w:3.2, h:0.25, margin:0, fontSize:12, color:'1D4ED8', align:'center' });
  s.addText('testes', { x:8.95, y:2.55, w:3.2, h:0.35, margin:0, fontSize:21, bold:true, color:'B91C1C', align:'center' });
  s.addText('falharam', { x:8.95, y:3.25, w:3.2, h:0.5, margin:0, fontSize:28, bold:true, color:'B91C1C', align:'center' });
  s.addText('A base está funcional, mas ainda não validada com o nível de confiança necessário para aquisição sem ressalvas.', { x:1.15, y:6.35, w:11.1, h:0.35, margin:0, fontSize:13, italic:true, color:C.muted, align:'center' });
  footer(s, 7);
}

// Slide 8
{
  const s = pptx.addSlide(); addBg(s, false); titleBlock(s, 'Dimensão da base atual', 'Métricas que ajudam a dimensionar o esforço real de manutenção', false);
  metricCard(s, 0.95, 1.95, 2.0, 1.55, '172', 'arquivos TS/TSX', C.blueSoft, '1D4ED8');
  metricCard(s, 3.15, 1.95, 2.0, 1.55, '41.842', 'linhas de código', C.greenSoft, '166534');
  metricCard(s, 5.35, 1.95, 2.0, 1.55, '7', 'arquivos de teste', C.amberSoft, 'B45309');
  metricCard(s, 7.55, 1.95, 2.0, 1.55, '238', 'linhas de teste', 'F5F3FF', '7C3AED');
  metricCard(s, 9.75, 1.95, 2.0, 1.55, '~374', 'ocorrências de any', C.redSoft, 'B91C1C');
  metricCard(s, 11.95, 1.95, 0.95, 1.55, '53', 'console.*', 'FFE4E6', 'BE123C');
  card(s, 1.15, 4.2, 11.0, 1.6, { fill:'F8FAFC' });
  s.addText('O tamanho do sistema já exige disciplina de engenharia maior do que a observada hoje.', { x:1.45, y:4.78, w:10.5, h:0.35, margin:0, fontSize:20, bold:true, color:C.text, align:'center' });
  footer(s, 8);
}

// Slide 9
{
  const s = pptx.addSlide(); addBg(s, true); titleBlock(s, 'Alerta número 1', 'O principal ponto de risco técnico hoje', true);
  s.addText('A suíte de testes\nfalha hoje', { x:0.9, y:2.0, w:4.7, h:1.2, margin:0, fontSize:30, bold:true, color:C.white });
  card(s, 6.6, 1.75, 5.6, 3.7, { fill:'0B1220', line:'1E293B' });
  bullets(s, [
    'reduz confiança técnica imediata',
    'aumenta risco de regressão',
    'indica necessidade de saneamento logo após compra',
    'enfraquece percepção de software pronto'
  ], 6.95, 2.25, 4.9, 2.2, 'E2E8F0', 18);
  s.addText('Se a compra acontecer, haverá investimento técnico logo em seguida.', { x:0.95, y:5.95, w:11.5, h:0.3, margin:0, fontSize:14, italic:true, color:'94A3B8' });
  footer(s, 9, true);
}

// Slide 10
{
  const s = pptx.addSlide(); addBg(s, false); titleBlock(s, 'Riscos estruturais centrais', 'Os 4 blocos de dívida que mais pesam na decisão', false);
  card(s, 0.95, 1.9, 5.7, 2.0, { fill:C.redSoft });
  card(s, 6.8, 1.9, 5.55, 2.0, { fill:C.amberSoft });
  card(s, 0.95, 4.15, 5.7, 2.0, { fill:C.blueSoft });
  card(s, 6.8, 4.15, 5.55, 2.0, { fill:C.greenSoft });
  s.addText('Cobertura de testes insuficiente', { x:1.2, y:2.25, w:5.0, h:0.3, margin:0, fontSize:19, bold:true, color:'991B1B' });
  s.addText('poucos testes para a complexidade atual', { x:1.2, y:2.82, w:4.9, h:0.24, margin:0, fontSize:12, color:'991B1B' });
  s.addText('Tipagem frouxa demais', { x:7.05, y:2.25, w:4.8, h:0.3, margin:0, fontSize:19, bold:true, color:'92400E' });
  s.addText('strict: false e uso amplo de any', { x:7.05, y:2.82, w:4.4, h:0.24, margin:0, fontSize:12, color:'92400E' });
  s.addText('Arquivos grandes demais', { x:1.2, y:4.5, w:4.8, h:0.3, margin:0, fontSize:19, bold:true, color:'1E3A8A' });
  s.addText('responsabilidade concentrada e manutenção cara', { x:1.2, y:5.07, w:4.9, h:0.24, margin:0, fontSize:12, color:'1E3A8A' });
  s.addText('Governança de qualidade ainda fraca', { x:7.05, y:4.5, w:4.9, h:0.3, margin:0, fontSize:19, bold:true, color:'166534' });
  s.addText('sem sinais claros de CI/lint/format visíveis', { x:7.05, y:5.07, w:4.3, h:0.24, margin:0, fontSize:12, color:'166534' });
  footer(s, 10);
}

// Slide 11
{
  const s = pptx.addSlide(); addBg(s, false); titleBlock(s, 'A infraestrutura faz parte do ativo', 'Comprar só o código não resolve', false);
  card(s, 0.95, 2.0, 4.2, 4.2, { fill:C.panel });
  bullets(s, ['Supabase', 'EAS / Expo', 'Cloudinary', 'Google Auth', 'variáveis de ambiente', 'possíveis URLs públicas e automações'], 1.25, 2.55, 3.3, 3.1, C.text, 18);
  card(s, 5.55, 2.0, 6.7, 4.2, { fill:C.redSoft });
  s.addText('Sem transferência completa da infraestrutura, a aquisição fica tecnicamente incompleta.', { x:6.0, y:3.0, w:5.8, h:1.0, margin:0, fontSize:25, bold:true, color:'991B1B', align:'center', valign:'mid' });
  footer(s, 11);
}

// Slide 12
{
  const s = pptx.addSlide(); addBg(s, false); titleBlock(s, 'Melhorias obrigatórias pós-compra', 'Roteiro de saneamento e evolução', false);
  card(s, 0.95, 2.0, 3.8, 3.9, { fill:C.blueSoft });
  card(s, 4.8, 2.0, 3.8, 3.9, { fill:C.amberSoft });
  card(s, 8.65, 2.0, 3.8, 3.9, { fill:C.greenSoft });
  s.addText('1. Estabilizar', { x:1.25, y:2.3, w:3.2, h:0.28, margin:0, fontSize:22, bold:true, color:'1E3A8A', align:'center' });
  bullets(s, ['corrigir testes', 'validar build', 'revisar módulos críticos'], 1.25, 2.85, 3.0, 2.2, '1E3A8A', 16);
  s.addText('2. Endurecer', { x:5.1, y:2.3, w:3.2, h:0.28, margin:0, fontSize:22, bold:true, color:'92400E', align:'center' });
  bullets(s, ['CI', 'lint', 'tipagem', 'redução de any'], 5.1, 2.85, 3.0, 2.2, '92400E', 16);
  s.addText('3. Escalar', { x:8.95, y:2.3, w:3.2, h:0.28, margin:0, fontSize:22, bold:true, color:'166534', align:'center' });
  bullets(s, ['testes adicionais', 'documentação', 'observabilidade', 'refatoração dos módulos pesados'], 8.95, 2.85, 3.0, 2.3, '166534', 15.5);
  footer(s, 12);
}

// Slide 13
{
  const s = pptx.addSlide(); addBg(s, false); titleBlock(s, 'Prioridades imediatas', 'Áreas que concentram maior risco operacional e reputacional', false);
  const items = ['financeiro', 'rentabilidade', 'vendas', 'despesas', 'permissões / RBAC', 'compartilhamento de tenant', 'multi-tenant / segurança', 'offline queue / sync'];
  let x=1.05, y=2.15; let i=0;
  for (const t of items) {
    const fill = i % 2 === 0 ? C.panel : C.panel2;
    card(s, x, y, 3.0, 0.82, { fill });
    s.addText(t, { x:x+0.18, y:y+0.22, w:2.65, h:0.2, margin:0, fontSize:16, bold:true, color:C.text, align:'center' });
    x += 3.18; i++;
    if (i % 4 === 0) { x = 1.05; y += 1.02; }
  }
  footer(s, 13);
}

// Slide 14
{
  const s = pptx.addSlide(); addBg(s, true); titleBlock(s, 'Por que ainda faz sentido comprar', 'A lógica econômica e estratégica por trás da tese', true);
  bullets(s, [
    'acelera entrada no mercado',
    'evita reconstruir toda a lógica de negócio',
    'já traz estrutura de operação complexa',
    'reduz tempo até evolução comercial'
  ], 0.95, 2.1, 5.2, 3.0, C.white, 20);
  card(s, 7.1, 1.9, 4.9, 3.8, { fill:'0B1220', line:'1E293B' });
  s.addText('O ativo não vale por perfeição técnica.\nVale pela aceleração estratégica.', { x:7.5, y:3.0, w:4.1, h:1.0, margin:0, fontSize:24, bold:true, color:'86EFAC', align:'center' });
  footer(s, 14, true);
}

// Slide 15
{
  const s = pptx.addSlide(); addBg(s, false); titleBlock(s, 'Fatores que puxam o preço para baixo', 'O que precisa entrar na negociação de valuation', false);
  bullets(s, [
    'testes falhando no estado atual',
    'cobertura muito baixa',
    'dívida de tipagem',
    'arquivos excessivamente grandes',
    'falta de pipeline visível de qualidade',
    'necessidade de hardening imediato',
    'dependência de infraestrutura externa',
    'forte necessidade de handover técnico'
  ], 1.0, 2.0, 5.7, 4.8, C.text, 17.5);
  card(s, 7.2, 2.15, 5.0, 3.5, { fill:C.redSoft });
  s.addText('O valuation precisa refletir custo de estabilização, não apenas funcionalidades entregues.', { x:7.6, y:3.0, w:4.2, h:1.0, margin:0, fontSize:24, bold:true, color:'991B1B', align:'center' });
  footer(s, 15);
}

// Slide 16
{
  const s = pptx.addSlide(); addBg(s, false); titleBlock(s, 'Leitura de valuation', 'Faixas sugeridas com base no estado técnico atual', false);
  card(s, 1.0, 2.0, 3.0, 3.5, { fill:C.greenSoft });
  card(s, 4.25, 2.0, 3.0, 3.5, { fill:C.blueSoft });
  card(s, 7.5, 2.0, 3.0, 3.5, { fill:C.amberSoft });
  card(s, 10.75, 2.0, 1.6, 3.5, { fill:C.redSoft });
  s.addText('R$ 25k–40k', { x:1.2, y:2.55, w:2.6, h:0.4, margin:0, fontSize:22, bold:true, color:'166534', align:'center' });
  s.addText('oportunidade muito boa', { x:1.2, y:3.25, w:2.6, h:0.25, margin:0, fontSize:12, color:'166534', align:'center' });
  s.addText('R$ 40k–60k', { x:4.45, y:2.55, w:2.6, h:0.4, margin:0, fontSize:22, bold:true, color:'1D4ED8', align:'center' });
  s.addText('faixa justa', { x:4.45, y:3.25, w:2.6, h:0.25, margin:0, fontSize:12, color:'1D4ED8', align:'center' });
  s.addText('R$ 60k–75k', { x:7.7, y:2.55, w:2.6, h:0.4, margin:0, fontSize:22, bold:true, color:'92400E', align:'center' });
  s.addText('teto aceitável com transferência completa', { x:7.7, y:3.12, w:2.6, h:0.5, margin:0, fontSize:11, color:'92400E', align:'center' });
  s.addText('> 75k', { x:10.95, y:2.55, w:1.2, h:0.4, margin:0, fontSize:22, bold:true, color:'991B1B', align:'center' });
  s.addText('começa a ficar caro', { x:10.9, y:3.18, w:1.3, h:0.4, margin:0, fontSize:10, color:'991B1B', align:'center' });
  footer(s, 16);
}

// Slide 17
{
  const s = pptx.addSlide(); addBg(s, false); titleBlock(s, 'Condições para pagar mais ou menos', 'O preço depende do pacote real de transição', false);
  card(s, 0.95, 1.95, 5.7, 4.8, { fill:C.greenSoft });
  card(s, 6.8, 1.95, 5.55, 4.8, { fill:C.redSoft });
  s.addText('Pagar perto do teto', { x:1.25, y:2.3, w:5.0, h:0.3, margin:0, fontSize:22, bold:true, color:'166534', align:'center' });
  bullets(s, ['acesso total ao Supabase', 'acesso ao EAS / Expo', 'acesso ao Cloudinary', 'credenciais Google', 'build reproduzível', 'handover técnico e suporte 30–60 dias'], 1.25, 2.85, 4.8, 3.0, '166534', 16.5);
  s.addText('Pressionar desconto', { x:7.05, y:2.3, w:5.0, h:0.3, margin:0, fontSize:22, bold:true, color:'991B1B', align:'center' });
  bullets(s, ['vier só o código', 'infra não for transferida', 'build não for reproduzível', 'banco não estiver claro', 'não houver documentação operacional', 'fluxos críticos não puderem ser demonstrados'], 7.05, 2.85, 4.8, 3.0, '991B1B', 16.5);
  footer(s, 17);
}

// Slide 18
{
  const s = pptx.addSlide(); addBg(s, false); titleBlock(s, 'Plano de estabilização — 30 dias', 'Roteiro prático pós-aquisição', false);
  const weeks = [
    ['Semana 1','mapear acessos\nvalidar infra\nrodar build\ncorrigir testes'],
    ['Semana 2','revisar financeiro e permissões\nvalidar multi-tenant\nvalidar offline\nimplantar CI mínima'],
    ['Semana 3','reduzir risco dos módulos críticos\ncomeçar refatoração dirigida\nampliar testes'],
    ['Semana 4','consolidar documentação\nfechar checklist operacional\nformalizar roadmap técnico']
  ];
  let x=0.95;
  for (const [wk, body] of weeks) {
    card(s, x, 2.1, 2.9, 3.95, { fill:C.panel });
    pill(s, x+0.3, 2.38, 1.45, 0.28, wk.toUpperCase(), C.blueSoft, '1D4ED8');
    s.addText(body, { x:x+0.28, y:3.0, w:2.35, h:2.4, margin:0, fontSize:15.5, color:C.text, breakLine:true });
    x += 3.12;
  }
  footer(s, 18);
}

// Slide 19
{
  const s = pptx.addSlide(); addBg(s, true); titleBlock(s, 'Decisão recomendada', 'Mensagem final para fechamento de reunião', true);
  s.addText('O projeto pode ser uma boa aquisição, desde que tratado como base estratégica com dívida técnica controlável — e não como plataforma pronta.', { x:0.95, y:2.05, w:11.2, h:1.1, margin:0, fontSize:26, bold:true, color:C.white, align:'center' });
  card(s, 2.15, 4.1, 9.0, 1.45, { fill:'0B1220', line:'1E293B' });
  s.addText('Comprar faz sentido se o preço refletir o retrabalho, a infraestrutura vier junto e o handover for sólido.', { x:2.45, y:4.58, w:8.4, h:0.38, margin:0, fontSize:16, color:'86EFAC', align:'center', bold:true });
  s.addText('Valor de produto: alto.   Maturidade de engenharia: intermediária.   Decisão: viável, com negociação técnica bem feita.', { x:1.2, y:6.45, w:10.9, h:0.28, margin:0, fontSize:12, color:'94A3B8', align:'center' });
  footer(s, 19, true);
}

const out = path.resolve('C:/Users/bruno/Desktop/ESTUFA/Estufa2/APRESENTACAO_AQUISICAO_ESTUFA_PRO.pptx');
pptx.writeFile({ fileName: out }).then(() => console.log(out)).catch(err => { console.error(err); process.exit(1); });
