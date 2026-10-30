"""Gera o site estático da Agrociel (home, categorias, 26 páginas de serviço, sitemap, robots, llms.txt).
Uso:  python3 _gerador/build.py            -> versão oficial (endereços limpos)
      python3 _gerador/build.py --previa   -> versão de prévia (links com index.html, para visualizar no githack)
"""
import json, os, sys, re, datetime, html
from jinja2 import Environment, FileSystemLoader

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
PREVIA = "--previa" in sys.argv
SITE = "https://www.agrociel.com.br/"
HOJE = datetime.date.today().isoformat()
data = json.load(open(os.path.join(HERE, "conteudo-extraido.json"), encoding="utf-8"))
TOPO = json.load(open(os.path.join(HERE, "topo.json"), encoding="utf-8"))

CIDADES = ["Aurora do Pará", "Mãe do Rio", "Capitão Poço", "Ipixuna do Pará", "Paragominas"]
FRENTES = {
    "agro": {"nome": "Agronegócio", "titulo": "Soluções para o Agronegócio", "url": "agronegocio/", "img": "assets/servicos/analise-de-solo.webp",
             "texto": "Território, regularização, produção e crédito rural para apoiar quem produz no Pará.", "cobertura": "Atendimento em todo o Pará"},
    "assessoria": {"nome": "Assessoria previdenciária", "titulo": "Soluções em Assessoria", "url": "para-voce/#assessoria", "img": "assets/servicos/salario-maternidade-rural.webp",
                   "texto": "Organização de documentos, protocolo e acompanhamento de benefícios rurais e revisões.", "cobertura": "Atendimento em todo o Brasil"},
    "financeiro": {"nome": "Soluções financeiras", "titulo": "Soluções Financeiras", "url": "para-voce/#financeiro", "img": "assets/servicos/emprestimo-consignado-inss.webp",
                   "texto": "Consignado, crédito com garantia, portabilidade, seguros e consórcios com atendimento consultivo.", "cobertura": "Atendimento em todo o Brasil"},
}
# palavras extras para o buscador (como o cliente procura)
CHAVES = {
    "georreferenciamento-rural": "georreferenciamento terra fazenda sitio incra sigef certificacao mapa",
    "georreferenciamento-urbano": "terreno lote casa cidade medicao",
    "regularizacao-rural": "documento da terra car itr ccir titulo escritura regularizar",
    "licenciamento-ambiental": "licenca ambiental semas car",
    "credito-rural": "pronaf financiamento rural custeio investimento banco",
    "analise-de-solo": "solo adubacao calagem laboratorio",
    "assistencia-tecnica-rural": "agronomo tecnico lavoura gado",
    "avaliacao-de-imoveis-rurais": "laudo valor fazenda",
    "servicos-administrativos-rurais": "documentos rurais cadastro",
    "aposentadoria-rural": "inss aposentar trabalhador rural segurado especial",
    "salario-maternidade-rural": "gravida bebe inss maternidade",
    "revisao-de-beneficios": "inss revisao aumentar beneficio",
    "emprestimo-consignado-inss": "consignado aposentado pensionista inss emprestimo",
    "portabilidade-e-refinanciamento": "portabilidade refinanciar trocar banco juros",
    "credito-do-trabalhador-clt": "carteira assinada clt consignado privado",
    "antecipacao-saque-aniversario-fgts": "fgts saque aniversario",
    "emprestimo-na-conta-de-luz": "conta de luz energia",
    "seguro-de-carro-e-moto": "seguro auto moto veiculo",
    "consorcios": "consorcio carro casa",
}

def sentence(s):
    s = s.strip()
    if s and s == s.upper():
        s = s.lower()
        for a, b in (("pará", "Pará"), ("inss", "INSS"), ("clt", "CLT"), ("fgts", "FGTS"), ("agrociel", "Agrociel")):
            s = re.sub(r"\b%s\b" % a, b, s)
        s = s[0].upper() + s[1:]
    return s

# --- serviços, com frente e ordem vindas das páginas de categoria ---
by_slug = {s["slug"]: s for s in data["services"]}
ordem = []
for cat_path, cat in data["categories"].items():
    for sec in cat["sections"]:
        frente = "agro" if cat_path == "/agronegocio" else ("assessoria" if sec["id"] == "assessoria" else "financeiro")
        for c in sec["cards"]:
            s = by_slug[c["slug"]]; s["frente"] = frente; s["card_text"] = c["text"]; s["card_tag"] = sentence(c["tag"] or s["group"])
            ordem.append(s["slug"])
services = [by_slug[x] for x in ordem]
for s in services:
    s["url"] = "servicos/%s/" % s["slug"]
    s["grupo"] = sentence(s["group"])
    s["keys"] = CHAVES.get(s["slug"], "")
    s["img_w"], s["img_h"] = (1200, 900) if s["slug"] in ("analise-de-solo", "georreferenciamento-rural", "georreferenciamento-urbano", "credito-com-garantia-de-veiculo") else (1200, 800)
    agro = s["frente"] == "agro"
    s["cobertura"] = FRENTES[s["frente"]]["cobertura"]
    s["title"] = ("%s no Pará | Agrociel" if agro else "%s | Agrociel") % s["name"]
    desc = s["lead"].rstrip(".") + (". Atendimento em todo o Pará." if agro else ". Atendimento em todo o Brasil pelo WhatsApp.")
    s["description"] = desc if len(desc) <= 160 else s["lead"][:157].rsplit(" ", 1)[0] + "…"
    s["wa_text"] = "Olá! Vim pelo site da Agrociel e gostaria de informações sobre %s." % s["name"]
    mesmos = [x for x in services if x is not s and x["frente"] == s["frente"]]
    s["relacionados"] = [x for x in mesmos if x["group"] == s["group"]][:3]
    s["relacionados"] += [x for x in mesmos if x not in s["relacionados"]][:3 - len(s["relacionados"])]
    s["mesma_frente"] = mesmos

