// =============================================================================
// GEOMETRIA.JS — Motor de Visualização Molecular 3D (PhET-like)
// STEM Licungo | Universidade Licungo, Moçambique
// Depende de: 3Dmol.js (CDN)
// =============================================================================

'use strict';

// --- Estado Global ---
let viewer = null;
let modeloAtual = null;
let atomosAtuais = [];
let estaCarregando = false;

// --- Modo de visualização: 'bastoes-esferas' | 'so-esferas' ---
let modoVisualizacao = 'bastoes-esferas';

// --- Interação PhET-like ---
let sobreAtomo = false;
let arrastandoAtomo = false;
let viewInicio = null;
let mouseInicioX = 0;
let mouseInicioY = 0;

// =============================================================================
// TABELAS QUÍMICAS
// =============================================================================

const ELETRONEGATIVIDADE = {
  H:2.20, C:2.55, N:3.04, O:3.44, F:3.98, Cl:3.16, Br:2.96,
  I:2.66,  S:2.58, P:2.19, Na:0.93, K:0.82, Ca:1.00, Mg:1.31,
  Al:1.61, Si:1.90, Se:2.55, B:2.04, As:2.18, Fe:1.83, Cu:1.90
};

const ELETRONS_VALENCIA = {
  H:1, C:4, N:5, O:6, F:7, Cl:7, Br:7, I:7, S:6, P:5, B:3, Si:4, As:5, Se:6
};

// Geometrias VSEPR: chave = "nLigações-nParesLivres"
const GEOMETRIA_VSEPR = {
  '1-0': 'Diatômica',
  '2-0': 'Linear (180°)',
  '3-0': 'Trigonal Planar (120°)',
  '2-1': 'Angular (~120°)',
  '4-0': 'Tetraédrica (109.5°)',
  '3-1': 'Pirâmide Trigonal (~107°)',
  '2-2': 'Angular (~104.5°)',
  '5-0': 'Bipiramidal Trigonal (90°/120°)',
  '4-1': 'Gangorra (Seesaw)',
  '3-2': 'Forma de T (90°)',
  '2-3': 'Linear (180°)',
  '6-0': 'Octaédrica (90°)',
  '5-1': 'Pirâmide Quadrangular (~90°)',
  '4-2': 'Quadrangular Planar (90°)',
};

function determinarGeometria(nLig, nLP) {
  return GEOMETRIA_VSEPR[`${nLig}-${nLP}`]
    || (nLig === 1 ? 'Diatômica' : `${nLig} ligações`);
}

// =============================================================================
// INICIALIZAÇÃO DO VISUALIZADOR
// =============================================================================

