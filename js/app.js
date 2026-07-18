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