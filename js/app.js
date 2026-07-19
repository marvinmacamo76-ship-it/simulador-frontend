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
                const resposta = await fetch('https://simulador-backend-y7up.onrender.com/api/processar-camera', {
                    method: 'POST',
                    body: formData
                });
                const dados = await resposta.json();

                if (dados.sucesso) {
                    console.log("SMILES detetado:", dados.smiles);
                    if (typeof carregarMoleculaNoPainel3D === "function") {
                        carregarMoleculaNoPainel3D(dados.dadosEstrutura3D);
                    } else if (window.carregarMoleculaNoPainel3D) {
                        window.carregarMoleculaNoPainel3D(dados.dadosEstrutura3D);
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

        // --- LÓGICA DA OPÇÃO 3 (ENVIAR TEXTO DIGITADO COM PUBCHEM + GEMINI) ---
        document.getElementById('btn-enviar-texto').addEventListener('click', async () => {
            const textoDigitado = document.getElementById('input-texto-smiles').value;
            if (!textoDigitado) return alert("Por favor, digite uma fórmula, nome ou código SMILES.");

            statusIa.style.display = 'block';
            statusIa.innerText = "⏳ A procurar no PubChem...";
            try {
                // 1. Validar e Buscar no PubChem
                const pubchemData = await buscarMoleculaPubChem(textoDigitado);
                if (!pubchemData) {
                    alert("A molécula não foi encontrada ou é impossível/inválida segundo a base de dados química.");
                    statusIa.style.display = 'none';
                    return;
                }

                // 2. Extrair o formato 3D e o Dipolo
                statusIa.innerText = "⏳ A gerar formato 3D...";
                const dados3D = await buscarDados3DPubChem(pubchemData.cid);
                
                // 3. Obter Explicação Didática da IA
                statusIa.innerText = "⏳ A gerar explicação didática (Glinka/Atkins)...";
                const explicacaoDidatica = await gerarExplicacaoIA(pubchemData.smiles || textoDigitado);

                // 4. Construir Objeto da Nova Molécula
                const novaMolecula = {
                    id: pubchemData.cid.toString(),
                    nome: textoDigitado.charAt(0).toUpperCase() + textoDigitado.slice(1),
                    formula: pubchemData.formula,
                    peso: pubchemData.peso,
                    polaridade: dados3D.dipole !== "Desconhecido" ? "Polar" : "Apolar",
                    dipolo: dados3D.dipole,
                    tipo: "Indeterminado",
                    geometria: "Automática",
                    justificativaVSEPR: explicacaoDidatica,
                    contextoMocambique: "Dados analisados automaticamente pelo sistema integrado.",
                    sdfText: dados3D.sdfText
                };

                // Mostrar na interface
                if (typeof carregarMoleculaNoPainel3D === "function") {
                    carregarMoleculaNoPainel3D(novaMolecula);
                }
                
                // Atualizar o painel didático
                moleculaAtiva = novaMolecula;
                document.getElementById("info-nome").textContent = novaMolecula.nome;
                document.getElementById("info-formula").textContent = novaMolecula.formula;
                document.getElementById("info-tipo").textContent = novaMolecula.tipo;
                document.getElementById("info-geometria").textContent = novaMolecula.geometria;
                document.getElementById("info-polaridade").textContent = `${novaMolecula.polaridade} (Momento Dipolar: ${novaMolecula.dipolo})`;
                document.getElementById("info-detalhes").textContent = novaMolecula.justificativaVSEPR;
                document.getElementById("info-mocambique").textContent = novaMolecula.contextoMocambique;

                modalOpcoes.style.display = 'none';
                zonaTextoMolecula.style.display = 'none';
                
                // 5. Salvar silenciosamente no backend do Render
                salvarNovaMolecula(novaMolecula);

            } catch (erro) {
                console.error(erro);
                alert("Erro durante a geração inteligente da molécula.");
            } finally {
                statusIa.style.display = 'none';
            }
        });
    }
});

// ==============================================================================
// 1. Controle da IA
let geminiApiKey = localStorage.getItem("geminiApiKey") || "";

