# EtiqueCarro: consulta de eficiência energética de veículos

Projeto da Etapa 5 da disciplina (UFMG, Grupo 4). O EtiqueCarro torna a Tabela PBE Veicular 2026 do Inmetro compreensível para o consumidor: busca em linguagem natural, classificação A–E, comparação de veículos, glossário e custo de uso com o preço atual do combustível.

O projeto tem três partes:

1. **Pipeline de dados** (Python + pandas): transforma o CSV bruto do Inmetro em tabelas relacionais, um JSON para o site e um tesauro.
2. **Carga para o banco** (Python): gera um documento por registro, no formato das coleções do banco do site.
3. **Front-end** (HTML, CSS e JavaScript sem build): o site em `web/`, que lê os dados localmente ou dentro do Claude.

---

## Sumário

- [Estrutura do repositório](#estrutura-do-repositório)
- [Como rodar](#como-rodar)
- [Pipeline de dados](#pipeline-de-dados)
- [Tesauro](#tesauro)
- [Carga para o banco](#carga-para-o-banco)
- [Arquitetura do front-end](#arquitetura-do-front-end)
- [Fontes de dados externas](#fontes-de-dados-externas)
- [Testes](#testes)
- [Limitações conhecidas](#limitações-conhecidas)
- [Fluxo de trabalho com Git](#fluxo-de-trabalho-com-git)

---

## Estrutura do repositório

```
etiquecarro-grupo4/
├── pipeline.py            # E1–E8: CSV do Inmetro -> tabelas, JSON do site e relatório de qualidade
├── tesauro_tabelas.py     # tesauro.json -> faceta, termo, remissiva, relacao_termo
├── carga_banco.py         # saida/veiculos.json + tesauro.json -> carga/ (um documento por registro)
├── tesauro.json           # tesauro exportado da seção 3.2 do projeto (107 termos)
├── saida/                 # saídas do pipeline (versionadas)
├── carga/                 # documentos para o banco (gerada; ignorada pelo Git)
├── tools/
│   └── baixar_imagens.py  # opcional: baixa fotos livres da Wikimedia Commons
├── web/                   # o site (sem build; módulos ES nativos)
│   ├── index.html
│   ├── styles/            # tokens.css, base.css, components.css, pages.css
│   ├── src/               # código do front, em camadas (ver Arquitetura)
│   ├── assets/            # logos do site
│   └── tests/             # testes da camada de domínio (node --test)
├── .gitignore             # ignora carga/
└── README.md
```

---

## Como rodar

### Requisitos

- **Python 3** com pandas: `pip install pandas`. Testado com Python 3.14 e pandas 3.0.
- **Node.js 18 ou mais recente**, só para os testes. O site não precisa de Node. Testado com Node 24.
- Um navegador moderno (Chrome, Edge ou Firefox).
- Internet para o card de custo (API de preços) e para a tipografia do Google Fonts.

No Windows o comando costuma ser `python`. Em Linux e macOS use `python3`. Os exemplos abaixo usam `python`.

### Passo a passo

Rode os comandos sempre a partir da pasta `etiquecarro-grupo4`.

1. **Tesauro** (gera as tabelas do tesauro em `saida/`):
   ```
   python tesauro_tabelas.py tesauro.json saida
   ```

2. **Carga para o banco** (gera `carga/`, obrigatória para o site local):
   ```
   python carga_banco.py saida/veiculos.json tesauro.json carga
   ```
   Cria `carga/veiculos/` (968 arquivos, V0001 a V0968), `carga/termos/` (107 arquivos, T001 a T107) e `carga/meta/base.json`.

3. **Site**, com servidor local:
   ```
   python -m http.server 8000
   ```
   Abra `http://localhost:8000/web/`.

   **Não abra o arquivo com duplo clique.** Os módulos do site não carregam pelo protocolo `file://`.

4. **Pipeline completo** (opcional, precisa do CSV bruto, que não está no repositório):
   ```
   python pipeline.py VEICULOS_2026_v2.csv saida
   ```
   Baixe o CSV no Portal de Dados Abertos do Inmetro e coloque-o nesta pasta. Depois rode os passos 1 e 2 de novo.

> **Importante:** sem o passo 2, a pasta `carga/` não existe e o site local mostra erro ao carregar os dados. Quem clona o repositório precisa rodar o passo 2 antes de abrir o site.

### Dentro do Claude

Quando o site roda dentro do Claude, ele lê os veículos e o tesauro do banco (coleções `veiculos`, `termos` e `meta`). Os arquivos locais só são usados quando o banco não está disponível.

---

## Pipeline de dados

O `pipeline.py` lê o CSV do Inmetro (28 colunas, codificação ISO-8859-1, separador `;`) e produz as tabelas do projeto. As etapas seguem a seção 5.1 do projeto.

| Etapa | O que faz |
|---|---|
| **E1 Coleta** | Lê o CSV publicado no Portal de Dados Abertos. |
| **E2 Decodificação** | Converte de ISO-8859-1 para UTF-8, usa o separador `;` e limpa os cabeçalhos. |
| **E3 Validação** | Confere se há 28 colunas (interrompe com `assert` se não houver). |
| **E4 Padronização** | Remove espaços extras, uniformiza grafias de marca, decompõe a transmissão em tipo e número de marchas, normaliza o código do motor, trata valores ausentes e converte decimal com vírgula. |
| **E5 Correção de leiaute** | Corrige linhas com valores deslocados para as colunas erradas: flex com seis valores, gasolina com três, elétrico gravado nas colunas de VEHP flex e etanol com valor combinado indevido. |
| **E6 Indexação** | Converte os códigos da tabela (por exemplo, `E100` ou `G`) para os termos preferidos do tesauro. |
| **E7 Identificação** | Atribui `id_veiculo` (V0001…), `id_marca` (MAR001…) e `id_modelo` (MOD0001…). Marca e modelo formam um arquivo de autoridade. Marca registros com chave composta repetida. |
| **E8 Carga** | Grava as tabelas relacionais, o `veiculos.json` para o site, o `log_transformacao.csv` e o `relatorio_qualidade.json`. |

### Saídas (`saida/`)

Os CSVs são UTF-8 com separador `;`.

| Arquivo | Conteúdo |
|---|---|
| `marca.csv`, `modelo.csv`, `veiculo.csv` | Entidades: marca, modelo e versão. |
| `emissao.csv` | Emissões de escapamento (NMOG+NOx, CO, CHO, CO2). |
| `consumo.csv` | Quilometragem por litro (cidade e estrada) para etanol, gasolina/diesel e elétrico; MJ/km; autonomia elétrica. |
| `classificacao.csv` | Classe A–E geral e na categoria. |
| `log_transformacao.csv` | Cada alteração feita pelo pipeline, com a linha do arquivo original e a regra aplicada. Permite auditar o tratamento. |
| `relatorio_qualidade.json` | Contagens do processamento: linhas lidas, correções de leiaute, transformações e distribuição por propulsão, combustível e transmissão. |
| `veiculos.json` | Um objeto por veículo, com os campos usados pelo site, já arredondados para exibição. |
| `faceta.csv`, `termo.csv`, `remissiva.csv`, `relacao_termo.csv` | Tesauro (gerado pelo `tesauro_tabelas.py`). |

Números da base atual: **968 versões**, **308 modelos**, **42 marcas**, **16 categorias** de veículo e **4 tipos de propulsão** (combustão, híbrido, plug-in e elétrico).

---

## Tesauro

O tesauro organiza o vocabulário do domínio. Cada termo tem definição, nota em linguagem simples, remissivas (sinônimos e formas não preferidas), termos genéricos (`tg`) e relacionados (`tr`), faceta de busca e exemplos.

- `tesauro.json` é a fonte. Tem 107 termos e é a exportação da seção 3.2 do projeto.
- O `tesauro_tabelas.py` separa o tesauro nas tabelas `faceta`, `termo`, `remissiva` e `relacao_termo`. Entradas com `busca: 1` (termos agregados, como "SUV") ficam fora dessas tabelas e são usadas pela busca do site.
- O site usa o tesauro para o vocabulário da busca (sinônimos e siglas), as sugestões e o glossário.

---

## Carga para o banco

O `carga_banco.py` gera um arquivo JSON por documento, no formato das coleções do banco do site:

- `veiculos/V0001.json` … `V0968.json`: um documento por versão de veículo.
- `termos/T001.json` … `T107.json`: um documento por termo, com o campo `ordem` para manter a ordem do tesauro.
- `meta/base.json`: fonte, nome do arquivo de origem, número de registros e de termos, e quem tratou os dados.

Dentro do Claude, o front lê essas coleções pelo `window.claude.use("db")`. Fora do Claude, lê `saida/veiculos.json`, `tesauro.json` e `carga/meta/base.json`.

---

## Arquitetura do front-end

O front-end é um conjunto de módulos ES nativos, sem build, sem framework e sem dependências de runtime. Ele é organizado em camadas com uma regra: **as dependências só apontam para dentro**.

```
   ui  ───────►  state  ───────►  domain
    │                              ▲
    │                              │
   data  ──────────────────────────┘
   main.js  (composição: liga tudo)
```

| Camada | Pasta | Responsabilidade | Usa DOM ou `window`? |
|---|---|---|---|
| **domain** | `web/src/domain/` | Regras puras: consulta, facetas, ordenação, comparação, ficha, glossário e custo de uso. | **Não.** Por isso é testável com `node --test`. |
| **data** | `web/src/data/` | Obtém os dados: banco do Claude, arquivos locais e preços da API. | Só `window.claude` e `fetch`. |
| **state** | `web/src/state/` | Estado único, ações e roteamento por hash. | Só o roteador (`hashchange`). |
| **ui** | `web/src/ui/` | Componentes: cabeçalho, busca, filtros, resultados, ficha, comparação e glossário. | **Sim.** É a única camada que desenha na tela. |
| **main** | `web/src/main.js` | Raiz de composição: carrega os dados, cria o estado e monta os componentes. | Sim. |

### Fluxo de dados

1. `main.js` chama `loadDataset()` (`data/index.js`). Ele tenta o banco do Claude e, se não houver, lê os arquivos locais.
2. O domínio prepara os dados: `withSearchText` gera o texto de busca de cada veículo em uma cópia, sem alterar o objeto original, e `buildVocabulary` monta o vocabulário a partir do tesauro.
3. O estado (`state/store.js`) guarda a consulta, as facetas, a ordenação e a lista de comparação. Cada atualização cria um objeto novo e avisa os assinantes.
4. A cada mudança, `runSearch` (`domain/search.js`) aplica a consulta, depois as facetas e depois a ordenação. Cada componente de `ui/` recebe o estado e desenha a sua parte.
5. Ações do usuário (`state/actions.js`) alteram o estado. Os componentes não alteram o estado diretamente.

### Rotas

O site tem três rotas pelo hash da URL: `#buscar` (padrão), `#comparar` e `#glossario`. Ao trocar de rota, o foco vai para o título da página, o que ajuda leitores de tela e quem usa teclado.

### Decisões de implementação

- **Sem build.** Os módulos são carregados direto pelo navegador. Por isso é preciso servir a pasta por HTTP (`python -m http.server`).
- **Dados sem mutação.** Campos derivados, como o texto de busca, são calculados em cópias. Os objetos originais não mudam.
- **Escape de HTML.** Todo valor vindo dos dados passa por `esc` ou pelo template `html` (em `ui/dom.js`), para evitar injeção de HTML.
- **Foco preservado.** Ao refazer um bloco da tela, `keepFocus` devolve o foco ao mesmo controle, para quem usa teclado.
- **Acessibilidade.** Controles de contraste e tamanho de fonte ficam no cabeçalho e são lembrados no navegador. O site respeita `prefers-reduced-motion` e `forced-colors`. As letras A–E têm texto próprio, para não depender só de cor.
- **Tema.** O tema segue o sistema (claro e escuro), e há um modo de alto contraste.

### Mapa de arquivos

| Arquivo | Função |
|---|---|
| `domain/query.js` | Interpreta a consulta (`parse`) e aplica os termos (`compile`, `passQ`). |
| `domain/vocabulary.js` | Vocabulário controlado: termos, remissivas e sinônimos da busca. |
| `domain/filters.js` | Facetas, faixas numéricas e ordenação. |
| `domain/search.js` | Junta consulta, facetas e ordenação (`runSearch`). |
| `domain/compare.js` | Regras do "melhor valor" na tabela de comparação. |
| `domain/ficha.js` | Dados da ficha técnica de um veículo. |
| `domain/glossary.js` | Agrupamento dos termos do glossário. |
| `domain/cost.js` | Custo por 100 km com o preço do combustível, e escolha do estado padrão. |
| `data/index.js` | Escolhe a fonte de dados (banco ou arquivos). |
| `data/dbRepository.js` | Lê as coleções do banco do Claude. |
| `data/httpRepository.js` | Lê os arquivos locais. |
| `data/fuelPrices.js` | Busca os preços na API Combustível, com cache de 2 horas. |
| `state/store.js` | Estado único com assinaturas. |
| `state/actions.js` | Ações que alteram o estado. |
| `state/router.js` | Rotas por hash e foco. |
| `state/prefs.js` | Contraste e tamanho de fonte, guardados no navegador com proteção contra erro. |
| `ui/resultsGrid.js`, `ui/vehicleCard.js` | Lista de resultados e cartão de cada veículo. |
| `ui/fichaDialog.js`, `ui/costCard.js` | Ficha técnica (em `<dialog>`) e card de custo. |
| `ui/compareTable.js`, `ui/compareTray.js` | Tabela de comparação e bandeja fixa. |
| `ui/glossary.js` | Glossário com índice A–Z. |
| `ui/a11yBar.js`, `ui/header.js` | Controles de acessibilidade e cabeçalho com a marca animada. |

---

## Fontes de dados externas

| Fonte | Uso | Acesso |
|---|---|---|
| **Inmetro**, Tabela PBE Veicular 2026 (Portal de Dados Abertos) | Dados dos veículos, usados pelo pipeline. | CSV baixado manualmente (não versionado). |
| **API Combustível** (`https://combustivelapi.com.br/api/precos/`) | Preços de gasolina e diesel por estado, com dados da Petrobras. Atualizada a cada 2 horas. | Pública, sem chave. Usada pelo card de custo. |
| **Wikimedia Commons** | Fotos livres de modelos, via `tools/baixar_imagens.py`. | Pública. Só licenças livres (CC0, domínio público, CC BY e CC BY-SA). |

### Custo de uso

O card da ficha calcula o custo por 100 km assim:

```
custo por 100 km = 100 ÷ (km por litro) × preço do litro
```

- Usa o consumo de cidade e de estrada do próprio veículo.
- **Gasolina e flex:** usa o preço da gasolina. O flex usa gasolina porque a API não tem etanol.
- **Diesel:** usa o preço do diesel.
- **Híbrido e plug-in:** mostra o valor do modo a combustão.
- **Etanol puro e elétrico:** não têm preço nessa API, então o card explica que não dá para calcular.
- A API devolve "N/A" quando não há preço em um estado. Nesse caso, os estados sem dado ficam desabilitados no seletor, e o card escolhe um estado com preço automaticamente: a média do Brasil, depois São Paulo, depois o primeiro disponível.

### Fotos (opcional)

O `tools/baixar_imagens.py` procura uma foto por modelo na Wikimedia Commons. Ele só aceita licença livre, exige que o título contenha marca e modelo, e converte para WebP de 480 px. Guarda autor, licença e link da origem em `index.json`.

Hoje o site **não exibe fotos nem silhuetas**. O script fica disponível para uso futuro. Para rodar:

```
pip install pillow
python tools/baixar_imagens.py
```

A API da Wikimedia limita requisições (erro 429). O script espera e tenta de novo, mas pode demorar.

---

## Testes

Os testes da camada de domínio não precisam de navegador nem de dependências. Eles usam o `node --test`, que vem com o Node:

```
node --test web/tests/domain.test.js web/tests/cost.test.js
```

- `domain.test.js` cobre texto, vocabulário, interpretação da consulta (E, OU, NÃO, aspas, `*`, `autonomia>=400`), facetas, ordenação, comparação, ficha, glossário e contagens derivadas dos dados.
- `cost.test.js` cobre o cálculo de custo, a leitura de "N/A", o estado padrão e os casos de etanol e elétrico.

Os testes comparam resultados com os dados reais de `saida/veiculos.json` e `tesauro.json`. Se os dados mudarem, alguns números esperados precisam ser revisados.

---

## Limitações conhecidas

- **Preços de combustível:** a API não tem etanol nem tarifa de energia. O card não calcula esses casos.
- **Dependência de internet:** o card de custo e a tipografia precisam de rede. Sem ela, o site continua funcionando, mas o card mostra erro.
- **Dados:** o pipeline depende do CSV do Inmetro, que não está no repositório. Se a tabela mudar de formato, a validação (E3) falha e o pipeline precisa de ajuste.
- **Testes de interface:** a verificação visual e de teclado foi feita no Edge em modo headless, com inspeção pelo DevTools. Não foi testada com leitores de tela (NVDA, VoiceOver ou JAWS), nem com axe-core, nem com `prefers-contrast`.
- **Protótipo acadêmico:** os valores foram padronizados pelo pipeline do projeto. Veja "Como os dados foram tratados", no glossário do site.

---

## Fluxo de trabalho com Git

- A branch `main` é a versão estável. Trabalhe em branches próprias e abra um Pull Request para `main`.
- O repositório remoto é `collesal/etiquecarro-grupo4`. Para enviar, é preciso ter permissão de escrita.
- Os arquivos gerados (`carga/`) não são versionados. O `.gitignore` os ignora.
- Antes de abrir o PR, rode os testes de domínio e confira o site no navegador pelo servidor local.
