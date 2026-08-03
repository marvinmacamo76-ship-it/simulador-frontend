// =============================================================================
// POLARIDADE.JS — Visualizador de Polaridade Molecular
// STEM Licungo | Universidade Licungo, Moçambique
// Depende de: 3Dmol.js (CDN), /api/biblioteca, /api/pubchem/*
// =============================================================================

'use strict';

// ── Estado global ──────────────────────────────────────────────────────────────
let viewer       = null;
let atomosAtuais = [];
let superficieId = null;        // handle da superfície VDW activa
let molActiva    = null;        // { nome, formula, pubchem }
let sdfActual    = '';
let bibliotecaDB = {};
let categoriaActiva = 'inorganicas';
let buscaActual  = '';

// ── Tabelas químicas ──────────────────────────────────────────────────────────
const EN = {
  H:2.20, C:2.55, N:3.04, O:3.44, F:3.98, Cl:3.16, Br:2.96,
  I:2.66, S:2.58, P:2.19, Na:0.93, K:0.82, Ca:1.00, Mg:1.31,
  Al:1.61, Si:1.90, Se:2.55, B:2.04, As:2.18, Fe:1.83, Cu:1.90,
  Zn:1.65, Ag:1.93, Ni:1.91, Co:1.88, Au:2.54,
};

const CORES_CPK = {
  H:'#f0f0f0', C:'#404040', N:'#4444ff', O:'#ff2200', F:'#44ff44',
  Cl:'#22dd22', Br:'#882200', I:'#660099', S:'#dddd00', P:'#ff8800',
  Na:'#aa55aa', K:'#887799', Ca:'#556655', Mg:'#228b22', Fe:'#dd7733',
  Cu:'#dd8833', Al:'#aabbcc', Si:'#aabbcc',
};

const ELETRONS_VALENCIA = {
  H:1, C:4, N:5, O:6, F:7, Cl:7, Br:7, I:7, S:6, P:5, B:3, Si:4, As:5, Se:6,
};

const GEOMETRIA_VSEPR = {
  '1-0':'Diatómica','2-0':'Linear (180°)','3-0':'Trigonal Planar (120°)',
  '2-1':'Angular (~120°)','4-0':'Tetraédrica (109.5°)','3-1':'Pirâmide Trigonal (~107°)',
  '2-2':'Angular (~104.5°)','5-0':'Bipiramidal Trigonal','4-1':'Gangorra (Seesaw)',
  '3-2':'Forma de T','6-0':'Octaédrica (90°)','5-1':'Pirâmide Quadrangular',
};

// ── Cor de superfície por EN ──────────────────────────────────────────────────
function enParaCor(elem) {
  const en = EN[elem] ?? 2.5;
  const t  = Math.max(0, Math.min(1, (en - 1.5) / 2.5)); // 0→azul(δ+), 1→vermelho(δ-)
  if (t > 0.72) return '#ff2222';
  if (t > 0.55) return '#ff8888';
  if (t > 0.45) return '#ffffff';
  if (t > 0.25) return '#8888ff';
  return '#2244ff';
}

// ── INICIALIZAÇÃO ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  iniciarViewer();
  await carregarBiblioteca();
  registarEventos();
  // Molécula padrão: água
  await carregarMolecula('water', 'Água', 'H₂O');
});

// ── VIEWER 3Dmol ──────────────────────────────────────────────────────────────
function iniciarViewer() {
  if (!window.$3Dmol) {
    document.getElementById('webgl-fallback').style.display = 'flex';
    return;
  }
  const el = document.getElementById('viewer-container');
  try {
    viewer = $3Dmol.createViewer(el, {
      backgroundColor: '#000000',
      antialias: true,
    });
    // Pausa rotação ao interagir
    el.addEventListener('mousedown', () => viewer?.spin(false));
    el.addEventListener('touchstart', () => viewer?.spin(false), { passive: true });
    el.addEventListener('mouseup',   () => { if (sdfActual) viewer?.spin('y', 1.2); });
    el.addEventListener('touchend',  () => { if (sdfActual) viewer?.spin('y', 1.2); });
  } catch {
    document.getElementById('webgl-fallback').style.display = 'flex';
  }
}

