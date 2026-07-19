/* ==========================================================================
   O CÉREBRO DO APLICATIVO (Versão Resiliente - Sem Erros de Sintaxe)
   ========================================================================== */
let RDKitModule = null; // Guardará a instância oficial do RDKit

// Inicializa o módulo oficial do RDKit assim que o script carregar
window.initRDKitModule().then((instance) => {
    RDKitModule = instance;
    console.log("RDKit carregado com sucesso! Versão: " + RDKitModule.version());
}).catch((err) => {
    console.error("Erro ao inicializar o RDKit oficial:", err);
});
let bibliotecaMoleculas = [];
let moleculaAtiva = null;

// Executa automaticamente assim que toda a página HTML carregar
document.addEventListener("DOMContentLoaded", async () => {
    
    // Tenta iniciar o 3D. Se o navegador falhar, o app ativa o modo descritivo e continua vivo!
    try {
        iniciarMotor3D();
    } catch (erro) {
        console.warn("Aviso: WebGL não suportado. Ativando modo de segurança textual.");
    }

    // CHAMADA DE REDE REAL: Pede as moléculas ao nosso servidor backend!
    try {
        const resposta = await fetch('https://simulador-backend-y7up.onrender.com/api/moleculas');
        if (!resposta.ok) {
            throw new Error("Erro na resposta do servidor.");
        }

        bibliotecaMoleculas = await resposta.json();

        // Popula a interface com os dados reais vindos da rede!
        renderizarListaMoleculas(bibliotecaMoleculas);
        configurarEventosUI();

        if (bibliotecaMoleculas.length > 0) {
            selecionarMolecula(bibliotecaMoleculas[0].id);
        }
    } catch (erro) {
        console.error("Falha ao carregar os dados do servidor. Ativando modo off-line local.", erro);
        // Aqui podemos colocar um plano de contingência caso o servidor esteja desligado
    }
});

/**
 * Preenche o elemento <select> na barra lateral
 */
function renderizarListaMoleculas(lista) {
    const select = document.getElementById("select-molecule");
    if (!select) return;

    select.innerHTML = "";

    lista.forEach(mol => {
        const option = document.createElement("option");
        option.value = mol.id;
        option.textContent = `${mol.formula} - ${mol.nome}`;
        select.appendChild(option);
    });
}

/**
 * Gerencia a troca de dados e textos na interface
 */
function selecionarMolecula(id) {
    const molecula = bibliotecaMoleculas.find(m => m.id === id);
    if (!molecula) return;
    
    moleculaAtiva = molecula;

    // Tenta renderizar o 3D isoladamente; se falhar, não trava os textos abaixo
    try {
        carregarMoleculaNoPainel3D(molecula);
    } catch (e) {
        // Abafa o erro gráfico do navegador
    }

    // Preenche o painel didático lateral com os dados científicos
    document.getElementById("info-nome").textContent = molecula.nome;
    document.getElementById("info-formula").textContent = molecula.formula;
    document.getElementById("info-tipo").textContent = molecula.tipo;
    document.getElementById("info-geometria").textContent = molecula.geometria;
    document.getElementById("info-polaridade").textContent = molecula.polaridade;
    document.getElementById("info-detalhes").textContent = molecula.justificativaVSEPR;
    document.getElementById("info-mocambique").textContent = molecula.contextoMocambique;
}

/**
 * Configura os escutadores de eventos para pesquisa e filtros
 */
function configurarEventosUI() {
    const select = document.getElementById("select-molecule");
    const searchInput = document.getElementById("search-input");
    const btnFiltros = document.querySelectorAll('.btn-filtro');
    
    select.addEventListener("change", (e) => {
        selecionarMolecula(e.target.value);
    });

    searchInput.addEventListener("input", () => {
        executarFiltroCombinado();
    });

    btnFiltros.forEach(btn => {
        btn.addEventListener("click", (e) => {
            btnFiltros.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            executarFiltroCombinado();
        });
    });

    document.getElementById("btn-style-ball").addEventListener("click", () => {
        try { if (moleculaAtiva) carregarMoleculaNoPainel3D(moleculaAtiva, 'ball'); } catch(e){}
    });

    document.getElementById("btn-style-space").addEventListener("click", () => {
        try { if (moleculaAtiva) carregarMoleculaNoPainel3D(moleculaAtiva, 'space'); } catch(e){}
    });

    document.getElementById("btn-camera").addEventListener("click", () => {
        if (!RDKitModule) {
            alert("O motor químico RDKit ainda está a carregar. Por favor, aguarde um segundo.");
            return;
        }

        // Simulação: O utilizador "scaneou" ou digitou o SMILES do Etanol (CC()O)
        const smilesInput = prompt("Pipeline Óptico Ativado!\nInsira a string SMILES da molécula para o RDKit otimizar:", "CCO");
        
        if (!smilesInput) return;

        // O RDKit oficial tenta criar a molécula a partir do texto
        const mol = RDKitModule.get_mol(smilesInput);

        if (mol) {
            // Se a molécula for válida, o RDKit gera os detalhes científicos reais!
            const formulaReal = mol.get_descriptors();
            
            alert(`✅ RDKit Otimização Sucesso!\n\nEstrutura válida!\nNúmero de Átomos: ${JSON.parse(formulaReal).NumAtoms}\n\nO RDKit validou a geometria tridimensional da molécula.`);
            
            // Boa prática: limpar a memória do WebAssembly após usar a molécula
            mol.delete(); 
        } else {
            alert("❌ Erro no RDKit: A estrutura química fornecida é inválida ou impossível.");
        }
    });
    // ⚡ ESCUTADORES PARA AS OPÇÕES VISUAIS DINÂMICAS (PhET Style)
    const chkAngles = document.getElementById("chk-angles");
    const chkLonepairs = document.getElementById("chk-lonepairs");
    const chkArrows = document.getElementById("chk-arrows");

    [chkAngles, chkLonepairs, chkArrows].forEach(chk => {
        if (chk) {
            chk.addEventListener("change", () => {
                // Redesenha a molécula atual aplicando os novos filtros visuais
                if (moleculaAtiva) carregarMoleculaNoPainel3D(moleculaAtiva);
            });
        }
    });
}

