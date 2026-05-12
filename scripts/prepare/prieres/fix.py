#!/usr/bin/env python3
"""
Editorial pass over the auto-extracted prayers. The state-machine parser
got most of the structure right, but fragmented a few bilingual blocks
(Angélus, Sub tuum, Litanies, O Salutaris, Tantum ergo) and dropped a
couple of titles. This script reads `flow.json`, rewrites the broken
nodes by hand, and saves it back.

Run once after `build.py` to produce the editorialised JSON. The output
is committed; the parser is no longer the source of truth for those
specific entries.
"""
import json
from pathlib import Path

OUT = Path('static/data/prieres/flow.json')


def prayer(fr_title='', fr_body='', la_title='', la_body=''):
    return {
        'kind': 'prayer',
        'fr': {'title': fr_title, 'body': fr_body},
        'la': {'title': la_title, 'body': la_body}
    }


def heading(level, title, slug=None):
    if slug is None:
        slug = title.lower().replace(' ', '-').replace("'", '').replace('.', '').replace(',', '')
    return {'kind': 'heading', 'level': level, 'id': slug, 'title': title}


# ──────────────────────────────────────────────────────────────────────────
# Hand-authored bilingual prayers
# ──────────────────────────────────────────────────────────────────────────

ANGELUS = prayer(
    fr_title="L'Angélus",
    fr_body=(
        "V. L'Ange du Seigneur a annoncé à Marie.\n"
        "R. Et elle a conçu du Saint-Esprit.\n"
        "Je vous salue, Marie…\n\n"
        "V. Voici la servante du Seigneur.\n"
        "R. Qu'il me soit fait selon votre parole.\n"
        "Je vous salue, Marie…\n\n"
        "V. Et le Verbe s'est fait chair.\n"
        "R. Et il a habité parmi nous.\n"
        "Je vous salue, Marie…\n\n"
        "V. Priez pour nous, sainte Mère de Dieu.\n"
        "R. Afin que nous soyons rendus dignes des promesses de Jésus-Christ.\n\n"
        "Prions.\n"
        "Répandez, s'il vous plaît, Seigneur, votre grâce dans nos âmes, afin qu'ayant connu, "
        "par la voix de l'Ange, l'Incarnation de Jésus-Christ votre Fils, nous arrivions, "
        "par sa Passion et par sa Croix, à la gloire de sa Résurrection. Par le même "
        "Jésus-Christ notre Seigneur.\n"
        "R. Ainsi soit-il."
    ),
    la_title='Angelus Domini',
    la_body=(
        "V. Angelus Dómini nuntiávit Maríæ.\n"
        "R. Et concépit de Spíritu Sancto.\n"
        "Ave María…\n\n"
        "V. Ecce ancílla Dómini.\n"
        "R. Fiat mihi secúndum verbum tuum.\n"
        "Ave María…\n\n"
        "V. Et Verbum caro factum est.\n"
        "R. Et habitávit in nobis.\n"
        "Ave María…\n\n"
        "V. Ora pro nobis, sancta Dei Génetrix.\n"
        "R. Ut digni efficiámur promissiónibus Christi.\n\n"
        "Orémus.\n"
        "Grátiam tuam, quǽsumus, Dómine, méntibus nostris infúnde: ut qui, Angelo nuntiánte, "
        "Christi Fílii tui incarnatiónem cognóvimus, per passiónem ejus et crucem, ad "
        "resurrectiónis glóriam perducámur. Per eúndem Christum Dóminum nostrum.\n"
        "R. Amen."
    )
)

MYSTERES = prayer(
    fr_title='Les Mystères du Rosaire',
    fr_body=(
        "Mystères joyeux (lundi et samedi)\n"
        "1. L'Annonciation\n"
        "2. La Visitation\n"
        "3. La Nativité\n"
        "4. La Présentation de Jésus au Temple\n"
        "5. Le Recouvrement de Jésus au Temple\n\n"
        "Mystères douloureux (mardi et vendredi)\n"
        "1. L'Agonie de Jésus au jardin des Oliviers\n"
        "2. La Flagellation de Jésus\n"
        "3. Le Couronnement d'épines\n"
        "4. Le Portement de la Croix\n"
        "5. Le Crucifiement et la mort de Jésus\n\n"
        "Mystères glorieux (mercredi et dimanche)\n"
        "1. La Résurrection\n"
        "2. L'Ascension\n"
        "3. La Descente du Saint-Esprit sur les Apôtres\n"
        "4. L'Assomption de la Vierge Marie\n"
        "5. Le Couronnement de la Vierge Marie au Ciel"
    )
)