// ── BIBLIOTECA ────────────────────────────────────────────────────────────────
async function carregarBiblioteca() {
  try {
    const r = await fetch('/api/biblioteca');
    bibliotecaDB = await r.json();
    renderizarLista();
  } catch {
    mostrarStatus('erro', 'Não foi possível carregar a biblioteca de moléculas.');
  }
}

function renderizarLista() {
  const lista  = document.getElementById('lista-moleculas');
  const mols   = (bibliotecaDB[categoriaActiva] || []).filter(m =>
    !buscaActual ||
    m.nome.toLowerCase().includes(buscaActual) ||
    m.formula.toLowerCase().includes(buscaActual)
  );
  if (!mols.length) {
    lista.innerHTML = '<p style="color:var(--text-muted);font-size:0.83rem;padding:0.8rem;text-align:center;">Nenhum resultado.</p>';
    return;
  }
  lista.innerHTML = mols.map(m => `
    <div class="mol-card${molActiva?.pubchem === m.pubchem ? ' ativa' : ''}"
         data-pubchem="${m.pubchem}" data-nome="${m.nome}" data-formula="${m.formula}">
      <div class="mol-nome">${m.nome}</div>
      <div class="mol-formula">${subscript(m.formula)}</div>
    </div>`).join('');

  lista.querySelectorAll('.mol-card').forEach(card => {
    card.addEventListener('click', () => {
      const { pubchem, nome, formula } = card.dataset;
      carregarMolecula(pubchem, nome, formula);
    });
  });
}

// ── CARREGAR MOLÉCULA ─────────────────────────────────────────────────────────
async function carregarMolecula(pubchem, nome, formula) {
  if (!viewer) return;
  mostrarStatus('loading', `A carregar ${nome}…`);

  try {
    const [sdfR] = await Promise.allSettled([
      fetch(`/api/pubchem/sdf/${encodeURIComponent(pubchem)}`),
    ]);

    if (sdfR.status !== 'fulfilled' || !sdfR.value.ok)
      throw new Error('SDF não disponível');

    const sdf = await sdfR.value.text();
    sdfActual = sdf;
    molActiva = { pubchem, nome, formula };

    atomosAtuais = parsearAtomos(sdf);
    renderizarTudo(sdf);
    atualizarAnalise();
    atualizarTabelaEN();
    actualizarOverlay();

    // Destaca card activo
    document.querySelectorAll('.mol-card').forEach(c => {
      c.classList.toggle('ativa', c.dataset.pubchem === pubchem);
    });
    document.getElementById('viewer-mol-nome').textContent = `${nome}  ${formula}`;
    mostrarStatus('ok', `${nome} carregada com sucesso.`);
  } catch (e) {
    mostrarStatus('erro', `Não foi possível carregar "${nome}". Verifique a ligação.`);
  }
}

// ── RENDER PRINCIPAL ──────────────────────────────────────────────────────────
function renderizarTudo(sdf) {
  if (!viewer) return;
  viewer.clear();
  superficieId = null;

  viewer.addModel(sdf, 'sdf');
  viewer.setStyle({}, getEstiloBase());

  if (chk('chk-dipol-lig'))  renderizarDipolosLigacao();
  if (chk('chk-dipol-mol'))  renderizarDipoloMolecular();
  if (chk('chk-cargas'))     renderizarCargasParciais();
  if (chk('chk-superficie')) renderizarSuperficie();

  viewer.zoomTo();
  viewer.spin('y', 1.2);
  viewer.render();
}

function getEstiloBase() {
  return {
    sphere: { scale: 0.30, colorscheme: 'Jmol' },
    stick:  { radius: 0.18, colorscheme: 'Jmol' },
  };
}