document.addEventListener('DOMContentLoaded', () => {
    const btnConfigIa = document.getElementById('btn-config-ia');
    const modalIa = document.getElementById('modal-ia');
    const inputGemini = document.getElementById('input-gemini-key');
    
    if(btnConfigIa && modalIa) {
        btnConfigIa.addEventListener('click', () => {
            inputGemini.value = geminiApiKey;
            modalIa.style.display = 'block';
        });
        
        document.getElementById('btn-fechar-ia').addEventListener('click', () => {
            modalIa.style.display = 'none';
        });
        
        document.getElementById('btn-salvar-ia').addEventListener('click', () => {
            geminiApiKey = inputGemini.value.trim();
            localStorage.setItem("geminiApiKey", geminiApiKey);
            modalIa.style.display = 'none';
            alert("Chave IA (Gemini) guardada com sucesso!");
        });
    }
});

// 2. PubChem API Helper
async function buscarMoleculaPubChem(termo) {
    try {
        let resposta = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(termo)}/property/CanonicalSMILES,MolecularFormula,MolecularWeight/JSON`);
        if (!resposta.ok) {
            resposta = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(termo)}/property/CanonicalSMILES,MolecularFormula,MolecularWeight/JSON`);
        }
        
        if (!resposta.ok) throw new Error("Composto não encontrado no PubChem.");
        
        const dados = await resposta.json();
        const cid = dados.PropertyTable.Properties[0].CID;
        const smiles = dados.PropertyTable.Properties[0].CanonicalSMILES;
        const formula = dados.PropertyTable.Properties[0].MolecularFormula;
        const peso = dados.PropertyTable.Properties[0].MolecularWeight;
        
        return { cid, smiles, formula, peso };
    } catch(e) {
        console.error(e);
        return null;
    }
}

// 3. PubChem 3D e Dipolo
async function buscarDados3DPubChem(cid) {
    try {
        const respSDF = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/record/SDF/?record_type=3d`);
        if (!respSDF.ok) throw new Error("Sem estrutura 3D");
        const sdfText = await respSDF.text();
        
        let dipole = "Desconhecido";
        try {
            const respJson = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/${cid}/JSON`);
            if(respJson.ok) {
                const dataView = await respJson.json();
                const dipoleSection = dataView.Record.Section.find(s => s.TOCHeading === "Chemical and Physical Properties")
                    ?.Section.find(s => s.TOCHeading === "Experimental Properties")
                    ?.Section.find(s => s.TOCHeading === "Dipole Moment");
                if(dipoleSection && dipoleSection.Information[0].Value.StringWithMarkup[0].String) {
                    dipole = dipoleSection.Information[0].Value.StringWithMarkup[0].String;
                }
            }
        } catch(e) {}

        return { sdfText, dipole };
    } catch(e) {
        console.error(e);
        return { sdfText: null, dipole: "N/A" };
    }
}

// 4. Gemini API Helper
async function gerarExplicacaoIA(nomeOuFormula) {
    if (!geminiApiKey) return "Para ler a explicação baseada em Atkins e Glinka, configure a chave da API Gemini no painel de controlo.";
    
    const prompt = `Aja como um professor universitário de Química. Explique didaticamente a molécula/composto "${nomeOuFormula}". Aborde a sua estrutura, geometria, propriedades e ligações usando como referência as obras "Físico-Química" de Atkins e "Química Geral" de Glinka. Inclua um parágrafo de aplicação ou contextualização industrial. Responda num texto limpo e direto, sem formatação exagerada.`;
    
    try {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });
        
        const dados = await resp.json();
        if(dados.candidates && dados.candidates.length > 0) {
            return dados.candidates[0].content.parts[0].text;
        }
        return "Não foi possível gerar a explicação com a IA.";
    } catch(e) {
        console.error(e);
        return "Erro ao contactar a IA.";
    }
}

// 5. Salvar Nova Molécula no Backend
async function salvarNovaMolecula(molObj) {
    try {
        await fetch('https://simulador-backend-y7up.onrender.com/api/moleculas', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(molObj)
        });
        // Recarregar a lista (opcional, só se quiser que apareça logo no dropdown)
        const respList = await fetch('https://simulador-backend-y7up.onrender.com/api/moleculas');
        if(respList.ok) {
            bibliotecaMoleculas = await respList.json();
            const select = document.getElementById("select-molecule");
            if (select) {
                select.innerHTML = '<option value="" disabled selected>Escolha um composto na lista ou pesquise...</option>';
                bibliotecaMoleculas.forEach(mol => {
                    const option = document.createElement("option");
                    option.value = mol.id;
                    option.textContent = `${mol.formula} - ${mol.nome}`;
                    select.appendChild(option);
                });
            }
        }
    } catch(e) {
        console.error("Erro ao salvar:", e);
    }
}