SUB_TUUM = prayer(
    fr_title='Sous votre protection',
    fr_body=(
        "Nous avons recours à votre protection, sainte Mère de Dieu: ne rejetez pas les "
        "prières que nous vous adressons dans nos besoins; mais délivrez-nous toujours de "
        "tous les dangers, ô Vierge glorieuse et bénie."
    ),
    la_title='Sub tuum praesidium',
    la_body=(
        "Sub tuum præsídium confúgimus, sancta Dei Génetrix: nostras deprecatiónes ne "
        "despícias in necessitátibus; sed a perículis cunctis líbera nos semper, Virgo "
        "gloriósa et benedícta."
    )
)

# Standard Loretan litany (abridged here to the canonical sequence; the
# source has the same with a few OCR variants).
LITANIES = prayer(
    fr_title='Litanies de la très sainte Vierge',
    fr_body=(
        "Seigneur, ayez pitié de nous.\n"
        "Jésus-Christ, ayez pitié de nous.\n"
        "Seigneur, ayez pitié de nous.\n"
        "Jésus-Christ, écoutez-nous.\n"
        "Jésus-Christ, exaucez-nous.\n\n"
        "Père céleste, qui êtes Dieu, ayez pitié de nous.\n"
        "Fils Rédempteur du monde, qui êtes Dieu, ayez pitié de nous.\n"
        "Esprit-Saint, qui êtes Dieu, ayez pitié de nous.\n"
        "Trinité Sainte, qui êtes un seul Dieu, ayez pitié de nous.\n\n"
        "Sainte Marie, priez pour nous.\n"
        "Sainte Mère de Dieu,\n"
        "Sainte Vierge des vierges,\n"
        "Mère du Christ,\n"
        "Mère de l'Église,\n"
        "Mère de la divine grâce,\n"
        "Mère très pure,\n"
        "Mère très chaste,\n"
        "Mère toujours vierge,\n"
        "Mère sans tache,\n"
        "Mère aimable,\n"
        "Mère admirable,\n"
        "Mère du bon conseil,\n"
        "Mère du Créateur,\n"
        "Mère du Sauveur,\n"
        "Mère de miséricorde,\n\n"
        "Vierge très prudente,\n"
        "Vierge vénérable,\n"
        "Vierge digne de louanges,\n"
        "Vierge puissante,\n"
        "Vierge clémente,\n"
        "Vierge fidèle,\n\n"
        "Miroir de justice,\n"
        "Siège de la Sagesse,\n"
        "Cause de notre joie,\n"
        "Vase spirituel,\n"
        "Vase d'honneur,\n"
        "Vase insigne de dévotion,\n"
        "Rose mystique,\n"
        "Tour de David,\n"
        "Tour d'ivoire,\n"
        "Maison d'or,\n"
        "Arche d'alliance,\n"
        "Porte du Ciel,\n"
        "Étoile du matin,\n\n"
        "Salut des infirmes,\n"
        "Refuge des pécheurs,\n"
        "Consolatrice des affligés,\n"
        "Secours des chrétiens,\n\n"
        "Reine des Anges,\n"
        "Reine des Patriarches,\n"
        "Reine des Prophètes,\n"
        "Reine des Apôtres,\n"
        "Reine des Martyrs,\n"
        "Reine des Confesseurs,\n"
        "Reine des Vierges,\n"
        "Reine de tous les Saints,\n"
        "Reine conçue sans le péché originel,\n"
        "Reine élevée au Ciel,\n"
        "Reine du très saint Rosaire,\n"
        "Reine de la famille,\n"
        "Reine de la paix.\n\n"
        "Agneau de Dieu qui effacez les péchés du monde, pardonnez-nous, Seigneur.\n"
        "Agneau de Dieu qui effacez les péchés du monde, exaucez-nous, Seigneur.\n"
        "Agneau de Dieu qui effacez les péchés du monde, ayez pitié de nous.\n\n"
        "V. Priez pour nous, sainte Mère de Dieu.\n"
        "R. Afin que nous soyons rendus dignes des promesses de Jésus-Christ.\n\n"
        "Prions.\n"
        "Daignez nous accorder, Seigneur, à nous vos serviteurs, de jouir toujours de la "
        "santé de l'âme et du corps; et par la glorieuse intercession de la bienheureuse "
        "Marie toujours Vierge, d'être délivrés des tristesses du temps présent et d'avoir "
        "part aux joies éternelles. Par Jésus-Christ notre Seigneur.\n"
        "R. Ainsi soit-il."
    ),
    la_title='Litaniæ Lauretanæ',
    la_body=(
        "Kýrie, eléison.\n"
        "Christe, eléison.\n"
        "Kýrie, eléison.\n"
        "Christe, audi nos.\n"
        "Christe, exáudi nos.\n\n"
        "Pater de cælis, Deus, miserére nobis.\n"
        "Fili, Redémptor mundi, Deus, miserére nobis.\n"
        "Spíritus Sancte, Deus, miserére nobis.\n"
        "Sancta Trínitas, unus Deus, miserére nobis.\n\n"
        "Sancta María, ora pro nobis.\n"
        "Sancta Dei Génetrix,\n"
        "Sancta Virgo vírginum,\n"
        "Mater Christi,\n"
        "Mater Ecclésiæ,\n"
        "Mater divínæ grátiæ,\n"
        "Mater puríssima,\n"
        "Mater castíssima,\n"
        "Mater invioláta,\n"
        "Mater intemeráta,\n"
        "Mater amábilis,\n"
        "Mater admirábilis,\n"
        "Mater boni consílii,\n"
        "Mater Creatóris,\n"
        "Mater Salvatóris,\n"
        "Mater misericórdiæ,\n\n"
        "Virgo prudentíssima,\n"
        "Virgo veneránda,\n"
        "Virgo prædicánda,\n"
        "Virgo potens,\n"
        "Virgo clemens,\n"
        "Virgo fidélis,\n\n"
        "Spéculum iustítiæ,\n"
        "Sedes sapiéntiæ,\n"
        "Causa nostræ lætítiæ,\n"
        "Vas spirituále,\n"
        "Vas honorábile,\n"
        "Vas insígne devotiónis,\n"
        "Rosa mýstica,\n"
        "Turris davídica,\n"
        "Turris ebúrnea,\n"
        "Domus áurea,\n"
        "Fœderis arca,\n"
        "Iánua cæli,\n"
        "Stella matutína,\n\n"
        "Salus infirmórum,\n"
        "Refúgium peccatórum,\n"
        "Consolátrix afflictórum,\n"
        "Auxílium christianórum,\n\n"
        "Regína Angelórum,\n"
        "Regína Patriarchárum,\n"
        "Regína Prophetárum,\n"
        "Regína Apostolórum,\n"
        "Regína Mártyrum,\n"
        "Regína Confessórum,\n"
        "Regína Vírginum,\n"
        "Regína Sanctórum ómnium,\n"
        "Regína sine labe origináli concépta,\n"
        "Regína in cælum assúmpta,\n"
        "Regína sacratíssimi Rosárii,\n"
        "Regína famíliæ,\n"
        "Regína pacis.\n\n"
        "Agnus Dei, qui tollis peccáta mundi, parce nobis, Dómine.\n"
        "Agnus Dei, qui tollis peccáta mundi, exáudi nos, Dómine.\n"
        "Agnus Dei, qui tollis peccáta mundi, miserére nobis.\n\n"
        "V. Ora pro nobis, sancta Dei Génetrix.\n"
        "R. Ut digni efficiámur promissiónibus Christi.\n\n"
        "Orémus.\n"
        "Concéde nos fámulos tuos, quǽsumus, Dómine Deus, perpétua mentis et córporis "
        "sanitáte gaudére: et gloriósa beátæ Maríæ semper Vírginis intercessióne, a "
        "præsénti liberári tristítia, et ætérna pérfrui lætítia. Per Christum Dóminum "
        "nostrum.\n"
        "R. Amen."
    )
)

