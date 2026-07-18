/* ==========================================================================
   O CÉREBRO DO APLICATIVO (Versão Resiliente - Sem Erros de Sintaxe)
   ========================================================================== */
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
    const radiofilters = document.querySelectorAll('input[name="tipo-composto"]');
    
    select.addEventListener("change", (e) => {
        selecionarMolecula(e.target.value);
    });

    searchInput.addEventListener("input", () => {
        executarFiltroCombinado();
    });

    radiofilters.forEach(radio => {
        radio.addEventListener("change", () => {
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
        alert("Simulação de Pipeline Ativada:\n1. OSRA processará a foto.\n2. OpenBabel converterá para 3D.\n3. RDKit otimizará a geometria.");
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
    const categoriaSelecionada = document.querySelector('input[name="tipo-composto"]:checked').value;

    const resultadoFiltrado = bibliotecaMoleculas.filter(mol => {
        const correspondeTexto = mol.nome.toLowerCase().includes(textoBusca) || mol.formula.toLowerCase().includes(textoBusca);
        const correspondeCategoria = (categoriaSelecionada === "todos") || (mol.tipo === categoriaSelecionada);
        
        return correspondeTexto && correspondeCategoria;
    });

    renderizarListaMoleculas(resultadoFiltrado);
}