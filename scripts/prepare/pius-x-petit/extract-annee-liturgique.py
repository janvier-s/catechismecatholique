#!/usr/bin/env python3
"""Build static/data/pius-x-petit/appendices/annee-liturgique.json.

The chapter ('L'année liturgique et la discipline ecclésiastique', PDF pp.
214-232) mixes numbered prose, bulleted lists, sub-headings, oraison
quotations, indulgence concessions with italicized commentary, and a closing
prayer. Pure heuristic extraction from the PDF is brittle, so we encode the
structure explicitly in this file (one source of truth) and apply the same
small-caps→Title-case fix-up used for histoire-revelation.

Data shape:
    {
        corpus, slug, title, kicker,
        chapters: [
            { roman, title, subtitle?, sections: [
                { n, title, blocks: [Block, ...] }
            ]}
        ]
    }

Block kinds:
    {kind: 'h',       text}                              -- level-3 sub-heading
    {kind: 'intro',   html}                              -- unnumbered prose
    {kind: 'para',    n?, html}                          -- numbered prose
    {kind: 'ol_roman',items: [{roman, html}]}            -- liturgical seasons
    {kind: 'ol',      items: [{n, html}]}                -- 1. 2. 3.
    {kind: 'ul',      items: [{html, sub?: [str]}]}      -- bulleted
    {kind: 'concession', n, html, note?}                 -- indulgence concession
    {kind: 'indulgence', label, body?, sub?: [str]}      -- plenary indulgence item
    {kind: 'oraison', html, cite?}
    {kind: 'prayer',  title, html}
"""
from __future__ import annotations

import json
import re
from pathlib import Path

OUT_PATH = (
    Path(__file__).resolve().parents[3]
    / "scripts/prepare/pius-x-petit/_appendices/annee-liturgique.json"
)

PROPER_NOUNS = [
    # Theological
    "Dieu", "Christ", "Christ-Roi", "Messie", "Sauveur", "Rédempteur",
    "Saint-Esprit", "Esprit-Saint", "Père", "Seigneur", "Vierge",
    "Mère", "Juge", "Apôtres", "Apôtre", "Sainte", "Saint",
    "Saints", "Sacré-Cœur", "Cœur", "Verbe",
    # Persons / places
    "Marie", "Joseph", "Jean-Baptiste", "Pierre", "Paul", "Damase",
    "Jésus", "Jésus-Christ", "Église", "Notre-Seigneur", "Notre-Dame",
    "Pie", "Pie XII", "Napoléon", "Caprara", "Latran", "Rome", "France",
    "Synagogue", "Sanhédrin", "Thabor",
    # Liturgical times / feasts
    "Avent", "Noël", "Carême", "Quadragésime", "Septuagésime",
    "Sexagésime", "Quinquagésime", "Pâques", "Passion", "Cendres",
    "Ascension", "Pentecôte", "Trinité", "Épiphanie", "Toussaint",
    "Immaculée", "Conception", "Assomption", "Annonciation",
    "Visitation", "Purification", "Maternité", "Nativité",
    "Circoncision", "Transfiguration", "Eucharistie", "Fête-Dieu",
    "Corpus", "Christi", "Quatre-Temps",
    "Triduum", "Sacré", "Semaine", "Saintes", "Écritures",
    "Foi", "Voie", "Vérité", "Vie", "Histoire",
    "Litanies", "Martyrologe", "Précurseur", "Confesseur", "Patron",
    "Princes",
    "Tantum", "Veni", "Creator", "Te", "Deum", "Pater", "Credo",
    "Ave", "Ainsi", "Pontife", "Souverain",
    "Motu", "Sacram", "Enchiridion",
    "Indulgentiarum", "Bréviaire", "Missel", "Romain",
    "Saint-Sacrement", "Cena", "Domini", "Cœur", "Acathiste", "Paraclisis",
    "Iesu", "Redemptor", "Portioncule",
    "Concile", "Constitution",
    "Mont",
    "Mission", "Missions", "Sacrées", "Visite", "Visiteur",
    # OT (rarely appear here but keep)
    "Adam", "Ève", "Israël",
    # Ordinals / day labels stylized
    "Princes",
    # Roman / catechetical
    "Catéchisme",
]

PHRASES = [
    ("notre-seigneur", "Notre-Seigneur"),
    ("notre seigneur", "Notre Seigneur"),
    ("notre-dame", "Notre-Dame"),
    ("notre dame", "Notre-Dame"),
    ("très sainte", "très Sainte"),
    ("très saint", "très Saint"),
    ("sainte vierge", "sainte Vierge"),
    ("saint-esprit", "Saint-Esprit"),
    ("saint-sacrement", "Saint-Sacrement"),
    ("sacré-cœur", "Sacré-Cœur"),
    ("sacré cœur", "Sacré-Cœur"),
    ("fête-dieu", "Fête-Dieu"),
    ("corpus christi", "Corpus Christi"),
    ("vendredi saint", "Vendredi Saint"),
    ("samedi saint", "Samedi Saint"),
    ("jeudi saint", "Jeudi Saint"),
    ("semaine sainte", "Semaine Sainte"),
    ("vigile pascale", "Vigile pascale"),
    ("temps pascal", "temps Pascal"),
    ("immaculée conception", "Immaculée Conception"),
    ("très saint corps", "très Saint Corps"),
    ("histoire sainte", "Histoire Sainte"),
    ("très précieux sang", "très Précieux Sang"),
    ("bénédiction apostolique", "bénédiction apostolique"),
    ("sainte famille", "Sainte Famille"),
    ("saintes écritures", "Saintes Écritures"),
    ("urbi et orbi", "urbi et orbi"),
    ("article de la mort", "article de la mort"),
    ("in articulo mortis", "in articulo mortis"),
    ("in cena domini", "in Cena Domini"),
    ("per annum", "per annum"),
    ("conc.", "conc."),
    ("première messe", "Première Messe"),
    ("première communion", "Première Communion"),
    ("congrès eucharistique", "Congrès eucharistique"),
    ("synode diocésain", "Synode diocésain"),
    ("visite pastorale", "Visite pastorale"),
    ("missions sacrées", "Missions Sacrées"),
    ("mission sacrée", "Mission sacrée"),
]