// ── DIPOLOS DE LIGAÇÃO ────────────────────────────────────────────────────────
function renderizarDipolosLigacao() {
  const ligacoes = encontrarLigacoes();
  ligacoes.forEach(({ a1, a2 }) => {
    const en1 = EN[a1.elem] ?? 2.5;
    const en2 = EN[a2.elem] ?? 2.5;
    const delta = Math.abs(en2 - en1);
    if (delta < 0.2) return; // ligação apolar — sem seta

    // Seta aponta de δ+ (baixa EN) → δ- (alta EN)
    const [inicio, fim] = en1 < en2 ? [a1, a2] : [a2, a1];
    const d    = normalize3D({ x: fim.x - inicio.x, y: fim.y - inicio.y, z: fim.z - inicio.z });
    const meia = dist3D(a1, a2) * 0.5;

    // Posiciona a seta no meio do segmento de ligação
    const cx = (a1.x + a2.x) / 2;
    const cy = (a1.y + a2.y) / 2;
    const cz = (a1.z + a2.z) / 2;
    const comprimento = Math.min(0.55, meia * 0.5);

    viewer.addArrow({
      start:       { x: cx - d.x * comprimento, y: cy - d.y * comprimento, z: cz - d.z * comprimento },
      end:         { x: cx + d.x * comprimento, y: cy + d.y * comprimento, z: cz + d.z * comprimento },
      radius:      0.06,
      radiusRatio: 2.8,
      mid:         0.62,
      color:       '#f59e0b',
    });
  });
}

// ── DIPOLO MOLECULAR (resultante) ─────────────────────────────────────────────
function renderizarDipoloMolecular() {
  if (atomosAtuais.length < 2) return;

  // Centro geométrico
  let cx = 0, cy = 0, cz = 0;
  atomosAtuais.forEach(a => { cx += a.x; cy += a.y; cz += a.z; });
  cx /= atomosAtuais.length;
  cy /= atomosAtuais.length;
  cz /= atomosAtuais.length;

  // Soma vectorial dos momentos de dipolo de cada ligação
  let dx = 0, dy = 0, dz = 0;
  encontrarLigacoes().forEach(({ a1, a2 }) => {
    const en1 = EN[a1.elem] ?? 2.5;
    const en2 = EN[a2.elem] ?? 2.5;
    const d   = dist3D(a1, a2);
    if (d < 0.01) return;
    const delta = en2 - en1;
    dx += delta * (a2.x - a1.x) / d;
    dy += delta * (a2.y - a1.y) / d;
    dz += delta * (a2.z - a1.z) / d;
  });

  const mag = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (mag < 0.05) {
    viewer.addLabel('Apolar  (μ ≈ 0 D)', {
      position: { x: cx, y: cy + 2.2, z: cz },
      backgroundColor: 'rgba(16,185,129,0.85)',
      fontColor: '#ffffff',
      fontSize: 12, fontStyle: 'bold',
      borderThickness: 0, inFront: true,
    });
    return;
  }

  const escala = 2.6;
  const ex = cx + (dx / mag) * escala;
  const ey = cy + (dy / mag) * escala;
  const ez = cz + (dz / mag) * escala;

  viewer.addArrow({
    start:       { x: cx, y: cy, z: cz },
    end:         { x: ex, y: ey, z: ez },
    radius:      0.10,
    color:       '#f97316',
    radiusRatio: 3.0,
    mid:         0.75,
  });

  const muVal = calcularMagnitudeDipolo();
  viewer.addLabel(`μ = ${muVal.toFixed(2)} D`, {
    position:        { x: ex, y: ey + 0.65, z: ez },
    backgroundColor: 'rgba(249,115,22,0.90)',
    fontColor:       '#ffffff',
    fontSize:        12, fontStyle: 'bold',
    borderThickness: 0, inFront: true,
  });
}

// ── CARGAS PARCIAIS ───────────────────────────────────────────────────────────
function renderizarCargasParciais() {
  atomosAtuais.forEach(a => {
    const vizinhos = atomosAtuais.filter(b => b !== a && dist3D(a, b) < 2.5);
    if (!vizinhos.length) return;

    const enA    = EN[a.elem] ?? 2.5;
    const avgViz = vizinhos.reduce((s, b) => s + (EN[b.elem] ?? 2.5), 0) / vizinhos.length;
    const diff   = enA - avgViz;

    let label, cor;
    if (diff >  0.35) { label = 'δ−'; cor = '#f87171'; }
    else if (diff < -0.35) { label = 'δ+'; cor = '#60a5fa'; }
    else return;

    viewer.addLabel(label, {
      position:        { x: a.x, y: a.y + 0.55, z: a.z },
      fontColor:       cor,
      fontSize:        13, fontStyle: 'bold',
      backgroundColor: 'rgba(0,0,0,0)',
      backgroundOpacity: 0,
      borderThickness: 0,
      inFront:         true,
    });
  });
}