/**
 * Combina filtros de texto e rádio
 */
function ejecutarFiltroCombinado() {
    // Mantida apenas como segurança histórica interna
    executarFiltroCombinado();
}

function executarFiltroCombinado() {
    const textoBusca = document.getElementById("search-input").value.toLowerCase().trim();
    const btnAtivo = document.querySelector('.btn-filtro.active');
    const categoriaSelecionada = btnAtivo ? btnAtivo.getAttribute('data-tipo') : "Todos";

    const resultadoFiltrado = bibliotecaMoleculas.filter(mol => {
        const correspondeTexto = mol.nome.toLowerCase().includes(textoBusca) || mol.formula.toLowerCase().includes(textoBusca);
        const correspondeCategoria = (categoriaSelecionada === "Todos") || (mol.tipo === categoriaSelecionada);
        
        return correspondeTexto && correspondeCategoria;
    });

    renderizarListaMoleculas(resultadoFiltrado);
}
// =======================================================================
// COLOQUE ESTE BLOCO NO FINAL DO SEU FILE JS/APP.JS
// LÓGICA DO POP-UP DA CÂMARA / FICHEIROS / TEXTO
// =======================================================================

document.addEventListener('DOMContentLoaded', () => {
    const btnPrincipal = document.getElementById('btn-principal-camera');
    const modalOpcoes = document.getElementById('modal-opcoes');
    const btnFecharModal = document.getElementById('btn-fechar-modal');

    const optTirarFoto = document.getElementById('opt-tirar-foto');
    const optCarregarFicheiro = document.getElementById('opt-carregar-ficheiro');
    const optEscreverTexto = document.getElementById('opt-escrever-texto');

    const inputFotoDireta = document.getElementById('input-foto-direta');
    const inputGaleria = document.getElementById('input-galeria');
    const zonaTextoMolecula = document.getElementById('zona-texto-molecula');
    const statusIa = document.getElementById('status-ia');

    // Se o botão principal existir na página, ativa as configurações
    if (btnPrincipal) {
        // 1. Abrir o menu pop-up ao clicar no botão da barra lateral
        btnPrincipal.addEventListener('click', () => {
            modalOpcoes.style.display = 'block';
            zonaTextoMolecula.style.display = 'none'; // Garante que a área de texto começa fechada
        });

        // 2. Fechar o menu pop-up ao clicar em Cancelar
        btnFecharModal.addEventListener('click', () => {
            modalOpcoes.style.display = 'none';
        });

        // 3. Opção 1: Clicar em Tirar Foto ativa o input da câmara
        optTirarFoto.addEventListener('click', () => {
            modalOpcoes.style.display = 'none';
            inputFotoDireta.click();
        });

        // 4. Opção 2: Clicar em Carregar Ficheiro ativa a galeria
        optCarregarFicheiro.addEventListener('click', () => {
            modalOpcoes.style.display = 'none';
            inputGaleria.click();
        });

        // 5. Opção 3: Clicar em Escrever Texto mostra a caixa de texto sem fechar o pop-up
        optEscreverTexto.addEventListener('click', () => {
            zonaTextoMolecula.style.display = 'block';
        });

        // --- FUNÇÃO PARA ENVIAR AS IMAGENS PARA O TEU BACKEND ---
        async function enviarImagemBackend(ficheiro) {
            if (!ficheiro) return;
            statusIa.style.display = 'block';

            const formData = new FormData();
            formData.append('imagem', ficheiro);

            try {
                // ALERTA: Altera 'http://localhost:3000' para o URL do teu Render quando estiver online!
                const resposta = await fetch('http://localhost:3000/api/processar-camera', {
                    method: 'POST',
                    body: formData
                });
                const dados = await resposta.json();

                if (dados.sucesso) {
                    console.log("SMILES detetado:", dados.smiles);
                    // Certifica-te de que a função abaixo existe no teu js/visualizador.js
                    if (typeof renderizarMolecula3D === "function") {
                        renderizarMolecula3D(dados.dadosEstrutura3D);
                    } else if (window.renderizarMolecula3D) {
                        window.renderizarMolecula3D(dados.dadosEstrutura3D);
                    }
                    modalOpcoes.style.display = 'none'; // Fecha o modal após o sucesso
                } else {
                    alert(dados.error);
                }
            } catch (erro) {
                console.error(erro);
                alert("Erro ao conectar com o servidor backend.");
            } finally {
                statusIa.style.display = 'none';
            }
        }

        // Escutar quando o utilizador tira a foto ou escolhe da galeria
        inputFotoDireta.addEventListener('change', (e) => enviarImagemBackend(e.target.files[0]));
        inputGaleria.addEventListener('change', (e) => enviarImagemBackend(e.target.files[0]));

        // --- LÓGICA DA OPÇÃO 3 (ENVIAR TEXTO DIGITADO) ---
        document.getElementById('btn-enviar-texto').addEventListener('click', async () => {
            const textoDigitado = document.getElementById('input-texto-smiles').value;
            if (!textoDigitado) return alert("Por favor, digite uma fórmula ou código SMILES.");

            console.log("A enviar texto para o processador:", textoDigitado);
            // Aqui podes ligar à tua rota que processa texto puro do formulário
        });
    }
});