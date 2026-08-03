# STEM Licungo — Simulador Interativo de Geometria Molecular e Polaridade

Plataforma educacional web interativa para o ensino de Química na Universidade Licungo, Moçambique.

## Stack
- **Backend**: Node.js 20 + Express (`server.js`) — proxy das APIs externas, serve estáticos
- **Frontend**: HTML5, CSS3, JavaScript ES6+ puro (sem frameworks)
- **Visualização 3D**: 3Dmol.js (via CDN jsDelivr) — renderização WebGL
- **Dados moleculares**: PubChem REST API (proxy pelo backend)
- **Literatura académica**: CrossRef API (gratuita, sem chave de API)
- **Tradução automática**: MyMemory API (gratuita, sem chave) — traduz para pt-PT no servidor

## Como executar
```bash
npm install
npm start
```
O servidor inicia na porta 5000.

## Estrutura de ficheiros
```
/
├── server.js          # Backend Express: rotas /api/, proxy PubChem/CrossRef, tradução
├── index.html         # Página inicial (menu)
├── geometria.html     # Visualizador de geometria molecular (3Dmol.js)
├── biblioteca.html    # Biblioteca de moléculas por categoria (40+ compostos)
├── descricao.html     # Descrição, arquitetura e tecnologias do projeto
├── css/
│   ├── estilo.css     # Estilos do visualizador e painéis
│   ├── menu.css       # Estilos do menu principal
│   └── biblioteca.css # Estilos da biblioteca de moléculas
└── js/
    └── geometria.js   # Toda a lógica 3D: viewer, VSEPR, ângulos, pares livres, dipolo, literatura
```

## Rotas da API (proxy em `/api/`)
- `GET /api/biblioteca` → Lista de moléculas organizadas por categoria
- `GET /api/pubchem/sdf/:query` → Estrutura SDF 3D (fallback 2D) do PubChem
- `GET /api/pubchem/info/:query` → Propriedades químicas do PubChem
- `GET /api/pubchem/descricao/:query` → Descrição do composto (PubChem), já traduzida para PT
- `GET /api/scholar/:query` → Artigos científicos via CrossRef, com tradução automática para PT

## Funcionalidades principais
- Visualização 3D WebGL com rotação automática (1.5×), pausa/retoma ao interagir
- Modos: Bastões e Esferas (ball-and-stick) e Só Esferas CPK
- Sobreposições: símbolos CPK, ângulos de ligação (arco+número), pares de eletrões livres (esferas cinzentas + pontos amarelos), vetor dipolo (seta laranja + magnitude em Debye)
- Inferência VSEPR automática a partir da estrutura 3D do PubChem
- Pares livres calculados por minimização de energia de Coulomb (80 iterações)
- Biblioteca de 40+ moléculas com pesquisa em tempo real
- Literatura científica com descrição PubChem + artigos CrossRef, traduzidos automaticamente

## User preferences
- Português europeu/moçambicano (pt-MZ) em todos os textos da interface
- Manter a estrutura e identidade visual existente (cores #0f172a, #0ea5e9)
- Não alterar funcionalidades existentes sem pedido explícito
