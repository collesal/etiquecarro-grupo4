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

3. Protótipo: o site publicado lê os veículos e o tesauro do banco de dados (coleções veiculos, termos e meta).
   Aberto localmente, fora do Claude, o arquivo etiquecarro.html não tem acesso ao banco e mostra um aviso.
