# STEM Licungo — Simulação de Geometria Molecular e Polaridade

Plataforma educacional interativa para o ensino de Química na Universidade Licungo, Moçambique.

## Stack
- **Backend**: Node.js + Express (`server.js`)
- **Frontend**: HTML5, CSS3, JavaScript puro
- **Visualização 3D**: 3Dmol.js (via CDN)
- **Dados moleculares**: PubChem REST API (proxy pelo backend)
- **Literatura académica**: Semantic Scholar API (proxy pelo backend)

## Como executar
```bash
npm install
npm start
```
O servidor inicia na porta 5000.

## Estrutura de pastas
```
/
├── server.js          # Backend Express
├── index.html         # Página inicial (menu)
├── geometria.html     # Visualizador de geometria molecular (3Dmol.js)
├── biblioteca.html    # Biblioteca de moléculas por categoria
├── descricao.html     # Descrição e fundamentação do projeto
├── css/
│   ├── estilo.css     # Estilos do visualizador
│   ├── menu.css       # Estilos do menu principal
│   └── biblioteca.css # Estilos da biblioteca de moléculas
└── js/
    ├── geometria.js   # Lógica do visualizador 3D (PhET-like, 3Dmol)
    └── visualizador.js # (legado — substituído por geometria.js)
```

## APIs utilizadas (via proxy `/api/`)
- `GET /api/biblioteca` → Lista de moléculas organizadas por categoria
- `GET /api/pubchem/sdf/:query` → Estrutura SDF 3D do PubChem
- `GET /api/pubchem/info/:query` → Propriedades químicas do PubChem
- `GET /api/pubchem/descricao/:query` → Descrição do composto (PubChem)
- `GET /api/scholar/:query` → Busca académica (Semantic Scholar)

## User preferences
- Português europeu/moçambicano (pt-MZ) em todos os textos da interface
- Manter a estrutura e identidade visual existente (cores #0f172a, #0ea5e9)
