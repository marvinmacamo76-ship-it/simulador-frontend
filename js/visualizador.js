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

    // 🏷️ NOVO: Adiciona etiquetas flutuantes com o símbolo químico em cada átomo
    try {
        molecula.modelo3D.atoms.forEach(at => {
            visualizador3D.addLabel(at.elem, {
                position: { x: at.x + 0.3, y: at.y + 0.3, z: at.z },
                backgroundColor: 'rgba(15, 23, 42, 0.7)', // Fundo escuro elegante
                fontSize: 14,
                fontColor: 'white',
                alignment: 'center',
                backgroundOpacity: 0.6,
                useScreen: false,
                inFront: false
            });
        });
    } catch (e) {
        console.warn("Aviso: Não foi possível carregar as etiquetas dos átomos.", e);
    }

    try { visualizador3D.resize(); } catch (e) {}
    visualizador3D.zoomTo();
    
    // 🔄 NOVO: Ativa a rotação automática suave no espaço tridimensional
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