// ── SUPERFÍCIE ELETROSTÁTICA ──────────────────────────────────────────────────
function renderizarSuperficie() {
  if (!viewer) return;
  // Mapa de cores por elemento (baseado em EN)
  const colorMap = {};
  atomosAtuais.forEach(a => { colorMap[a.elem] = enParaCor(a.elem); });

  superficieId = viewer.addSurface(
    $3Dmol.SurfaceType.VDW,
    { opacity: 0.60, colorscheme: { prop: 'elem', map: colorMap } },
    {},
  );
}

// ── ANÁLISE PAINEL ────────────────────────────────────────────────────────────
function atualizarAnalise() {
  const el = document.getElementById('analise-conteudo');
  if (!molActiva || !atomosAtuais.length) {
    el.innerHTML = '<p class="analise-vazio">Selecione uma molécula para ver a análise.</p>';
    return;
  }

  const { geometria, nLig, nLP } = inferirGeometria();
  const mu      = calcularMagnitudeDipolo();
  const polar   = mu > 0.08;

  const badgeCls  = polar ? 'polar' : 'apolar';
  const badgeIcon = polar ? '⚡' : '◎';
  const badgeTxt  = polar ? 'POLAR' : 'APOLAR';

  const explicacao = polar
    ? `A molécula ${molActiva.nome} é <strong>polar</strong> porque a soma vetorial dos dipolos de ligação é não nula (μ = ${mu.toFixed(2)} D). A geometria ${geometria.split(' ')[0].toLowerCase()} e a diferença de eletronegatividade entre os átomos criam uma distribuição assimétrica de carga.`
    : `A molécula ${molActiva.nome} é <strong>apolar</strong> porque os dipolos de ligação se cancelam por simetria (μ ≈ 0 D). Mesmo que existam ligações polares, a geometria ${geometria.split(' ')[0].toLowerCase()} é simétrica e a resultante vetorial é zero.`;

  el.innerHTML = `
    <div class="analise-grid">
      <div class="analise-item span2">
        <div class="ai-label">Molécula</div>
        <div class="ai-valor">${molActiva.nome} <span style="color:var(--text-muted);font-family:monospace;font-size:0.82rem;">${molActiva.formula}</span></div>
      </div>
      <div class="analise-item">
        <div class="ai-label">Geometria</div>
        <div class="ai-valor" style="font-size:0.82rem;">${geometria}</div>
      </div>
      <div class="analise-item">
        <div class="ai-label">Dipolo (μ)</div>
        <div class="ai-valor">${mu.toFixed(2)} D</div>
      </div>
      <div class="analise-item">
        <div class="ai-label">Ligações</div>
        <div class="ai-valor">${nLig}</div>
      </div>
      <div class="analise-item">
        <div class="ai-label">Pares Livres</div>
        <div class="ai-valor">${nLP}</div>
      </div>
      <div class="analise-item span2">
        <div class="ai-label">Polaridade</div>
        <span id="badge-polaridade" class="${badgeCls}">${badgeIcon} ${badgeTxt}</span>
      </div>
    </div>
    <p id="explicacao-polar">${explicacao}</p>`;
}

function atualizarTabelaEN() {
  const el = document.getElementById('tabela-en');
  if (!atomosAtuais.length) { el.innerHTML = '<p class="analise-vazio">Carregue uma molécula.</p>'; return; }

  // Elementos únicos, ordenados por EN desc
  const elementos = [...new Set(atomosAtuais.map(a => a.elem))]
    .sort((a, b) => (EN[b] ?? 2.5) - (EN[a] ?? 2.5));

  const enMax = 4.0, enMin = 1.0;
  el.innerHTML = elementos.map(elem => {
    const en  = EN[elem] ?? 2.5;
    const pct = Math.round(((en - enMin) / (enMax - enMin)) * 100);
    const cor = CORES_CPK[elem] ?? '#aaaaaa';
    return `<div class="en-row">
      <div class="en-elem" style="background:${cor}; color:${lumens(cor) > 128 ? '#000' : '#fff'}">${elem}</div>
      <span class="en-nome">Eletroneg.</span>
      <span class="en-valor">${en.toFixed(2)}</span>
      <div class="en-bar-wrap"><div class="en-bar" style="width:${pct}%; background:${enParaCor(elem)};"></div></div>
    </div>`;
  }).join('');
}