def fix_caps(text: str) -> str:
    if not text:
        return text
    for low, high in PHRASES:
        text = re.sub(re.escape(low), high, text, flags=re.IGNORECASE)
    for noun in sorted(PROPER_NOUNS, key=len, reverse=True):
        pat = r"(?<![\wÀ-ÿ-])" + re.escape(noun.lower()) + r"(?![\wÀ-ÿ-])"
        text = re.sub(pat, noun, text, flags=re.IGNORECASE)

    # Sentence-initial capitalization
    def cap(m: re.Match) -> str:
        return m.group(1) + m.group(2).upper()
    text = re.sub(r"([.!?]\s+|^|\n)([a-zàâéèêëîïôöùûüÿç])", cap, text)
    text = re.sub(r"(«\s+)([a-zàâéèêëîïôöùûüÿç])", cap, text)
    text = re.sub(r"^([a-zàâéèêëîïôöùûüÿç])", lambda m: m.group(1).upper(), text)

    return text


def p(html: str) -> str:
    """Wrap raw text in <p> after fixing caps. Allow <em>..</em> markup."""
    return "<p>" + fix_caps(html.strip()) + "</p>"


def t(text: str) -> str:
    return fix_caps(text.strip())


# ─── Data ────────────────────────────────────────────────────────────────────