MEMORARE = prayer(
    fr_title='Souvenez-vous',
    fr_body=(
        "Souvenez-vous, ô très miséricordieuse Vierge Marie, qu'on n'a jamais entendu dire "
        "qu'aucun de ceux qui ont eu recours à votre protection, imploré votre assistance "
        "ou réclamé vos suffrages, ait été abandonné. Animé d'une pareille confiance, ô "
        "Vierge des Vierges, ô ma Mère, je viens à vous; gémissant sous le poids de mes "
        "péchés, je me prosterne à vos pieds. Ô Mère du Verbe incarné, ne méprisez pas mes "
        "prières, mais écoutez-les favorablement et daignez les exaucer. Ainsi soit-il."
    ),
    la_title='Memorare',
    la_body=(
        "Memoráre, o piíssima Virgo María, non esse audítum a sǽculo, quemquam ad tua "
        "curréntem præsídia, tua implorántem auxília, tua peténtem suffrágia, esse "
        "derelíctum. Ego tali animátus confidéntia, ad te, Virgo Vírginum, Mater, curro, "
        "ad te vénio, coram te gemens peccátor assísto. Noli, Mater Verbi, verba mea "
        "despícere; sed áudi propítia et exáudi. Amen."
    )
)

O_SALUTARIS = prayer(
    fr_title='Ô Salutaire Hostie',
    fr_body=(
        "Ô Salutaire Hostie, qui ouvrez la porte du Ciel,\n"
        "l'ennemi nous presse par ses attaques: donnez-nous la force, secourez-nous.\n\n"
        "Gloire éternelle au Seigneur unique en trois Personnes;\n"
        "qu'il nous donne dans la patrie la vie qui n'aura pas de fin. Ainsi soit-il."
    ),
    la_title='O Salutaris Hostia',
    la_body=(
        "O salutáris Hóstia, quæ cæli pandis óstium:\n"
        "bella premunt hostília, da robur, fer auxílium.\n\n"
        "Uni trinóque Dómino sit sempitérna glória,\n"
        "qui vitam sine término nobis donet in pátria. Amen."
    )
)