function actualizarOverlay() {
  const el = document.getElementById('overlay-polaridade');
  if (!molActiva) { el.style.display = 'none'; return; }
  const mu    = calcularMagnitudeDipolo();
  const polar = mu > 0.08;
  el.style.display = 'block';
  el.textContent = polar ? '⚡ POLAR' : '◎ APOLAR';
  el.className    = polar ? 'polar' : 'apolar';
}

// ── CAMPO ELÉCTRICO (visual) ──────────────────────────────────────────────────
function toggleCampo(ativo) {
  const overlay = document.getElementById('campo-overlay');
  if (ativo) {
    overlay.innerHTML = `
      <div class="placa neg"><span class="placa-label">−</span></div>
      <div class="placa pos"><span class="placa-label">+</span></div>
      ${Array.from({ length: 14 }, (_, i) => {
        const top = 4 + i * 7;
        const delay = (i * 0.18).toFixed(2);
        return `<div class="campo-linha" style="top:${top}%;animation-delay:${delay}s;"></div>`;
      }).join('')}`;
    overlay.classList.add('ativo');
  } else {
    overlay.classList.remove('ativo');
    overlay.innerHTML = `
      <div class="placa neg"><span class="placa-label">−</span></div>
      <div class="placa pos"><span class="placa-label">+</span></div>`;
  }
}

// ── EVENTOS ───────────────────────────────────────────────────────────────────
function registarEventos() {
  // Checkboxes de visualização
  ['chk-dipol-lig','chk-dipol-mol','chk-cargas'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      if (sdfActual) renderizarTudo(sdfActual);
    });
  });

  // Superfície precisa de tratamento especial (é lenta)
  document.getElementById('chk-superficie')?.addEventListener('change', e => {
    if (!viewer || !sdfActual) return;
    if (e.target.checked) {
      renderizarSuperficie();
      viewer.render();
    } else {
      if (superficieId !== null) { viewer.removeSurface(superficieId); superficieId = null; }
      viewer.render();
    }
  });

  // Campo eléctrico
  document.getElementById('chk-campo')?.addEventListener('change', e => {
    toggleCampo(e.target.checked);
  });

  // Categoria tabs
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      categoriaActiva = btn.dataset.cat;
      renderizarLista();
    });
  });

  // Pesquisa
  document.getElementById('input-busca')?.addEventListener('input', e => {
    buscaActual = e.target.value.toLowerCase().trim();
    // Se há texto de busca, mostra todos os resultados independente da categoria
    if (buscaActual) {
      const todos = Object.values(bibliotecaDB).flat().filter(m =>
        m.nome.toLowerCase().includes(buscaActual) ||
        m.formula.toLowerCase().includes(buscaActual)
      );
      const lista = document.getElementById('lista-moleculas');
      if (!todos.length) {
        lista.innerHTML = '<p style="color:var(--text-muted);font-size:0.83rem;padding:0.8rem;text-align:center;">Nenhum resultado.</p>';
        return;
      }
      lista.innerHTML = todos.map(m => `
        <div class="mol-card${molActiva?.pubchem === m.pubchem ? ' ativa' : ''}"
             data-pubchem="${m.pubchem}" data-nome="${m.nome}" data-formula="${m.formula}">
          <div class="mol-nome">${m.nome}</div>
          <div class="mol-formula">${subscript(m.formula)}</div>
        </div>`).join('');
      lista.querySelectorAll('.mol-card').forEach(card => {
        card.addEventListener('click', () => carregarMolecula(card.dataset.pubchem, card.dataset.nome, card.dataset.formula));
      });
    } else {
      renderizarLista();
    }
  });
}

// ── UTILITÁRIOS VSEPR ─────────────────────────────────────────────────────────
function inferirGeometria() {
  if (!atomosAtuais.length) return { geometria: '—', nLig: 0, nLP: 0 };
  const { centralIdx, vizinhos } = encontrarAtomoCentral();
  const central = atomosAtuais[centralIdx];
  const nLig    = vizinhos.length;
  const val     = ELETRONS_VALENCIA[central.elem] ?? 4;
  const nLP     = Math.max(0, Math.floor((val - nLig) / 2));
  const geo     = GEOMETRIA_VSEPR[`${nLig}-${nLP}`] || (nLig === 1 ? 'Diatómica' : `${nLig} ligações`);
  return { geometria: geo, nLig, nLP };
}

