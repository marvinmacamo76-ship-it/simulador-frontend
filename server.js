// =============================================================================
// SERVIDOR STEM LICUNGO — Proxy API + Biblioteca de Moléculas
// Node.js 20 + Express | Universidade Licungo, Moçambique
// =============================================================================

'use strict';

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// =============================================================================
// BIBLIOTECA DE MOLÉCULAS (organizada por categoria)
// =============================================================================

const BIBLIOTECA = {
  organicas: [
    { nome: 'Metano',          formula: 'CH4',       pubchem: 'methane',        descricao: 'O mais simples dos alcanos.' },
    { nome: 'Etano',           formula: 'C2H6',      pubchem: 'ethane',         descricao: 'Alcano de cadeia curta.' },
    { nome: 'Etileno',         formula: 'C2H4',      pubchem: 'ethylene',       descricao: 'Alceno com ligação dupla C=C.' },
    { nome: 'Acetileno',       formula: 'C2H2',      pubchem: 'acetylene',      descricao: 'Alcino linear com tripla ligação.' },
    { nome: 'Etanol',          formula: 'C2H6O',     pubchem: 'ethanol',        descricao: 'Álcool comum, bebidas e combustível.' },
    { nome: 'Ácido Acético',   formula: 'CH4O2',     pubchem: 'acetic acid',    descricao: 'Componente principal do vinagre.' },
    { nome: 'Benzeno',         formula: 'C6H6',      pubchem: 'benzene',        descricao: 'Composto aromático fundamental.' },
    { nome: 'Acetona',         formula: 'C3H6O',     pubchem: 'acetone',        descricao: 'Solvente orgânico comum.' },
    { nome: 'Glicose',         formula: 'C6H12O6',   pubchem: 'glucose',        descricao: 'Monossacarídeo essencial ao metabolismo.' },
    { nome: 'Metanol',         formula: 'CH4O',      pubchem: 'methanol',       descricao: 'Álcool mais simples, tóxico.' },
    { nome: 'Formaldeído',     formula: 'CH2O',      pubchem: 'formaldehyde',   descricao: 'Aldeído simples, conservante.' },
    { nome: 'Ácido Fórmico',   formula: 'CH2O2',     pubchem: 'formic acid',    descricao: 'Ácido orgânico mais simples.' },
  ],
  inorganicas: [
    { nome: 'Água',                    formula: 'H2O',    pubchem: 'water',              descricao: 'Molécula angular, polar, solvente universal.' },
    { nome: 'Amónia',                  formula: 'NH3',    pubchem: 'ammonia',            descricao: 'Pirâmide trigonal com par solitário.' },
    { nome: 'Dióxido de Carbono',      formula: 'CO2',    pubchem: 'carbon dioxide',     descricao: 'Molécula linear e apolar.' },
    { nome: 'Dióxido de Enxofre',      formula: 'SO2',    pubchem: 'sulfur dioxide',     descricao: 'Molécula angular e polar.' },
    { nome: 'Trióxido de Enxofre',     formula: 'SO3',    pubchem: 'sulfur trioxide',    descricao: 'Trigonal planar, apolar.' },
    { nome: 'Fluoreto de Hidrogénio',  formula: 'HF',     pubchem: 'hydrogen fluoride',  descricao: 'Ligação polar H–F.' },
    { nome: 'Ácido Clorídrico',        formula: 'HCl',    pubchem: 'hydrochloric acid',  descricao: 'Ácido forte diatômico.' },
    { nome: 'Ácido Sulfúrico',         formula: 'H2SO4',  pubchem: 'sulfuric acid',      descricao: 'Ácido forte, tetraédrico em S.' },
    { nome: 'Ácido Nítrico',           formula: 'HNO3',   pubchem: 'nitric acid',        descricao: 'Ácido forte oxidante.' },
    { nome: 'Ácido Fosfórico',         formula: 'H3PO4',  pubchem: 'phosphoric acid',    descricao: 'Ácido fraco triprotônico.' },
    { nome: 'Cloreto de Hidrogénio',   formula: 'HCl',    pubchem: 'hydrogen chloride',  descricao: 'Gás diatômico polar.' },
    { nome: 'Pentacloreto de Fósforo', formula: 'PCl5',   pubchem: 'phosphorus pentachloride', descricao: 'Bipiramidal trigonal.' },
  ],
  ionicas: [
    { nome: 'Cloreto de Sódio',    formula: 'NaCl',   pubchem: 'sodium chloride',     descricao: 'Sal de cozinha, rede cristalina iônica.' },
    { nome: 'Hidróxido de Sódio',  formula: 'NaOH',   pubchem: 'sodium hydroxide',    descricao: 'Soda cáustica, base forte.' },
    { nome: 'Carbonato de Cálcio', formula: 'CaCO3',  pubchem: 'calcium carbonate',   descricao: 'Calcário, cascas de moluscos.' },
    { nome: 'Sulfato de Cobre II', formula: 'CuSO4',  pubchem: 'copper sulfate',      descricao: 'Sal azul solúvel.' },
    { nome: 'Nitrato de Prata',    formula: 'AgNO3',  pubchem: 'silver nitrate',      descricao: 'Reagente analítico clássico.' },
    { nome: 'Cloreto de Cálcio',   formula: 'CaCl2',  pubchem: 'calcium chloride',    descricao: 'Sal higroscópico, antiderrapante.' },
    { nome: 'Carbonato de Sódio',  formula: 'Na2CO3', pubchem: 'sodium carbonate',    descricao: 'Sal de cozinha alternativo, barrilha.' },
    { nome: 'Sulfato de Sódio',    formula: 'Na2SO4', pubchem: 'sodium sulfate',      descricao: 'Sal usado em detergentes.' },
  ],
  elementares: [
    { nome: 'Hidrogénio Molecular', formula: 'H2',  pubchem: 'hydrogen',  descricao: 'Molécula diatômica mais leve.' },
    { nome: 'Oxigénio Molecular',   formula: 'O2',  pubchem: 'oxygen',    descricao: 'Essencial à respiração aeróbia.' },
    { nome: 'Nitrogénio Molecular', formula: 'N2',  pubchem: 'nitrogen',  descricao: 'Principal componente do ar (78%).' },
    { nome: 'Cloro Molecular',      formula: 'Cl2', pubchem: 'chlorine',  descricao: 'Gás amarelo-esverdeado, oxidante.' },
    { nome: 'Flúor Molecular',      formula: 'F2',  pubchem: 'fluorine',  descricao: 'Elemento mais eletronegativo.' },
    { nome: 'Ozônio',               formula: 'O3',  pubchem: 'ozone',     descricao: 'Angular, camada protetora da atmosfera.' },
    { nome: 'Bromo Molecular',      formula: 'Br2', pubchem: 'bromine',   descricao: 'Único não-metal líquido a 25°C.' },
    { nome: 'Iodo Molecular',       formula: 'I2',  pubchem: 'iodine',    descricao: 'Sólido, sublima facilmente.' },
  ],
  complexas: [
    { nome: 'Cafeína',        formula: 'C8H10N4O2',     pubchem: 'caffeine',       descricao: 'Estimulante presente no café e chá.' },
    { nome: 'Aspirina',       formula: 'C9H8O4',        pubchem: 'aspirin',        descricao: 'Anti-inflamatório amplamente usado.' },
    { nome: 'Colesterol',     formula: 'C27H46O',       pubchem: 'cholesterol',    descricao: 'Lípido essencial, precursor hormonal.' },
    { nome: 'Penicilina G',   formula: 'C16H18N2O4S',   pubchem: 'penicillin G',   descricao: 'Primeiro antibiótico descoberto.' },
    { nome: 'Dopamina',       formula: 'C8H11NO2',      pubchem: 'dopamine',       descricao: 'Neurotransmissor do sistema de recompensa.' },
    { nome: 'Serotonina',     formula: 'C10H12N2O',     pubchem: 'serotonin',      descricao: 'Neurotransmissor, regula humor e sono.' },
    { nome: 'Adrenalina',     formula: 'C9H13NO3',      pubchem: 'epinephrine',    descricao: 'Hormônio da resposta ao estresse.' },
    { nome: 'Vitamina C',     formula: 'C6H8O6',        pubchem: 'ascorbic acid',  descricao: 'Antioxidante essencial, ácido ascórbico.' },
    { nome: 'Paracetamol',    formula: 'C8H9NO2',       pubchem: 'acetaminophen',  descricao: 'Analgésico e antipirético comum.' },
    { nome: 'Ibuprofeno',     formula: 'C13H18O2',      pubchem: 'ibuprofen',      descricao: 'Anti-inflamatório não esteroidal.' },
  ],
};

