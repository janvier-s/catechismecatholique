<script module lang="ts">
	export type CollectionItem = {
		slug: string;
		href: string | null;
		image?: string;
		eyebrow: string;
		title: string;
		subtitle?: string;
		blurb?: string;
		focus?: 'top' | 'center' | 'bottom';
	};

	export type CollectionGroup = {
		title?: string;
		kicker?: string;
		count?: string;
		columns?: number;
		items: CollectionItem[];
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	const PLACEHOLDER = '/img/bibliotheque/placeholder.png';

	let {
		kicker,
		title,
		lede,
		groups = [],
		footer
	}: {
		kicker: string;
		title: string;
		lede: Snippet;
		groups?: CollectionGroup[];
		footer?: Snippet;
	} = $props();
</script>

<main class="collection">
	<header class="collection-hero">
		<span class="hero-ornament" aria-hidden="true">
			<span class="rule"></span>
			<span class="fleuron">✠</span>
			<span class="rule"></span>
		</span>
		<p class="hero-kicker">{kicker}</p>
		<h1 class="hero-title">{title}</h1>
		<div class="hero-lede">{@render lede()}</div>
	</header>

	{#each groups as group, gi (gi)}
		<section class="group" style="--group-index: {gi}">
			{#if group.title}
				<header class="group-head">
					<div class="group-head-text">
						<h2 class="group-title">{group.title}</h2>
						{#if group.kicker}
							<p class="group-kicker">{group.kicker}</p>
						{/if}
					</div>
					{#if group.count}
						<span class="group-count">{group.count}</span>
					{/if}
					<span class="group-rule" aria-hidden="true"></span>
				</header>
			{/if}

			<ul class="grid" style={group.columns ? `--grid-cols: ${group.columns}` : ''}>
				{#each group.items as item, ii (item.slug)}
					<li class="card-wrap" style="--card-index: {ii}; --shelf-index: {gi}">
						{#if item.href}
							<a class="card" href={item.href}>
								<figure class="cover">
									<img
										src={item.image ?? PLACEHOLDER}
										alt="{item.title}, couverture"
										loading="lazy"
										style="object-position: 50% {item.focus === 'top'
											? '0%'
											: item.focus === 'bottom'
												? '100%'
												: '50%'}"
										onerror={(e) => {
											const img = e.currentTarget as HTMLImageElement;
											if (!img.dataset.fb) {
												img.dataset.fb = '1';
												img.src = PLACEHOLDER;
											}
										}}
									/>
									<span class="cover-shine" aria-hidden="true"></span>
								</figure>
								<div class="card-body">
									<p class="card-year">{item.eyebrow}</p>
									<h3 class="card-title">{item.title}</h3>
									{#if item.subtitle}
										<p class="card-sub">{item.subtitle}</p>
									{/if}
									{#if item.blurb}
										<p class="card-blurb">{item.blurb}</p>
									{/if}
									<span class="card-cta">
										Lire<span class="card-cta-arrow" aria-hidden="true">→</span>
									</span>
								</div>
							</a>
						{:else}
							<div class="card card-unavailable">
								<figure class="cover">
									<img
										src={item.image ?? PLACEHOLDER}
										alt="{item.title}, couverture"
										loading="lazy"
										onerror={(e) => {
											const img = e.currentTarget as HTMLImageElement;
											if (!img.dataset.fb) {
												img.dataset.fb = '1';
												img.src = PLACEHOLDER;
											}
										}}
									/>
									<span class="cover-shine" aria-hidden="true"></span>
								</figure>
								<div class="card-body">
									<p class="card-year">{item.eyebrow}</p>
									<h3 class="card-title">{item.title}</h3>
									{#if item.subtitle}
										<p class="card-sub">{item.subtitle}</p>
									{/if}
									{#if item.blurb}
										<p class="card-blurb">{item.blurb}</p>
									{/if}
									<span class="card-cta card-cta-pending">À venir</span>
								</div>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/each}

	{#if footer}
		{@render footer()}
	{/if}
</main>

<style>
	/* ── Container ──────────────────────────────────────────────────── */
	.collection {
		max-width: 1120px;
		margin: 0 auto;
		padding: clamp(1rem, 3vw, 2.5rem) clamp(1.25rem, 4vw, 2.5rem) 6rem;
		color: var(--color-fg);
		font-family: var(--font-body);
	}

	/* ── Hero ───────────────────────────────────────────────────────── */
	.collection-hero {
		text-align: center;
		padding: 1rem 0 clamp(3rem, 6vw, 5rem);
	}
	.hero-ornament {
		display: inline-flex;
		align-items: center;
		gap: 0.85rem;
		max-width: 280px;
		width: 100%;
		margin: 0 auto 1.4rem;
	}
	.rule {
		flex: 1;
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			color-mix(in srgb, var(--color-fg) 22%, transparent),
			transparent
		);
	}
	.fleuron {
		font-family: var(--font-heading);
		font-size: 1.05rem;
		color: var(--color-accent);
		line-height: 1;
	}
	.hero-kicker {
		font-family: var(--font-ui);
		font-size: 0.66rem;
		font-weight: 600;
		letter-spacing: 0.32em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0 0 0.5rem;
	}
	.hero-title {
		font-family: var(--font-heading);
		font-style: italic;
		font-weight: 700;
		font-size: clamp(2.8rem, 7vw, 5rem);
		line-height: 1.05;
		letter-spacing: -0.005em;
		margin: 0 0 1rem;
		color: var(--color-fg);
	}
	.hero-lede {
		max-width: 56ch;
		margin: 0 auto;
		font-style: italic;
		font-size: 0.97rem;
		line-height: 1.65;
		color: var(--color-subtle);
	}

	/* ── Section groups ─────────────────────────────────────────────── */
	.group {
		margin-top: clamp(2.5rem, 5vw, 4rem);
		opacity: 0;
		animation: shelf-in 720ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
		animation-delay: calc(var(--group-index) * 120ms + 80ms);
	}
	@keyframes shelf-in {
		from {
			opacity: 0;
			transform: translateY(14px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.group-head {
		margin-bottom: 1.75rem;
		position: relative;
	}
	.group-head-text {
		margin-bottom: 1.1rem;
	}
	.group-title {
		font-family: var(--font-heading);
		font-style: italic;
		font-weight: 700;
		font-size: clamp(1.85rem, 3.5vw, 2.4rem);
		line-height: 1.1;
		margin: 0;
		text-wrap: balance;
	}
	.group-kicker {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.94rem;
		color: var(--color-subtle);
		margin: 0.4rem 0 0;
	}
	.group-count {
		position: absolute;
		top: 0;
		right: 0;
		font-family: var(--font-ui);
		font-size: 0.66rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-muted);
		font-variant-numeric: tabular-nums;
	}
	.group-rule {
		display: block;
		height: 1px;
		background: linear-gradient(
			to right,
			color-mix(in srgb, var(--color-accent) 40%, transparent),
			color-mix(in srgb, var(--color-fg) 14%, transparent) 40%,
			transparent
		);
	}

	/* ── Card grid ──────────────────────────────────────────────────── */
	.grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(var(--grid-cols, 3), 1fr);
		gap: 1.6rem 1.4rem;
	}
	@media (max-width: 1000px) {
		.grid {
			grid-template-columns: repeat(min(var(--grid-cols, 3), 3), 1fr);
		}
	}
	@media (max-width: 880px) {
		.grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (max-width: 560px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}

	/* ── Card ───────────────────────────────────────────────────────── */
	.card-wrap {
		display: flex;
		opacity: 0;
		animation: card-in 560ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
		animation-delay: calc(var(--card-index) * 40ms + var(--shelf-index, 0) * 120ms + 200ms);
	}
	@keyframes card-in {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.card {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		text-decoration: none;
		color: var(--color-fg);
		padding: 0.5rem 0.5rem 0.85rem;
		border-radius: 4px;
		position: relative;
		width: 100%;
		transition:
			transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
			color 160ms ease;
	}
	.card::after {
		content: '';
		position: absolute;
		left: 0.6rem;
		right: 0.6rem;
		bottom: 0.55rem;
		height: 1px;
		background: var(--color-accent);
		transform: scaleX(0);
		transform-origin: left center;
		transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.card:not(.card-unavailable):hover,
	.card:not(.card-unavailable):focus-visible {
		transform: translateY(-2px);
		color: var(--color-accent);
		outline: none;
	}
	.card:not(.card-unavailable):hover::after,
	.card:not(.card-unavailable):focus-visible::after {
		transform: scaleX(1);
	}
	.card-unavailable {
		opacity: 0.55;
		cursor: default;
	}

	/* ── Cover ──────────────────────────────────────────────────────── */
	.cover {
		position: relative;
		aspect-ratio: 3 / 4;
		margin: 0;
		overflow: hidden;
		background: linear-gradient(
			135deg,
			color-mix(in srgb, var(--color-accent) 6%, var(--color-panel)),
			var(--color-panel)
		);
		border: 1px solid color-mix(in srgb, var(--color-fg) 12%, transparent);
		border-radius: 2px;
		box-shadow: 0 1px 0 color-mix(in srgb, var(--color-fg) 8%, transparent);
	}
	.cover img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		transition: transform 480ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.card:not(.card-unavailable):hover .cover img {
		transform: scale(1.015);
	}
	.cover-shine {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			115deg,
			transparent 40%,
			color-mix(in srgb, white 6%, transparent) 50%,
			transparent 60%
		);
		pointer-events: none;
		mix-blend-mode: overlay;
	}

	/* ── Card body ──────────────────────────────────────────────────── */
	.card-body {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0 0.1rem;
		flex: 1 1 auto;
	}
	.card-year {
		font-family: var(--font-ui);
		font-size: 0.66rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--color-accent);
		font-variant-numeric: tabular-nums;
		margin: 0 0 0.1rem;
	}
	.card-unavailable .card-year {
		color: var(--color-muted);
	}
	.card-title {
		font-family: var(--font-heading);
		font-style: normal;
		font-weight: 700;
		font-size: 1.18rem;
		line-height: 1.18;
		margin: 0;
		text-wrap: balance;
		color: var(--color-fg);
	}
	.card:not(.card-unavailable):hover .card-title,
	.card:not(.card-unavailable):focus-visible .card-title {
		color: var(--color-accent);
	}
	.card-sub {
		font-family: var(--font-body);
		font-style: italic;
		font-size: 0.86rem;
		color: var(--color-subtle);
		margin: 0.05rem 0 0.3rem;
		line-height: 1.4;
	}
	.card-blurb {
		font-family: var(--font-body);
		font-size: 0.86rem;
		line-height: 1.55;
		color: var(--color-muted);
		margin: 0;
	}
	.card-cta {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: auto;
		padding-top: 0.65rem;
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--color-accent);
		font-variant-numeric: tabular-nums;
	}
	.card-cta-pending {
		color: var(--color-muted);
	}
	.card-cta-arrow {
		display: inline-block;
		line-height: 1;
		transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
	}
	.card:not(.card-unavailable):hover .card-cta-arrow,
	.card:not(.card-unavailable):focus-visible .card-cta-arrow {
		transform: translateX(4px);
	}

	@media (prefers-reduced-motion: reduce) {
		.group,
		.card-wrap {
			animation: none;
			opacity: 1;
			transform: none;
		}
		.card,
		.card::after,
		.cover img,
		.card-cta-arrow {
			transition: none;
		}
	}
</style>
