#!/usr/bin/env python3
"""Build static/data/pius-x-petit/appendices/educateurs.json.

'Instructions aux parents et aux éducateurs chrétiens' is a short flat
appendix in the Pie X petit catechism (PDF pp. 233-237): 9 numbered
paragraphs followed by a single closing oraison. We hand-encode the OCR'd
text and apply small-caps capitalization fix-up.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

OUT_PATH = (
    Path(__file__).resolve().parents[3]
    / "static/data/pius-x-petit/appendices/educateurs.json"
)

PROPER_NOUNS = [
    "Dieu", "Christ", "Jésus", "Jésus-Christ", "Église", "Esprit", "Esprit-Saint",
    "Saint", "Seigneur", "Père", "Fils", "Mère", "Juge", "Sainte",
    "Marie", "Joseph", "Foi", "Ciel", "Mariage", "Consolateur",
    "Quatre-Temps", "Pentecôte", "Premières",
]

PHRASES = [
    ("très sainte", "très Sainte"),
    ("ainsi soit-il", "Ainsi soit-il"),
    ("esprit saint", "Esprit Saint"),
]


def fix_caps(text: str) -> str:
    if not text:
        return text
    for low, high in PHRASES:
        text = re.sub(re.escape(low), high, text, flags=re.IGNORECASE)
    for noun in sorted(PROPER_NOUNS, key=len, reverse=True):
        pat = r"(?<![\wÀ-ÿ-])" + re.escape(noun.lower()) + r"(?![\wÀ-ÿ-])"
        text = re.sub(pat, noun, text, flags=re.IGNORECASE)
    text = re.sub(r"([.!?]\s+|^|\n)([a-zàâéèêëîïôöùûüÿç])",
                  lambda m: m.group(1) + m.group(2).upper(), text)
    text = re.sub(r"(«\s+)([a-zàâéèêëîïôöùûüÿç])",
                  lambda m: m.group(1) + m.group(2).upper(), text)
    text = re.sub(r"^([a-zàâéèêëîïôöùûüÿç])",
                  lambda m: m.group(1).upper(), text)
    return text


def p(html: str) -> str:
    return "<p>" + fix_caps(html.strip()) + "</p>"


PARAGRAPHS = [
    (1, [
        "faire le catéchisme, c’est instruire dans la foi et dans la morale de "
        "Jésus-Christ ; c’est donner aux enfants de Dieu la conscience de leur "
        "propre origine, de leur dignité, de leur destinée et de leurs propres "
        "devoirs ; c’est déposer et développer dans leurs intelligences les "
        "principes et les motifs de la religion, de la vertu et de la sainteté "
        "sur terre, et par conséquent du bonheur dans le Ciel."
    ]),
    (2, [
        "l’enseignement du catéchisme est donc ce qu’il y a de plus nécessaire "
        "et de plus bienfaisant pour les individus, pour l’Église et pour la "
        "société civile ; c’est l’enseignement fondamental qui est à la base de "
        "la vie chrétienne, laquelle, s’il vient à manquer ou s’il a été mal "
        "donné, devient fragile, chancelante, et facilement disparaît."
    ]),
    (3, [
        "les parents chrétiens, étant les premiers et les principaux éducateurs "
        "de leurs enfants, doivent en être de même les premiers et principaux "
        "catéchistes : les premiers, parce qu’ils doivent leur instiller, pour "
        "ainsi dire avec le lait, la doctrine reçue de l’Église ; les "
        "principaux, parce que c’est à eux qu’il appartient de faire apprendre "
        "par cœur dans la famille les points principaux de la Foi, en "
        "commençant par les Premières prières, et les faire répéter tous les "
        "jours, de façon que peu à peu elles pénètrent profondément dans "
        "l’esprit des enfants. Si les parents, comme il arrive le plus souvent, "
        "étaient contraints de se faire suppléer par d’autres dans l’éducation "
        "de leurs enfants, qu’ils se souviennent de l’obligation sacrée qu’ils "
        "ont de choisir des institutions ou des personnes qui sachent et "
        "veuillent consciencieusement remplir pour eux un si grave devoir. "
        "L’indifférence en cette matière a été la perte irréparable de tant "
        "d’enfants ! Quel compte ne devra-t-on pas en rendre à Dieu !"
    ]),
    (4, [
        "pour enseigner avec fruit la doctrine chrétienne, il faut la bien "
        "savoir, l’exposer et l’expliquer d’une manière adaptée à la capacité "
        "des élèves, et surtout, puisqu’il s’agit d’une doctrine qui a trait à "
        "la pratique, il faut la vivre."
    ]),
    (5, [
        "il faut bien connaître la doctrine chrétienne. Comment instruire, en "
        "effet, si l’on n’est pas instruit ? De là, pour les parents et les "
        "éducateurs, le devoir de repasser le catéchisme et d’en pénétrer à "
        "fond les vérités ; pour cela, ils fréquenteront les instructions plus "
        "étendues données par les curés aux adultes, ils interrogeront des "
        "personnes compétentes et liront, s’ils le peuvent, des livres "
        "appropriés."
    ]),
    (6, [
        "on doit exposer la doctrine chrétienne d’une manière adaptée, "
        "c’est-à-dire qu’il faut le faire avec intelligence et amour, de sorte "
        "que les enfants ne soient pas ennuyés et dégoûtés du maître et de la "
        "doctrine. Dans ce but, il convient de se mettre à leur portée, "
        "d’employer le langage le plus connu et le plus simple, d’éveiller "
        "l’intelligence par des comparaisons et des exemples appropriés, "
        "d’émouvoir les sentiments du cœur ; d’avoir grande discrétion et "
        "mesure pour ne pas fatiguer ; d’avancer peu à peu, sans se rebuter de "
        "répéter, en supportant avec patience et affection les dissipations, "
        "les distractions, les impertinences et autres défauts de cet âge. "
        "Qu’on évite surtout cette manière mécanique d’enseigner qui écrase et "
        "ferme l’esprit, mettant en jeu la seule mémoire sans impliquer "
        "l’intelligence et le cœur."
    ]),
    (7, [
        "enfin, il faut vivre la foi et la morale qu’on enseigne ; autrement "
        "comment aura-t-on le courage d’apprendre aux enfants la religion qu’on "
        "ne pratique pas soi-même, les commandements et les préceptes que l’on "
        "néglige sous leurs propres yeux ? Et quel fruit, en ce cas, pouvoir en "
        "espérer ? Au contraire, les parents se discréditeront facilement "
        "eux-mêmes, et amèneront leurs enfants à l’indifférence et au mépris "
        "des principes les plus nécessaires et des devoirs sacro-saints de la "
        "vie."
    ]),
    (8, [
        "et parce que, de nos jours, on a créé une atmosphère très funeste à la "
        "vie spirituelle, par la guerre à toute idée d’autorité supérieure, de "
        "Dieu, de révélation, de vie future, de mortification, que les parents "
        "et les éducateurs inculquent avec le plus grand soin les vérités "
        "fondamentales contenues dans les premières notions du catéchisme ; "
        "qu’ils leur inspirent le concept chrétien de la vie, le sens de la "
        "responsabilité de tout acte devant le Juge suprême qui est partout, "
        "sait tout et voit tout ; qu’ils leur communiquent, avec la crainte "
        "salutaire de Dieu, l’amour du Christ et de l’Église, le goût de la "
        "charité et de la solide piété, et l’estime de la vertu et des "
        "pratiques chrétiennes. C’est seulement ainsi que l’éducation des "
        "enfants sera fondée non pas sur le sable d’idées mouvantes et de "
        "respect humain, mais sur le roc des convictions surnaturelles, qui ne "
        "seront pas ébranlées durant la vie entière, malgré toutes les "
        "tempêtes."
    ]),
    (9, [
        "pour tout cela, il faut une foi vive, une profonde estime de la valeur "
        "des âmes et des biens spirituels ; il faut cet amour judicieux qui "
        "s’étudie à assurer avant tout l’éternelle félicité aux âmes de ceux "
        "qui leur sont chers. Ce qu’il faut encore, c’est une grâce spéciale "
        "pour comprendre la nature des enfants et trouver le chemin de "
        "l’intelligence et du cœur. Les parents chrétiens, en vertu du "
        "sacrement de Mariage bien reçu, ont droit aux grâces de leur état, et "
        "par conséquent à celles qui sont nécessaires pour élever "
        "chrétiennement leurs enfants. De plus, ils peuvent, par une humble "
        "prière, obtenir de Dieu des grâces plus abondantes dans ce même but ; "
        "car il est particulièrement agréable à Dieu qu’on lui forme des "
        "adorateurs pieux et des fils obéissants. Qu’ils le fassent donc au "
        "prix de tous les sacrifices ; il y va du salut éternel de l’âme de "
        "leurs enfants et de la leur propre. Dieu bénira la foi et l’amour "
        "qu’ils mettront à cette œuvre d’importance capitale, et il leur "
        "donnera la récompense la plus désirable, celle d’une postérité sainte, "
        "éternellement bienheureuse avec eux dans le Ciel."
    ]),
]

ORAISON_HTML = (
    "Nous vous en supplions, Seigneur, que le Consolateur qui procède de vous, "
    "éclaire nos âmes et nous fasse pénétrer toute vérité comme l’a promis "
    "votre Fils, Jésus-Christ notre Seigneur, qui vit et règne avec vous, en "
    "l’unité du même Esprit Saint, dans tous les siècles des siècles. Ainsi "
    "soit-il."
)
ORAISON_CITE = "Oraison pour le mercredi des Quatre-Temps de Pentecôte"


def main() -> None:
    paragraphs = [{"n": n, "html": p(parts[0])} for n, parts in PARAGRAPHS]
    out = {
        "corpus": "pius-x-petit",
        "slug": "educateurs",
        "title": "Instructions aux parents et aux éducateurs chrétiens",
        "kicker": "Appendice",
        "paragraphs": paragraphs,
        "oraison": {"html": fix_caps(ORAISON_HTML), "cite": ORAISON_CITE},
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
    print(f"Wrote {OUT_PATH.relative_to(Path.cwd())}: {len(paragraphs)} paragraphs + 1 oraison")


if __name__ == "__main__":
    main()