CHAPTER_I = {
    "roman": "I",
    "title": "L’année liturgique",
    "subtitle": "D’après le code des rubriques du Bréviaire et du Missel Romain du 25 juillet 1960",
    "sections": [
        {
            "n": 1,
            "title": "Notions sur les fêtes chrétiennes",
            "blocks": [
                {"kind": "para", "n": 1, "html": p(
                    "ce n’est pas seulement par la doctrine chrétienne et par l’Histoire Sainte, "
                    "mais encore par ses fêtes, que l’Église nous rappelle et nous enseigne "
                    "concrètement les vérités de la Foi et les meilleurs exemples des vertus "
                    "chrétiennes."
                )},
                {"kind": "para", "n": 2, "html": p(
                    "les fêtes ont été instituées pour rendre à Dieu en public, dans ses saints "
                    "temples, le culte suprême d’adoration, de louange, de remerciement, de "
                    "réparation. Tout y a été admirablement disposé et adapté aux circonstances : "
                    "les cérémonies, les paroles, les chants, l’ordonnance extérieure en tous ses "
                    "détails. Ainsi, elles peuvent faire pénétrer profondément dans l’esprit les "
                    "mystères, les vérités ou les faits que nous célébrons, et nous porter aux "
                    "sentiments et aux actes qui y correspondent."
                ) + p(
                    "si les fidèles étaient bien instruits de ces fêtes et les célébraient avec "
                    "l’esprit voulu de l’Église en leur institution, on obtiendrait une rénovation "
                    "et un accroissement notable de foi, de piété et de connaissance religieuse. "
                    "En conséquence, on aurait de la part des fidèles une vie chrétienne plus "
                    "forte et plus féconde en œuvres."
                )},
                {"kind": "para", "n": 3, "html": p(
                    "l’année entière est consacrée à Dieu. Il ne se passe point de jour sans que "
                    "l’Église nous lise, à la Messe et à l’office, quelques extraits des Saintes "
                    "Écritures qui sont l’œuvre de Dieu, sans qu’elle nous suggère, avec une "
                    "merveilleuse variété, des formules appropriées de louanges et de prières au "
                    "Seigneur, notre premier principe et notre dernière fin."
                ) + p(
                    "elle nous rappelle les infinies perfections de Dieu, ses bienfaits immenses, "
                    "sa loi sainte."
                ) + p(
                    "elle nous rapporte chaque jour, à l’évangile de la Messe, quelque miracle ou "
                    "quelque enseignement de notre Seigneur Jésus-Christ, qui est la Voie, la "
                    "Vérité et la Vie, et qui, seul, a « les paroles de la vie éternelle »."
                ) + p(
                    "mais comme nous ne sommes d’ordinaire obligés d’assister au saint Sacrifice "
                    "que les dimanches, la sainte Église y a sagement réparti le saint évangile "
                    "et les écrits apostoliques. De la sorte, la vie entière et la doctrine du "
                    "Sauveur sont lues et expliquées aux fidèles durant l’année, formant ainsi "
                    "un vrai cours d’instruction religieuse chrétienne."
                )},
                {"kind": "para", "n": 4, "html": p(
                    "en outre, l’Église a institué des fêtes spéciales. Elle vénère, le premier "
                    "dimanche après la Pentecôte, le mystère fondamental du christianisme, la "
                    "très Sainte Trinité, à qui elle offre continuellement l’honneur, la gloire "
                    "et le sacrifice."
                ) + p(
                    "elle rappelle et célèbre les faits principaux de la vie du Seigneur ainsi "
                    "que les mystères essentiels qui manifestent plus clairement son infinie "
                    "miséricorde envers nous :"
                )},
                {"kind": "ul", "items": [
                    {"html": t("sa naissance à Noël ou fête de la Nativité de Notre-Seigneur (25 décembre) ;")},
                    {"html": t("sa Circoncision en l’octave de la Nativité (1<sup>er</sup> janvier) ;")},
                    {"html": t("sa manifestation à l’Épiphanie (6 janvier) ;")},
                    {"html": t("son baptême (13 janvier) ;")},
                    {"html": t("sa Transfiguration au Mont Thabor (6 août) ;")},
                    {"html": t("sa Passion et sa Mort le Vendredi Saint ;")},
                    {"html": t("sa glorieuse résurrection à Pâques ;")},
                    {"html": t("son Ascension triomphante ;")},
                    {"html": t("l’envoi du Saint-Esprit sur l’Église à la Pentecôte ;")},
                    {"html": t(
                        "la présence réelle de son Corps et de son Sang dans la très Sainte Eucharistie "
                        "(Fête-Dieu ou Corpus Christi) le jeudi qui suit le I<sup>er</sup> dimanche "
                        "après la Pentecôte ;"
                    )},
                    {"html": t(
                        "son Cœur infiniment miséricordieux, le vendredi qui suit le II<sup>e</sup> "
                        "dimanche après la Pentecôte ;"
                    )},
                    {"html": t("son très Précieux Sang (le 1<sup>er</sup> juillet) ;")},
                    {"html": t(
                        "sa royauté sociale, à la fête de Notre Seigneur Jésus-Christ Roi, le dernier "
                        "dimanche d’octobre."
                    )},
                ]},
                {"kind": "intro", "html": p(
                    "la célébration des fêtes de Noël, de Pâques et de Pentecôte est prolongée "
                    "pendant huit jours consécutifs, appelés octave. D’autre part, l’Église nous "
                    "prépare aux deux premières par un temps de prière et de jeûne : l’Avent, qui "
                    "précède Noël, et le Carême institué en mémoire des quarante jours de jeûne "
                    "du Sauveur, et consacré d’une façon toute spéciale à la pénitence, à "
                    "l’instruction catéchistique et à la prédication."
                ) + p(
                    "cette préparation à Pâques est suivie d’une longue période joyeuse, appelée "
                    "temps Pascal, en souvenir des quarante jours que Jésus-Christ glorieux a "
                    "passés sur la terre après sa résurrection."
                )},
                {"kind": "para", "n": 5, "html": p(
                    "l’Église célèbre avec la plus grande solennité les privilèges singuliers de "
                    "la très sainte Vierge Marie, propres à elle seule comme Mère de Dieu :"
                )},
                {"kind": "ul", "items": [
                    {"html": t("son exemption du péché originel en la fête de l’Immaculée Conception (8 décembre) ;")},
                    {"html": t(
                        "l’élévation immédiate de son corps virginal avec son âme dans la gloire "
                        "céleste en la fête de l’Assomption (15 août)."
                    )},
                ]},
                {"kind": "intro", "html": p(
                    "outre sa Maternité divine (fêtée le 11 octobre), le peuple chrétien célèbre, "
                    "avec grande joie, les événements les plus mémorables de sa vie :"
                )},
                {"kind": "ul", "items": [
                    {"html": t("sa Nativité (8 septembre) ;")},
                    {"html": t("l’Annonciation (25 mars) ;")},
                    {"html": t("la Visitation (2 juillet) ;")},
                    {"html": t("la Purification (2 février).")},
                ]},
                {"kind": "intro", "html": p(
                    "plusieurs jours lui ont été aussi consacrés pour commémorer d’autres "
                    "mystères de sa vie ou quelques-uns de ses bienfaits plus insignes :"
                )},
                {"kind": "ul", "items": [
                    {"html": t(
                        "Notre-Dame des Sept Douleurs : le vendredi de la Passion de "
                        "Notre-Seigneur et le 15 septembre ;"
                    )},
                    {"html": t("Marie Reine (31 mai) ;")},
                    {"html": t("le Cœur immaculé de Marie (22 août) ;")},
                    {"html": t("le Saint Rosaire (7 octobre), solennisé le I<sup>er</sup> dimanche d’octobre.")},
                ]},
                {"kind": "intro", "html": p(
                    "elle célèbre aussi d’autres fêtes particulières qui alimentent la piété des "
                    "fidèles envers leur Mère du Ciel."
                )},
                {"kind": "para", "n": 6, "html": p(
                    "la gloire de tous les anges et de tous les Saints de l’Église triomphante "
                    "nous est présentée en la fête de la Toussaint (1<sup>er</sup> novembre), "
                    "afin qu’en nous réjouissant de leur triomphe, nous nous sentions portés à "
                    "marcher sur leurs traces."
                ) + p(
                    "le lendemain, comme pour donner une suite naturelle à la fête de tous les "
                    "Saints, l’Église nous rappelle tous nos chers défunts du Purgatoire "
                    "(Commémoration des fidèles défunts, 2 novembre), afin que nous les aidions "
                    "par nos prières et qu’à la pensée de leurs souffrances nous nous sentions "
                    "nous-mêmes stimulés à faire pénitence de nos péchés et à pratiquer toute "
                    "sorte de bonnes œuvres."
                ) + p(
                    "parmi le cortège des anges et Saints, l’Église ne célèbre avec une grande "
                    "solennité, que les tout principaux :"
                )},
                {"kind": "ul", "items": [
                    {"html": t("Saint Michel Archange en la fête de la dédicace (29 septembre) ;")},
                    {"html": t(
                        "Saint Joseph, époux de la Vierge Marie, Confesseur, Patron de l’Église "
                        "universelle (19 mars) ; et saint Joseph, artisan (1<sup>er</sup> mai) ;"
                    )},
                    {"html": t(
                        "Saint Jean-Baptiste, Précurseur de Notre-Seigneur, en la fête de sa "
                        "Nativité (24 juin) ;"
                    )},
                    {"html": t("les saints Pierre et Paul, Princes des Apôtres (29 juin).")},
                ]},
                {"kind": "intro", "html": p(
                    "non contente d’honorer presque chaque jour un saint en particulier, "
                    "l’Église rappelle quotidiennement par son Martyrologe les noms des autres "
                    "saints et bienheureux dont on célèbre la mémoire dans les différentes "
                    "églises particulières."
                ) + p(
                    "elle nous montre ainsi qu’elle les voudrait toujours présents à la mémoire "
                    "des fidèles, honorés et invoqués par eux pour leur édification, leur soutien "
                    "et leur encouragement."
                )},
                {"kind": "para", "n": 7, "html": p(
                    "certains jours enfin méritent particulièrement, de notre part, attention et "
                    "observance. Ce sont :"
                )},
                {"kind": "ul", "items": [
                    {"html": t("les féries de l’Avent et du Carême consacrées au jeûne et à la pénitence ;")},
                    {"html": t("les vigiles instituées comme préparation aux plus grandes fêtes ;")},
                    {"html": t(
                        "les Quatre-Temps, les Litanies majeures (en la fête de Saint Marc, le "
                        "25 avril) et les Litanies mineures ou rogations (les trois jours "
                        "précédant l’Ascension) pour demander la grâce d’avoir de bons prêtres "
                        "et la conservation des fruits de la terre ;"
                    )},
                    {"html": t(
                        "le Triduum Sacré ou trois derniers jours de la Semaine Sainte, tout "
                        "spécialement consacré à nous représenter, dans la forme la plus vive, "
                        "les atroces souffrances et la mort ignominieuse que l’Homme-Dieu "
                        "supporta pour nous racheter, nous, indignes pécheurs, de l’esclavage de "
                        "Satan et de la mort."
                    )},
                ]},
                {"kind": "para", "n": 8, "html": p(
                    "que tout bon chrétien s’efforce donc, s’aidant de la prédication et de "
                    "quelque livre approprié, de comprendre et de faire sien l’esprit de chacune "
                    "de ces fêtes."
                ) + p(
                    "qu’il connaisse l’objet et la fin spéciale de la fête, médite la vérité, la "
                    "vertu, le prodige, le bienfait qui nous y est particulièrement rappelé."
                ) + p(
                    "qu’il cherche enfin à en tirer le meilleur profit pour son âme."
                ) + p(
                    "par ce moyen, il connaîtra mieux et aimera avec plus de ferveur Dieu, notre "
                    "Seigneur Jésus-Christ, la très sainte Vierge, les anges et les Saints, et "
                    "il sera porté à mettre en pratique leurs exemples et leurs enseignements."
                ) + p(
                    "il s’attachera avec affection à la liturgie sacrée, à la prédication et à "
                    "l’Église, et il tâchera de communiquer aussi aux autres ce goût et cet amour."
                ) + p(
                    "toute fête sera dès lors pour lui un jour de Dieu, une vraie fête qui "
                    "réjouira son âme, la restaurera, la retrempera, la remplira d’une nouvelle "
                    "vigueur pour porter les souffrances et les luttes quotidiennes de toute la "
                    "semaine."
                )},
            ],
        },
        {
            "n": 2,
            "title": "Les temps de l’année liturgique",
            "blocks": [
                {"kind": "ol_roman", "items": [
                    {"roman": "I", "html": t(
                        "le temps de l’<em>Avent</em>, du I<sup>er</sup> dimanche de l’Avent à "
                        "la vigile de Noël."
                    )},
                    {"roman": "II", "html": t(
                        "le temps de la <em>Naissance du Christ</em>, de Noël au 13 janvier, qui "
                        "comprend les temps de Noël et de l’Épiphanie."
                    )},
                    {"roman": "III", "html": t(
                        "le temps de la <em>Septuagésime</em>, qui inclut les dimanches de "
                        "Septuagésime, de Sexagésime et de Quinquagésime."
                    )},
                    {"roman": "IV", "html": t(
                        "le temps du <em>Carême</em>, du mercredi des Cendres au Samedi Saint, "
                        "qui comprend les temps de la Quadragésime et de la Passion."
                    )},
                    {"roman": "V", "html": t(
                        "le temps <em>Pascal</em>, du dimanche de la résurrection au samedi de "
                        "la Pentecôte, qui regroupe les temps de Pâques, de l’Ascension et "
                        "l’octave de la Pentecôte."
                    )},
                    {"roman": "VI", "html": t(
                        "le temps de l’<em>année</em> ou temps « <em>per annum</em> », du "
                        "14 janvier au samedi précédant le dimanche de la Septuagésime, et de "
                        "la fête de la Sainte Trinité au samedi précédant le I<sup>er</sup> "
                        "dimanche de l’Avent."
                    )},
                ]},
                {"kind": "oraison", "html": fix_caps(
                    "Ô Dieu, qui chaque année, nous réjouissez en la solennité de la "
                    "Résurrection du Seigneur, faites, dans votre bonté, qu’au moyen de ces "
                    "fêtes que nous célébrons dans le temps, nous méritions d’arriver aux "
                    "joies éternelles."
                ), "cite": "Oraison du mercredi de Pâques"},
                {"kind": "oraison", "html": fix_caps(
                    "Nous vous en supplions, Seigneur, donnez à vos fidèles de ressentir "
                    "toujours de la joie en vénérant vos Saints et d’être toujours assistés de "
                    "leur prière. Par Jésus-Christ, votre Fils, notre Seigneur. Ainsi soit-il."
                ), "cite": "Postcommunion de la Messe de saint Damase, 11 décembre"},
            ],
        },
    ],
}

