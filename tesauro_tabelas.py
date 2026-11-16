"""Gera as tabelas FACETA, TERMO, REMISSIVA e RELACAO_TERMO a partir do tesauro (JSON exportado da seção 3.2)."""
import json, csv, sys, os
TES, OUT = (sys.argv[1] if len(sys.argv) > 1 else "tes_site.json"), (sys.argv[2] if len(sys.argv) > 2 else "saida")
T = [e for e in json.load(open(TES, encoding="utf-8")) if not e.get("busca")]
FAC = ["Identificação", "Categoria do veículo", "Características técnicas", "Emissões", "Consumo e autonomia", "Classificação PBE"]
idf = {f: f"FAC{i+1}" for i, f in enumerate(FAC)}
idt = {e["t"]: f"T{i+1:03d}" for i, e in enumerate(T)}
def w(n, h, rows):
    with open(os.path.join(OUT, n), "w", newline="", encoding="utf-8") as f:
        c = csv.writer(f, delimiter=";"); c.writerow(h); c.writerows(rows)
w("faceta.csv", ["id_faceta", "nome"], [[v, k] for k, v in idf.items()])
w("termo.csv", ["id_termo", "termo_preferido", "id_faceta", "definicao", "nota_explicativa"],
  [[idt[e["t"]], e["t"], idf.get(e.get("fac") or e["t"], ""), e.get("def", ""), e.get("ne", "")] for e in T])
rem = [[idt[e["t"]], u] for e in T for u in e.get("up", [])]
w("remissiva.csv", ["id_remissiva", "id_termo", "forma_nao_preferida"], [[f"R{i+1:04d}"] + r for i, r in enumerate(rem)])
rel = [[idt[e["t"]], idt[g], "TG"] for e in T for g in e.get("tg", []) if g in idt] + \
      [[idt[e["t"]], idt[r], "TR"] for e in T for r in e.get("tr", []) if r in idt]
w("relacao_termo.csv", ["id_termo_origem", "id_termo_destino", "tipo"], rel)
print(len(T), "termos;", len(rem), "remissivas;", len(rel), "relações")
