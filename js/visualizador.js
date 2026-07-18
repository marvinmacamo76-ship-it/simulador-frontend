/* ==========================================================================
   MOTOR GRÁFICO 3D (Gerenciamento do 3Dmol.js) — versão corrigida
   ========================================================================== */

let visualizador3D = null;
let estiloAtual = 'ball';
let motorPronto = false;

/**
 * Converte o objeto modelo3D (lista de átomos) para o formato XYZ,
 * necessário para que o 3Dmol.js detete automaticamente as ligações químicas.
 */
function moleculaParaXYZ(molecula) {
    const atoms = molecula.modelo3D.atoms;
    const linhas = [String(atoms.length), molecula.nome || ''];
    atoms.forEach(a => {
        linhas.push(`${a.elem} ${a.x.toFixed(4)} ${a.y.toFixed(4)} ${a.z.toFixed(4)}`);
    });
    return linhas.join('\n');
}

function iniciarMotor3D() {
    const container = document.getElementById('mol-3d-viewer');
    if (!container) {
        console.error("Elemento do visualizador não encontrado.");
        return;
    }
    if (typeof $3Dmol === 'undefined') {
        throw new Error("Biblioteca 3Dmol.js não foi carregada.");
    }
    // Adia a criação até haver dimensões reais no contêiner (evita canvas 0x0)
    const criar = () => {
        if (container.clientWidth < 10 || container.clientHeight < 10) {
            return requestAnimationFrame(criar);
        }
        visualizador3D = $3Dmol.createViewer(container, {
            backgroundColor: '#0f172a',
            antialias: true
        });
        motorPronto = true;
    };
    criar();
}

function carregarMoleculaNoPainel3D(molecula, estilo = estiloAtual) {
    if (!molecula) return;
    if (!motorPronto || !visualizador3D) {
        // aguarda o motor terminar de iniciar antes de renderizar
        return requestAnimationFrame(() => carregarMoleculaNoPainel3D(molecula, estilo));
    }
    if (!molecula || !molecula.modelo3D || !molecula.modelo3D.atoms) {
        console.warn("Dados 3D ausentes para a molécula.");
        return;
    }

    estiloAtual = estilo;

    visualizador3D.clear();

    // Carrega via XYZ para que as ligações sejam perceptíveis automaticamente
    const xyz = moleculaParaXYZ(molecula);
    const model = visualizador3D.addModel(xyz, 'xyz');
    // Garante ligações mesmo quando o parser XYZ não as inferir
    try { if (model && typeof model.assignBonds === 'function') model.assignBonds(); } catch (e) {}

    if (estiloAtual === 'ball') {
        visualizador3D.setStyle({}, {
            stick: { radius: 0.12, colorscheme: 'Jmol' },
            sphere: { radius: 0.32, colorscheme: 'Jmol' }
        });
    } else {
        visualizador3D.setStyle({}, {
            sphere: { scale: 0.9, colorscheme: 'Jmol' }
        });
    }

    // 1. 🏷️ Etiquetas dos Átomos (Sempre visíveis para orientação)
    try {
        molecula.modelo3D.atoms.forEach(at => {
            visualizador3D.addLabel(at.elem, {
                position: { x: at.x + 0.2, y: at.y + 0.2, z: at.z },
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                fontSize: 12,
                fontColor: 'white',
                alignment: 'center',
                backgroundOpacity: 0.6,
                useScreen: false,
                inFront: true
            });
        });
    } catch (e) {
        console.warn("Aviso: Não foi possível carregar as etiquetas dos átomos.", e);
    }

    // 2. 📐 Ângulos de Ligação (chk-angles)
    const mostrarAngulos = document.getElementById("chk-angles")?.checked ?? true;
    if (mostrarAngulos && molecula.angulo) {
        const centro = molecula.modelo3D.atoms[0]; // O primeiro átomo da lista é o central
        visualizador3D.addLabel(molecula.angulo, {
            position: { x: centro.x, y: centro.y - 0.4, z: centro.z + 0.4 },
            backgroundColor: '#0ea5e9', // Azul vivo do teu cabeçalho CSS
            fontSize: 13,
            fontColor: 'white',
            backgroundOpacity: 0.9,
            useScreen: false,
            inFront: true
        });
    }

    // 3. ⚛️ Pares de Elétrons Isolados (chk-lonepairs)
    const mostrarParesIsolados = document.getElementById("chk-lonepairs")?.checked ?? true;
    if (mostrarParesIsolados && molecula.paresIsolados > 0) {
        const centro = molecula.modelo3D.atoms[0];
        // Adiciona pequenas esferas roxas para representar visualmente os pares isolados (PhET style!)
        for (let i = 0; i < molecula.paresIsolados; i++) {
            const offsetX = (i === 0 ? 0.45 : -0.45);
            visualizador3D.addSphere({
                center: { x: centro.x + offsetX, y: centro.y, z: centro.z + 0.5 },
                radius: 0.16,
                color: '#a855f7' // Roxo elegante para os pares não-ligantes
            });
        }
    }

    // 4. ➡️ Vetores de Polaridade / Dipolo (chk-arrows)
    const mostrarSetas = document.getElementById("chk-arrows")?.checked ?? true;
    if (mostrarSetas && molecula.polaridade === "Polar") {
        const centro = molecula.modelo3D.atoms[0];
        visualizador3D.addArrow({
            start: { x: centro.x, y: centro.y - 0.8, z: centro.z },
            end: { x: centro.x, y: centro.y + 0.8, z: centro.z },
            radius: 0.07,
            color: '#ef4444', // Seta vermelha indicando o vetor de dipolo
            clickable: false
        });
    }

    try { visualizador3D.resize(); } catch (e) {}
    visualizador3D.zoomTo();
    
    // 🔄 Rotação Automática Ativa por Padrão
    try { 
        visualizador3D.spin("y", 1); 
    } catch(e) {
        console.warn("Aviso: O seu navegador não suporta a animação automática.", e);
    }

    visualizador3D.render();
    
    // Segundo render após o próximo frame para garantir viewport correto
    requestAnimationFrame(() => {
        try {
            visualizador3D.render();
        } catch(e) {}
    });
}

// Redesenha ao redimensionar a janela para manter o canvas correto
window.addEventListener('resize', () => {
    try { visualizador3D && visualizador3D.resize(); } catch (e) {}
});