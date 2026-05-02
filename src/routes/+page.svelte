<svelte:head>
	<title>Le Catéchisme — Catéchisme de l'Église catholique en français</title>
	<meta
		name="description"
		content="Édition française définitive du Catéchisme de l'Église catholique. Lecture, recherche et navigation par paragraphe, référence biblique et thème."
	/>
</svelte:head>

<main class="mx-auto max-w-4xl px-6 py-16 lg:py-24">
	<header class="text-center mb-16">
		<p class="font-ui text-sm uppercase tracking-[0.2em] text-muted mb-4">Édition française définitive</p>
		<h1 class="font-ui text-5xl lg:text-6xl font-bold leading-tight">
			Catéchisme<br />
			de l'Église<br />
			Catholique
		</h1>
		<p class="mt-8 text-lg text-muted max-w-2xl mx-auto">
			Lecture, navigation et recherche dans les 2&nbsp;865 paragraphes du Catéchisme. Édition libre, hors ligne, sans publicité.
		</p>
	</header>

	<div class="grid sm:grid-cols-2 gap-4 mb-16">
		<a
			href="/ccc"
			class="block p-6 border border-border rounded-lg hover:border-accent transition-colors"
		>
			<h2 class="font-ui text-lg font-semibold">Commencer la lecture</h2>
			<p class="text-sm text-muted mt-1">Parcourir les quatre parties du Catéchisme.</p>
		</a>
		<a
			href="/ccc/sommaire"
			class="block p-6 border border-border rounded-lg hover:border-accent transition-colors"
		>
			<h2 class="font-ui text-lg font-semibold">Sommaire complet</h2>
			<p class="text-sm text-muted mt-1">Plan détaillé : parties → chapitres → articles.</p>
		</a>
		<a
			href="/ccc/prologue"
			class="block p-6 border border-border rounded-lg hover:border-accent transition-colors"
		>
			<h2 class="font-ui text-lg font-semibold">Prologue</h2>
			<p class="text-sm text-muted mt-1">L'introduction au Catéchisme (§§&nbsp;1–25).</p>
		</a>
		<a
			href="/ccc/27"
			class="block p-6 border border-border rounded-lg hover:border-accent transition-colors"
		>
			<h2 class="font-ui text-lg font-semibold">Aller à un paragraphe</h2>
			<p class="text-sm text-muted mt-1">
				Tapez un numéro dans la barre de recherche (par ex. <span class="font-mono">27</span>) ou
				partagez un lien comme <span class="font-mono">/ccc/27</span>.
			</p>
		</a>
	</div>

	<section class="border-t border-border pt-10">
		<h2 class="font-ui text-2xl font-bold mb-6">Quatre parties</h2>
		<ol class="space-y-3 font-ui">
			<li>
				<a href="/ccc/la-profession-de-la-foi" class="block hover:text-accent">
					<span class="text-muted text-sm">I.</span>
					<span class="ml-2 font-semibold">La profession de la foi</span>
				</a>
			</li>
			<li>
				<a href="/ccc/la-celebration-du-mystere-chretien" class="block hover:text-accent">
					<span class="text-muted text-sm">II.</span>
					<span class="ml-2 font-semibold">La célébration du mystère chrétien</span>
				</a>
			</li>
			<li>
				<a href="/ccc/la-vie-dans-le-christ" class="block hover:text-accent">
					<span class="text-muted text-sm">III.</span>
					<span class="ml-2 font-semibold">La vie dans le Christ</span>
				</a>
			</li>
			<li>
				<a href="/ccc/la-priere-chretienne" class="block hover:text-accent">
					<span class="text-muted text-sm">IV.</span>
					<span class="ml-2 font-semibold">La prière chrétienne</span>
				</a>
			</li>
		</ol>
	</section>
</main>