function calcularMagnitudeDipolo() {
  if (atomosAtuais.length < 2) return 0;
  let dx = 0, dy = 0, dz = 0;
  encontrarLigacoes().forEach(({ a1, a2 }) => {
    const en1 = EN[a1.elem] ?? 2.5, en2 = EN[a2.elem] ?? 2.5;
    const d   = dist3D(a1, a2);
    if (d < 0.01) return;
    const delta = en2 - en1;
    dx += delta * (a2.x - a1.x) / d;
    dy += delta * (a2.y - a1.y) / d;
    dz += delta * (a2.z - a1.z) / d;
  });
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function encontrarLigacoes() {
  const bonds = [];
  for (let i = 0; i < atomosAtuais.length; i++)
    for (let j = i + 1; j < atomosAtuais.length; j++)
      if (dist3D(atomosAtuais[i], atomosAtuais[j]) < 2.5)
        bonds.push({ a1: atomosAtuais[i], a2: atomosAtuais[j] });
  return bonds;
}

function encontrarAtomoCentral() {
  const con = new Map();
  for (let i = 0; i < atomosAtuais.length; i++)
    for (let j = i + 1; j < atomosAtuais.length; j++)
      if (dist3D(atomosAtuais[i], atomosAtuais[j]) < 2.5) {
        con.set(i, (con.get(i) || 0) + 1);
        con.set(j, (con.get(j) || 0) + 1);
      }
  let centralIdx = 0, maxCon = 0;
  con.forEach((v, k) => { if (v > maxCon) { maxCon = v; centralIdx = k; } });
  const central  = atomosAtuais[centralIdx];
  const vizinhos = atomosAtuais.filter((a, i) => i !== centralIdx && dist3D(central, a) < 2.5);
  return { centralIdx, vizinhos };
}

// ── PARSER SDF ────────────────────────────────────────────────────────────────
function parsearAtomos(sdf) {
  const linhas = sdf.split('\n');
  const atoms  = [];
  if (linhas.length < 4) return atoms;
  const headerLine = linhas[3] || '';
  const nAtoms     = parseInt(headerLine.substring(0, 3), 10);
  if (isNaN(nAtoms) || nAtoms <= 0) return atoms;
  for (let i = 4; i < 4 + nAtoms && i < linhas.length; i++) {
    const l = linhas[i];
    const x = parseFloat(l.substring(0, 10));
    const y = parseFloat(l.substring(10, 20));
    const z = parseFloat(l.substring(20, 30));
    const e = l.substring(31, 34).trim();
    if (e && !isNaN(x)) atoms.push({ x, y, z, elem: e });
  }
  return atoms;
}

// ── MATEMÁTICA ────────────────────────────────────────────────────────────────
function dist3D(a, b) {
  return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2 + (a.z-b.z)**2);
}
function normalize3D(v) {
  const m = Math.sqrt(v.x**2 + v.y**2 + v.z**2) || 1;
  return { x: v.x/m, y: v.y/m, z: v.z/m };
}

// Luminância aproximada de uma cor hex (para decidir texto preto ou branco)
function lumens(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return 0.299*r + 0.587*g + 0.114*b;
}

// ── STATUS BAR ────────────────────────────────────────────────────────────────
function mostrarStatus(tipo, msg) {
  const el = document.getElementById('status-bar');
  el.className    = `status-${tipo}`;
  el.textContent  = msg;
  el.style.display = 'block';
  if (tipo === 'ok') setTimeout(() => { el.style.display = 'none'; }, 3000);
}

// Helper: lê estado de checkbox
function chk(id) { return document.getElementById(id)?.checked ?? false; }

// Converte "H2O" → "H₂O" usando dígitos subscritos Unicode
function subscript(formula) {
  return formula.replace(/(\d+)/g, n => n.split('').map(d => '₀₁₂₃₄₅₆₇₈₉'[+d]).join(''));
}