function iniciarVisualizador() {
  const container = document.getElementById('viewer-container');
  if (!container) return;

  if (!window.$3Dmol) {
    mostrarStatus('erro', '3Dmol.js não pôde ser carregado. Verifique a ligação à internet.');
    return;
  }

  try {
    viewer = $3Dmol.createViewer(container, {
      backgroundColor: '#0f172a',
      antialias: true,
    });
  } catch (e) {
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:12px;color:#94a3b8;padding:24px;text-align:center;">
        <span style="font-size:2.5rem;">⚠️</span>
        <p style="font-size:0.95rem;font-weight:600;color:#f8fafc;">Visualização 3D indisponível</p>
        <p style="font-size:0.82rem;line-height:1.5;">
          O seu navegador não suporta WebGL, necessário para a renderização molecular.<br>
          Tente um navegador moderno como Chrome, Firefox ou Edge.
        </p>
      </div>`;
    return;
  }

  configurarInteracao();
  configurarListeners();

  // Verifica se há molécula na URL (?mol=...)
  const params = new URLSearchParams(window.location.search);
  const molQuery = params.get('mol');
  if (molQuery) {
    document.getElementById('search-input').value = decodeURIComponent(molQuery);
    setTimeout(() => buscarMolecula(molQuery), 400);
  }
}

function configurarListeners() {
  document.getElementById('btn-buscar-pubchem')?.addEventListener('click', () => {
    const q = document.getElementById('search-input').value.trim();
    if (q) buscarMolecula(q);
  });

  document.getElementById('search-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = e.target.value.trim();
      if (q) buscarMolecula(q);
    }
  });

  // Modo de visualização (radio)
  document.querySelectorAll('input[name="modo-vis"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      modoVisualizacao = e.target.value;
      atualizarVisualizacao();
    });
  });

  document.getElementById('chk-simbolos')?.addEventListener('change', atualizarVisualizacao);
  document.getElementById('chk-angles')?.addEventListener('change', atualizarVisualizacao);
  document.getElementById('chk-pares')?.addEventListener('change', atualizarVisualizacao);
  document.getElementById('chk-dipolo')?.addEventListener('change', atualizarVisualizacao);
}

// =============================================================================
// INTERAÇÃO TIPO PhET
// Clicar e arrastar sobre átomo → TRADUZ a molécula
// Clicar e arrastar em espaço vazio → RODA a molécula (comportamento padrão 3Dmol)
// =============================================================================

function configurarInteracao() {
  const container = document.getElementById('viewer-container');
  if (!container || !viewer) return;

  // Deteta passagem do rato sobre átomo
  viewer.setHoverable({}, true,
    function(/* atom */) {
      sobreAtomo = true;
      container.style.cursor = 'grab';
    },
    function() {
      sobreAtomo = false;
      if (!arrastandoAtomo) container.style.cursor = 'default';
    }
  );

  // Ao pressionar (átomo ou espaço vazio): pausa a rotação automática
  container.addEventListener('mousedown', function(e) {
    if (e.button !== 0) return;
    viewer.spin(false); // pausa spin durante interação
    if (sobreAtomo) {
      arrastandoAtomo = true;
      viewInicio = viewer.getView();
      mouseInicioX = e.clientX;
      mouseInicioY = e.clientY;
      container.style.cursor = 'grabbing';
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);

  // Arrastar átomo → translação via setView
  document.addEventListener('mousemove', function(e) {
    if (!arrastandoAtomo || !viewInicio) return;
    const escala = 0.016;
    const dx =  (e.clientX - mouseInicioX) * escala;
    const dy = -(e.clientY - mouseInicioY) * escala;
    const novaView = [...viewInicio];
    novaView[0] = viewInicio[0] + dx;
    novaView[1] = viewInicio[1] + dy;
    viewer.setView(novaView, 0);
    e.stopPropagation();
  });

  // Soltar rato → termina arrasto e retoma rotação automática
  document.addEventListener('mouseup', function() {
    if (arrastandoAtomo) {
      arrastandoAtomo = false;
      const container = document.getElementById('viewer-container');
      if (container) container.style.cursor = sobreAtomo ? 'grab' : 'default';
    }
    if (modeloAtual) viewer.spin('y', 1.5); // retoma spin
  });

  // Suporte toque (mobile)
  let touchSobreAtomo = false;
  container.addEventListener('touchstart', function(e) {
    // Simplificado: toque sempre traduz
    if (e.touches.length === 1) {
      arrastandoAtomo = true;
      viewInicio = viewer.getView();
      mouseInicioX = e.touches[0].clientX;
      mouseInicioY = e.touches[0].clientY;
      e.stopPropagation();
    }
  }, { passive: false });

  document.addEventListener('touchmove', function(e) {
    if (!arrastandoAtomo || !viewInicio || e.touches.length !== 1) return;
    const escala = 0.016;
    const dx =  (e.touches[0].clientX - mouseInicioX) * escala;
    const dy = -(e.touches[0].clientY - mouseInicioY) * escala;
    const novaView = [...viewInicio];
    novaView[0] = viewInicio[0] + dx;
    novaView[1] = viewInicio[1] + dy;
    viewer.setView(novaView, 0);
  }, { passive: true });

  document.addEventListener('touchend', function() {
    arrastandoAtomo = false;
  });
}

// =============================================================================
// BUSCA E RENDERIZAÇÃO
// =============================================================================

async function buscarMolecula(query) {
  if (estaCarregando) return;
  estaCarregando = true;

  mostrarStatus('carregando', `A buscar "${query}" no PubChem…`);
  limparPainelInfo();

  try {
    // Busca SDF (estrutura 3D) e informações em paralelo
    const [sdfRes, infoRes] = await Promise.all([
      fetch(`/api/pubchem/sdf/${encodeURIComponent(query)}`),
      fetch(`/api/pubchem/info/${encodeURIComponent(query)}`),
    ]);

    if (!sdfRes.ok) {
      throw new Error(
        `Composto "${query}" não encontrado. Tente o nome em inglês (ex: "water", "methane") ou a fórmula (ex: H2O).`
      );
    }

    const sdf  = await sdfRes.text();
    const info = infoRes.ok ? await infoRes.json() : null;

    renderizarMolecula(sdf, info, query);
    preencherPainelInfo(info, query);
    mostrarStatus('ok', `"${query}" carregada com sucesso.`);

    // Pesquisa de literatura em segundo plano (não bloqueia)
    buscarLiteratura(query, info).catch(() => {});

  } catch (err) {
    mostrarStatus('erro', err.message);
  } finally {
    estaCarregando = false;
  }
}

// Retorna o estilo 3Dmol baseado no modo seleccionado
function getEstiloMolecula() {
  if (modoVisualizacao === 'so-esferas') {
    // Modo CPK / Space-Fill: esferas grandes com raio van der Waals
    return { sphere: { colorscheme: 'Jmol', scale: 1.0 } };
  }
  // Modo padrão: bastões + esferas menores
  // Esferas com scale 0.28 para que os bastões sejam bem visíveis entre os átomos
  return {
    sphere: { colorscheme: 'Jmol', scale: 0.28 },
    stick:  { colorscheme: 'Jmol', radius: 0.22 },
  };
}

function renderizarMolecula(sdf, info, nomeQuery) {
  viewer.clear();
  viewer.removeAllLabels();
  viewer.removeAllShapes();

  modeloAtual = viewer.addModel(sdf, 'sdf');
  atomosAtuais = modeloAtual.selectedAtoms({});

  viewer.setStyle({}, getEstiloMolecula());

  if (document.getElementById('chk-simbolos')?.checked) renderizarLabels();
  if (document.getElementById('chk-angles')?.checked)   renderizarAngulos();
  if (document.getElementById('chk-pares')?.checked)    renderizarParesSolitarios();
  if (document.getElementById('chk-dipolo')?.checked)   renderizarVetorDipolo();

  viewer.zoomTo();
  viewer.render();
  viewer.spin('y', 1.5); // rotação automática a 1.5×
}

function atualizarVisualizacao() {
  if (!modeloAtual || !viewer) return;
  viewer.removeAllLabels();
  viewer.removeAllShapes();

  viewer.setStyle({}, getEstiloMolecula());

  if (document.getElementById('chk-simbolos')?.checked) renderizarLabels();
  if (document.getElementById('chk-angles')?.checked)   renderizarAngulos();
  if (document.getElementById('chk-pares')?.checked)    renderizarParesSolitarios();
  if (document.getElementById('chk-dipolo')?.checked)   renderizarVetorDipolo();

  viewer.render();
}

// =============================================================================
// LABELS DOS ÁTOMOS (símbolo na superfície)
// =============================================================================

function renderizarLabels() {
  if (!atomosAtuais.length) return;
  atomosAtuais.forEach(atom => {
    const elem = atom.elem || '?';
    // Cor do texto: escura para H e elementos claros, branca para os demais
    const corTexto = (elem === 'H') ? '#1e293b' : '#ffffff';
    viewer.addLabel(elem, {
      position:        { x: atom.x, y: atom.y, z: atom.z },
      fontColor:       corTexto,
      fontSize:        14,
      fontStyle:       'bold',
      alignment:       'center',
      showBackground:  false,
      inFront:         true,
    });
  });
}

// =============================================================================
// ÂNGULOS DE LIGAÇÃO
// =============================================================================

function renderizarAngulos() {
  if (atomosAtuais.length < 3) return;

  const { centralIdx, vizinhos } = encontrarAtomoCentral();
  if (vizinhos.length < 2) return;

  const central = atomosAtuais[centralIdx];

  // Mostrar ângulo entre cada par de vizinhos
  for (let i = 0; i < vizinhos.length; i++) {
    for (let j = i + 1; j < vizinhos.length; j++) {
      const ang = calcularAngulo(vizinhos[i], central, vizinhos[j]);
      // Posição da label: ponto médio entre os dois vizinhos, deslocado para o centro
      const mx = (vizinhos[i].x + vizinhos[j].x) / 2;
      const my = (vizinhos[i].y + vizinhos[j].y) / 2;
      const mz = (vizinhos[i].z + vizinhos[j].z) / 2;
      const px = (mx + central.x) / 2;
      const py = (my + central.y) / 2;
      const pz = (mz + central.z) / 2;

      viewer.addLabel(`${ang.toFixed(1)}°`, {
        position:       { x: px, y: py, z: pz },
        backgroundColor:'rgba(14,165,233,0.85)',
        fontColor:      '#ffffff',
        fontSize:       11,
        fontStyle:      'bold',
        borderThickness: 0,
        inFront:        true,
      });
    }
  }
}

// =============================================================================
// VETOR DIPOLO MOLECULAR
// =============================================================================

function renderizarVetorDipolo() {
  if (!atomosAtuais.length) return;

  // Centro geométrico
  let cx = 0, cy = 0, cz = 0;
  atomosAtuais.forEach(a => { cx += a.x; cy += a.y; cz += a.z; });
  cx /= atomosAtuais.length;
  cy /= atomosAtuais.length;
  cz /= atomosAtuais.length;

  // Soma vetorial dos momentos de dipolo de cada ligação
  let dx = 0, dy = 0, dz = 0;
  for (let i = 0; i < atomosAtuais.length; i++) {
    for (let j = i + 1; j < atomosAtuais.length; j++) {
      const a1 = atomosAtuais[i];
      const a2 = atomosAtuais[j];
      const d = dist3D(a1, a2);
      if (d < 2.5) { // provavelmente ligados
        const en1 = ELETRONEGATIVIDADE[a1.elem] ?? 2.0;
        const en2 = ELETRONEGATIVIDADE[a2.elem] ?? 2.0;
        // Vetor aponta de a1→a2, ponderado pela diferença de EN
        const delta = en2 - en1;
        dx += delta * (a2.x - a1.x) / d;
        dy += delta * (a2.y - a1.y) / d;
        dz += delta * (a2.z - a1.z) / d;
      }
    }
  }

  const mag = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (mag < 0.05) {
    // Molécula apolar
    viewer.addLabel('Apolar  (μ ≈ 0 D)', {
      position:       { x: cx, y: cy + 3, z: cz },
      backgroundColor:'rgba(34,197,94,0.9)',
      fontColor:      '#ffffff',
      fontSize:       13,
      fontStyle:      'bold',
      borderThickness: 0,
      inFront:        true,
    });
    return;
  }

  const escala = 2.8;
  const ex = cx + (dx / mag) * escala;
  const ey = cy + (dy / mag) * escala;
  const ez = cz + (dz / mag) * escala;

  viewer.addArrow({
    start:       { x: cx, y: cy, z: cz },
    end:         { x: ex, y: ey, z: ez },
    radius:      0.09,
    color:       '#f97316',
    radiusRatio: 3.0,
    mid:         0.75,
  });

  viewer.addLabel(`μ = ${mag.toFixed(2)} D`, {
    position:       { x: ex, y: ey + 0.7, z: ez },
    backgroundColor:'rgba(249,115,22,0.92)',
    fontColor:      '#ffffff',
    fontSize:       12,
    fontStyle:      'bold',
    borderThickness: 0,
    inFront:        true,
  });
}

// =============================================================================
// PARES DE ELETRÕES LIVRES (estilo PhET)
// =============================================================================

function renderizarParesSolitarios() {
  if (!atomosAtuais.length) return;

  const { centralIdx, vizinhos } = encontrarAtomoCentral();
  const central = atomosAtuais[centralIdx];
  const nLig = vizinhos.length;
  const valEletrons = ELETRONS_VALENCIA[central.elem] ?? 4;
  const nLP = Math.max(0, Math.floor((valEletrons - nLig) / 2));

  if (nLP === 0) return; // nenhum par solitário

  const bondVecs = vizinhos.map(v =>
    normalize3D({ x: v.x - central.x, y: v.y - central.y, z: v.z - central.z })
  );

  const lpPositions = calcularPosicoesParesSolitarios(central, bondVecs, nLP);

  lpPositions.forEach(lp => {
    // Dois pequenos lóbulos por par solitário (como no PhET)
    const lpVec = normalize3D({ x: lp.x - central.x, y: lp.y - central.y, z: lp.z - central.z });

    // Encontra um vetor perpendicular ao lpVec para separar os dois eletrões
    const arb = Math.abs(lpVec.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
    const perp = normalize3D(cross3D(lpVec, arb));
    const sep = 0.22; // separação entre os dois eletrões do par

    const e1 = { x: lp.x + perp.x * sep, y: lp.y + perp.y * sep, z: lp.z + perp.z * sep };
    const e2 = { x: lp.x - perp.x * sep, y: lp.y - perp.y * sep, z: lp.z - perp.z * sep };

    // Esfera translúcida de fundo (envelope do par)
    viewer.addSphere({
      center: lp,
      radius: 0.40,
      color: '#60a5fa',
      opacity: 0.22,
    });

    // Dois eletrões do par como esferas menores
    [e1, e2].forEach(e => {
      viewer.addSphere({
        center: e,
        radius: 0.18,
        color: '#93c5fd',
        opacity: 0.85,
      });
    });
  });
}

/**
 * Calcula as posições dos pares de eletrões livres usando minimização de energia
 * (repulsão de Coulomb entre todos os domínios electrónicos — PhET/VSEPR).
 */
function calcularPosicoesParesSolitarios(central, bondVecs, nLP) {
  // Inicializar posições LP de forma aproximada, distribuídas na esfera
  let lpVecs = [];
  const phi = Math.PI * (3 - Math.sqrt(5)); // ângulo de ouro
  for (let i = 0; i < nLP; i++) {
    const y = 1 - (i / Math.max(nLP - 1, 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = phi * i;
    lpVecs.push(normalize3D({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r }));
  }

  // Minimização iterativa: maximizar repulsão de todos os domínios electrónicos
  const allVecs = () => [...bondVecs, ...lpVecs];
  const lr = 0.08;

  for (let iter = 0; iter < 80; iter++) {
    for (let i = 0; i < nLP; i++) {
      const lpIdx = bondVecs.length + i;
      const all = allVecs();
      let grad = { x: 0, y: 0, z: 0 };

      for (let j = 0; j < all.length; j++) {
        if (j === lpIdx) continue;
        const dx = all[lpIdx].x - all[j].x;
        const dy = all[lpIdx].y - all[j].y;
        const dz = all[lpIdx].z - all[j].z;
        const d2 = dx * dx + dy * dy + dz * dz + 1e-4;
        const f = 1 / (d2 * Math.sqrt(d2));
        grad.x += dx * f; grad.y += dy * f; grad.z += dz * f;
      }

      // Projetar gradiente na superfície da esfera (remover componente radial)
      const lp = all[lpIdx];
      const radComp = grad.x * lp.x + grad.y * lp.y + grad.z * lp.z;
      grad = { x: grad.x - radComp * lp.x, y: grad.y - radComp * lp.y, z: grad.z - radComp * lp.z };

      lpVecs[i] = normalize3D({
        x: lp.x + grad.x * lr,
        y: lp.y + grad.y * lr,
        z: lp.z + grad.z * lr,
      });
    }
  }

  // Converter de vectores unitários para posições no espaço
  const lpDist = 1.05; // distância ao átomo central (Å)
  return lpVecs.map(v => ({
    x: central.x + v.x * lpDist,
    y: central.y + v.y * lpDist,
    z: central.z + v.z * lpDist,
  }));
}

// =============================================================================
// UTILITÁRIOS MATEMÁTICOS
// =============================================================================

function dist3D(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function normalize3D(v) {
  const m = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1;
  return { x: v.x / m, y: v.y / m, z: v.z / m };
}

function cross3D(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function calcularAngulo(a, centro, b) {
  const v1 = { x: a.x - centro.x, y: a.y - centro.y, z: a.z - centro.z };
  const v2 = { x: b.x - centro.x, y: b.y - centro.y, z: b.z - centro.z };
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const m1 = Math.sqrt(v1.x ** 2 + v1.y ** 2 + v1.z ** 2);
  const m2 = Math.sqrt(v2.x ** 2 + v2.y ** 2 + v2.z ** 2);
  return Math.acos(Math.max(-1, Math.min(1, dot / (m1 * m2)))) * (180 / Math.PI);
}

function encontrarAtomoCentral() {
  const con = new Map();
  for (let i = 0; i < atomosAtuais.length; i++) {
    for (let j = i + 1; j < atomosAtuais.length; j++) {
      if (dist3D(atomosAtuais[i], atomosAtuais[j]) < 2.5) {
        con.set(i, (con.get(i) || 0) + 1);
        con.set(j, (con.get(j) || 0) + 1);
      }
    }
  }
  let centralIdx = 0, maxCon = 0;
  con.forEach((val, idx) => { if (val > maxCon) { maxCon = val; centralIdx = idx; } });

  const central = atomosAtuais[centralIdx];
  const vizinhos = atomosAtuais.filter((a, i) => i !== centralIdx && dist3D(central, a) < 2.5);
  return { centralIdx, vizinhos, conectividade: maxCon };
}

// =============================================================================
// PAINEL DE INFORMAÇÕES (coluna direita)
// =============================================================================

function preencherPainelInfo(info, nomeQuery) {
  const props = info?.PropertyTable?.Properties?.[0];

  setTexto('info-nome',
    props?.IUPACName ? capitalizar(props.IUPACName) : capitalizar(nomeQuery || 'Molécula'));
  setTexto('info-formula',   props?.MolecularFormula || nomeQuery || '-');
  setTexto('info-peso',      props?.MolecularWeight  ? `${props.MolecularWeight} g/mol` : '-');
  setTexto('info-carga',     props?.Charge !== undefined ? String(props.Charge) : '-');

  // Geometria calculada a partir dos átomos (após renderizar)
  if (atomosAtuais.length) {
    const geo = calcularInfoGeometria();
    setTexto('info-geometria', geo.geometria);
    setTexto('info-angulos',   geo.angulosTexto);
    setTexto('info-polaridade', geo.polar ? 'Polar' : 'Apolar');
  }
}

function calcularInfoGeometria() {
  if (!atomosAtuais.length) return { geometria: '-', angulosTexto: '-', polar: false };

  const { centralIdx, vizinhos } = encontrarAtomoCentral();
  const central = atomosAtuais[centralIdx];
  const nLig = vizinhos.length;
  const valEletrons = ELETRONS_VALENCIA[central.elem] ?? 4;
  const nLP = Math.max(0, Math.floor((valEletrons - nLig) / 2));
  const geometria = determinarGeometria(nLig, nLP);

  let angulosTexto = '-';
  if (vizinhos.length >= 2) {
    const ang = calcularAngulo(vizinhos[0], central, vizinhos[1]);
    angulosTexto = `${ang.toFixed(1)}°`;
    if (vizinhos.length > 2) angulosTexto += ' (típico)';
  }

  // Polaridade via dipolo
  let dx = 0, dy = 0, dz = 0;
  for (let i = 0; i < atomosAtuais.length; i++) {
    for (let j = i + 1; j < atomosAtuais.length; j++) {
      const a1 = atomosAtuais[i], a2 = atomosAtuais[j];
      const d = dist3D(a1, a2);
      if (d < 2.5) {
        const delta = (ELETRONEGATIVIDADE[a2.elem] ?? 2.0) - (ELETRONEGATIVIDADE[a1.elem] ?? 2.0);
        dx += delta * (a2.x - a1.x) / d;
        dy += delta * (a2.y - a1.y) / d;
        dz += delta * (a2.z - a1.z) / d;
      }
    }
  }
  const polar = Math.sqrt(dx * dx + dy * dy + dz * dz) > 0.05;

  return { geometria, angulosTexto, polar };
}

function limparPainelInfo() {
  ['info-nome','info-formula','info-peso','info-carga',
   'info-geometria','info-angulos','info-polaridade'].forEach(id => setTexto(id, '…'));
  const det = document.getElementById('info-detalhes');
  if (det) det.innerHTML = '<p class="lit-loading">A carregar informações…</p>';
}

// =============================================================================
// BUSCA DE LITERATURA (Semantic Scholar + PubChem Descrição)
// =============================================================================

async function buscarLiteratura(query, info) {
  const det = document.getElementById('info-detalhes');
  if (!det) return;
  det.innerHTML = '<p class="lit-loading">🔍 A pesquisar na literatura científica…</p>';

  const nomeBusca = info?.PropertyTable?.Properties?.[0]?.IUPACName || query;

  const [descRes, scholarRes] = await Promise.allSettled([
    fetch(`/api/pubchem/descricao/${encodeURIComponent(query)}`),
    fetch(`/api/scholar/${encodeURIComponent(nomeBusca + ' molecular geometry chemistry')}`),
  ]);

  let html = '';

  // Descrição do PubChem
  if (descRes.status === 'fulfilled' && descRes.value.ok) {
    const descData = await descRes.value.json().catch(() => null);
    const inf = descData?.InformationList?.Information?.[0];
    if (inf?.Description) {
      html += `
        <div class="lit-secao">
          <h5>📖 Descrição</h5>
          <p>${inf.Description.substring(0, 500)}${inf.Description.length > 500 ? '…' : ''}</p>
          ${inf.DescriptionURL ? `<a href="${inf.DescriptionURL}" target="_blank" class="lit-link">→ Ver fonte completa</a>` : ''}
        </div>`;
    }
  }

  // Artigos do Semantic Scholar
  if (scholarRes.status === 'fulfilled' && scholarRes.value.ok) {
    const sData = await scholarRes.value.json().catch(() => null);
    const artigos = sData?.data?.filter(p => p.title)?.slice(0, 3) || [];
    if (artigos.length > 0) {
      html += '<div class="lit-secao"><h5>📚 Artigos Científicos Relacionados</h5>';
      artigos.forEach(a => {
        const autores = a.authors?.slice(0, 2).map(x => x.name).join(', ') || '';
        html += `
          <div class="lit-artigo">
            <strong>${a.title}</strong>
            <span class="lit-meta">${autores}${a.year ? ' · ' + a.year : ''}</span>
            ${a.abstract ? `<p>${a.abstract.substring(0, 220)}…</p>` : ''}
            ${a.url ? `<a href="${a.url}" target="_blank" class="lit-link">→ Ler artigo</a>` : ''}
          </div>`;
      });
      html += '</div>';
    }
  }

  det.innerHTML = html || '<p style="color:#64748b;font-style:italic;">Sem informações adicionais disponíveis.</p>';
}

// =============================================================================
// FEEDBACK VISUAL (barra de estado)
// =============================================================================

function mostrarStatus(tipo, mensagem) {
  const el = document.getElementById('status-bar');
  if (!el) return;
  el.className = `status-bar status-${tipo}`;
  el.textContent = mensagem;
  el.style.display = 'block';
  if (tipo === 'ok') {
    setTimeout(() => { el.style.display = 'none'; }, 3500);
  }
}

// =============================================================================
// UTILITÁRIOS DOM
// =============================================================================

function setTexto(id, texto) {
  const el = document.getElementById(id);
  if (el) el.textContent = texto;
}

function capitalizar(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// =============================================================================
// ARRANQUE
// =============================================================================

document.addEventListener('DOMContentLoaded', iniciarVisualizador);
