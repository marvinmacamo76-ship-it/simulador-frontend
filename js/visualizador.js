/* ==========================================================================
   MOTOR GRÁFICO (PhET Scenery & Dot Engine)
   ========================================================================== */

let displayPhET = null;
let rootNode = null;
let moleculaNode = null;

function iniciarMotor3D() {
    const container = document.getElementById('cenario-phet-container');
    if (!container) {
        console.error("Elemento do visualizador não encontrado.");
        return;
    }

    // Usando as bibliotecas do phet-lib que foram importadas no HTML
    const { Node, Display, Circle, Line, Text } = phet.scenery;
    
    // Criação do nó raiz
    rootNode = new Node();

    // Inicialização do Display Scenery
    displayPhET = new Display(rootNode, {
        container: container,
        backgroundColor: '#ffffff', // Fundo limpo padrão PhET
        allowSceneOverflow: false
    });

    displayPhET.initializeEvents();
    displayPhET.updateDisplay();

    // Loop de renderização contínuo
    const animacao = () => {
        displayPhET.updateDisplay();
        requestAnimationFrame(animacao);
    };
    requestAnimationFrame(animacao);

    // Ajusta o display quando a janela muda de tamanho
    window.addEventListener('resize', () => {
        displayPhET.setWidthHeight(container.clientWidth, container.clientHeight);
    });
}

function carregarMoleculaNoPainel3D(molecula) {
    if (!molecula) return;
    if (!displayPhET) iniciarMotor3D();

    const { Node, Circle, Line, Text } = phet.scenery;
    const { Vector2 } = phet.dot;

    // Remove a molécula antiga se existir
    if (moleculaNode) {
        rootNode.removeChild(moleculaNode);
    }

    moleculaNode = new Node({ center: new Vector2(displayPhET.width / 2, displayPhET.height / 2) });
    rootNode.addChild(moleculaNode);

    // A partir dos dados estruturais (PubChem), nós mapeamos para coordenadas 2D projetadas
    // Caso a molécula venha com modelo3D (átomos com x, y, z), criamos a estrutura
    if (molecula.modelo3D && molecula.modelo3D.atoms) {
        const atoms = molecula.modelo3D.atoms;
        const escala = 100; // Multiplicador para o tamanho visual
        
        // 1. Desenhar Ligações (simples heurística de distância)
        const drawnBonds = new Set();
        for (let i = 0; i < atoms.length; i++) {
            for (let j = i + 1; j < atoms.length; j++) {
                const a1 = atoms[i];
                const a2 = atoms[j];
                const dx = a1.x - a2.x;
                const dy = a1.y - a2.y;
                const dz = a1.z - a2.z;
                const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                
                // Se a distância for típica de uma ligação química (~1.2 a 1.8 Angstroms)
                if (dist < 1.9) {
                    const id = i + '-' + j;
                    if (!drawnBonds.has(id)) {
                        const v1 = new Vector2(a1.x * escala, a1.y * escala);
                        const v2 = new Vector2(a2.x * escala, a2.y * escala);
                        
                        const bondLine = new Line(v1, v2, {
                            stroke: '#94a3b8',
                            lineWidth: 12,
                            lineCap: 'round'
                        });
                        moleculaNode.addChild(bondLine);
                        drawnBonds.add(id);
                    }
                }
            }
        }

        // 2. Desenhar Átomos
        atoms.forEach(at => {
            const pos = new Vector2(at.x * escala, at.y * escala);
            let cor = '#cbd5e1'; // Padrão
            let raio = 20;

            // Cores CPK básicas
            switch(at.elem) {
                case 'H': cor = '#ffffff'; raio = 15; break;
                case 'C': cor = '#334155'; raio = 25; break;
                case 'O': cor = '#ef4444'; raio = 22; break;
                case 'N': cor = '#3b82f6'; raio = 22; break;
                case 'Cl': cor = '#22c55e'; raio = 26; break;
                case 'F': cor = '#4ade80'; raio = 20; break;
                case 'S': cor = '#eab308'; raio = 28; break;
            }

            const atNode = new Circle(raio, {
                fill: cor,
                stroke: '#1e293b',
                lineWidth: 2,
                center: pos
            });

            // Se for H, a cor da letra precisa ser escura
            const corLetra = at.elem === 'H' || at.elem === 'C' ? '#000000' : '#ffffff';
            
            const txt = new Text(at.elem, {
                font: 'bold 16px sans-serif',
                fill: (at.elem === 'C') ? '#ffffff' : ((at.elem === 'H') ? '#334155' : '#ffffff'),
                center: pos
            });

            moleculaNode.addChild(atNode);
            moleculaNode.addChild(txt);
        });

        // 3. Centraliza a molécula no display
        moleculaNode.center = new Vector2(displayPhET.width / 2, displayPhET.height / 2);
    } else {
        // Fallback visual se não houver dados de atoms no payload
        const txtFallback = new Text("Modelo 3D indisponível para esta molécula.", {
            font: '20px sans-serif',
            fill: '#ef4444',
            center: new Vector2(0, 0)
        });
        moleculaNode.addChild(txtFallback);
    }
}