// =============================================================================
// TRADUTOR (MyMemory — gratuito, sem chave de API)
// =============================================================================

/**
 * Traduz um texto para português europeu usando a API MyMemory.
 * Limita a 490 caracteres por chamada (limite da API gratuita).
 * Em caso de falha retorna o texto original sem bloquear.
 */
async function traduzirParaPT(texto) {
  if (!texto || texto.trim().length === 0) return texto;
  // Divide textos longos em blocos de 490 caracteres (por frases quando possível)
  const blocos = [];
  let restante = texto.trim();
  while (restante.length > 0) {
    if (restante.length <= 490) {
      blocos.push(restante);
      break;
    }
    // Tenta cortar na última frase dentro dos 490 caracteres
    const corte = restante.lastIndexOf('. ', 490);
    const pos   = corte > 50 ? corte + 1 : 490;
    blocos.push(restante.substring(0, pos).trim());
    restante = restante.substring(pos).trim();
  }
  try {
    const partes = await Promise.all(blocos.map(async bloco => {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(bloco)}&langpair=en|pt-PT`;
      const r   = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!r.ok) return bloco;
      const d = await r.json();
      // Ignora se a tradução devolveu erro de quota (começa com "MYMEMORY")
      const t = d?.responseData?.translatedText || bloco;
      return t.startsWith('MYMEMORY') ? bloco : t;
    }));
    return partes.join(' ');
  } catch {
    return texto; // em caso de timeout/erro, devolve original
  }
}

// =============================================================================
// ROTAS DA API
// =============================================================================

// Biblioteca de moléculas
app.get('/api/biblioteca', (req, res) => {
  res.json(BIBLIOTECA);
});

// Proxy: SDF 3D do PubChem
app.get('/api/pubchem/sdf/:query', async (req, res) => {
  const query = encodeURIComponent(req.params.query);
  try {
    // Tenta 3D primeiro
    let response = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${query}/SDF?record_type=3d`
    );
    if (!response.ok) {
      // Fallback para 2D
      response = await fetch(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${query}/SDF`
      );
    }
    if (!response.ok) {
      return res.status(404).json({ erro: 'Composto não encontrado no PubChem.' });
    }
    const texto = await response.text();
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(texto);
  } catch (err) {
    console.error('[PubChem SDF]', err.message);
    res.status(500).json({ erro: 'Falha ao contactar o PubChem.' });
  }
});

// Proxy: Propriedades químicas do PubChem
app.get('/api/pubchem/info/:query', async (req, res) => {
  const query = encodeURIComponent(req.params.query);
  const campos = 'MolecularFormula,MolecularWeight,IUPACName,HBondDonorCount,HBondAcceptorCount,XLogP,Complexity,Charge,RotatableBondCount,ExactMass';
  try {
    const response = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${query}/property/${campos}/JSON`
    );
    if (!response.ok) return res.status(404).json({ erro: 'Propriedades não encontradas.' });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('[PubChem Info]', err.message);
    res.status(500).json({ erro: 'Falha ao obter propriedades.' });
  }
});

// Proxy: Descrição do composto no PubChem (com tradução automática para PT)
app.get('/api/pubchem/descricao/:query', async (req, res) => {
  const query = encodeURIComponent(req.params.query);
  try {
    const response = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${query}/description/JSON`
    );
    if (!response.ok) return res.status(404).json({ erro: 'Descrição não disponível.' });
    const data = await response.json();

    // Traduz a descrição de cada item que a contenha
    const lista = data?.InformationList?.Information || [];
    await Promise.all(lista.map(async item => {
      if (item.Description) {
        item.Description = await traduzirParaPT(item.Description);
      }
    }));

    res.json(data);
  } catch (err) {
    console.error('[PubChem Desc]', err.message);
    res.status(500).json({ erro: 'Falha ao obter descrição.' });
  }
});

// Proxy: Busca académica (CrossRef — gratuito, sem limite de taxa, com tradução para PT)
app.get('/api/scholar/:query', async (req, res) => {
  const query = encodeURIComponent(req.params.query);
  try {
    const response = await fetch(
      `https://api.crossref.org/works?query=${query}&rows=4&select=title,author,published,abstract,URL,DOI,container-title`,
      { headers: { 'User-Agent': 'STEM-Licungo/1.0 (stemolicungo@unirovuma.ac.mz)' } }
    );
    if (!response.ok) return res.status(404).json({ erro: 'Sem resultados.' });
    const data = await response.json();

    // Traduz títulos e resumos em paralelo
    const items = data?.message?.items || [];
    await Promise.all(items.map(async item => {
      const tarefas = [];
      if (Array.isArray(item.title) && item.title[0]) {
        tarefas.push(
          traduzirParaPT(item.title[0]).then(t => { item.title[0] = t; })
        );
      }
      if (item.abstract) {
        // Remove tags HTML que o CrossRef inclui nos abstracts
        const semTags = item.abstract.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        tarefas.push(
          traduzirParaPT(semTags).then(t => { item.abstract = t; })
        );
      }
      await Promise.all(tarefas);
    }));

    res.json(data);
  } catch (err) {
    console.error('[CrossRef]', err.message);
    res.status(500).json({ erro: 'Falha ao pesquisar literatura.' });
  }
});

// =============================================================================
// INICIAR SERVIDOR
// =============================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅  Servidor STEM Licungo iniciado em http://0.0.0.0:${PORT}`);
});