CHAPTER_II = {
    "roman": "II",
    "title": "La discipline ecclésiastique",
    "sections": [
        {
            "n": 1,
            "title": "Les jours de fêtes d’obligation",
            "blocks": [
                {"kind": "h", "text": "I. Dans l’Église Universelle"},
                {"kind": "intro", "html": p(
                    "le dimanche doit être observé comme le principal jour de fête de précepte. "
                    "Ce jour-là sont célébrées plusieurs fêtes de I<sup>ère</sup> classe dans "
                    "l’Église universelle : Pâques ou Fête de la résurrection, la Pentecôte et "
                    "la Fête de la très Sainte Trinité."
                ) + p(
                    "de plus, l’Église universelle célèbre dans l’année dix fêtes de précepte."
                )},
                {"kind": "intro", "html": p("<em>Cinq fêtes en l’honneur de Notre Seigneur Jésus-Christ :</em>")},
                {"kind": "ol", "items": [
                    {"n": 1, "html": t("la Nativité de Notre Seigneur Jésus-Christ (25 décembre) ;")},
                    {"n": 2, "html": t("la Circoncision en l’octave de la Nativité (1<sup>er</sup> janvier) ;")},
                    {"n": 3, "html": t("l’Épiphanie (6 janvier) ;")},
                    {"n": 4, "html": t("l’Ascension (quarante jours après Pâques) ;")},
                    {"n": 5, "html": t(
                        "la Fête-Dieu ou Fête du très Saint Corps du Christ "
                        "(jeudi qui suit le I<sup>er</sup> dimanche après la Pentecôte)."
                    )},
                ]},
                {"kind": "intro", "html": p("<em>Deux fêtes en l’honneur de la très sainte Vierge Marie :</em>")},
                {"kind": "ol", "items": [
                    {"n": 6, "html": t("l’Immaculée Conception (8 décembre) ;")},
                    {"n": 7, "html": t("l’Assomption (15 août).")},
                ]},
                {"kind": "intro", "html": p("<em>Trois fêtes en l’honneur des Saints :</em>")},
                {"kind": "ol", "items": [
                    {"n": 8, "html": t("Saint Joseph (19 mars) ;")},
                    {"n": 9, "html": t("les saints Apôtres Pierre et Paul (29 juin) ;")},
                    {"n": 10, "html": t("la Toussaint (1<sup>er</sup> novembre).")},
                ]},
                {"kind": "h", "text": "II. En France"},
                {"kind": "intro", "html": p(
                    "par décret du cardinal Caprara, concédé à Napoléon en 1802, les fêtes "
                    "d’obligation en vigueur en France ont été restreintes au nombre de quatre :"
                )},
                {"kind": "ol", "items": [
                    {"n": 1, "html": t("la Nativité de Notre Seigneur Jésus-Christ (25 décembre) ;")},
                    {"n": 2, "html": t("l’Ascension (quarante jours après Pâques) ;")},
                    {"n": 3, "html": t("l’Assomption (15 août) ;")},
                    {"n": 4, "html": t("la Toussaint (1<sup>er</sup> novembre).")},
                ]},
                {"kind": "intro", "html": p(
                    "l’Épiphanie, la Fête-Dieu et la fête des saints Apôtres Pierre et Paul, "
                    "quant à elles, sont solennisées le dimanche qui suit leur célébration."
                )},
            ],
        },
        {
            "n": 2,
            "title": "Les jours d’abstinence et de jeûne",
            "blocks": [
                {"kind": "h", "text": "I. Jours d’abstinence de viande"},
                {"kind": "intro", "html": p(
                    "l’abstinence de viande sera observée chaque vendredi de l’année, (à moins "
                    "que ne soit célébrée ce jour-là une fête chômée de l’Église universelle) "
                    "et plus gravement les jours de jeûne : le mercredi des Cendres et le "
                    "Vendredi Saint."
                )},
                {"kind": "h", "text": "II. Jours de jeûne"},
                {"kind": "intro", "html": p("le jeûne est à observer :")},
                {"kind": "ol", "items": [
                    {"n": 1, "html": t("le mercredi des Cendres ;")},
                    {"n": 2, "html": t("le Vendredi Saint.")},
                ]},
                {"kind": "h", "text": "III. Pratique traditionnelle de l’Église"},
                {"kind": "intro", "html": p(
                    "selon la tradition multi-séculaire, en vigueur dans l’Église jusqu’au "
                    "XX<sup>e</sup> siècle, les fidèles sont vivement encouragés à observer "
                    "le jeûne et l’abstinence :"
                )},
                {"kind": "ol", "items": [
                    {"n": 1, "html": t(
                        "les vendredis de Carême, voire, pour ceux qui le peuvent, tous les "
                        "jours de semaine du Carême ;"
                    )},
                    {"n": 2, "html": t("les mercredis, vendredis et samedis des Quatre-Temps :"),
                     "sub": [
                        t("de l’Avent, dans la troisième semaine,"),
                        t("de la Quadragésime, dans la première semaine de Carême,"),
                        t("de la Pentecôte, pendant l’octave,"),
                        t("de septembre, dans la troisième semaine de ce mois ;"),
                     ]},
                    {"n": 3, "html": t(
                        "les quatre vigiles de Noël, de la Pentecôte, de la Toussaint et de "
                        "l’Immaculée Conception."
                    )},
                ]},
            ],
        },
        {
            "n": 3,
            "title": "Le jeûne eucharistique",
            "blocks": [
                {"kind": "intro", "html": p(
                    "dès l’époque la plus ancienne, l’Église imposa le jeûne avant de recevoir "
                    "l’Eucharistie et se montra sévère dans l’application de cette discipline. "
                    "Les motifs ont déjà été exprimés par saint Paul. L’abstention de nourriture "
                    "et de boisson convient au profond respect que nous devons avoir envers la "
                    "Majesté suprême de Jésus-Christ avant de le recevoir sous les voiles de "
                    "l’Eucharistie. Ce jeûne fut traditionnellement observé depuis minuit. "
                    "Pie XII atténua la rigueur de la loi et réduisit le temps du jeûne à trois "
                    "heures pour faciliter aux fidèles un accès fréquent à la table eucharistique."
                ) + p(
                    "par la suite, la discipline fut considérablement amoindrie, au point d’avoir "
                    "été réduite à une heure (Code 1983). Cependant, de par la nature même des "
                    "choses, une heure n’est pas un temps suffisant pour permettre la digestion, "
                    "ni pour parler véritablement de « jeûne ». Si donc l’obligation légale "
                    "n’exige pas davantage, l’obligation morale de droit naturel, quant à elle, "
                    "demeure."
                ) + p(
                    "c’est pourquoi les fidèles sont vivement encouragés à suivre les "
                    "prescriptions suivantes du pape Pie XII publiées dans son Motu proprio "
                    "<em>Sacram communionem</em> du 19 mars 1957 :"
                )},
                {"kind": "oraison", "html": fix_caps(
                    "« 2. Les prêtres et les fidèles sont tenus à s’abstenir, pendant trois "
                    "heures, d’aliments solides et de boissons alcoolisées, pendant une heure de "
                    "boissons non alcoolisées, respectivement avant la Messe ou la sainte "
                    "communion : l’eau pure ne rompt pas le jeûne. (...) "
                    "<br><br>"
                    "4. Les malades, même s’ils ne sont pas alités, peuvent prendre des boissons "
                    "non alcoolisées et de véritables remèdes, aussi bien solides que liquides, "
                    "respectivement avant la Messe ou la sainte communion, sans limites de temps. "
                    "<br><br>"
                    "Toutefois, nous exhortons vivement les prêtres et les fidèles qui sont en "
                    "mesure de le faire, d’observer, avant la Messe ou la sainte communion, "
                    "l’antique et vénérable forme du jeûne eucharistique »,"
                ), "cite": "Pie XII, Motu proprio Sacram communionem, 19 mars 1957"},
                {"kind": "intro", "html": p(
                    "c’est-à-dire le jeûne naturel observé depuis minuit."
                )},
            ],
        },
    ],
}

