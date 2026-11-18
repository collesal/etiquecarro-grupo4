EtiqueCarro - Etapa 5 (UFMG, Grupo 4)

1. Pipeline de dados (requer Python 3 e pandas):
   python3 pipeline.py VEICULOS_2026_v2.csv saida
   python3 tesauro_tabelas.py tesauro.json saida
   python3 carga_banco.py saida/veiculos.json tesauro.json carga   (documentos para o banco do site)

2. Saídas (pasta saida, CSV em UTF-8 com ponto e vírgula):
   marca, modelo, veiculo, emissao, consumo, classificacao  -> dados do PBEV
   faceta, termo, remissiva, relacao_termo                 -> tesauro
   log_transformacao.csv  -> cada alteração feita, com a linha do arquivo original
   relatorio_qualidade.json, veiculos.json (usado pelo site)

3. Protótipo: o site (pasta `web/`) lê os veículos e o tesauro do banco de dados do Claude (coleções veiculos, termos e meta)
   quando ele existe. Fora do Claude, lê os JSON gerados pelo pipeline (`saida/veiculos.json`, `tesauro.json` e `carga/meta/base.json`).

## Como rodar o projeto

### Requisitos
- Python 3 com pandas: `pip install pandas` (testado com Python 3.14 e pandas 3.0)
- No Windows o comando costuma ser `python` (e não `python3`). Os exemplos abaixo usam `python`; em Linux/macOS troque para `python3`.

### Passo a passo (a partir da pasta `etiquecarro-grupo4`)

1. **Tesauro (já validado, roda sem dependências extras):**
   ```
   python tesauro_tabelas.py tesauro.json saida
   ```
   Gera `faceta.csv`, `termo.csv`, `remissiva.csv` e `relacao_termo.csv` em `saida/`.

2. **Carga para o banco do site (usa as saídas já existentes em `saida/`):**
   ```
   python carga_banco.py saida/veiculos.json tesauro.json carga
   ```
   Cria a pasta `carga/` com um JSON por documento: `veiculos/` (968 arquivos, V0001 a V0968), `termos/` (107 arquivos, T001 a T107) e `meta/base.json`.

3. **Site:** na pasta `etiquecarro-grupo4`, inicie um servidor local e abra a página no navegador:
   ```
   python -m http.server 8000
   ```
   Depois acesse `http://localhost:8000/web/`. Não abra o arquivo com duplo clique: os módulos do site não carregam pelo `file://`, e os dados são lidos por `fetch` a partir da pasta raiz. Fora do Claude o site usa os arquivos locais; dentro do Claude usa o banco.

### Testes
- Testes da camada de domínio (sem navegador, sem dependências): `node --test web/tests/domain.test.js web/tests/cost.test.js` (testado com Node 24).
- Custo de uso: o card da ficha usa os preços de gasolina e diesel da [API Combustível](https://combustivelapi.com.br/) (dados da Petrobras, cache de 2 horas no navegador). Precisa de internet; sem ela o card mostra a mensagem de erro e o resto do site continua funcionando. Etanol e eletricidade não têm preço nessa API.
- Os testes comparam parse, passQ, facetas, ordenação e comparação com os dados em `saida/` e `tesauro.json`.

### Pipeline de dados completo (E1 a E8)
```
python pipeline.py VEICULOS_2026_v2.csv saida
```
**Atenção:** o arquivo `VEICULOS_2026_v2.csv` (Tabela PBE Veicular 2026, Portal de Dados Abertos do Inmetro) **não está no repositório**. Sem ele o `pipeline.py` não roda. Para executá-lo, baixe o CSV no portal e coloque-o nesta pasta. As saídas já geradas estão em `saida/`, então os passos 1 e 2 funcionam sem o CSV.

### Observações
- Os CSVs de `saida/` são UTF-8 com separador `;`.
- A pasta `carga/` é gerada pelo passo 2 e pode ser apagada e recriada quando precisar.
