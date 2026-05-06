<script lang="ts">
	import { page } from '$app/state';

	const status = $derived(page.status);
	const message = $derived.by(() => {
		if (status === 404) return 'Page introuvable';
		if (status >= 500) return 'Erreur serveur';
		return page.error?.message || 'Erreur inattendue';
	});
</script>

<svelte:head>
	<title>{status} — {message}</title>
</svelte:head>

<main class="error">
	<div class="error-inner">
		<p class="status" aria-hidden="true">{status}</p>
		<h1 class="message">{message}</h1>
		<div class="ornament" aria-hidden="true">
			<span class="fleuron">✠</span>
			<span class="rule"></span>
		</div>
		<a class="home-link" href="/">
			Retour à l'accueil <span aria-hidden="true">→</span>
		</a>
	</div>
</main>

<style>
	.error {
		min-height: calc(100vh - 80px);
		min-height: calc(100dvh - 80px);
		padding: clamp(2rem, 8vh, 5rem) 1.5rem;
		background: var(--color-bg);
		color: var(--color-fg);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	.error-inner {
		width: 100%;
		max-width: 520px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		text-align: center;
	}
	.status {
		font-family: var(--font-ui);
		font-size: 0.7rem;
		font-weight: 500;
		letter-spacing: 0.32em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin: 0;
		padding-left: 0.32em;
		font-variant-numeric: oldstyle-nums;
	}
	.message {
		font-family: var(--font-heading);
		font-size: clamp(1.75rem, 4vw, 2.5rem);
		font-weight: 400;
		line-height: 1.2;
		color: var(--color-heading, var(--color-fg));
		margin: 0;
	}
	.ornament {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
		margin: 0.5rem 0;
	}
	.fleuron {
		font-family: 'Libre Baskerville', Georgia, serif;
		font-size: 1.25rem;
		color: var(--color-accent);
		line-height: 1;
		user-select: none;
	}
	.rule {
		display: block;
		width: 64px;
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			color-mix(in srgb, var(--color-fg) 30%, transparent),
			transparent
		);
	}
	.home-link {
		font-family: var(--font-ui);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-accent);
		text-decoration: none;
		padding: 0.15rem 0;
		border-bottom: 1px solid transparent;
		transition:
			border-color 120ms ease,
			opacity 120ms ease;
	}
	.home-link:hover {
		border-bottom-color: color-mix(in srgb, var(--color-accent) 60%, transparent);
		opacity: 0.85;
	}
</style>