CHAPTER_III = {
    "roman": "III",
    "title": "Les indulgences",
    "subtitle": "D’après l’Enchiridion Indulgentiarum Romain du 16 juillet 1999",
    "sections": [
        {
            "n": 1,
            "title": "Normes générales sur les indulgences",
            "blocks": [
                {"kind": "ol", "items": [
                    {"n": 1, "html": t(
                        "l’indulgence est la remise devant Dieu de la peine temporelle due "
                        "pour les péchés déjà effacés quant à la faute, que le fidèle, bien "
                        "disposé et à certaines conditions déterminées, reçoit par "
                        "l’intervention de l’Église qui, en tant que ministre de la rédemption, "
                        "distribue et applique avec autorité le trésor des satisfactions du "
                        "Christ et des Saints."
                    ), "label": "n. 1"},
                    {"n": 2, "html": t(
                        "l’indulgence est partielle ou plénière selon qu’elle libère en partie "
                        "ou totalement de la peine temporelle due pour les péchés."
                    ), "label": "n. 2"},
                    {"n": 3, "html": t(
                        "tout fidèle peut gagner des indulgences partielles ou plénières pour "
                        "lui-même, ou les appliquer aux défunts par mode de suffrage."
                    ), "label": "n. 3"},
                    {"n": 4, "html": t(
                        "au fidèle qui, au moins le cœur contrit, accomplit une œuvre à "
                        "laquelle est attachée une indulgence partielle, est appliquée par "
                        "l’Église la remise d’une peine temporelle de même valeur que celle "
                        "qu’il obtient déjà par son œuvre."
                    ), "label": "n. 4"},
                ]},
            ],
        },
        {
            "n": 2,
            "title": "Conditions requises pour gagner les indulgences",
            "blocks": [
                {"kind": "h", "text": "I. Conditions générales"},
                {"kind": "ol", "items": [
                    {"n": 17, "html": t(
                        "<strong>§ 1.</strong> Pour avoir capacité à gagner des indulgences, "
                        "il faut être baptisé, non excommunié et en état de grâce, au moins à "
                        "la fin des œuvres prescrites."
                        "<br>"
                        "<strong>§ 2.</strong> Cependant, pour qu’un sujet capable gagne des "
                        "indulgences, il doit avoir l’intention au moins générale de les "
                        "acquérir, et accomplir les œuvres imposées dans le temps fixé et de "
                        "la manière prescrite, selon la teneur de la concession."
                    ), "label": "n. 17"},
                    {"n": 18, "html": t(
                        "<strong>§ 1.</strong> L’indulgence plénière ne peut être acquise "
                        "qu’une seule fois par jour ; l’indulgence partielle peut l’être "
                        "plusieurs fois."
                    ), "label": "n. 18"},
                ]},
                {"kind": "h", "text": "II. Conditions pour l’indulgence plénière"},
                {"kind": "ol", "items": [
                    {"n": 19, "html": t(
                        "l’œuvre prescrite pour acquérir l’indulgence plénière attachée à une "
                        "église ou à un oratoire consiste à y faire une pieuse visite, au "
                        "cours de laquelle on récite l’oraison dominicale et le symbole de la "
                        "Foi (Pater et Credo), à moins que la concession n’en dispose "
                        "autrement."
                    ), "label": "n. 19"},
                    {"n": 20, "html": t(
                        "<strong>§ 1.</strong> Pour gagner l’indulgence plénière, en plus "
                        "d’exclure toute affection au péché, même véniel, il est requis "
                        "d’accomplir l’œuvre indulgenciée et de remplir les trois conditions : "
                        "confession sacramentelle, communion eucharistique et prière aux "
                        "intentions du Souverain Pontife."
                        "<br>"
                        "<strong>§ 2.</strong> Avec une seule confession sacramentelle, on "
                        "peut acquérir plusieurs indulgences plénières ; mais avec une seule "
                        "communion eucharistique et une seule prière aux intentions du "
                        "Souverain Pontife, on n’acquiert qu’une seule indulgence plénière."
                        "<br>"
                        "<strong>§ 3.</strong> Les trois conditions peuvent être remplies "
                        "plusieurs jours avant ou après l’accomplissement de l’œuvre "
                        "prescrite ; cependant, il convient de recevoir la communion et de "
                        "prier aux intentions du Souverain Pontife le jour même où l’on "
                        "accomplit l’œuvre."
                        "<br>"
                        "<strong>§ 4.</strong> S’il manque la pleine disposition, ou si "
                        "l’œuvre requise n’est pas entièrement exécutée et les trois "
                        "conditions susdites ne sont pas remplies, l’indulgence sera "
                        "seulement partielle."
                        "<br>"
                        "<strong>§ 5.</strong> La condition de prier aux intentions du "
                        "Souverain Pontife est remplie si l’on récite à son intention un "
                        "Pater et un Ave ; cependant les fidèles sont libres de réciter toute "
                        "autre prière selon la piété et dévotion de chacun."
                    ), "label": "n. 20"},
                ]},
            ],
        },
        {
            "n": 3,
            "title": "Quatre concessions générales concernant les indulgences partielles",
            "blocks": [
                {"kind": "intro", "html": p(
                    "sont proposées avant tout quatre concessions d’indulgences invitant le "
                    "fidèle à pénétrer d’esprit chrétien les actions qui sont en quelque sorte "
                    "la trame de sa vie quotidienne, et à chercher la perfection de la charité "
                    "dans ses occupations ordinaires."
                )},
                {"kind": "concession", "n": 1, "html": t(
                    "une indulgence partielle est accordée au fidèle qui, accomplissant ses "
                    "devoirs et supportant les adversités de la vie, élève son âme vers Dieu "
                    "avec une humble confiance, en ajoutant, ne serait-ce que mentalement, une "
                    "pieuse invocation."
                ), "note": t(
                    "par cette première concession, les fidèles sont conduits en quelque sorte "
                    "à mettre en pratique le commandement du Christ : « Il est nécessaire de "
                    "prier sans cesse et de ne pas se décourager » ; en même temps ils sont "
                    "exhortés à s’acquitter de leurs devoirs d’une façon telle qu’ils gardent "
                    "et accroissent leur union au Christ."
                )},
                {"kind": "concession", "n": 2, "html": t(
                    "une indulgence partielle est accordée au fidèle qui, en esprit de foi et "
                    "avec un cœur miséricordieux, s’emploie, par sa personne ou par ses biens, "
                    "au service de ses frères dans le besoin."
                ), "note": t(
                    "par la concession de cette indulgence, le fidèle est engagé, en suivant "
                    "l’exemple et le commandement du Christ, à accomplir plus fréquemment des "
                    "œuvres de charité et de miséricorde."
                )},
                {"kind": "concession", "n": 3, "html": t(
                    "une indulgence partielle est accordée au fidèle qui, en esprit de "
                    "pénitence, s’abstient spontanément de quelque chose de licite qui lui est "
                    "agréable."
                ), "note": t(
                    "cette concession convient particulièrement à notre époque en laquelle, "
                    "en complément de la loi, d’ailleurs très douce, sur l’abstinence de viande "
                    "et le jeûne, il convient tout à fait que les fidèles soient incités à "
                    "exercer d’eux-mêmes la pénitence."
                )},
                {"kind": "concession", "n": 4, "html": t(
                    "une indulgence partielle est accordée au fidèle qui, de façon spontanée, "
                    "rend ouvertement un témoignage de foi devant les autres en des "
                    "circonstances particulières de la vie quotidienne."
                ), "note": t(
                    "cette concession incite le fidèle à professer ouvertement sa foi devant "
                    "les autres, pour la gloire de Dieu et l’édification de l’Église."
                )},
            ],
        },
        {
            "n": 4,
            "title": "Liste des indulgences plénières",
            "blocks": [
                {"kind": "h", "text": "I. Indulgences plénières que l’on peut obtenir chaque jour"},
                {"kind": "ul", "items": [
                    {"html": t("Adoration eucharistique, pendant au moins une demi-heure (conc. 7 § 1, 1)")},
                    {"html": t("Exercice pieux du Chemin de Croix (conc. 13, 2)")},
                    {"html": t(
                        "Lecture ou écoute de la Sainte Écriture, pendant au moins une "
                        "demi-heure (conc. 30)"
                    )},
                    {"html": t("Prières des églises orientales : Acathiste ou Paraclisis (conc. 23 § 1)"),
                     "note": t(
                        "récitation de l’hymne <em>Acathiste</em> ou de l’office "
                        "<em>Paraclisis</em> dans une église ou un oratoire, ou en famille, "
                        "dans une communauté religieuse, au sein d’une association de fidèles "
                        "et généralement quand on se rassemble pour une fin honnête."
                    )},
                    {"html": t("Rosaire marial (conc. 17 § 1)"),
                     "note": t(
                        "récitation du Rosaire dans une église ou un oratoire, ou en famille, "
                        "dans une communauté religieuse, au sein d’une association de fidèles "
                        "et en général lorsque plusieurs se retrouvent pour une fin honnête."
                        "<br>"
                        "a) Il suffit d’en réciter seulement le tiers ; mais les cinq dizaines "
                        "doivent être récitées sans interruption ;"
                        "<br>"
                        "b) À la prière vocale doit s’ajouter la pieuse méditation des mystères."
                    )},
                    {"html": t("Visite en forme de pèlerinage aux basiliques Patriarcales de Rome (conc. 33 § 1, 1)"),
                     "note": t("en y récitant le Pater et le Credo.")},
                ]},
                {"kind": "h", "text": "II. Indulgences plénières accordées certains jours déterminés"},
                {"kind": "ul", "items": [
                    {"html": t("1<sup>er</sup> janvier (conc. 26 § 1, 1)"),
                     "note": t("participation au chant ou à la récitation solennelle dans une église ou un oratoire de l’hymne <em>Veni Creator</em>.")},
                    {"html": t("Semaine pour l’unité des chrétiens (conc. 11 § 1)"),
                     "note": t("participation à quelque cérémonie.")},
                    {"html": t("22 février : Chaire de saint Pierre, Apôtre (conc. 33 § 1, 3)"),
                     "note": t("visite d’une église cathédrale en y récitant le Pater et le Credo.")},
                    {"html": t("Tous les vendredis de Carême (conc. 8 § 1, 2)"),
                     "note": t("récitation de la prière <em>Ô bon et très doux Jésus</em> devant la représentation de Jésus-Christ crucifié.")},
                    {"html": t("Jeudi Saint (conc. 7 § 1, 2)"),
                     "note": t("récitation pieuse du <em>Tantum ergo</em> au cours de la déposition solennelle du Saint-Sacrement à l’issue de la Messe « <em>in Cena Domini</em> ».")},
                    {"html": t("Vendredi Saint (conc. 13 § 1)"),
                     "note": t("participation pieuse à l’adoration de la Croix au cours de l’office liturgique solennel.")},
                    {"html": t("Samedi Saint (conc. 28 § 1)"),
                     "note": t("renouvellement des promesses du Baptême lors de la célébration de la Vigile pascale.")},
                    {"html": t("Solennité de Pentecôte (conc. 26 § 1, 1)"),
                     "note": t("participation au chant ou à la récitation solennelle dans une église ou un oratoire de l’hymne <em>Veni Creator</em>.")},
                    {"html": t("Solennité du Corps et du Sang du Christ (conc. 7 § 1, 3)"),
                     "note": t("participation à la procession eucharistique solennelle.")},
                    {"html": t("Solennité du Sacré-Cœur de Jésus (conc. 3)"),
                     "note": t("récitation publique de l’acte de réparation <em>Iesu dulcissime</em>.")},
                    {"html": t("Solennité des saints Apôtres Pierre et Paul (conc. 14 § 1 ; 33 § 1, 2 et 3)"),
                     "note": t(
                        "- Utilisation en esprit de dévotion d’un objet de piété (crucifix ou "
                        "croix, chapelet, scapulaire ou médaille) bénit par le Souverain "
                        "Pontife ou par tout autre évêque, en y ajoutant une formule légitime "
                        "de profession de foi."
                        "<br>"
                        "- Visite d’une des quatre basiliques patriarcales de Rome, d’une "
                        "basilique mineure ou d’une église cathédrale, en y récitant le Pater "
                        "et le Credo."
                    )},
                    {"html": t("2 août (conc. 33 § 1, 2, 3, 5) : indulgence de la « Portioncule »"),
                     "note": t(
                        "visite d’une des quatre basiliques patriarcales de Rome, d’une "
                        "basilique mineure, d’une église cathédrale ou de l’église paroissiale, "
                        "en y récitant le Pater et le Credo."
                    )},
                    {"html": t("Solennité du Christ-Roi (conc. 2)"),
                     "note": t("récitation publique de l’acte de consécration du genre humain au Christ-Roi <em>Iesu dulcissime, Redemptor</em>.")},
                    {"html": t("Tous les jours du 1<sup>er</sup> au 8 novembre (conc. 29 § 1, 1)"),
                     "note": t(
                        "visite d’un cimetière en priant pour les défunts, ne serait-ce que "
                        "mentalement. Indulgence applicable seulement aux âmes du purgatoire."
                    )},
                    {"html": t("Commémoration de tous les fidèles défunts (conc. 29 § 1, 2)"),
                     "note": t("visite d’une église ou d’un oratoire en y récitant le Pater et le Credo.")},
                    {"html": t("9 novembre : dédicace de l’archibasilique du très Saint Sauveur au Latran (conc. 33 § 1, 3)"),
                     "note": t("visite d’une église cathédrale en y récitant le Pater et le Credo.")},
                    {"html": t("31 décembre (conc. 26 § 1, 2)"),
                     "note": t("participation au chant ou à la récitation solennelle dans une église ou un oratoire de l’hymne <em>Te Deum</em>.")},
                ]},
                {"kind": "h", "text": "III. Indulgences plénières accordées en des circonstances particulières"},
                {"kind": "ul", "items": [
                    {"html": t("À l’article de la mort (conc. 12)"),
                     "note": t(
                        "réception de la bénédiction apostolique administrée par le prêtre."
                        "<br>"
                        "Si le prêtre ne peut être présent, notre sainte Mère l’Église concède "
                        "avec bonté à ce fidèle l’indulgence plénière à l’article de la mort, "
                        "pourvu qu’il soit bien disposé et qu’il ait récité habituellement "
                        "quelques prières durant sa vie ; dans ce cas l’Église supplée aux "
                        "trois conditions habituelles requises pour l’indulgence plénière. "
                        "Pour acquérir cette indulgence plénière, il est recommandé d’utiliser "
                        "un crucifix ou une croix."
                        "<br>"
                        "Le fidèle peut gagner cette indulgence plénière « <em>in articulo "
                        "mortis</em> » même si, ce jour-là, il a déjà gagné une autre "
                        "indulgence plénière."
                    )},
                    {"html": t("Bénédiction papale <em>urbi et orbi</em> (conc. 4)")},
                    {"html": t("Célébrations jubilaires des ordinations (conc. 27 § 2)"),
                     "note": t(
                        "- Aux prêtres qui célèbrent à l’occasion du 25<sup>e</sup>, "
                        "50<sup>e</sup>, 60<sup>e</sup> et 70<sup>e</sup> anniversaire de leur "
                        "ordination sacerdotale, et qui auront renouvelé devant Dieu la "
                        "résolution d’accomplir fidèlement les devoirs de leur vocation ;"
                        "<br>"
                        "- Aux évêques qui lors des 25<sup>e</sup>, 40<sup>e</sup>, et "
                        "50<sup>e</sup> anniversaires de leur sacre auront renouvelé devant "
                        "Dieu la résolution d’accomplir fidèlement les devoirs de leur état ;"
                        "<br>"
                        "- Aux fidèles qui assistent à la Messe jubilaire."
                    )},
                    {"html": t(
                        "Célébration liturgique du Fondateur d’instituts de vie consacrée et "
                        "de Sociétés de vie apostolique (conc. 33 § 1, 7)"
                    ),
                     "note": t(
                        "visite d’une église ou d’un oratoire de l’Institut ou de la Société, "
                        "en y récitant le Pater et le Credo."
                    )},
                    {"html": t("Congrès eucharistique (conc. 7 § 1, 4)"),
                     "note": t("assistance à la cérémonie de clôture.")},
                    {"html": t("Exercices spirituels ou retraite spirituelle (conc. 10 § 1)"),
                     "note": t("au fidèle qui s’y consacre au moins trois jours entiers.")},
                    {"html": t("Jour anniversaire de son baptême (conc. 28 § 1)"),
                     "note": t("renouvellement des promesses du Baptême selon une formule légitimement approuvée.")},
                    {"html": t("Jour de la consécration de la famille au Sacré-Cœur de Jésus ou à la Sainte Famille (conc. 1)")},
                    {"html": t("Jour de la consécration d’une église ou d’un autel (conc. 33 § 1, 6)"),
                     "note": t("visite de l’église, en y récitant le Pater et le Credo.")},
                    {"html": t("Jour fixé pour une église de « station » (conc. 33 § 2)"),
                     "note": t("participation aux offices dans cette église.")},
                    {"html": t("Journée universellement dédiée à célébrer quelque fin religieuse (conc. 5)"),
                     "note": t("participation à cette célébration.")},
                    {"html": t("Missions Sacrées (conc. 16 § 1)"),
                     "note": t("assistance à la clôture solennelle d’une Mission Sacrée après avoir écouté quelques prédications.")},
                    {"html": t("Pèlerinage (conc. 33 § 1, 1, 3 ou 4)"),
                     "note": t(
                        "visite d’une des quatre basiliques patriarcales de Rome en y récitant "
                        "le Pater et le Credo."
                        "<br>"
                        "Participation à un pèlerinage collectif dans un sanctuaire constitué "
                        "par l’autorité compétente."
                    )},
                    {"html": t("Première Communion (conc. 8 § 1, 1)"),
                     "note": t("réception pour la première fois de la Sainte Eucharistie ou assistance à la Première Communion d’autres personnes.")},
                    {"html": t("Première Messe (conc. 27 § 1)"),
                     "note": t("au prêtre qui célèbre sa Première Messe en présence de peuple au jour fixé ; aux fidèles qui assistent à cette Messe.")},
                    {"html": t(
                        "Solennité du titulaire d’une basilique mineure, d’une église "
                        "cathédrale, d’un sanctuaire, d’une église paroissiale (conc. 33 § 1, 2-5)"
                    ),
                     "note": t("visite de l’église ou du sanctuaire, en y récitant le Pater et le Credo.")},
                    {"html": t("Synode diocésain (conc. 31)"),
                     "note": t("visite de l’église où se tient le synode diocésain en y récitant le Pater et le Credo.")},
                    {"html": t("Une fois par an, en un jour choisi librement (conc. 33 § 1, 2, 4)"),
                     "note": t("visite d’une basilique mineure ou d’un sanctuaire constitué par l’autorité compétente.")},
                    {"html": t("Visite pastorale (conc. 32)"),
                     "note": t("assistance à un office présidé par le Visiteur.")},
                ]},
                {"kind": "prayer", "title": "Prière pour gagner les indulgences partielles", "html": fix_caps(
                    "Divin Cœur de Jésus, je vous offre par le Cœur Immaculé de Marie, les "
                    "prières, les œuvres et les souffrances de cette journée en réparation de "
                    "nos offenses et à toutes les intentions pour lesquelles vous vous immolez "
                    "continuellement sur l’autel. Je désire aussi gagner en ce jour toutes les "
                    "indulgences que je puis."
                )},
            ],
        },
    ],
}


def main() -> None:
    out = {
        "corpus": "pius-x-petit",
        "slug": "annee-liturgique",
        "title": "L’année liturgique et la discipline ecclésiastique",
        "kicker": "Appendice",
        "chapters": [CHAPTER_I, CHAPTER_II, CHAPTER_III],
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
    n_blocks = sum(
        len(s["blocks"])
        for c in out["chapters"]
        for s in c["sections"]
    )
    print(
        f"Wrote {OUT_PATH.relative_to(Path.cwd())}: "
        f"{len(out['chapters'])} chapters, "
        f"{sum(len(c['sections']) for c in out['chapters'])} sections, "
        f"{n_blocks} blocks"
    )


if __name__ == "__main__":
    main()
