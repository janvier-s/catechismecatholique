// French overlay for the English Levada glossary entries.
//
// Each key is the English entry's `id` (uppercase, underscores). The value
// gives:
//   - fr:  the French head-word this entry corresponds to. When the term
//          already exists in the French thematic index, this string MUST
//          match the head-word exactly so the merge step knows to attach
//          the definition to that entry. When it doesn't (technical terms
//          like "Anaphora" or pastoral terms like "Acolyte"), this is the
//          natural French translation and the entry becomes a standalone
//          "definition-only" record.
//   - def: French translation of the English definition. Kept terse and
//          faithful to the catechism's own vocabulary — for example
//          "Esprit Saint" rather than "Saint-Esprit", "péché" rather than
//          "faute" for the theological sense.
//   - cluster: optional manual override of the auto-clustering.
import type { ClusterId } from './glossary-clusters.ts';

export interface EnOverlay {
	fr: string;
	def: string;
	cluster?: ClusterId | ClusterId[];
}

export const EN_OVERLAY: Record<string, EnOverlay> = {
	ABORTION: {
		fr: 'Avortement',
		def: "Interruption volontaire de la grossesse par mort donnée à l'enfant à naître. L'avortement direct, voulu comme fin ou comme moyen, est gravement contraire à la loi morale. L'Église attache à ce crime contre la vie humaine la peine canonique de l'excommunication.",
		cluster: 'morale'
	},
	ABRAHAM: {
		fr: 'Abraham',
		def: "Patriarche d'Israël et père de la foi. Dieu fit avec lui une alliance, lui promettant une terre et une nombreuse descendance, un peuple dont il serait le Dieu. Par Abraham, Dieu se prépara le peuple à qui il révélerait sa Loi par Moïse. Avec la venue du Christ, ce peuple devient la racine sur laquelle les païens sont greffés par la foi."
	},
	ABSOLUTION: {
		fr: 'Absolution',
		def: "Élément essentiel du sacrement de Pénitence par lequel le prêtre, en vertu du pouvoir confié à l'Église par le Christ, pardonne le ou les péchés du pénitent.",
		cluster: 'sacrements'
	},
	ACEDIA: {
		fr: 'Acédie',
		def: "Synonyme moins courant de la paresse, l'un des sept péchés « capitaux ». Voir Paresse.",
		cluster: 'morale'
	},
	ACOLYTE: {
		fr: 'Acolyte',
		def: "Ministre liturgique institué pour aider à la célébration des liturgies. Les prêtres et les diacres reçoivent ce ministère avant l'ordination. Des laïcs peuvent être institués acolytes de manière permanente par un rite d'institution et de bénédiction.",
		cluster: 'liturgie'
	},
	ADAM: {
		fr: 'Adam',
		def: "Selon le récit de la création dans la Genèse, le premier homme. À partir de ce récit, l'Église a appris que l'humanité fut originellement créée dans un état de sainteté et de justice, et que les premiers ancêtres du genre humain perdirent cet état pour eux-mêmes et pour toute l'humanité par leur péché (« péché originel »). Le Christ est appelé le « second » ou « nouvel Adam » parce qu'il a inauguré la nouvelle création en pardonnant le péché et en restaurant l'humanité dans la grâce de l'amitié divine perdue par le péché originel."
	},
	ADORATION: {
		fr: 'Adoration',
		def: "Reconnaissance de Dieu comme Dieu, Créateur et Sauveur, Seigneur et Maître de tout ce qui existe. Par le culte et la prière, l'Église et chaque personne rendent à Dieu l'adoration qui est le premier acte de la vertu de religion. Le premier commandement de la Loi nous oblige à adorer Dieu."
	},
	ADULTERY: {
		fr: 'Adultère',
		def: "Infidélité conjugale, ou rapports sexuels entre deux partenaires dont au moins l'un est marié à une autre personne. Le sixième commandement et le Nouveau Testament interdisent l'adultère de manière absolue.",
		cluster: 'morale'
	},
	ADVENT: {
		fr: 'Avent',
		def: "Temps liturgique de quatre semaines consacré à la préparation de la venue du Christ à Noël.",
		cluster: 'liturgie'
	},
	ALMSGIVING: {
		fr: 'Aumône',
		def: "Don d'argent ou de biens aux pauvres comme acte de pénitence ou de charité fraternelle. L'aumône, avec la prière et le jeûne, est traditionnellement recommandée pour entretenir l'état intérieur de pénitence.",
		cluster: 'morale'
	},
	ALTAR: {
		fr: 'Autel',
		def: "Centre et point focal de l'église, où le sacrifice du Christ sur la croix est rendu présent sous des signes sacramentels dans la Messe. Chez les Israélites, l'autel était le lieu où l'on offrait des sacrifices à Dieu. L'autel chrétien représente deux aspects du mystère de l'Eucharistie : autel du sacrifice où le Christ, victime sacrificielle, s'offre pour nos péchés, et table du Seigneur où le Christ se donne à nous comme nourriture venue du ciel.",
		cluster: 'liturgie'
	},
	AMEN: {
		fr: 'Amen',
		def: "Mot hébreu signifiant « vraiment ; il en est ainsi ; qu'il en soit fait ainsi », exprimant l'accord avec ce qui vient d'être dit. Les prières du Nouveau Testament et de la liturgie de l'Église, ainsi que les Symboles de la foi, se concluent par « Amen ». Jésus l'employait pour introduire des affirmations solennelles, soulignant leur véracité et leur autorité.",
		cluster: 'priere'
	},
	ANALOGY_OF_FAITH: {
		fr: 'Analogie de la foi',
		def: "La cohérence des vérités de la foi entre elles et au sein de l'ensemble du plan de la Révélation."
	},
	ANAMNESIS: {
		fr: 'Anamnèse',
		def: "Le « mémorial » des actes salvifiques de Dieu dans l'histoire, posé par l'action liturgique de l'Église, qui suscite l'action de grâce et la louange. Toute Prière eucharistique contient une anamnèse, un mémorial où l'Église fait mémoire de la Passion, de la Résurrection et du retour glorieux du Christ Jésus.",
		cluster: 'liturgie'
	},
	ANAPHORA: {
		fr: 'Anaphore',
		def: "La Prière eucharistique, prière d'action de grâce et de consécration, qui est le cœur et le sommet de la célébration de la Messe.",
		cluster: 'liturgie'
	},
	ANGEL: {
		fr: 'Ange',
		def: "Créature spirituelle, personnelle et immortelle, douée d'intelligence et de libre arbitre. Les anges glorifient Dieu sans cesse et le servent comme messagers de son dessein de salut. Voir Anges gardiens.",
		cluster: 'marie-saints'
	},
	ANGER: {
		fr: 'Colère',
		def: "Émotion qui n'est pas mauvaise en elle-même mais qui, lorsqu'elle n'est pas dominée par la raison ou se durcit en ressentiment et en haine, devient l'un des sept péchés capitaux. Le Christ a enseigné que la colère est une offense au cinquième commandement.",
		cluster: 'morale'
	},
	ANNUNCIATION: {
		fr: 'Annonciation',
		def: "Visite de l'ange Gabriel à la Vierge Marie pour lui annoncer qu'elle serait la mère du Sauveur. Après avoir donné son consentement à la parole de Dieu, Marie devint la mère de Jésus par la puissance de l'Esprit Saint."
	},
	ANOINTING: {
		fr: 'Onction',
		def: "Symbole de l'Esprit Saint, dont l'« onction » de Jésus comme Messie a accompli les prophéties de l'Ancien Testament. Christ (en hébreu Messie) signifie celui qui est « oint » par l'Esprit Saint. L'onction est le signe sacramentel de la Confirmation, appelée Chrismation dans les Églises d'Orient. Des onctions font partie des rites liturgiques du catéchuménat et des sacrements du Baptême et de l'Ordre. Voir Christ.",
		cluster: 'sacrements'
	},
	ANOINTING_OF_THE_SICK: {
		fr: 'Onction des malades',
		def: "L'un des sept sacrements. Le prêtre l'administre par la prière et l'onction d'huile bénite à tout baptisé qui se trouve en danger de mort à cause d'une grave maladie ou de la vieillesse. Le sacrement procure au malade une grâce particulière de guérison, de consolation et de pardon des péchés.",
		cluster: 'sacrements'
	},
	ANTICHRIST: {
		fr: 'Antichrist',
		def: "Le « trompeur » dont parle le Nouveau Testament, associé au « mystère d'iniquité » qui précédera le second avènement du Christ et par lequel les hommes seront détournés de la vérité pour suivre un faux « messianisme » par lequel l'homme se glorifie lui-même et ses propres réussites à la place de Dieu et de son Messie venu dans la chair, en qui le Royaume sera accompli.",
		cluster: 'fins-dernieres'
	},
	APOSTASY: {
		fr: 'Apostasie',
		def: "Reniement total de la foi chrétienne.",
		cluster: 'morale'
	},
	APOSTLE: {
		fr: 'Apôtre',
		def: "Du grec apostolos, « envoyé ». Comme Jésus fut envoyé par le Père, il envoya à son tour les Douze prêcher l'Évangile au monde entier. Témoins choisis de sa Résurrection, ils sont le fondement sur lequel l'Église est bâtie. Leur charge se prolonge dans l'Église par leurs successeurs, les évêques, par le sacrement de l'Ordre. Voir Succession apostolique.",
		cluster: 'eglise'
	},
	APOSTLES__CREED: {
		fr: 'Symbole des Apôtres',
		def: "Énoncé de la foi chrétienne issu du Symbole baptismal de l'Église ancienne de Rome, siège de saint Pierre, premier des Apôtres. Le Symbole des Apôtres est considéré comme un résumé fidèle de la foi des Apôtres."
	},
	APOSTOLATE: {
		fr: 'Apostolat',
		def: "Activité du chrétien qui réalise la nature apostolique de toute l'Église en travaillant à étendre le règne du Christ au monde entier.",
		cluster: 'eglise'
	},
	APOSTOLIC_SUCCESSION: {
		fr: 'Succession apostolique',
		def: "Transmission de la prédication et de l'autorité apostoliques, des Apôtres à leurs successeurs les évêques, par l'imposition des mains, comme charge permanente dans l'Église.",
		cluster: 'eglise'
	},
	APPARITION: {
		fr: 'Apparitions du Christ',
		def: "Manifestations du Christ ressuscité aux Apôtres et à d'autres disciples qui constituent le fondement historique de la foi de l'Église en sa Résurrection.",
		cluster: 'christ'
	},
	ASCENSION: {
		fr: 'Ascension du Christ',
		def: "Élévation glorieuse du Christ ressuscité, dans son humanité, à la droite du Père, où il vit pour intercéder pour nous, quarante jours après sa Résurrection. Voir Avènement second.",
		cluster: 'christ'
	},
	ASCESIS: {
		fr: 'Ascèse',
		def: "Effort soutenu, exigé pour parvenir à la perfection chrétienne. La discipline ascétique, qui comprend le combat contre les inclinations désordonnées du cœur humain, est nécessaire pour grandir dans la vertu et dans la sainteté.",
		cluster: 'morale'
	},
	ASSUMPTION: {
		fr: 'Assomption',
		def: "Élévation au ciel de la Bienheureuse Vierge Marie, en son corps et en son âme, à la fin de sa vie terrestre, en union privilégiée avec son Fils. L'Assomption est célébrée dans la liturgie le 15 août.",
		cluster: 'marie-saints'
	},
	BAPTISM: {
		fr: 'Baptême',
		def: "Premier des sacrements de l'initiation chrétienne. Par la triple immersion dans l'eau ou son effusion, au nom du Père, du Fils et de l'Esprit Saint, le baptisé est lavé du péché, fait enfant adoptif de Dieu et incorporé à l'Église. Le Baptême est nécessaire au salut, reçu comme sacrement ou désiré dans le cœur.",
		cluster: 'sacrements'
	},
	BEATIFIC_VISION: {
		fr: 'Vision béatifique',
		def: "La connaissance et la jouissance directes de Dieu dont jouissent ceux qui sont au ciel, leur procurant la béatitude éternelle.",
		cluster: 'fins-dernieres'
	},
	BEATITUDE: {
		fr: 'Béatitude',
		def: "Le bonheur ultime auquel Dieu nous appelle ; la vision et la jouissance éternelles de la Sainte Trinité dans la gloire du ciel. La béatitude éternelle est promise à ceux qui aiment Dieu et qui font sa volonté.",
		cluster: 'fins-dernieres'
	},
	BEATITUDES: {
		fr: 'Béatitudes',
		def: "Promesses de bonheur faites par Jésus à ceux qui suivent fidèlement ses préceptes. Les Béatitudes énoncées par Jésus dans le Sermon sur la Montagne décrivent les attitudes et les actions caractéristiques de la vie chrétienne et constituent les paradoxales promesses de la grâce dans le Royaume.",
		cluster: 'morale'
	},
	BIBLE: {
		fr: 'Bible',
		def: "L'ensemble des Livres saints de l'Ancien et du Nouveau Testament, dont l'Église, instruite par l'Esprit Saint, reconnaît qu'ils ont été écrits sous l'inspiration de l'Esprit Saint et qu'ils ont Dieu pour auteur. La Bible est la Parole de Dieu écrite. Voir Écriture, Parole de Dieu.",
		cluster: 'ecriture'
	},
	BIBLICAL_INSPIRATION: {
		fr: 'Inspiration biblique',
		def: "Action de l'Esprit Saint sur les auteurs humains des livres saints de la Bible, de telle sorte que ces livres ont Dieu pour auteur et qu'ils enseignent fermement, fidèlement et sans erreur les vérités que Dieu a voulu, en vue de notre salut, faire consigner dans les saintes Lettres.",
		cluster: 'ecriture'
	},
	BISHOP: {
		fr: 'Évêque',
		def: "Successeur des Apôtres ayant reçu la plénitude du sacrement de l'Ordre. Comme membre du collège épiscopal, sous l'autorité du Pape, il porte avec ses frères la mission apostolique de toute l'Église. Comme pasteur d'une Église particulière, il préside les œuvres de son diocèse.",
		cluster: 'eglise'
	},
	BLASPHEMY: {
		fr: 'Blasphème',
		def: "Parole, pensée ou geste qui exprime mépris ou irrévérence à l'égard de Dieu, ou qui prend en vain le nom du Seigneur. Le blasphème enfreint le deuxième commandement.",
		cluster: 'morale'
	},
	BLESSED_SACRAMENT: {
		fr: 'Saint Sacrement',
		def: "Nom donné au Sacrement de l'Eucharistie, particulièrement quand l'Eucharistie est conservée dans le tabernacle pour la communion des malades, les visites privées au Christ Notre Seigneur ou l'adoration eucharistique.",
		cluster: 'sacrements'
	},
	BLESSING: {
		fr: 'Bénédiction',
		def: "Action liturgique qui invoque la faveur de Dieu sur des personnes, des objets, des lieux ou des moments. Signe de la providence par laquelle Dieu veille sur sa création.",
		cluster: 'liturgie'
	},
	BODY_OF_CHRIST: {
		fr: 'Corps du Christ',
		def: "Image utilisée par saint Paul pour décrire l'Église, en raison de l'unité organique entre le Christ-Tête et tous les baptisés. Voir Église. Le Corps eucharistique du Christ est la présence sacramentelle du Christ dans l'Eucharistie sous l'apparence du pain.",
		cluster: 'eglise'
	},
	CALUMNY: {
		fr: 'Calomnie',
		def: "Fausse déclaration qui nuit à la réputation d'autrui et lui fait porter un faux jugement. Le huitième commandement défend la calomnie.",
		cluster: 'morale'
	},
	CANON_LAW: {
		fr: 'Droit canonique',
		def: "Ensemble des lois ecclésiastiques régissant l'Église catholique. Voir Code de droit canonique.",
		cluster: 'eglise'
	},
	CANON_OF_THE_MASS: {
		fr: 'Canon de la Messe',
		def: "Désignation traditionnelle, dans le rite romain, de la première Prière eucharistique de la Messe, dite aussi « Canon romain ».",
		cluster: 'liturgie'
	},
	CANON_OF_SCRIPTURE: {
		fr: 'Canon des Écritures',
		def: "Liste, fixée par la Tradition apostolique, des livres reconnus par l'Église comme inspirés et appartenant à la Bible. Cette liste comprend 46 livres pour l'Ancien Testament et 27 pour le Nouveau Testament.",
		cluster: 'ecriture'
	},
	CANONIZATION: {
		fr: 'Canonisation',
		def: "Déclaration solennelle par l'Église qu'une personne défunte ayant vécu une vie de vertu héroïque jouit de la béatitude céleste et peut être proposée à la vénération universelle des fidèles.",
		cluster: 'marie-saints'
	},
	CAPITAL_SINS: {
		fr: 'Péchés capitaux',
		def: "Vices qui engendrent d'autres péchés et d'autres vices. Traditionnellement énumérés au nombre de sept : orgueil, avarice, envie, colère, luxure, gourmandise et paresse (ou acédie).",
		cluster: 'morale'
	},
	CARDINAL_VIRTUES: {
		fr: 'Vertus cardinales',
		def: "Quatre vertus humaines qui jouent un rôle central et autour desquelles s'articulent toutes les autres : prudence, justice, force et tempérance. Elles sont dites « cardinales » du latin cardo (gond, pivot).",
		cluster: 'morale'
	},
	CATECHESIS: {
		fr: 'Catéchèse',
		def: "Éducation organisée et systématique des enfants, des jeunes et des adultes en la foi de l'Église, dans le but de les introduire à la plénitude de la vie chrétienne.",
		cluster: 'eglise'
	},
	CATECHISM: {
		fr: "Catéchisme de l'Église catholique",
		def: "Texte officiel et authentique enseignant la doctrine catholique de manière organique et synthétique. La forme universelle est le Catéchisme de l'Église catholique. Des catéchismes locaux peuvent être adaptés à des cultures et à des situations particulières."
	},
	CATECHUMEN: {
		fr: 'Catéchumène',
		def: "Personne se préparant aux sacrements de l'initiation chrétienne (Baptême, Confirmation, Eucharistie) par la formation à la foi de l'Église et par la pratique chrétienne progressive. Le rite d'inscription à l'état de catéchumène insère le catéchumène dans l'Église.",
		cluster: 'sacrements'
	},
	CATHEDRAL: {
		fr: 'Cathédrale',
		def: "Église principale d'un diocèse, où l'évêque a son siège (cathedra) et préside la liturgie.",
		cluster: 'eglise'
	},
	CATHOLIC: {
		fr: 'Catholique',
		def: "Mot qui signifie « universel ». L'Église est catholique en deux sens : elle est catholique parce que le Christ est présent en elle dans la plénitude de son corps et avec la plénitude des moyens de salut ; elle est catholique parce qu'elle est envoyée en mission par le Christ à l'humanité tout entière.",
		cluster: 'eglise'
	},
	CATHOLIC_CHURCH: {
		fr: 'Église catholique',
		def: "L'Église fondée par le Christ sur les Apôtres et dirigée par leurs successeurs, les évêques, en communion avec le Pape, successeur de saint Pierre.",
		cluster: 'eglise'
	},
	CELIBACY: {
		fr: 'Célibat',
		def: "État de ceux qui choisissent de demeurer non mariés en vue du Royaume des cieux pour se consacrer entièrement à Dieu et au service des autres.",
		cluster: 'morale'
	},
	CHARACTER__SACRAMENTAL: {
		fr: 'Caractère sacramentel',
		def: "Marque spirituelle indélébile imprimée par les sacrements du Baptême, de la Confirmation et de l'Ordre, qui ne peuvent donc être reçus qu'une seule fois.",
		cluster: 'sacrements'
	},
	CHARISM: {
		fr: 'Charisme',
		def: "Don ou grâce spécifique de l'Esprit Saint accordé à un individu ou à une communauté pour le bien commun de l'Église.",
		cluster: 'esprit-saint'
	},
	CHARITY: {
		fr: 'Charité',
		def: "Vertu théologale par laquelle nous aimons Dieu par-dessus tout pour lui-même, et notre prochain comme nous-mêmes par amour de Dieu. La plus grande des vertus théologales, elle est l'âme de toutes les autres.",
		cluster: 'morale'
	},
	CHASTITY: {
		fr: 'Chasteté',
		def: "Vertu morale qui intègre la sexualité dans la personne et lui assure l'unité intérieure de son être corporel et spirituel. Dans le mariage, elle prend la forme de la fidélité conjugale ; chez les non-mariés, celle de la continence.",
		cluster: 'morale'
	},
	CHOIR: {
		fr: 'Chœur',
		def: "Ensemble des chantres d'une église ; aussi, partie de l'église réservée au clergé pendant la liturgie.",
		cluster: 'liturgie'
	},
	CHRISM: {
		fr: 'Saint Chrême',
		def: "Huile parfumée consacrée par l'évêque, utilisée dans les sacrements du Baptême, de la Confirmation et de l'Ordre, ainsi que dans la consécration des églises et des autels.",
		cluster: 'sacrements'
	},
	CHRISMATION: {
		fr: 'Chrismation',
		def: "Nom donné dans les Églises orientales au sacrement de la Confirmation. Voir Confirmation.",
		cluster: 'sacrements'
	},
	CHRIST: {
		fr: 'Christ',
		def: "Du grec christos, qui traduit l'hébreu Messie, « celui qui est oint ». Ce titre est devenu propre à Jésus parce qu'il a parfaitement accompli la mission divine qu'il désigne. En lui s'accomplissent le sacerdoce, la prophétie et la royauté annoncés dans l'Ancien Testament.",
		cluster: 'christ'
	},
	CHRISTIAN: {
		fr: 'Chrétien',
		def: "Disciple du Christ ; nom donné aux disciples à Antioche (Ac 11, 26). Le chrétien, par le Baptême, est incorporé au Christ et à son Église.",
		cluster: 'eglise'
	},
	CHRISTMAS: {
		fr: 'Noël',
		def: "Fête de la Nativité de Jésus Christ, célébrée le 25 décembre, qui inaugure le temps liturgique de Noël.",
		cluster: 'liturgie'
	},
	CHURCH: {
		fr: 'Église',
		def: "Du grec ekklèsia, « assemblée convoquée ». L'Église est le peuple que Dieu rassemble dans le monde entier, le Corps du Christ dont il est la Tête. Visible dans son peuple et ses structures, spirituelle comme corps mystique du Christ et temple de l'Esprit Saint, elle est conduite par les Apôtres et leurs successeurs en communion avec le Pape.",
		cluster: 'eglise'
	},
	CIRCUMCISION: {
		fr: 'Circoncision',
		def: "Rite religieux et social pratiqué dans l'Ancien Testament comme signe de l'alliance entre Dieu et Abraham, accompli, pour les chrétiens, dans le sacrement du Baptême.",
		cluster: 'ecriture'
	},
	COLLEGIALITY: {
		fr: 'Collégialité',
		def: "Doctrine selon laquelle les évêques, comme successeurs des Apôtres et en communion les uns avec les autres et avec le Pape, partagent la responsabilité de l'enseignement, de la sanctification et du gouvernement de l'Église.",
		cluster: 'eglise'
	},
	COMMANDMENT: {
		fr: 'Commandement',
		def: "Précepte qui oblige en conscience. Le Décalogue, les Dix commandements remis par Dieu à Moïse au Sinaï, demeure le cœur de la morale d'Israël et de l'Église.",
		cluster: 'morale'
	},
	COMMANDMENTS_OF_THE_CHURCH: {
		fr: "Commandements de l'Église",
		def: "Préceptes positifs promulgués par l'autorité pastorale de l'Église qui établissent un minimum de pratique en vue de l'esprit de prière et de l'effort moral, de la croissance dans l'amour de Dieu et du prochain.",
		cluster: 'eglise'
	},
	COMMUNION: {
		fr: 'Communion',
		def: "Mot qui désigne la communion des saints, l'union profonde de tous les fidèles du Christ (vivants sur terre, défunts en purgatoire et bienheureux du ciel) dans la grâce et l'amour. La sainte Communion désigne aussi la réception de l'Eucharistie, dans laquelle le Christ se donne à ses fidèles. Voir Communion des saints.",
		cluster: 'sacrements'
	},
	COMMUNION_OF_SAINTS: {
		fr: 'Communion des saints',
		def: "Unité dans le Christ de tous ceux qu'il a rachetés : l'Église pèlerinante sur terre, les âmes en purgatoire et les bienheureux dans la gloire, tous formant la seule famille en Christ. Cette unité s'exprime aussi par le partage des choses saintes (sacra), notamment de l'Eucharistie.",
		cluster: 'marie-saints'
	},
	CONCUPISCENCE: {
		fr: 'Concupiscence',
		def: "Tendance désordonnée de l'homme blessé par le péché originel à pécher. Toutes les inclinations de l'homme à l'égoïsme, à la satisfaction des passions et à la rébellion contre Dieu sont rassemblées dans la concupiscence.",
		cluster: 'morale'
	},
	CONFESSION: {
		fr: 'Confession',
		def: "Aveu des péchés graves au prêtre dans le sacrement de Pénitence. La confession constitue, avec la contrition et la satisfaction, l'un des actes du pénitent. Voir Pénitence.",
		cluster: 'sacrements'
	},
	CONFIRMATION: {
		fr: 'Confirmation',
		def: "Sacrement par lequel les baptisés sont enrichis du don de l'Esprit Saint et liés plus parfaitement à l'Église, fortifiés et plus strictement obligés de répandre et de défendre la foi par la parole et par l'action.",
		cluster: 'sacrements'
	},
	CONSCIENCE: {
		fr: 'Conscience',
		def: "Jugement de la raison par lequel la personne humaine reconnaît la qualité morale d'un acte concret qu'elle va poser, qu'elle est en train de poser ou qu'elle a posé. La personne est tenue d'agir selon ce jugement.",
		cluster: 'morale'
	},
	CONSECRATED_LIFE: {
		fr: 'Vie consacrée',
		def: "État de vie reconnu par l'Église dans lequel des fidèles s'engagent par les conseils évangéliques de pauvreté, chasteté et obéissance à suivre le Christ de plus près au service du Royaume.",
		cluster: 'eglise'
	},
	CONSECRATED_VIRGINS: {
		fr: 'Vierges consacrées',
		def: "Femmes laïques qui, par un rite liturgique, sont consacrées par l'évêque pour vivre l'état de virginité au service de l'Église.",
		cluster: 'eglise'
	},
	CONSECRATION: {
		fr: 'Consécration',
		def: "Dans la Messe, ce moment central de la Prière eucharistique au cours duquel les paroles du Seigneur sont prononcées sur le pain et le vin, qui deviennent par la puissance de l'Esprit Saint le Corps et le Sang du Christ. Plus largement, action de réserver une personne ou une chose à Dieu.",
		cluster: 'sacrements'
	},
	CONTEMPLATION: {
		fr: 'Contemplation',
		def: "Forme silencieuse de prière dans laquelle l'esprit et le cœur s'unissent à Dieu dans l'amour. La prière contemplative est une union profonde avec le Christ.",
		cluster: 'priere'
	},
	CONTRACEPTION__ARTIFICIAL: {
		fr: 'Contraception artificielle',
		def: "Recours, dans l'acte conjugal, à des moyens visant à empêcher la conception. La contraception artificielle est moralement inacceptable parce qu'elle dissocie le sens unitif et le sens procréatif inscrits dans l'acte conjugal.",
		cluster: 'morale'
	},
	CONTRITION: {
		fr: 'Contrition',
		def: "Douleur de l'âme et détestation du péché commis avec la résolution de ne plus pécher. La contrition parfaite est mue par l'amour de Dieu ; la contrition imparfaite (attrition) est mue par d'autres motifs.",
		cluster: 'sacrements'
	},
	CONVERSION: {
		fr: 'Conversion',
		def: "Retour vers Dieu, changement radical du cœur, en réponse à son amour miséricordieux. La conversion suppose le repentir du péché et la décision de vivre désormais dans le Christ.",
		cluster: 'morale'
	},
	COUNCIL__ECUMENICAL: {
		fr: 'Concile œcuménique',
		def: "Assemblée des évêques du monde entier, convoquée et présidée par le Pape ou avec son approbation, ayant autorité pour définir des questions de doctrine et de discipline.",
		cluster: 'eglise'
	},
	COUNSEL: {
		fr: 'Conseil',
		def: "Don de l'Esprit Saint qui dispose la personne à juger promptement et droitement de ce qu'il convient de faire, surtout dans des situations difficiles.",
		cluster: 'esprit-saint'
	},
	COVENANT: {
		fr: 'Alliance',
		def: "Engagement solennel et irrévocable que Dieu a librement contracté avec son peuple, et qui appelle de leur part une réponse de foi et d'obéissance. L'Alliance ancienne avec Israël prépare l'Alliance nouvelle et éternelle scellée dans le sang du Christ.",
		cluster: 'ecriture'
	},
	COVETOUSNESS: {
		fr: 'Convoitise',
		def: "Désir désordonné des biens d'autrui, contraire au neuvième et au dixième commandements. Voir Concupiscence.",
		cluster: 'morale'
	},
	CREATION: {
		fr: 'Création',
		def: "L'acte par lequel Dieu, librement et par amour, fait exister tout ce qui est, en dehors de lui-même. Le récit de la Genèse, lu à la lumière du Christ et de l'Église, révèle Dieu comme le Créateur unique et tout-puissant.",
		cluster: 'creation-homme'
	},
	CREED: {
		fr: 'Credo',
		def: "Profession de foi du chrétien, exprimant ce qui est cru. Voir Symbole de la foi.",
		cluster: 'priere'
	},
	CROSS: {
		fr: 'Croix',
		def: "Instrument du supplice du Christ. Par sa Croix et sa Résurrection, le Christ a sauvé le monde. Le signe de croix est un acte de foi par lequel le chrétien se met sous la protection du Père, du Fils et de l'Esprit Saint.",
		cluster: 'christ'
	},
	DEACON__DIACONATE: {
		fr: 'Diacre / Diaconat',
		def: "Troisième degré du sacrement de l'Ordre, après l'épiscopat et le presbytérat. Les diacres sont ordonnés pour le service du peuple de Dieu en union avec l'évêque et son presbyterium.",
		cluster: 'eglise'
	},
	DECALOGUE: {
		fr: 'Décalogue',
		def: "Les dix paroles ou les dix commandements donnés par Dieu à Moïse au mont Sinaï, qui résument les exigences fondamentales de l'alliance. Le Christ a confirmé le Décalogue et lui a donné son sens plénier.",
		cluster: 'morale'
	},
	DEFINITION__DOGMATIC: {
		fr: 'Définition dogmatique',
		def: "Acte du Magistère ordinaire ou extraordinaire de l'Église par lequel une vérité de foi est énoncée de manière définitive comme contenue dans la Révélation et à croire par tous les fidèles.",
		cluster: 'eglise'
	},
	DEMON: {
		fr: 'Démon',
		def: "Ange déchu : ayant librement et définitivement refusé Dieu et son règne, il est devenu, sous le nom de Satan ou diable, l'ennemi de Dieu et de l'humanité. Voir Diable, Satan.",
		cluster: 'creation-homme'
	},
	DEPOSIT_OF_FAITH: {
		fr: 'Dépôt de la foi',
		def: "L'héritage de la foi, contenu dans la sainte Écriture et la Tradition, transmis dans l'Église depuis le temps des Apôtres, à partir duquel le Magistère puise tout ce qu'il propose à croire.",
		cluster: 'ecriture'
	},
	DESCENT_INTO_HELL: {
		fr: 'Descente aux enfers',
		def: "Phrase du Symbole des Apôtres exprimant que Jésus, après sa mort, est descendu au séjour des morts, c'est-à-dire au shéol où se trouvaient les âmes des justes attendant le Rédempteur, pour les ouvrir au ciel.",
		cluster: 'christ'
	},
	DESPAIR: {
		fr: 'Désespoir',
		def: "Péché par lequel l'homme cesse d'espérer en sa propre salut, dans les secours de Dieu pour y parvenir, ou dans le pardon de ses péchés. Le désespoir est contraire à la vertu théologale d'espérance.",
		cluster: 'morale'
	},
	DETRACTION: {
		fr: 'Médisance',
		def: "Révélation, sans raison objectivement valable, des défauts ou des fautes d'autrui à des personnes qui les ignoraient. La médisance enfreint le huitième commandement.",
		cluster: 'morale'
	},
	DEVELOPMENT__DOCTRINAL: {
		fr: 'Développement doctrinal',
		def: "Compréhension croissante, dans l'Église, des vérités contenues dans le dépôt de la foi, qui ne reçoit aucune révélation nouvelle mais en pénètre toujours plus le contenu sous l'action de l'Esprit Saint.",
		cluster: 'eglise'
	},
	DEVIL_DEMON: {
		fr: 'Diable',
		def: "Le « diable » et les autres « démons » sont des anges qui se sont librement et définitivement détournés de Dieu. Voir Démon, Satan.",
		cluster: 'creation-homme'
	},

	DIOCESE: {
		fr: 'Diocèse',
		def: "Église particulière, c'est-à-dire portion du peuple de Dieu confiée à un évêque pour qu'il la fasse paître avec la coopération de son presbyterium.",
		cluster: 'eglise'
	},
	DISCIPLE: {
		fr: 'Disciple',
		def: "Celui qui suit le Christ et apprend de lui. Tous les baptisés sont appelés à être disciples du Christ et à porter du fruit pour la vie éternelle.",
		cluster: 'eglise'
	},
	DISPENSATION: {
		fr: 'Dispense',
		def: "Acte de l'autorité ecclésiastique compétente qui exempte d'une loi ecclésiastique en faveur d'une personne ou d'une communauté.",
		cluster: 'eglise'
	},
	DIVINE_LITURGY: {
		fr: 'Divine Liturgie',
		def: "Nom donné dans les Églises orientales à la célébration eucharistique. Voir Eucharistie, Messe.",
		cluster: 'liturgie'
	},
	DIVORCE: {
		fr: 'Divorce',
		def: "Rupture civile de l'engagement matrimonial qui prétend dissoudre le lien légitimement contracté. Le divorce est gravement contraire à la loi naturelle et à la doctrine du Christ sur l'indissolubilité du mariage.",
		cluster: 'morale'
	},
	DOCTOR_OF_THE_CHURCH: {
		fr: "Docteur de l'Église",
		def: "Titre donné par l'Église à certains saints éminents par leur sainteté de vie et la profondeur de leur enseignement, dont l'œuvre théologique a contribué à la compréhension de la foi.",
		cluster: 'marie-saints'
	},
	DOCTRINE_DOGMA: {
		fr: 'Doctrine / Dogme',
		def: "L'enseignement de l'Église. Un dogme est une vérité contenue dans la Révélation que l'Église propose comme telle à la foi des fidèles. Voir Définition dogmatique.",
		cluster: 'eglise'
	},
	DOMESTIC_CHURCH: {
		fr: 'Église domestique',
		def: "La famille chrétienne, en tant que communauté de foi, d'espérance et de charité, image de l'Église, où les enfants apprennent la prière et reçoivent les premiers témoignages de la foi.",
		cluster: 'eglise'
	},
	DOMINION: {
		fr: 'Domination',
		def: "Souveraineté que Dieu, en tant que Créateur, exerce sur toutes les créatures ; aussi, responsabilité confiée par Dieu à l'homme pour gouverner sagement la création.",
		cluster: 'creation-homme'
	},
	DOUBT: {
		fr: 'Doute',
		def: "Doute volontaire au sujet de la foi : il dédaigne ou refuse de tenir pour vrai ce que Dieu a révélé et que l'Église propose à croire. Le doute peut conduire à l'aveuglement de l'esprit.",
		cluster: 'morale'
	},
	DOXOLOGY: {
		fr: 'Doxologie',
		def: "Forme brève de prière par laquelle l'Église rend gloire à Dieu, souvent dans la formule trinitaire « Gloire au Père, et au Fils, et au Saint-Esprit… ».",
		cluster: 'priere'
	},
	EASTER: {
		fr: 'Pâques',
		def: "La fête centrale de l'année liturgique, célébrant la Résurrection du Christ d'entre les morts. Pâques inaugure le temps pascal de cinquante jours qui culmine à la Pentecôte.",
		cluster: 'liturgie'
	},
	ECONOMY__DIVINE: {
		fr: 'Économie divine',
		def: "Plan de Dieu pour le salut du genre humain et l'œuvre par laquelle ce plan se réalise dans l'histoire, depuis la création jusqu'à la consommation des siècles, par et dans le Christ.",
		cluster: 'trinite'
	},
	ECUMENISM: {
		fr: 'Œcuménisme',
		def: "Promotion de l'unité voulue par le Christ entre tous les chrétiens. L'œcuménisme s'exerce par la prière, le dialogue, la conversion du cœur et la coopération entre chrétiens séparés.",
		cluster: 'eglise'
	},
	EMMANUEL: {
		fr: 'Emmanuel',
		def: "Mot hébreu signifiant « Dieu avec nous », nom prophétique donné par Isaïe au Messie attendu et appliqué dans le Nouveau Testament à Jésus.",
		cluster: 'christ'
	},
	EPICLESIS: {
		fr: 'Épiclèse',
		def: "Prière par laquelle le prêtre invoque l'Esprit Saint pour que les offrandes deviennent le Corps et le Sang du Christ, et pour que les fidèles, en les recevant, deviennent eux-mêmes une offrande vivante à Dieu.",
		cluster: 'liturgie'
	},
	EPISCOPACY: {
		fr: 'Épiscopat',
		def: "Le ministère et la charge des évêques. La charge épiscopale, par institution divine, succède à celle des Apôtres.",
		cluster: 'eglise'
	},
	ESCHATOLOGY: {
		fr: 'Eschatologie',
		def: "Doctrine concernant les fins dernières (mort, jugement, ciel, enfer) et l'achèvement du Royaume de Dieu à la fin des temps.",
		cluster: 'fins-dernieres'
	},
	EUCHARIST: {
		fr: 'Eucharistie',
		def: "Sacrement de l'Alliance nouvelle. Sous les apparences du pain et du vin, le Christ s'y rend vraiment, réellement et substantiellement présent : offert au Père en sacrifice et donné aux fidèles en nourriture. « Source et sommet de toute la vie chrétienne. »",
		cluster: 'sacrements'
	},
	EUTHANASIA: {
		fr: 'Euthanasie',
		def: "Action ou omission qui, par sa nature ou dans son intention, donne la mort afin de supprimer toute douleur. L'euthanasie est gravement contraire à la dignité de la personne humaine et au respect dû au Dieu vivant, son Créateur.",
		cluster: 'morale'
	},
	EVANGELICAL_COUNSELS: {
		fr: 'Conseils évangéliques',
		def: "Pauvreté, chasteté et obéissance, voies de perfection chrétienne proposées dans l'Évangile par Jésus à ses disciples. Les religieux les professent par des vœux publics.",
		cluster: 'eglise'
	},
	EVANGELIST: {
		fr: 'Évangéliste',
		def: "Auteur de l'un des quatre Évangiles : Matthieu, Marc, Luc et Jean. Plus largement, celui qui annonce l'Évangile.",
		cluster: 'ecriture'
	},
	EVANGELIZATION: {
		fr: 'Évangélisation',
		def: "Annonce de l'Évangile du Christ par la parole et le témoignage de la vie, en accomplissement de l'envoi en mission donné par le Christ ressuscité.",
		cluster: 'eglise'
	},
	EVE: {
		fr: 'Ève',
		def: "Selon la Genèse, la première femme, mère de tous les vivants, créée par Dieu pour Adam. Tombée avec lui par le péché originel.",
		cluster: 'creation-homme'
	},
	EVIL: {
		fr: 'Mal',
		def: "Privation du bien, désordre introduit dans la création par le péché. Le mal moral est plus grave que le mal physique. Dieu ne veut en aucune manière le mal moral ; le mal physique, il le permet en vue d'un bien.",
		cluster: 'creation-homme'
	},
	EXCOMMUNICATION: {
		fr: 'Excommunication',
		def: "Peine canonique la plus grave, qui exclut le baptisé coupable de certaines fautes graves de la communion ecclésiale et du recours à certains sacrements et fonctions, jusqu'au repentir.",
		cluster: 'eglise'
	},
	EXEGESIS: {
		fr: 'Exégèse',
		def: "Étude scientifique de l'Écriture sainte qui, à la lumière des intentions des auteurs sacrés et de la foi de l'Église, cherche à comprendre la signification du texte.",
		cluster: 'ecriture'
	},
	EXISTENCE_OF_GOD: {
		fr: "Existence de Dieu",
		def: "Vérité que la raison humaine peut connaître par les œuvres de la création et que la Révélation divine atteste pleinement.",
		cluster: 'trinite'
	},
	EXORCISM: {
		fr: 'Exorcisme',
		def: "Prière publique et autoritaire de l'Église, au nom de Jésus Christ, pour qu'une personne ou un objet soit protégé contre l'emprise du Malin et soustrait à son empire.",
		cluster: 'liturgie'
	},
	FAITH: {
		fr: 'Foi',
		def: "Vertu théologale par laquelle nous croyons en Dieu, et à tout ce qu'il nous a dit et révélé, et que la sainte Église nous propose à croire, parce qu'il est la Vérité même. La foi est don gratuit de Dieu et engagement de la liberté humaine.",
		cluster: 'morale'
	},
	FAITHFUL: {
		fr: 'Fidèles',
		def: "Tous les chrétiens qui, étant baptisés, sont incorporés au Christ, constitués peuple de Dieu, faits participants à leur manière à la fonction sacerdotale, prophétique et royale du Christ.",
		cluster: 'eglise'
	},
	FALL__THE: {
		fr: 'Chute',
		def: "Le péché des premiers parents qui, en désobéissant à Dieu, ont perdu la sainteté et la justice originelles pour eux-mêmes et pour leur descendance. Voir Péché originel.",
		cluster: 'creation-homme'
	},
	FAMILY: {
		fr: 'Famille',
		def: "Société fondée sur le mariage entre un homme et une femme, ouverte à la procréation et à l'éducation des enfants. La famille chrétienne, communauté de foi et de prière, est appelée « Église domestique ».",
		cluster: 'morale'
	},
	FASTING: {
		fr: 'Jeûne',
		def: "Pratique consistant à s'abstenir de nourriture pour un temps, comme acte de pénitence ou en préparation à la prière. Le jeûne, avec la prière et l'aumône, est une œuvre traditionnelle de pénitence.",
		cluster: 'morale'
	},
	FATHER: {
		fr: 'Père',
		def: "Première Personne de la Trinité, source de la divinité. Père de toute éternité du Fils unique, Jésus Christ ; par lui et en lui, l'Esprit Saint nous est donné.",
		cluster: 'trinite'
	},
	FATHERS_OF_THE_CHURCH: {
		fr: 'Pères de l\'Église',
		def: "Témoins éminents de la Tradition apostolique, dont l'œuvre théologique des premiers siècles a contribué à former la doctrine de l'Église.",
		cluster: 'eglise'
	},
	FEAR_OF_THE_LORD: {
		fr: 'Crainte du Seigneur',
		def: "Don de l'Esprit Saint qui inspire un respect filial et révérenciel envers Dieu, conduisant à éviter le péché et à servir Dieu avec amour.",
		cluster: 'esprit-saint'
	},
	FILIOQUE: {
		fr: 'Filioque',
		def: "Mot latin signifiant « et du Fils », ajouté au Symbole de Nicée-Constantinople en Occident pour exprimer que l'Esprit Saint procède du Père et du Fils. Source de difficulté dans les relations avec les Églises orthodoxes.",
		cluster: 'trinite'
	},
	FORGIVENESS: {
		fr: 'Pardon',
		def: "Don gratuit de Dieu qui remet les péchés. Pour les chrétiens, le pardon des péchés est étroitement lié au sacrement du Baptême et au sacrement de Pénitence ; il s'étend aussi au pardon mutuel commandé par le Christ.",
		cluster: 'morale'
	},
	FORNICATION: {
		fr: 'Fornication',
		def: "Union charnelle entre un homme et une femme libres l'un et l'autre, hors mariage. La fornication est gravement contraire à la dignité des personnes et de la sexualité humaine.",
		cluster: 'morale'
	},
	FORTITUDE: {
		fr: 'Force',
		def: "Vertu cardinale qui affermit la résolution dans la poursuite du bien et fait surmonter les difficultés. Don de l'Esprit Saint qui rend capable de témoigner du Christ jusqu'au martyre.",
		cluster: 'morale'
	},
	FREEDOM: {
		fr: 'Liberté',
		def: "Pouvoir, enraciné dans la raison et la volonté, d'agir ou de ne pas agir, de faire ceci ou cela, et de poser par soi-même des actions délibérées. La liberté trouve sa perfection lorsqu'elle s'ordonne à Dieu.",
		cluster: 'morale'
	},
	FREE_WILL: {
		fr: 'Libre arbitre',
		def: "Pouvoir naturel de l'homme de choisir entre des biens. Le libre arbitre est blessé mais non détruit par le péché ; la grâce le restaure et le perfectionne.",
		cluster: 'morale'
	},
	FRUITS_OF_THE_SPIRIT: {
		fr: "Fruits de l'Esprit",
		def: "Perfections que l'Esprit Saint façonne en nous comme prémices de la gloire éternelle. La tradition de l'Église en énumère douze : charité, joie, paix, patience, longanimité, bonté, bénignité, douceur, fidélité, modestie, continence, chasteté.",
		cluster: 'esprit-saint'
	},
	GENERATION_OF_THE_SON: {
		fr: 'Génération du Fils',
		def: "Mode par lequel le Fils est éternellement engendré du Père dans la communion d'amour de la Trinité, sans être créé.",
		cluster: 'trinite'
	},
	GENTILES: {
		fr: 'Gentils',
		def: "Désignation, dans l'Ancien et le Nouveau Testament, des nations non juives. Avec le Christ, les Gentils sont appelés à entrer dans le peuple de Dieu et à être greffés sur Israël par la foi.",
		cluster: 'ecriture'
	},
	GIFTS_OF_THE_SPIRIT: {
		fr: "Dons de l'Esprit Saint",
		def: "Dispositions permanentes qui rendent l'homme docile à suivre les motions de l'Esprit Saint. Au nombre de sept : sagesse, intelligence, conseil, force, science, piété, crainte de Dieu.",
		cluster: 'esprit-saint'
	},
	GLORY: {
		fr: 'Gloire',
		def: "Manifestation de la sainteté et de la majesté de Dieu. La gloire éternelle est la participation des bienheureux à la gloire de Dieu.",
		cluster: 'trinite'
	},
	GLUTTONY: {
		fr: 'Gourmandise',
		def: "Désir désordonné du plaisir attaché à la nourriture ou à la boisson, l'un des sept péchés capitaux.",
		cluster: 'morale'
	},
	GOD: {
		fr: 'Dieu',
		def: "Dieu est unique : seul Seigneur, créateur du ciel et de la terre, source et fin de toute chose. Il s'est révélé comme Père, Fils et Esprit Saint, un seul Dieu en trois Personnes : esprit, éternel, tout-puissant, vrai et bon.",
		cluster: 'trinite'
	},
	GOOD_WORKS: {
		fr: 'Bonnes œuvres',
		def: "Actes de charité, de justice et de piété accomplis sous l'action de la grâce. Le mérite des bonnes œuvres est attribué d'abord à la grâce de Dieu et seulement ensuite au libre arbitre du fidèle.",
		cluster: 'morale'
	},
	GOSPEL: {
		fr: 'Évangile',
		def: "Du grec euangelion, « Bonne Nouvelle ». L'Évangile est la révélation du salut accomplie en Jésus Christ, et plus précisément les quatre évangiles (Matthieu, Marc, Luc, Jean) qui en consignent le témoignage.",
		cluster: 'ecriture'
	},
	GRACE: {
		fr: 'Grâce',
		def: "Faveur, secours gratuit que Dieu donne pour répondre à son appel : devenir enfants adoptifs de Dieu, participants de sa nature divine et héritiers de la vie éternelle. La grâce est participation à la vie même de Dieu.",
		cluster: 'morale'
	},
	GUARDIAN_ANGELS: {
		fr: 'Anges gardiens',
		def: "Anges spécialement chargés par Dieu de veiller sur chaque personne tout au long de sa vie pour l'aider à parvenir au salut.",
		cluster: 'marie-saints'
	},
	HAIL_MARY: {
		fr: 'Je vous salue Marie',
		def: "Prière mariale composée des paroles d'accueil de l'ange Gabriel à Marie, du salut d'Élisabeth, et d'une supplique de l'Église à la Mère de Dieu.",
		cluster: 'priere'
	},
	HEART: {
		fr: 'Cœur',
		def: "Selon la Bible, le centre de la personne, le lieu où elle décide pour ou contre Dieu. Siège de la prière et de la conversion.",
		cluster: 'creation-homme'
	},
	HEAVEN: {
		fr: 'Ciel',
		def: "Bonheur suprême et définitif. Le Ciel est la vision de Dieu et la communion de vie et d'amour avec la Trinité, la Vierge Marie, les anges et tous les saints.",
		cluster: 'fins-dernieres'
	},
	HELL: {
		fr: 'Enfer',
		def: "État de séparation définitive de Dieu de ceux qui meurent en état de péché mortel. La principale peine de l'enfer consiste dans la séparation éternelle d'avec Dieu.",
		cluster: 'fins-dernieres'
	},
	HERESY: {
		fr: 'Hérésie',
		def: "Négation obstinée, après le Baptême, d'une vérité qu'il faut croire de foi divine et catholique, ou doute obstiné sur cette vérité.",
		cluster: 'eglise'
	},
	HIERARCHY: {
		fr: 'Hiérarchie',
		def: "Communauté formée par les évêques en union avec le Pape pour l'enseignement, la sanctification et le gouvernement de l'Église.",
		cluster: 'eglise'
	},
	HOLY: {
		fr: 'Saint',
		def: "« Consacré à Dieu », mis à part pour lui. Dieu seul est saint en lui-même ; il rend saintes les personnes et les choses qu'il consacre à son service. Voir Sainteté.",
		cluster: 'morale'
	},
	HOLY_DAYS_OF_OBLIGATION: {
		fr: "Fêtes d'obligation",
		def: "Jours, autres que le dimanche, qui obligent les fidèles à participer à la Messe et à s'abstenir des travaux qui empêchent le culte ou la joie propre au jour du Seigneur.",
		cluster: 'liturgie'
	},
	HOLY_FATHER: {
		fr: 'Saint-Père',
		def: "Titre donné au Pape, évêque de Rome et successeur de saint Pierre.",
		cluster: 'eglise'
	},
	HOLY_OILS: {
		fr: 'Saintes huiles',
		def: "Trois huiles consacrées par l'évêque le Jeudi saint et utilisées dans les sacrements : huile des catéchumènes, huile des malades, saint chrême.",
		cluster: 'liturgie'
	},
	HOLY_ORDERS: {
		fr: 'Sacrement de l\'Ordre',
		def: "Sacrement par lequel la mission confiée par le Christ à ses Apôtres continue à être exercée dans l'Église jusqu'à la fin des temps. Il comporte trois degrés : épiscopat, presbytérat et diaconat.",
		cluster: 'sacrements'
	},
	HOLY_SEE: {
		fr: 'Saint-Siège',
		def: "Siège épiscopal de Rome, gouverné par le Pape. Le Saint-Siège représente l'autorité centrale de l'Église catholique.",
		cluster: 'eglise'
	},
	HOLY_SPIRIT: {
		fr: 'Esprit Saint',
		def: "Troisième Personne de la Trinité, consubstantiel au Père et au Fils, dont il procède éternellement. Vrai Dieu avec eux, il est envoyé dans nos cœurs pour y répandre l'amour de Dieu et nous donner la vie nouvelle des enfants de Dieu.",
		cluster: 'esprit-saint'
	},
	HOLY_THURSDAY: {
		fr: 'Jeudi saint',
		def: "Jour de la Semaine sainte qui célèbre l'institution de l'Eucharistie et du sacerdoce ministériel à la Cène.",
		cluster: 'liturgie'
	},
	HOLY_WATER: {
		fr: 'Eau bénite',
		def: "Eau bénite par un prêtre ou un diacre, utilisée comme sacramental pour rappeler le Baptême, demander la protection de Dieu et écarter le mal.",
		cluster: 'liturgie'
	},
	HOLY_WEEK: {
		fr: 'Semaine sainte',
		def: "Semaine qui précède Pâques, durant laquelle l'Église fait mémoire des derniers événements de la vie terrestre du Christ : son entrée à Jérusalem, sa Passion, sa mort.",
		cluster: 'liturgie'
	},
	HOMOSEXUALITY: {
		fr: 'Homosexualité',
		def: "Attirance sexuelle prédominante ou exclusive envers des personnes du même sexe. Les actes homosexuels sont gravement contraires à la loi naturelle ; les personnes homosexuelles doivent être accueillies avec respect, compassion et délicatesse.",
		cluster: 'morale'
	},
	HOPE: {
		fr: 'Espérance',
		def: "Vertu théologale par laquelle nous désirons le Royaume des cieux et la vie éternelle comme notre bonheur, plaçant notre confiance dans les promesses du Christ et nous appuyant sur le secours de la grâce de l'Esprit Saint.",
		cluster: 'morale'
	},
	HUMILITY: {
		fr: 'Humilité',
		def: "Vertu morale qui dispose la personne à reconnaître sa juste mesure devant Dieu et envers les autres. L'humilité du Christ et de Marie est le modèle parfait de cette vertu.",
		cluster: 'morale'
	},
	HYPOSTATIC_UNION: {
		fr: 'Union hypostatique',
		def: "Union, dans la personne unique du Verbe incarné, des deux natures divine et humaine. Le concile de Chalcédoine (451) a confessé cette union « sans confusion, sans changement, sans division, sans séparation ».",
		cluster: 'christ'
	},
	ICONS: {
		fr: 'Icônes',
		def: "Images sacrées du Christ, de la Vierge Marie ou des saints, vénérées en particulier dans la tradition orientale comme « livres pour les illettrés » et fenêtres sur le mystère.",
		cluster: 'liturgie'
	},
	IDOLATRY: {
		fr: 'Idolâtrie',
		def: "Faute consistant à diviniser ce qui n'est pas Dieu, à adorer une créature à la place du Créateur. L'idolâtrie est contraire au premier commandement.",
		cluster: 'morale'
	},
	IMAGE_OF_GOD: {
		fr: "Image de Dieu",
		def: "Réalité par laquelle l'homme, créé homme et femme, manifeste la dignité unique de la personne humaine, ouverte à la connaissance et à l'amour de Dieu.",
		cluster: 'creation-homme'
	},
	IMMACULATE_CONCEPTION: {
		fr: 'Immaculée Conception',
		def: "Dogme proclamé en 1854 par le Pape Pie IX selon lequel, dès le premier instant de sa conception, Marie a été préservée de toute tache du péché originel par une grâce et un privilège uniques de Dieu, en vue des mérites de Jésus Christ.",
		cluster: 'marie-saints'
	},
	IMMORTALITY: {
		fr: 'Immortalité',
		def: "Caractère de l'âme humaine, créée immortelle par Dieu, qui ne meurt pas avec le corps mais s'unira de nouveau à lui à la résurrection finale.",
		cluster: 'fins-dernieres'
	},
	IMPRIMATUR: {
		fr: 'Imprimatur',
		def: "Approbation donnée par l'autorité ecclésiastique pour la publication d'un livre traitant de matières religieuses, attestant qu'il est exempt d'erreurs concernant la foi et la morale.",
		cluster: 'eglise'
	},
	INCARNATION: {
		fr: 'Incarnation',
		def: "Mystère par lequel le Fils éternel de Dieu, assumant une nature humaine dans le sein de la Vierge Marie par l'œuvre de l'Esprit Saint, s'est fait homme sans cesser d'être Dieu.",
		cluster: 'christ'
	},
	INDULGENCE: {
		fr: 'Indulgence',
		def: "Remise devant Dieu de la peine temporelle due pour des péchés déjà pardonnés. Le fidèle obtient l'indulgence dans des conditions déterminées, par l'action de l'Église qui dispense le trésor des satisfactions du Christ et des saints.",
		cluster: 'sacrements'
	},
	INERRANCY: {
		fr: 'Inerrance',
		def: "Don accordé par Dieu aux Écritures par lequel celles-ci enseignent fermement, fidèlement et sans erreur la vérité de salut.",
		cluster: 'ecriture'
	},
	INFALLIBILITY: {
		fr: 'Infaillibilité',
		def: "Don que le Christ a fait à son Église par lequel les Pasteurs, en certaines circonstances, sont préservés de l'erreur lorsqu'ils enseignent en matière de foi et de mœurs.",
		cluster: 'eglise'
	},
	INFANCY_NARRATIVES: {
		fr: "Récits de l'enfance",
		def: "Chapitres des évangiles de Matthieu et de Luc qui rapportent les événements entourant la conception, la naissance et l'enfance de Jésus.",
		cluster: 'ecriture'
	},
	INSPIRATION_OF_SCRIPTURE: {
		fr: "Inspiration de l'Écriture",
		def: "Action de l'Esprit Saint qui assiste les auteurs sacrés de telle sorte qu'ils enseignent ce que Dieu veut, et lui seul, en vue de notre salut. Voir Inspiration biblique.",
		cluster: 'ecriture'
	},
	INSTITUTE__SECULAR: {
		fr: 'Institut séculier',
		def: "Institut de vie consacrée dont les membres, vivant dans le monde, tendent à la perfection de la charité et travaillent à la sanctification du monde de l'intérieur.",
		cluster: 'eglise'
	},
	INTEGRITY__ORIGINAL: {
		fr: 'Intégrité originelle',
		def: "État dans lequel les premiers parents furent créés : intégrité du corps et de l'âme, exempt de la concupiscence, harmonie intérieure et avec la création.",
		cluster: 'creation-homme'
	},
	INTERCESSION: {
		fr: 'Intercession',
		def: "Forme de prière de demande par laquelle, à la suite de Jésus, nous prions pour le salut des autres. Le Christ, prêtre éternel, intercède sans cesse en notre faveur ; la Vierge Marie et les saints intercèdent eux aussi pour nous.",
		cluster: 'priere'
	},
	ISLAM: {
		fr: 'Islam',
		def: "Religion monothéiste fondée par Muhammad au VIIe siècle. Les musulmans confessent un Dieu unique, miséricordieux, et reconnaissent Abraham comme leur père dans la foi.",
		cluster: 'eglise'
	},
	ISRAEL: {
		fr: 'Israël',
		def: "Nom donné à Jacob et à ses descendants, peuple choisi de l'Alliance ancienne, dépositaire de la promesse messianique. L'Église, greffée sur cette racine, est la « nouvelle Israël ».",
		cluster: 'ecriture'
	},
	JESUS_CHRIST: {
		fr: 'Jésus Christ',
		def: "Jésus de Nazareth, vrai Dieu et vrai homme, Fils unique du Père, conçu du Saint-Esprit et né de la Vierge Marie, qui a souffert sa Passion et est mort en croix pour notre salut, est ressuscité d'entre les morts, est monté au ciel et reviendra dans la gloire.",
		cluster: 'christ'
	},
	JEW: {
		fr: 'Juif',
		def: "Membre du peuple d'Israël, héritier des promesses de l'Alliance ancienne. L'Église reconnaît avec respect la place irrévocable du peuple juif dans le dessein de Dieu.",
		cluster: 'ecriture'
	},
	JOSEPH__ST_: {
		fr: 'Saint Joseph',
		def: "Époux de la Vierge Marie et père légal de Jésus, choisi par Dieu pour assumer dans la sainte Famille la mission de père et de protecteur du Sauveur.",
		cluster: 'marie-saints'
	},
	JUDAISM: {
		fr: 'Judaïsme',
		def: "Religion d'Israël, fondée sur l'Alliance que Dieu a faite avec Abraham et Moïse, fondée sur la Loi et les Prophètes. Le christianisme reconnaît au judaïsme ses racines.",
		cluster: 'ecriture'
	},
	JUDGMENT__GENERAL_OR_LAST: {
		fr: 'Jugement dernier',
		def: "Jugement définitif que portera le Christ glorieux à son retour, lors de la résurrection des morts, où sera révélé le sens ultime de la création tout entière et de l'œuvre du salut.",
		cluster: 'fins-dernieres'
	},
	JUDGMENT__PARTICULAR: {
		fr: 'Jugement particulier',
		def: "Jugement que chacun reçoit à l'instant même de sa mort, où chacun reçoit dans son âme immortelle sa rétribution éternelle, en fonction de sa foi et de ses œuvres.",
		cluster: 'fins-dernieres'
	},
	JUSTICE: {
		fr: 'Justice',
		def: "Vertu cardinale qui consiste dans la volonté constante et ferme de donner à Dieu et au prochain ce qui leur est dû. En théologie, désigne aussi l'ajustement de l'homme à Dieu, conforme à sa volonté.",
		cluster: 'morale'
	},
	JUSTIFICATION: {
		fr: 'Justification',
		def: "Œuvre miséricordieuse de Dieu qui rend l'homme juste par la grâce de l'Esprit Saint, principalement par le Baptême. La justification est à la fois rémission des péchés et sanctification.",
		cluster: 'morale'
	},
	KENOSIS: {
		fr: 'Kénose',
		def: "Mot grec signifiant « anéantissement », évoquant l'abaissement du Christ qui, étant de condition divine, s'est dépouillé pour assumer la condition humaine et accepter la mort sur la croix.",
		cluster: 'christ'
	},
	KERYGMA: {
		fr: 'Kérygme',
		def: "Annonce centrale du salut accompli par le Christ, telle que la prêchaient les premiers Apôtres : la mort et la Résurrection de Jésus pour la rémission des péchés.",
		cluster: 'ecriture'
	},
	KEYS__POWER_OF_THE: {
		fr: 'Pouvoir des clefs',
		def: "Pouvoir donné par Jésus à Pierre et, en lui, aux Apôtres, de remettre les péchés et de gouverner l'Église. « Je te donnerai les clefs du Royaume des cieux » (Mt 16, 19).",
		cluster: 'eglise'
	},
	KINGDOM_OF_GOD: {
		fr: 'Royaume de Dieu',
		def: "Règne de Dieu annoncé par Jésus. Déjà présent dans sa personne et son œuvre, et dans son Église, il s'accomplira pleinement à la fin des temps.",
		cluster: 'christ'
	},
	KNOW_AND_LOVE_GOD: {
		fr: "Connaître et aimer Dieu",
		def: "Fin pour laquelle Dieu a créé l'homme : le connaître, l'aimer et le servir en cette vie pour vivre éternellement avec lui.",
		cluster: 'trinite'
	},
	KNOWLEDGE: {
		fr: 'Science',
		def: "Don de l'Esprit Saint qui éclaire l'intelligence pour percevoir la valeur des créatures dans leur rapport au Créateur.",
		cluster: 'esprit-saint'
	},
	LAITY: {
		fr: 'Laïcs',
		def: "Tous les fidèles du Christ qui, ayant été incorporés au Christ par le Baptême, ne sont pas constitués dans l'Ordre sacré, et exercent dans le monde la mission de tout le peuple chrétien.",
		cluster: 'eglise'
	},
	LAST_SUPPER: {
		fr: 'Dernière Cène',
		def: "Repas pris par Jésus avec ses Apôtres la veille de sa Passion, au cours duquel il institua l'Eucharistie comme mémorial de son sacrifice et le sacerdoce du nouveau Testament.",
		cluster: 'sacrements'
	},
	LAST_THINGS: {
		fr: 'Fins dernières',
		def: "Mort, jugement, ciel et enfer ; les réalités définitives qui attendent chaque personne et l'humanité tout entière.",
		cluster: 'fins-dernieres'
	},
	LAW__NEW: {
		fr: 'Loi nouvelle',
		def: "Loi de la grâce de l'Esprit Saint, donnée par le Christ et inscrite dans le cœur des croyants. Elle accomplit, dépasse et perfectionne la Loi ancienne.",
		cluster: 'morale'
	},
	LAW__OLD: {
		fr: 'Loi ancienne',
		def: "Loi donnée par Dieu à Moïse au Sinaï, dont le cœur est le Décalogue. Elle prépare et figure la Loi nouvelle, accomplie dans le Christ.",
		cluster: 'ecriture'
	},
	LAYING_ON_OF_HANDS: {
		fr: 'Imposition des mains',
		def: "Geste rituel utilisé dans plusieurs sacrements (Baptême, Confirmation, Ordre, Onction des malades) et dans les bénédictions, signifiant le don de l'Esprit Saint.",
		cluster: 'sacrements'
	},
	LECTIONARY: {
		fr: 'Lectionnaire',
		def: "Livre liturgique qui contient les lectures de la sainte Écriture proclamées dans la Messe et les autres célébrations, organisées selon le calendrier liturgique.",
		cluster: 'liturgie'
	},
	LITURGICAL_YEAR: {
		fr: 'Année liturgique',
		def: "Cycle annuel par lequel l'Église célèbre, à des dates fixes, le mystère du salut accompli par le Christ : Avent, Noël, Carême, Pâques, Temps ordinaire.",
		cluster: 'liturgie'
	},
	LITURGY: {
		fr: 'Liturgie',
		def: "Du grec leitourgia, « œuvre publique ». Action par laquelle l'Église annonce et célèbre le mystère du Christ ; source et sommet de toute sa vie. La liturgie est l'œuvre du Christ tout entier, Tête et corps.",
		cluster: 'liturgie'
	},
	LITURGY_OF_THE_HOURS: {
		fr: 'Liturgie des Heures',
		def: "Prière publique et commune du peuple de Dieu, sanctifiant les diverses heures de la journée par la louange à Dieu. Elle constitue, avec l'Eucharistie, la source et le sommet de toute la vie chrétienne.",
		cluster: 'priere'
	},
	LITURGY_OF_THE_WORD: {
		fr: 'Liturgie de la Parole',
		def: "Première grande partie de la Messe, dans laquelle la Parole de Dieu est proclamée et expliquée, suivie par la profession de foi et la prière universelle.",
		cluster: 'liturgie'
	},
	LITURGY_OF_THE_EUCHARIST: {
		fr: "Liturgie eucharistique",
		def: "Seconde grande partie de la Messe : présentation des dons, prière eucharistique avec la consécration, communion. Le Christ s'y rend présent dans son sacrifice et se donne en nourriture.",
		cluster: 'liturgie'
	},
	LORD: {
		fr: 'Seigneur',
		def: "Titre divin que la Bible donne à Dieu et qui, dans le Nouveau Testament, est attribué à Jésus, reconnu Seigneur en sa Résurrection. Confesser « Jésus est Seigneur » est l'expression centrale de la foi chrétienne.",
		cluster: 'christ'
	},
	LORDS_DAY: {
		fr: 'Jour du Seigneur',
		def: "Le dimanche, jour de la Résurrection du Christ, premier jour de la semaine et premier jour de la nouvelle création. Voir Dimanche.",
		cluster: 'liturgie'
	},
	LORDS_PRAYER: {
		fr: 'Notre Père',
		def: "Prière que le Seigneur Jésus a enseignée à ses disciples. Prière par excellence de l'Église, elle est l'abrégé de tout l'Évangile.",
		cluster: 'priere'
	},
	LOVE: {
		fr: 'Amour',
		def: "Mouvement de la volonté tendu vers le bien. Sa perfection est la charité, vertu théologale par laquelle nous aimons Dieu et notre prochain en lui. « Dieu est Amour » (1 Jn 4, 8).",
		cluster: 'morale'
	},
	LUST: {
		fr: 'Luxure',
		def: "Désir désordonné ou jouissance déréglée du plaisir vénérien, l'un des sept péchés capitaux. Voir Chasteté.",
		cluster: 'morale'
	},
	LYING: {
		fr: 'Mensonge',
		def: "Action de dire faussement quelque chose qu'on sait être contraire à la vérité, dans l'intention d'induire en erreur. Le mensonge est contraire au huitième commandement.",
		cluster: 'morale'
	},
	MAGI: {
		fr: 'Mages',
		def: "Sages venus d'Orient adorer l'Enfant Jésus à Bethléem, dont la visite signifie la manifestation du Christ aux nations.",
		cluster: 'christ'
	},
	MAGISTERIUM: {
		fr: 'Magistère',
		def: "Charge d'enseignement vivante de l'Église confiée par le Christ aux Apôtres et à leurs successeurs : le Pape et les évêques en communion avec lui.",
		cluster: 'eglise'
	},
	MARRIAGE: {
		fr: 'Mariage',
		def: "Alliance par laquelle un homme et une femme constituent entre eux une communauté de toute la vie, ordonnée au bien des époux ainsi qu'à la procréation et à l'éducation des enfants. Entre baptisés, le mariage est sacrement.",
		cluster: 'sacrements'
	},
	MARTYR: {
		fr: 'Martyr',
		def: "Témoin qui rend témoignage de la vérité de la foi et de la doctrine du Christ jusqu'à la mort. Le sang des martyrs est semence de chrétiens.",
		cluster: 'marie-saints'
	},
	MARY__BLESSED_VIRGIN: {
		fr: 'Bienheureuse Vierge Marie',
		def: "Mère de Jésus Christ, Mère de Dieu, conçue immaculée, vierge avant, dans et après l'enfantement, élevée corps et âme dans la gloire céleste, type et figure de l'Église.",
		cluster: 'marie-saints'
	},
	MASS: {
		fr: 'Messe',
		def: "Célébration centrale du mystère eucharistique. Elle se compose de la Liturgie de la Parole et de la Liturgie eucharistique, qui forment un seul et même acte de culte.",
		cluster: 'liturgie'
	},
	MATRIMONY: {
		fr: 'Matrimonium',
		def: "Sacrement du mariage chrétien. Voir Mariage.",
		cluster: 'sacrements'
	},
	MEDIATOR: {
		fr: 'Médiateur',
		def: "Le Christ, unique Médiateur entre Dieu et les hommes, qui par sa mort et sa Résurrection a réconcilié l'humanité avec le Père.",
		cluster: 'christ'
	},
	MEDITATION: {
		fr: 'Méditation',
		def: "Forme de prière qui met en œuvre la pensée, l'imagination, l'émotion et le désir, en vue de s'approprier dans la foi le sujet considéré, confronté avec la réalité de la vie.",
		cluster: 'priere'
	},
	MERCY: {
		fr: 'Miséricorde',
		def: "Compassion attentive du cœur de Dieu envers la misère humaine, en particulier celle du péché. La miséricorde divine est le fondement et la mesure de la miséricorde envers le prochain.",
		cluster: 'morale'
	},
	MERIT: {
		fr: 'Mérite',
		def: "Récompense qui revient à une œuvre. Pour le chrétien, le mérite des bonnes œuvres est attribuable à Dieu, premier auteur, et à l'homme, qui agit par la grâce.",
		cluster: 'morale'
	},
	MESSIAH: {
		fr: 'Messie',
		def: "Mot hébreu signifiant « oint », correspondant au grec « Christ ». Le Messie attendu est le sauveur envoyé par Dieu pour établir son Royaume. Jésus est le Messie. Voir Christ.",
		cluster: 'christ'
	},
	MILLENARIANISM: {
		fr: 'Millénarisme',
		def: "Doctrine, condamnée par l'Église, attendant un règne intra-historique du Christ d'une durée de mille ans avant la fin du monde.",
		cluster: 'fins-dernieres'
	},
	MIRACLE: {
		fr: 'Miracle',
		def: "Signe ou prodige par lequel Dieu manifeste de manière sensible sa toute-puissance et sa miséricorde. Les miracles de Jésus attestent qu'il est l'envoyé du Père et accomplit les promesses messianiques.",
		cluster: 'christ'
	},
	MISSION: {
		fr: 'Mission',
		def: "Envoi du Fils par le Père pour le salut du monde, et envoi de l'Esprit Saint par le Père et le Fils. La mission de l'Église prolonge dans le temps ces missions divines.",
		cluster: 'eglise'
	},
	MIXED_MARRIAGE: {
		fr: 'Mariage mixte',
		def: "Mariage entre un catholique et un baptisé non catholique. Une dispense de l'Ordinaire est requise pour la licéité ; une autorisation pour la disparité du culte avec un non baptisé.",
		cluster: 'sacrements'
	},
	MODESTY: {
		fr: 'Modestie',
		def: "Vertu qui règle la manière de se présenter, dans le vêtement, le langage et le comportement, en accord avec la dignité de la personne et le respect des autres.",
		cluster: 'morale'
	},
	MONOTHEISM: {
		fr: 'Monothéisme',
		def: "Croyance en un Dieu unique. La foi d'Israël et la foi chrétienne sont monothéistes ; les chrétiens confessent un seul Dieu en trois Personnes.",
		cluster: 'trinite'
	},
	MORAL_LAW: {
		fr: 'Loi morale',
		def: "Œuvre de la sagesse divine, prescrivant à l'homme les voies, les règles de conduite qui mènent à la béatitude promise et qui interdisent les voies du mal.",
		cluster: 'morale'
	},
	MORAL_LIFE: {
		fr: 'Vie morale',
		def: "Vie selon la grâce et les vertus, conduite selon la loi de Dieu inscrite dans le cœur, illuminée par la Révélation et conformée au Christ.",
		cluster: 'morale'
	},
	MORAL_THEOLOGY: {
		fr: 'Théologie morale',
		def: "Discipline théologique qui étudie les comportements humains à la lumière de la foi, pour les ordonner à la fin dernière qu'est Dieu.",
		cluster: 'morale'
	},
	MORTAL_SIN: {
		fr: 'Péché mortel',
		def: "Acte gravement contraire à la loi de Dieu, accompli avec pleine conscience et plein consentement, qui détruit la charité dans le cœur de l'homme et entraîne la perte de la grâce sanctifiante.",
		cluster: 'morale'
	},
	MOTHER_OF_GOD: {
		fr: 'Mère de Dieu',
		def: "Titre donné à la Vierge Marie, parce qu'elle est mère, selon la chair, du Verbe de Dieu fait homme. Confessé solennellement au concile d'Éphèse en 431.",
		cluster: 'marie-saints'
	},
	MURDER: {
		fr: 'Meurtre',
		def: "Suppression injuste et volontaire de la vie d'un être humain. Le meurtre est gravement contraire au cinquième commandement.",
		cluster: 'morale'
	},
	MYSTAGOGY: {
		fr: 'Mystagogie',
		def: "Catéchèse postbaptismale qui introduit dans la compréhension des mystères vécus dans les sacrements de l'initiation chrétienne, particulièrement durant le temps pascal.",
		cluster: 'sacrements'
	},
	MYSTERY: {
		fr: 'Mystère',
		def: "Réalité divine qui dépasse la connaissance humaine, et qu'on ne peut atteindre que par la Révélation. Ainsi parle-t-on du mystère de Dieu, du mystère du Christ, du mystère de l'Église, du mystère de la foi.",
		cluster: 'trinite'
	},
	MYSTICAL_BODY_OF_CHRIST: {
		fr: 'Corps mystique du Christ',
		def: "L'Église comme communauté unie au Christ comme à sa Tête, et entre les membres comme dans un corps vivant, par l'Esprit Saint. Voir Corps du Christ, Église.",
		cluster: 'eglise'
	},
	NAME_OF_GOD: {
		fr: 'Nom de Dieu',
		def: "Le Nom révélé par Dieu à Moïse au buisson ardent, « JE SUIS » (YHWH), et le Nom de Jésus, par lequel nous est donné le salut. Le respect du Nom de Dieu est exigé par le deuxième commandement.",
		cluster: 'trinite'
	},
	NATURAL_FAMILY_PLANNING: {
		fr: 'Régulation naturelle des naissances',
		def: "Méthodes de régulation des naissances qui respectent l'intégrité de l'acte conjugal et la nature procréative de la sexualité humaine.",
		cluster: 'morale'
	},
	NATURAL_LAW: {
		fr: 'Loi naturelle',
		def: "Lumière de l'intelligence mise par Dieu en l'homme, par laquelle l'homme connaît ce qu'il faut faire et ce qu'il faut éviter. Elle exprime la dignité de la personne et constitue la base de ses droits et devoirs fondamentaux.",
		cluster: 'morale'
	},
	NEW_COVENANT: {
		fr: 'Alliance nouvelle',
		def: "Alliance définitive scellée par Jésus dans son sang, accomplissement de toutes les alliances précédentes. Voir Alliance.",
		cluster: 'ecriture'
	},
	NEW_TESTAMENT: {
		fr: 'Nouveau Testament',
		def: "Ensemble des 27 livres inspirés qui constituent la seconde grande partie de la Bible, témoignant de l'accomplissement, dans le Christ, de la Révélation préparée dans l'Ancien Testament.",
		cluster: 'ecriture'
	},
	NICENE_CREED: {
		fr: 'Symbole de Nicée-Constantinople',
		def: "Profession de foi élaborée aux conciles de Nicée (325) et de Constantinople (381) ; elle est récitée dans la liturgie eucharistique.",
		cluster: 'priere'
	},
	NUNS: {
		fr: 'Religieuses',
		def: "Femmes qui se consacrent à Dieu par les vœux publics dans une vie communautaire, vouées à la prière, à la liturgie et à diverses œuvres apostoliques.",
		cluster: 'eglise'
	},
	OATH: {
		fr: 'Serment',
		def: "Acte par lequel on prend Dieu à témoin de la vérité de ce qu'on affirme ou de la sincérité de ce qu'on promet. Le faux serment et le parjure sont gravement contraires au deuxième commandement.",
		cluster: 'morale'
	},
	OBEDIENCE: {
		fr: 'Obéissance',
		def: "Vertu morale qui dispose à se soumettre à l'autorité légitime, et au premier chef à la volonté de Dieu. L'obéissance du Christ jusqu'à la mort de la croix est la racine de notre rédemption.",
		cluster: 'morale'
	},
	OFFERTORY: {
		fr: 'Offertoire',
		def: "Partie de la Messe au cours de laquelle le pain et le vin sont apportés à l'autel et présentés à Dieu pour qu'ils deviennent, par la consécration, le Corps et le Sang du Christ.",
		cluster: 'liturgie'
	},
	ORDINARY_MAGISTERIUM: {
		fr: 'Magistère ordinaire',
		def: "Enseignement habituel et permanent du Pape et des évêques en communion avec lui, distinct du magistère extraordinaire des conciles et des définitions ex cathedra.",
		cluster: 'eglise'
	},
	ORIGINAL_HOLINESS_AND_JUSTICE: {
		fr: 'Sainteté et justice originelles',
		def: "État de grâce dans lequel les premiers parents furent créés, marqué par leur amitié avec Dieu et leur ordre intérieur. Cet état fut perdu par le péché originel.",
		cluster: 'creation-homme'
	},
	ORIGINAL_SIN: {
		fr: 'Péché originel',
		def: "Privation de la sainteté et de la justice originelles, transmise à toute la descendance d'Adam. Le Baptême en efface la faute, mais la concupiscence demeure.",
		cluster: 'creation-homme'
	},
	OUR_FATHER: {
		fr: 'Notre Père',
		def: "Prière que le Seigneur Jésus a enseignée à ses disciples ; abrégé de l'Évangile, prière par excellence de l'Église.",
		cluster: 'priere'
	},
	PALL: {
		fr: 'Pale',
		def: "Petit linge carré et raidi qui sert à recouvrir le calice contenant le précieux Sang du Christ pendant la Messe.",
		cluster: 'liturgie'
	},
	PAPACY: {
		fr: 'Papauté',
		def: "Charge et office du Pape, évêque de Rome et successeur de saint Pierre, principe et fondement perpétuel et visible de l'unité de la foi et de la communion de l'Église.",
		cluster: 'eglise'
	},
	PARABLE: {
		fr: 'Parabole',
		def: "Récit imagé de Jésus visant à exposer un aspect du Royaume des cieux par comparaison avec une réalité familière de la vie quotidienne.",
		cluster: 'ecriture'
	},
	PARADISE: {
		fr: 'Paradis',
		def: "Le « jardin de délices » dans la Genèse, image de l'état de béatitude originelle ; aussi, le ciel, où les justes voient Dieu face à face.",
		cluster: 'fins-dernieres'
	},
	PARISH: {
		fr: 'Paroisse',
		def: "Communauté précise de fidèles, constituée d'une manière stable dans l'Église particulière, et dont la charge pastorale est confiée à un curé sous l'autorité de l'évêque.",
		cluster: 'eglise'
	},
	PAROUSIA: {
		fr: 'Parousie',
		def: "Mot grec signifiant « venue » ou « présence » ; désigne le retour glorieux du Christ à la fin des temps. Voir Avènement second.",
		cluster: 'fins-dernieres'
	},
	PASCHAL_LAMB: {
		fr: 'Agneau pascal',
		def: "Agneau immolé et mangé au repas pascal d'Israël, en mémoire de la délivrance d'Égypte ; figure du Christ, vrai Agneau pascal qui ôte le péché du monde.",
		cluster: 'liturgie'
	},
	PASCHAL_MYSTERY: {
		fr: 'Mystère pascal',
		def: "L'œuvre du salut accomplie par le Christ, principalement par sa Passion, sa mort, sa Résurrection et son Ascension glorieuse, présent et agissant en tout temps dans la liturgie.",
		cluster: 'christ'
	},
	PASSION_OF_CHRIST: {
		fr: 'Passion du Christ',
		def: "Souffrances et mort de Jésus, depuis l'agonie à Gethsémani jusqu'à la mort sur la croix, par lesquelles il nous a rachetés.",
		cluster: 'christ'
	},
	PASSOVER: {
		fr: 'Pâque',
		def: "Fête juive qui commémore la sortie d'Égypte. La Pâque chrétienne, fondée sur celle d'Israël, célèbre le passage du Christ de la mort à la vie nouvelle.",
		cluster: 'liturgie'
	},
	PASTOR: {
		fr: 'Pasteur',
		def: "Ministre ordonné chargé d'une portion du peuple de Dieu. Au sens premier, le Christ est l'unique bon Pasteur ; à un titre dérivé, le Pape, les évêques et les prêtres.",
		cluster: 'eglise'
	},
	PATRIARCH: {
		fr: 'Patriarche',
		def: "Père de famille dans l'Ancien Testament. Aussi : titre donné dans certaines Églises orientales aux évêques de sièges éminents.",
		cluster: 'ecriture'
	},
	PATRON_SAINT: {
		fr: 'Saint patron',
		def: "Saint donné comme protecteur particulier d'une personne, d'une paroisse, d'une nation ou d'une corporation. Le saint dont on porte le nom est généralement le saint patron du baptisé.",
		cluster: 'marie-saints'
	},
	PEACE: {
		fr: 'Paix',
		def: "Don de Dieu et fruit de la justice. Tranquillité de l'ordre, dans la personne, entre les personnes, dans la société, et, par le Christ, entre l'humanité et Dieu.",
		cluster: 'morale'
	},
	PENANCE__SACRAMENT_OF: {
		fr: 'Sacrement de Pénitence',
		def: "Sacrement par lequel le baptisé reçoit, par l'absolution donnée par le ministre de l'Église, la rémission des péchés commis après le Baptême, ainsi que la réconciliation avec l'Église.",
		cluster: 'sacrements'
	},
	PENANCE__VIRTUE: {
		fr: 'Pénitence (vertu)',
		def: "Vertu morale et don de Dieu par laquelle le pécheur reconnaît son péché et se tourne vers Dieu, en se proposant de réparer ses fautes.",
		cluster: 'morale'
	},
	PENTATEUCH: {
		fr: 'Pentateuque',
		def: "Les cinq premiers livres de la Bible : Genèse, Exode, Lévitique, Nombres et Deutéronome. Pour les juifs, c'est la Torah, la Loi.",
		cluster: 'ecriture'
	},
	PENTECOST: {
		fr: 'Pentecôte',
		def: "Cinquantième jour après Pâques. Fête du don de l'Esprit Saint à l'Église ; aussi : fête juive de l'alliance au Sinaï, sept semaines après la Pâque.",
		cluster: 'liturgie'
	},
	PEOPLE_OF_GOD: {
		fr: 'Peuple de Dieu',
		def: "Image biblique de l'Église, désignant ceux que Dieu s'est acquis par son alliance ; ils ont pour Tête le Christ, pour condition la dignité et la liberté des fils de Dieu, pour loi le commandement nouveau.",
		cluster: 'eglise'
	},
	PERFECTION: {
		fr: 'Perfection',
		def: "Plénitude de la vie chrétienne consistant principalement dans la charité, vers laquelle tous les chrétiens sont appelés. La perfection est don de l'Esprit et œuvre à laquelle le fidèle coopère.",
		cluster: 'morale'
	},
	PERJURY: {
		fr: 'Parjure',
		def: "Faire un faux serment, ou ne pas tenir un serment fait. Le parjure est une grave irrévérence envers Dieu et offense au deuxième commandement.",
		cluster: 'morale'
	},
	PETER__ST_: {
		fr: 'Saint Pierre',
		def: "Premier des Apôtres, choisi par le Christ pour être le rocher de l'Église et recevoir les clefs du Royaume. Successeur de saint Pierre, le Pape exerce dans l'Église le primat de Pierre.",
		cluster: 'marie-saints'
	},
	PETITION: {
		fr: 'Demande',
		def: "Forme de prière par laquelle on demande à Dieu pour soi-même. La demande la plus noble est celle de la grâce et du Royaume.",
		cluster: 'priere'
	},
	PIETY: {
		fr: 'Piété',
		def: "Don de l'Esprit Saint qui dispose à un attachement filial à Dieu et à un amour respectueux envers les choses saintes et envers le prochain. Aussi : vertu qui rend respect et culte à Dieu, aux parents et à la patrie.",
		cluster: 'esprit-saint'
	},
	POLE: {
		fr: 'Pôle',
		def: "Désignation occasionnelle des deux principales orientations sacramentelles : sacrifice du Christ et communion ; figure et action.",
		cluster: 'sacrements'
	},
	POLYGAMY: {
		fr: 'Polygamie',
		def: "Coexistence de plusieurs unions matrimoniales d'une même personne. Elle est contraire à l'unité du mariage telle que voulue par Dieu et révélée par le Christ.",
		cluster: 'morale'
	},
	POOR__PREFERENTIAL_OPTION: {
		fr: 'Option préférentielle pour les pauvres',
		def: "Engagement de l'Église, à la suite du Christ, en faveur des pauvres et des opprimés, et appel à tous les fidèles à imiter le Christ dans son amour pour eux.",
		cluster: 'morale'
	},
	POPE: {
		fr: 'Pape',
		def: "Évêque de Rome, successeur de saint Pierre, vicaire du Christ et pasteur de l'Église universelle, principe et fondement perpétuel et visible de l'unité.",
		cluster: 'eglise'
	},
	POVERTY__EVANGELICAL: {
		fr: 'Pauvreté évangélique',
		def: "Conseil évangélique professé par les religieux ; détachement intérieur des biens matériels en vue de mieux suivre le Christ et de servir le prochain.",
		cluster: 'eglise'
	},
	PRAYER: {
		fr: 'Prière',
		def: "Élévation de l'âme vers Dieu, demande adressée à Dieu pour les biens qu'il convient d'attendre de lui. À la fois don gratuit de Dieu et réponse de l'homme, elle prend cinq formes principales : bénédiction et adoration, demande, intercession, action de grâces, louange.",
		cluster: 'priere'
	},
	PREDESTINATION: {
		fr: 'Prédestination',
		def: "Dessein éternel de Dieu d'appeler à la sainteté et à la béatitude. Elle ne contredit pas la liberté humaine ni n'implique une réprobation antécédente.",
		cluster: 'trinite'
	},
	PRESBYTER: {
		fr: 'Prêtre',
		def: "Ministre ordonné qui, comme coopérateur de l'évêque, a reçu le second degré du sacrement de l'Ordre. Il est consacré pour annoncer l'Évangile, célébrer l'Eucharistie et conduire la communauté.",
		cluster: 'eglise'
	},
	PRESENCE_OF_CHRIST: {
		fr: 'Présence du Christ',
		def: "Présence du Christ dans son Église, particulièrement présente dans la liturgie, éminemment dans l'Eucharistie sous les espèces du pain et du vin.",
		cluster: 'sacrements'
	},
	PRIDE: {
		fr: 'Orgueil',
		def: "Estime désordonnée de soi en tant qu'opposée à la soumission due à Dieu, l'un des sept péchés capitaux ; racine de tout péché.",
		cluster: 'morale'
	},
	PRIESTHOOD__COMMON: {
		fr: 'Sacerdoce commun',
		def: "Sacerdoce de tous les fidèles, conféré par le Baptême et la Confirmation, par lequel les baptisés sont consacrés pour offrir des sacrifices spirituels et témoigner de la foi.",
		cluster: 'sacrements'
	},
	PRIESTHOOD__MINISTERIAL: {
		fr: 'Sacerdoce ministériel',
		def: "Sacerdoce conféré par le sacrement de l'Ordre, distinct du sacerdoce commun par essence, et au service de celui-ci. Il participe au sacerdoce du Christ, unique Médiateur.",
		cluster: 'sacrements'
	},
	PROCESSION_OF_THE_HOLY_SPIRIT: {
		fr: "Procession de l'Esprit Saint",
		def: "Mode propre par lequel l'Esprit Saint est éternellement reçu du Père et du Fils dans l'unique substance divine.",
		cluster: 'trinite'
	},
	PROFESSION_OF_FAITH: {
		fr: 'Profession de foi',
		def: "Confession publique et solennelle de la foi de l'Église, faite par le baptisé dans le rite du Baptême et renouvelée notamment dans la liturgie.",
		cluster: 'priere'
	},
	PROPHET: {
		fr: 'Prophète',
		def: "Homme appelé et envoyé par Dieu pour parler en son nom. Les prophètes ont préparé la venue du Christ. Tous les baptisés participent à la fonction prophétique du Christ.",
		cluster: 'ecriture'
	},
	PROTESTANT: {
		fr: 'Protestant',
		def: "Désignation des chrétiens issus des communautés ecclésiales nées de la Réforme du XVIe siècle, séparées de la pleine communion de l'Église catholique.",
		cluster: 'eglise'
	},
	'PROTO-EVANGELIUM': {
		fr: 'Protoévangile',
		def: "Premier annoncement du Sauveur dans la Genèse (Gn 3, 15), où Dieu promet la victoire de la descendance de la femme sur le serpent.",
		cluster: 'ecriture'
	},
	PROVIDENCE: {
		fr: 'Providence',
		def: "Disposition par laquelle Dieu conduit toutes ses créatures vers la perfection finale qu'il leur a assignée. La Providence ne supprime pas la liberté humaine.",
		cluster: 'trinite'
	},
	PRUDENCE: {
		fr: 'Prudence',
		def: "Vertu cardinale qui dispose la raison pratique à discerner en toute circonstance le véritable bien et à choisir les moyens justes pour l'accomplir.",
		cluster: 'morale'
	},
	PSALM: {
		fr: 'Psaume',
		def: "Prière inspirée de l'Ancien Testament, à la fois personnelle et collective, ayant pour auteur principal David. Les psaumes sont la prière de l'Église qui les hérite d'Israël.",
		cluster: 'priere'
	},
	PSALTER: {
		fr: 'Psautier',
		def: "Le livre des Psaumes, recueil de cent cinquante prières inspirées qui forment le cœur de la prière liturgique.",
		cluster: 'ecriture'
	},
	PUNISHMENT__ETERNAL: {
		fr: 'Peine éternelle',
		def: "Peine principale de l'enfer, séparation éternelle d'avec Dieu encourue par ceux qui meurent en état de péché mortel.",
		cluster: 'fins-dernieres'
	},
	PUNISHMENT__TEMPORAL: {
		fr: 'Peine temporelle',
		def: "Peine due au péché qui subsiste après que la culpabilité a été pardonnée, et qui demande purification soit en cette vie, soit après la mort dans le purgatoire.",
		cluster: 'fins-dernieres'
	},
	PURGATORY: {
		fr: 'Purgatoire',
		def: "État de purification finale, après la mort, de ceux qui meurent dans la grâce de Dieu mais ont besoin d'être purifiés pour entrer dans la joie céleste.",
		cluster: 'fins-dernieres'
	},
	RACISM: {
		fr: 'Racisme',
		def: "Doctrine et pratique qui jugent les personnes selon leur appartenance raciale, contraires à la dignité de toute personne humaine créée à l'image de Dieu.",
		cluster: 'morale'
	},
	REAL_PRESENCE: {
		fr: 'Présence réelle',
		def: "Présence vraie, réelle et substantielle du Corps et du Sang du Christ, avec son âme et sa divinité, sous les apparences du pain et du vin consacrés. Voir Eucharistie, Transsubstantiation.",
		cluster: 'sacrements'
	},
	RECONCILIATION__SACRAMENT_OF: {
		fr: 'Sacrement de Réconciliation',
		def: "Autre nom du sacrement de Pénitence, soulignant qu'il rétablit la communion avec Dieu et avec l'Église rompue par le péché. Voir Pénitence (sacrement).",
		cluster: 'sacrements'
	},
	REDEEMER_REDEMPTION: {
		fr: 'Rédempteur / Rédemption',
		def: "Le Christ est notre Rédempteur ; sa mort sur la croix nous a rachetés du péché et de la mort, nous offrant en lui la vie éternelle.",
		cluster: 'christ'
	},
	RELIGION: {
		fr: 'Religion',
		def: "Vertu morale qui dispose à rendre à Dieu le culte qui lui est dû, première vertu liée au premier commandement.",
		cluster: 'morale'
	},
	RELIGIOUS_LIFE: {
		fr: 'Vie religieuse',
		def: "Forme de vie consacrée caractérisée par la profession publique des conseils évangéliques de pauvreté, chasteté et obéissance, en communauté approuvée par l'Église.",
		cluster: 'eglise'
	},
	REMISSION_OF_SINS: {
		fr: 'Rémission des péchés',
		def: "Pardon des péchés, obtenu principalement par le Baptême et le sacrement de Pénitence, en vertu de la grâce acquise par le Christ.",
		cluster: 'sacrements'
	},
	REPARATION: {
		fr: 'Réparation',
		def: "Acte par lequel le pénitent répare le dommage causé par son péché, en vertu d'un acte de justice et d'amour envers Dieu et envers le prochain.",
		cluster: 'morale'
	},
	REPENTANCE: {
		fr: 'Repentir',
		def: "Acte volontaire par lequel le pécheur se détourne du péché et retourne à Dieu. Le repentir est nécessaire au pardon et au salut.",
		cluster: 'morale'
	},
	RESTITUTION: {
		fr: 'Restitution',
		def: "Acte par lequel celui qui a injustement causé un dommage à autrui rétablit ce dernier dans ses biens, comme exigence de justice.",
		cluster: 'morale'
	},
	RESURRECTION_OF_CHRIST: {
		fr: 'Résurrection du Christ',
		def: "Évènement central de la foi chrétienne : Jésus, après sa mort sur la croix, est ressuscité d'entre les morts le troisième jour. Sa Résurrection est victoire sur la mort et fondement de notre espérance.",
		cluster: 'christ'
	},
	RESURRECTION_OF_THE_DEAD: {
		fr: 'Résurrection des morts',
		def: "Au dernier jour, tous les morts ressusciteront, les justes pour la vie éternelle, les autres pour la condamnation. Achèvement de l'œuvre de la Rédemption.",
		cluster: 'fins-dernieres'
	},
	REVELATION: {
		fr: 'Révélation',
		def: "Don que Dieu fait de lui-même et de son dessein bienveillant, par ses paroles et par ses actes ; il atteint son sommet en Jésus Christ, qui en est l'Envoyé et la plénitude. L'Église conserve et transmet cette Révélation dans l'Écriture sainte et dans la Tradition.",
		cluster: 'ecriture'
	},
	RITES: {
		fr: 'Rites',
		def: "Formes liturgiques propres aux différentes traditions de l'Église. L'Église catholique compte plusieurs rites : romain, byzantin, syriaque, copte, etc., tous expression de la foi unique.",
		cluster: 'liturgie'
	},
	ROSARY: {
		fr: 'Rosaire',
		def: "Prière à la fois vocale et méditative, centrée sur la contemplation des mystères de la vie du Christ avec la Vierge Marie. Compose des « Notre Père » et des « Je vous salue Marie » groupés en dizaines.",
		cluster: 'priere'
	},
	SABBATH: {
		fr: 'Sabbat',
		def: "Septième jour de la semaine, jour de repos consacré à Dieu dans l'Ancienne Alliance. Le dimanche, jour de la Résurrection, devient pour les chrétiens le « jour du Seigneur ».",
		cluster: 'liturgie'
	},
	SACRAMENT: {
		fr: 'Sacrement',
		def: "Signe efficace de la grâce, institué par le Christ et confié à l'Église, par lequel la vie divine nous est dispensée. Au nombre de sept : Baptême, Confirmation, Eucharistie, Pénitence, Onction des malades, Ordre, Mariage.",
		cluster: 'sacrements'
	},
	SACRAMENTALS: {
		fr: 'Sacramentaux',
		def: "Signes sacrés institués par l'Église pour préparer aux effets des sacrements et sanctifier diverses circonstances de la vie : bénédictions, exorcismes, consécrations.",
		cluster: 'liturgie'
	},
	SACRED_HEART: {
		fr: 'Sacré-Cœur',
		def: "Cœur de Jésus, symbole de son amour pour le Père et pour les hommes, objet d'une dévotion particulière par laquelle l'Église contemple les abîmes de la charité du Christ.",
		cluster: 'christ'
	},
	SACRIFICE: {
		fr: 'Sacrifice',
		def: "Acte par lequel l'homme honore Dieu en lui offrant un don, en reconnaissance de sa souveraineté. Le sacrifice du Christ sur la croix est le sacrifice unique et parfait, rendu présent dans l'Eucharistie.",
		cluster: 'sacrements'
	},
	SACRILEGE: {
		fr: 'Sacrilège',
		def: "Profanation ou traitement irrespectueux d'une réalité sacrée (personnes, lieux, objets ou sacrements consacrés à Dieu). Le sacrilège est péché grave, surtout contre l'Eucharistie.",
		cluster: 'morale'
	},
	SAINT: {
		fr: 'Saint',
		def: "Personne qui, par la grâce de Dieu, vit et meurt en amitié avec Dieu et qui jouit de la béatitude éternelle au ciel. Tous les baptisés sont appelés à la sainteté. Voir Saints.",
		cluster: 'marie-saints'
	},
	SALVATION: {
		fr: 'Salut',
		def: "Délivrance du péché et de la mort éternelle, accordée gratuitement par Dieu en Jésus Christ. Le salut s'accomplit dans la vie éternelle ; il est l'œuvre de Dieu, à laquelle l'homme coopère par la foi.",
		cluster: 'fins-dernieres'
	},
	SANCTIFYING_GRACE: {
		fr: 'Grâce sanctifiante',
		def: "Don habituel et permanent par lequel la justice de Dieu nous est attribuée, et par lequel nous sommes faits participants de la nature divine.",
		cluster: 'morale'
	},
	SANCTUARY: {
		fr: 'Sanctuaire',
		def: "Partie de l'église où se trouve l'autel et où le ministre célèbre. Aussi : lieu de pèlerinage où se rassemble la prière de l'Église.",
		cluster: 'liturgie'
	},
	SATAN: {
		fr: 'Satan',
		def: "Nom du chef des anges déchus, ennemi de Dieu et tentateur de l'humanité. Le Christ par sa mort et sa Résurrection a vaincu Satan. Voir Diable, Démon.",
		cluster: 'creation-homme'
	},
	SATISFACTION__FOR_SIN_: {
		fr: 'Satisfaction pour le péché',
		def: "Réparation des conséquences du péché et de l'offense faite à Dieu. Le Christ a satisfait pour nos péchés ; le pénitent doit lui-même participer à cette réparation.",
		cluster: 'sacrements'
	},
	SAVIOR: {
		fr: 'Sauveur',
		def: "Le Christ Jésus est le Sauveur, celui par qui Dieu nous délivre du péché et nous donne la vie. Le nom même de Jésus signifie « Dieu sauve ».",
		cluster: 'christ'
	},
	SCANDAL: {
		fr: 'Scandale',
		def: "Attitude ou comportement qui porte autrui à mal faire. Le scandale est péché grave si, par action ou par omission, il entraîne délibérément autrui à pécher.",
		cluster: 'morale'
	},
	SCHISM: {
		fr: 'Schisme',
		def: "Refus de la soumission au Pape ou de la communion avec les membres de l'Église qui lui sont soumis.",
		cluster: 'eglise'
	},
	SCRIPTURE__SACRED: {
		fr: 'Écriture sainte',
		def: "Parole de Dieu mise par écrit sous l'inspiration de l'Esprit Saint. Avec la Tradition, l'Écriture est la règle suprême de la foi de l'Église.",
		cluster: 'ecriture'
	},
	SEAL_OF_CONFESSION: {
		fr: 'Secret de confession',
		def: "Obligation absolue, pour le confesseur, de ne jamais trahir, par parole ou de toute autre manière et pour quelque raison que ce soit, ce que le pénitent lui a confié dans le sacrement.",
		cluster: 'sacrements'
	},
	SECOND_COMING_OF_CHRIST: {
		fr: 'Avènement second',
		def: "Retour glorieux du Christ à la fin des temps pour juger les vivants et les morts et achever son Royaume. Voir Parousie.",
		cluster: 'fins-dernieres'
	},
	SECULAR_INSTITUTE: {
		fr: 'Institut séculier',
		def: "Forme de vie consacrée dont les membres, dans l'état séculier, vivent les conseils évangéliques et travaillent à la sanctification du monde de l'intérieur. Voir Institut séculier.",
		cluster: 'eglise'
	},
	SENSUS_FIDEI: {
		fr: 'Sensus fidei',
		def: "Sens surnaturel de la foi du peuple de Dieu tout entier, qui ne peut errer dans la foi quand, des évêques aux derniers fidèles laïcs, il manifeste l'universel consentement en matière de foi et de mœurs.",
		cluster: 'eglise'
	},
	SEPTUAGINT: {
		fr: 'Septante',
		def: "Traduction grecque de l'Ancien Testament, faite à Alexandrie au IIIe siècle avant Jésus-Christ par soixante-dix lettrés juifs ; elle inclut les livres deutérocanoniques et est utilisée par les Apôtres.",
		cluster: 'ecriture'
	},
	SIGN_OF_THE_CROSS: {
		fr: 'Signe de la Croix',
		def: "Geste par lequel le chrétien trace une croix sur lui-même au Nom du Père, du Fils et de l'Esprit Saint. C'est l'expression la plus simple de la foi trinitaire et baptismale.",
		cluster: 'priere'
	},
	SIMONY: {
		fr: 'Simonie',
		def: "Achat ou vente de réalités spirituelles. La simonie tient son nom de Simon le Magicien (Ac 8, 9-24) et est un péché grave contre la vertu de religion.",
		cluster: 'morale'
	},
	SIN: {
		fr: 'Péché',
		def: "Parole, acte ou désir contraire à la loi éternelle de Dieu. Le péché est offense à Dieu et désordre intérieur de la créature. Voir Péché mortel, Péché véniel.",
		cluster: 'morale'
	},
	SLANDER: {
		fr: 'Diffamation',
		def: "Acte de noircir injustement la réputation d'autrui par des paroles ; comprend la médisance et la calomnie.",
		cluster: 'morale'
	},
	SLOTH: {
		fr: 'Paresse',
		def: "Négligence dans le service de Dieu et dans l'accomplissement des devoirs spirituels. La paresse, aussi appelée acédie, est l'un des sept péchés capitaux.",
		cluster: 'morale'
	},
	SOCIAL_JUSTICE: {
		fr: 'Justice sociale',
		def: "Justice qui procure à la société les conditions permettant aux personnes et aux groupes d'obtenir ce qui leur est dû selon leur nature et leur vocation.",
		cluster: 'morale'
	},
	SOCIAL_SIN: {
		fr: 'Péché social',
		def: "Réalité du péché qui dépasse la somme des fautes individuelles, s'incarnant dans des structures injustes ; les chrétiens sont appelés à les transformer.",
		cluster: 'morale'
	},
	SOCIAL_TEACHING: {
		fr: "Doctrine sociale de l'Église",
		def: "Ensemble de l'enseignement de l'Église sur la dignité de la personne, le bien commun, la subsidiarité et la solidarité, à appliquer aux questions économiques, politiques et sociales.",
		cluster: 'morale'
	},
	SON_OF_GOD: {
		fr: 'Fils de Dieu',
		def: "Titre propre de Jésus exprimant sa filiation divine éternelle et unique avec le Père. Confessé solennellement dans le Symbole de la foi.",
		cluster: 'christ'
	},
	SON_OF_MAN: {
		fr: "Fils de l'homme",
		def: "Titre que Jésus se donne dans l'Évangile, faisant écho à la vision de Daniel ; il désigne sa mission messianique et eschatologique.",
		cluster: 'christ'
	},
	SOUL: {
		fr: 'Âme',
		def: "Principe spirituel de l'homme, son élément le plus intime et le plus profond, par lequel il est à l'image de Dieu. L'âme subsiste après la mort, dans l'attente d'être réunie au corps à la résurrection.",
		cluster: 'creation-homme'
	},
	SPIRIT: {
		fr: 'Esprit',
		def: "Réalité immatérielle. Désigne en théologie soit l'âme spirituelle de l'homme, soit l'Esprit Saint, troisième Personne de la Trinité.",
		cluster: 'creation-homme'
	},
	STEALING_THEFT: {
		fr: 'Vol',
		def: "Action de prendre injustement les biens d'autrui contre la volonté raisonnable du propriétaire. Le vol est contraire au septième commandement.",
		cluster: 'morale'
	},
	SUNDAY: {
		fr: 'Dimanche',
		def: "Jour du Seigneur, premier jour de la semaine, qui commémore la Résurrection du Christ. Les chrétiens y participent à la Messe et s'abstiennent des travaux qui empêchent le culte ou la joie qui convient au jour du Seigneur.",
		cluster: 'liturgie'
	},
	SUPERNATURAL: {
		fr: 'Surnaturel',
		def: "Ce qui dépasse la nature et procède de la libre intervention de Dieu, élevant les créatures à une fin et à des moyens qui ne sont pas dus à leur nature.",
		cluster: 'trinite'
	},
	SUPERSTITION: {
		fr: 'Superstition',
		def: "Déviation du sentiment religieux et de la pratique qu'il impose ; elle peut affecter le culte que nous rendons au vrai Dieu, sous des pratiques contraires à l'honneur dû à Dieu.",
		cluster: 'morale'
	},
	SYNOD: {
		fr: 'Synode',
		def: "Assemblée d'évêques convoquée par l'autorité ecclésiastique pour traiter de questions concernant la foi, la liturgie, la discipline ou les œuvres pastorales.",
		cluster: 'eglise'
	},
	TABERNACLE: {
		fr: 'Tabernacle',
		def: "Réceptacle où sont conservées les espèces consacrées de l'Eucharistie. Aussi : tente sacrée d'Israël, dans laquelle se trouvait l'arche d'alliance.",
		cluster: 'liturgie'
	},
	TEACHING_OFFICE: {
		fr: "Office d'enseignement",
		def: "Charge confiée par le Christ aux Apôtres et à leurs successeurs, le Pape et les évêques en communion avec lui, d'enseigner authentiquement la foi chrétienne. Voir Magistère.",
		cluster: 'eglise'
	},
	TEMPERANCE: {
		fr: 'Tempérance',
		def: "Vertu cardinale qui modère l'attrait des plaisirs et procure l'équilibre dans l'usage des biens créés.",
		cluster: 'morale'
	},
	TEMPLE: {
		fr: 'Temple',
		def: "Sanctuaire de Jérusalem dans l'Ancienne Alliance, lieu unique du culte au Dieu d'Israël. Le Christ est le vrai Temple, et l'Église, par l'Esprit, est le Temple de Dieu.",
		cluster: 'ecriture'
	},
	TEMPTATION: {
		fr: 'Tentation',
		def: "Sollicitation au péché. Dieu n'éprouve pas par le mal, mais permet l'épreuve. Le Christ a vaincu les tentations au désert et nous demande dans le Notre Père de ne pas y consentir.",
		cluster: 'morale'
	},
	TESTAMENT: {
		fr: 'Testament',
		def: "Mot signifiant « alliance » ; les deux parties de la Bible : Ancien Testament et Nouveau Testament, comprenant les Écritures de l'Alliance ancienne et de l'Alliance nouvelle.",
		cluster: 'ecriture'
	},
	THEOLOGY: {
		fr: 'Théologie',
		def: "Étude scientifique de la foi, qui cherche à comprendre la Révélation de manière rigoureuse, à la lumière de la raison éclairée par la foi.",
		cluster: 'eglise'
	},
	THEOPHANY: {
		fr: 'Théophanie',
		def: "Manifestation visible de Dieu, telle que celles données à Abraham, Moïse, Élie ; manifestation accomplie par excellence dans l'Incarnation et le Baptême du Christ.",
		cluster: 'trinite'
	},
	TIME: {
		fr: 'Temps',
		def: "Réalité créée dans laquelle s'inscrit l'histoire. Le Christ, par son Incarnation, est entré dans le temps pour le sanctifier et y inaugurer le Royaume.",
		cluster: 'creation-homme'
	},
	TRADITION: {
		fr: 'Tradition',
		def: "Transmission vivante du message de l'Évangile dans l'Église par la prédication, le témoignage, les institutions, le culte et les écrits inspirés. Avec l'Écriture, la Tradition fait partie du dépôt de la foi.",
		cluster: 'ecriture'
	},
	TRANSFIGURATION: {
		fr: 'Transfiguration',
		def: "Manifestation de la gloire divine de Jésus à trois de ses Apôtres (Pierre, Jacques et Jean) sur le mont Thabor, anticipant sa Résurrection et révélant son identité.",
		cluster: 'christ'
	},
	TRANSUBSTANTIATION: {
		fr: 'Transsubstantiation',
		def: "Conversion, par la puissance des paroles du Christ et de l'Esprit Saint, de la substance du pain et du vin en la substance du Corps et du Sang du Christ, les apparences (espèces) demeurant.",
		cluster: 'sacrements'
	},
	TRIDUUM: {
		fr: 'Triduum pascal',
		def: "Trois jours saints qui célèbrent le mystère pascal du Christ : Cène du Seigneur (Jeudi saint), Passion (Vendredi saint), Veillée pascale et Pâques.",
		cluster: 'liturgie'
	},
	TRINITY: {
		fr: 'Trinité',
		def: "Mystère central de la foi chrétienne : un seul Dieu en trois Personnes, Père, Fils et Esprit Saint, distinctes mais consubstantielles. La Trinité est une.",
		cluster: 'trinite'
	},
	TYPOLOGY: {
		fr: 'Typologie',
		def: "Lecture chrétienne de l'Écriture qui découvre dans les événements et les personnes de l'Ancien Testament la préfiguration de ce que Dieu allait accomplir dans le Christ.",
		cluster: 'ecriture'
	},
	UNITY__CHRISTIAN: {
		fr: 'Unité des chrétiens',
		def: "Unité voulue par le Christ pour son Église, prière et engagement de l'œcuménisme en vue de rétablir, par la grâce, l'unité visible des chrétiens encore divisés.",
		cluster: 'eglise'
	},
	VENERATION__OF_SAINTS_: {
		fr: 'Vénération des saints',
		def: "Honneur que les fidèles rendent aux saints, à la Vierge Marie en particulier, qui ne se confond pas avec l'adoration due à Dieu seul.",
		cluster: 'marie-saints'
	},
	VENIAL_SIN: {
		fr: 'Péché véniel',
		def: "Faute morale qui ne détruit pas l'amitié avec Dieu, mais qui blesse la charité ; à la différence du péché mortel, elle ne fait pas perdre la grâce sanctifiante.",
		cluster: 'morale'
	},
	VIATICUM: {
		fr: 'Viatique',
		def: "Eucharistie reçue par le mourant comme provision pour le passage de cette vie au Père.",
		cluster: 'sacrements'
	},
	VICAR_OF_CHRIST: {
		fr: 'Vicaire du Christ',
		def: "Titre du Pape, qui exerce dans l'Église, comme représentant visible du Christ, le ministère de Pierre.",
		cluster: 'eglise'
	},
	VICE: {
		fr: 'Vice',
		def: "Disposition habituelle au mal, contraire à la vertu, formée par des actes mauvais répétés. Voir Péché capital.",
		cluster: 'morale'
	},
	VIRGIN_BIRTH: {
		fr: 'Conception virginale',
		def: "Conception de Jésus dans le sein de la Vierge Marie par la seule puissance de l'Esprit Saint, sans concours d'homme, signe de l'origine divine du Sauveur.",
		cluster: 'marie-saints'
	},
	VIRGIN_MARY: {
		fr: 'Vierge Marie',
		def: "Mère de Jésus Christ, Mère de Dieu, vierge avant, dans et après l'enfantement, première disciple de son Fils. Voir Bienheureuse Vierge Marie.",
		cluster: 'marie-saints'
	},
	VIRTUE: {
		fr: 'Vertu',
		def: "Disposition habituelle et ferme à faire le bien. Les vertus humaines s'acquièrent par la répétition d'actes bons ; les vertus théologales (foi, espérance, charité) sont infusées par Dieu.",
		cluster: 'morale'
	},
	VIRTUES__THEOLOGICAL: {
		fr: 'Vertus théologales',
		def: "Foi, espérance et charité : vertus infusées par Dieu, qui ont pour objet Dieu lui-même et fondent l'agir moral du chrétien.",
		cluster: 'morale'
	},
	VISION__BEATIFIC: {
		fr: 'Vision béatifique',
		def: "Connaissance et jouissance directes de Dieu dont jouissent les bienheureux au ciel. Voir Béatitude.",
		cluster: 'fins-dernieres'
	},
	VOCATION: {
		fr: 'Vocation',
		def: "Appel que Dieu adresse à chaque être humain à la vie éternelle dans la communion avec lui ; appel particulier à un état de vie ou à un service dans l'Église et le monde.",
		cluster: 'morale'
	},
	VOW: {
		fr: 'Vœu',
		def: "Promesse délibérée et libre faite à Dieu d'un bien possible et meilleur, qui doit être tenue par vertu de religion.",
		cluster: 'morale'
	},
	WAY_OF_THE_CROSS: {
		fr: 'Chemin de Croix',
		def: "Pieux exercice de méditation des étapes de la Passion du Christ, depuis sa condamnation jusqu'à sa mise au tombeau, généralement représenté par quatorze stations.",
		cluster: 'priere'
	},
	WISDOM: {
		fr: 'Sagesse',
		def: "Don de l'Esprit Saint qui dispose la personne à juger toutes choses selon la perspective de Dieu et à goûter Dieu lui-même.",
		cluster: 'esprit-saint'
	},
	WORD_OF_GOD: {
		fr: 'Parole de Dieu',
		def: "Le Fils, Parole éternelle du Père, fait chair en Jésus Christ. La Parole de Dieu nous est aussi transmise par l'Écriture sainte, lue dans la Tradition vivante de l'Église.",
		cluster: 'ecriture'
	},
	WORKS_OF_MERCY: {
		fr: 'Œuvres de miséricorde',
		def: "Actions de charité par lesquelles nous secourons notre prochain dans ses besoins corporels (donner à manger, vêtir, etc.) et spirituels (instruire, conseiller, consoler, etc.).",
		cluster: 'morale'
	},
	WORLD: {
		fr: 'Monde',
		def: "Ensemble de la création visible et invisible. La Bible donne au mot deux acceptions : tantôt le monde déchu et opposé à Dieu, tantôt le monde aimé de Dieu et appelé au salut par le Christ.",
		cluster: 'creation-homme'
	},
	WORSHIP: {
		fr: 'Culte',
		def: "Hommage solennel rendu à Dieu, expression première de la vertu de religion. Le culte chrétien s'exprime de manière éminente dans la liturgie.",
		cluster: 'liturgie'
	},
	YAHWEH: {
		fr: 'YHWH',
		def: "Le Tétragramme, nom propre du Dieu d'Israël révélé à Moïse au buisson ardent (Ex 3, 14), traduit habituellement par « le Seigneur ».",
		cluster: 'trinite'
	}
};
