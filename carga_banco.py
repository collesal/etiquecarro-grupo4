"""E8 Carga: gera um arquivo JSON por documento para o banco de dados do site.
Uso: python3 carga_banco.py saida/veiculos.json tesauro.json carga/
Coleções: veiculos (V0001...), termos (T001...), meta/base."""
import json, os, sys
V, T, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
for d in ("veiculos", "termos", "meta"): os.makedirs(os.path.join(OUT, d), exist_ok=True)
vs = json.load(open(V, encoding="utf-8")); ts = json.load(open(T, encoding="utf-8"))
for v in vs: json.dump(v, open(os.path.join(OUT, "veiculos", v["id"] + ".json"), "w", encoding="utf-8"), ensure_ascii=False)
for i, e in enumerate(ts): json.dump({**e, "ordem": i + 1}, open(os.path.join(OUT, "termos", f"T{i+1:03d}.json"), "w", encoding="utf-8"), ensure_ascii=False)
json.dump({"fonte": "Inmetro, Tabela PBE Veicular 2026 (Portal de Dados Abertos)", "arquivo": "VEICULOS_2026_v2.csv",
           "registros": len(vs), "termos": len(ts), "tratado_por": "pipeline.py (etapas E1 a E8)"},
          open(os.path.join(OUT, "meta", "base.json"), "w", encoding="utf-8"), ensure_ascii=False)
print(len(vs), "veículos;", len(ts), "termos")