frentes_svcs = {k: [s for s in services if s["frente"] == k] for k in FRENTES}

env = Environment(loader=FileSystemLoader(os.path.join(HERE, "templates")), autoescape=True, trim_blocks=True, lstrip_blocks=True)

def render(tpl, out_rel, **ctx):
    depth = out_rel.count("/")
    rel = "../" * depth
    def u(path=""):
        """endereço relativo de uma página ou arquivo do site"""
        if path in ("", "/"): return (rel or "./") + ("index.html" if PREVIA else "")
        frag = ""
        if "#" in path: path, frag = path.split("#", 1); frag = "#" + frag
        if path == "": return rel + ("index.html" if PREVIA else "") + frag
        if PREVIA and (path.endswith("/")): path += "index.html"
        return rel + path + frag
    ctx["services_json"] = json.dumps([{"name": x["name"], "area": FRENTES[x["frente"]]["nome"], "url": u(x["url"]), "keys": x["keys"]} for x in services], ensure_ascii=False).replace("</", "<\\/")
    ctx.update(u=u, a=lambda p: rel + p, abs_url=lambda p="": SITE + p, frentes=FRENTES, frentes_svcs=frentes_svcs, services=services,
               cidades=CIDADES, topo=TOPO, previa=PREVIA, hoje=HOJE, out_rel=out_rel)
    path = os.path.join(ROOT, out_rel); os.makedirs(os.path.dirname(path) or ROOT, exist_ok=True)
    htmltxt = env.get_template(tpl).render(**ctx)
    open(path, "w", encoding="utf-8").write(htmltxt)
    return out_rel

pages = []
pages.append(render("home.html", "index.html", page="home", canonical=""))
cats = data["categories"]
pages.append(render("categoria.html", "para-voce/index.html", page="para-voce", canonical="para-voce/", cat=cats["/para-voce"],
                    blocos=[("assessoria", FRENTES["assessoria"], frentes_svcs["assessoria"], cats["/para-voce"]["sections"][0]),
                            ("financeiro", FRENTES["financeiro"], frentes_svcs["financeiro"], cats["/para-voce"]["sections"][1])]))
pages.append(render("categoria.html", "agronegocio/index.html", page="agronegocio", canonical="agronegocio/", cat=cats["/agronegocio"],
                    blocos=[("agro", FRENTES["agro"], frentes_svcs["agro"], cats["/agronegocio"]["sections"][0])]))
for s in services:
    pages.append(render("servico.html", "servicos/%s/index.html" % s["slug"], page="servico", canonical=s["url"], s=s))
render("404.html", "404.html", page="404", canonical=None)

# sitemap, robots e llms.txt
urls = [("", "1.0"), ("para-voce/", "0.8"), ("agronegocio/", "0.8")] + [(s["url"], "0.7") for s in services] + [("politica-de-privacidade.html", "0.2"), ("termos-de-servico.html", "0.2")]
sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
sm += ["  <url><loc>%s%s</loc><lastmod>%s</lastmod><priority>%s</priority></url>" % (SITE, p, HOJE, pr) for p, pr in urls]
sm.append("</urlset>")
open(os.path.join(ROOT, "sitemap.xml"), "w").write("\n".join(sm) + "\n")
open(os.path.join(ROOT, "robots.txt"), "w").write("User-agent: *\nAllow: /\n\nSitemap: %ssitemap.xml\n" % SITE)
llms = ["# Agrociel Soluções Integradas", "",
        "> Empresa de serviços com matriz em Aurora do Pará (PA): soluções para o agronegócio em todo o Pará, assessoria previdenciária e soluções financeiras em todo o Brasil. Atendimento pelo WhatsApp (91) 99309-9267, de segunda a sábado, das 8h às 18h.", "",
        "- Endereço: Avenida Bernardo Sayão, 885, Centro, Aurora do Pará — PA, CEP 68658-000",
        "- Agronegócio: atuação próxima em %s; demais cidades do Pará atendidas; outros estados mediante análise." % ", ".join(CIDADES),
        "- A Agrociel não é banco e não cobra pagamento antecipado para liberar crédito.", ""]
for k, f in FRENTES.items():
    llms.append("## %s" % f["titulo"]); llms.append("")
    for s in frentes_svcs[k]: llms.append("- [%s](%s%s): %s" % (s["name"], SITE, s["url"], s["lead"]))
    llms.append("")
open(os.path.join(ROOT, "llms.txt"), "w", encoding="utf-8").write("\n".join(llms))
print("geradas %d páginas%s" % (len(pages) + 1, " (prévia)" if PREVIA else ""))