TANTUM_ERGO = prayer(
    fr_title='Adorons donc prosternés',
    fr_body=(
        "Adorons donc prosternés un si grand sacrement;\n"
        "que la figure antique fasse place au rite nouveau,\n"
        "et que la foi supplée à la défaillance des sens.\n\n"
        "Au Père et au Fils, louange et jubilation,\n"
        "salut, honneur, puissance et bénédiction;\n"
        "à celui qui procède de l'un et de l'autre, pareil hommage. Ainsi soit-il."
    ),
    la_title='Tantum ergo',
    la_body=(
        "Tantum ergo Sacraméntum venerémur cérnui:\n"
        "et antíquum documéntum novo cedat rítui:\n"
        "præstet fides suppleméntum sénsuum deféctui.\n\n"
        "Genitóri, Genitóque laus et iubilátio,\n"
        "salus, honor, virtus quoque sit et benedíctio:\n"
        "procedénti ab utróque compar sit laudátio. Amen."
    )
)


# ──────────────────────────────────────────────────────────────────────────
# Re-shape the flow
# ──────────────────────────────────────────────────────────────────────────

def main():
    flow = json.loads(OUT.read_text())
    by_idx = {i: n for i, n in enumerate(flow)}

    # Repair entry [3] (De profundis) by giving it a proper Latin title.
    if flow[3]['kind'] == 'prayer' and 'Profundis' in flow[3]['la'].get('body', ''):
        flow[3]['la']['title'] = 'De profundis'

    # Fix the "Avant la confession" / "Après la confession" titles
    if flow[20]['kind'] == 'prayer' and flow[20]['fr']['body'].startswith('Mon très miséricordieux'):
        flow[20]['fr']['title'] = "Acte de contrition"
    if flow[22]['kind'] == 'prayer' and 'Aussitôt après la confession' in flow[22]['fr']['body']:
        flow[22]['fr']['title'] = "Action de grâces"
        # Strip the rubric note at the top so only the prayer remains
        body = flow[22]['fr']['body']
        idx = body.find('COMME vous')
        if idx > 0:
            flow[22]['fr']['body'] = body[idx:]

    # Build the rebuilt flow: section I unchanged, section II reworked,
    # sections III/IV mostly unchanged, section V reworked.
    rebuilt = []
    # I. Prières à Dieu — keep entries [0..3]
    rebuilt.extend([flow[0], flow[1], flow[2], flow[3]])
    # II. Prières à la Vierge — rebuild from hand-authored content
    rebuilt.append(flow[4])  # heading
    rebuilt.append(ANGELUS)
    rebuilt.append(MYSTERES)
    rebuilt.append(SUB_TUUM)
    rebuilt.append(LITANIES)
    rebuilt.append(MEMORARE)
    # I. Sacrement de Pénitence — keep [18..22]
    rebuilt.extend([flow[18], flow[19], flow[20], flow[21], flow[22]])
    # II. Eucharistie — keep [23..37]
    rebuilt.extend(flow[23:38])
    # III. Bénédiction — rebuild with bilingual O Salutaris + Tantum ergo
    rebuilt.append(flow[38])  # heading
    rebuilt.append(O_SALUTARIS)
    rebuilt.append(TANTUM_ERGO)

    OUT.write_text(json.dumps(rebuilt, ensure_ascii=False, indent=2), encoding='utf-8')
    counts = {}
    for n in rebuilt:
        counts[n['kind']] = counts.get(n['kind'], 0) + 1
    print(f'rewrote {OUT} ({len(rebuilt)} nodes, {counts})')


if __name__ == '__main__':
    main()
