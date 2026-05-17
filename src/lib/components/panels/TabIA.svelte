<script lang="ts">
	import { marked } from 'marked';
	import { loadCecAiExplanation } from '$lib/data/loaders';

	let { paragraphNumber }: { paragraphNumber: number } = $props();

	type Phase = 'loading' | 'typing' | 'done' | 'empty';
	let phase = $state<Phase>('loading');
	// Accumulates markdown characters during typing phase
	let cursor = $state(0);
	let fullMd = $state('');

	let animFrame: number | null = null;

	function cancelAnim() {
		if (animFrame !== null) {
			cancelAnimationFrame(animFrame);
			animFrame = null;
		}
	}

	function startTyping() {
		phase = 'typing';
		cursor = 0;
		const CHARS_PER_FRAME = 6; // ~360 chars/sec at 60fps · fast AI feel

		function tick() {
			cursor = Math.min(cursor + CHARS_PER_FRAME, fullMd.length);
			if (cursor >= fullMd.length) {
				phase = 'done';
				return;
			}
			animFrame = requestAnimationFrame(tick);
		}
		animFrame = requestAnimationFrame(tick);
	}

	$effect(() => {
		const n = paragraphNumber;
		phase = 'loading';
		fullMd = '';
		cursor = 0;
		cancelAnim();

		const loadStart = Date.now();
		loadCecAiExplanation(n).then((md) => {
			if (!md) {
				phase = 'empty';
				return;
			}
			fullMd = md;
			// Ensure at least 700ms of the "thinking" dots before typing starts
			const delay = Math.max(0, 700 - (Date.now() - loadStart));
			setTimeout(startTyping, delay);
		});

		return cancelAnim;
	});

	// Re-render markdown on every cursor advance. marked.parse is synchronous
	// and very fast on short strings, so this is fine at 60fps.
	const html = $derived.by(() => {
		if (phase === 'loading' || phase === 'empty') return '';
		const slice = phase === 'done' ? fullMd : fullMd.slice(0, cursor);
		const raw = marked.parse(slice) as string;
		// marked encodes apostrophes as &#39;. Match all known summary-label
		// variants so the accent colour applies consistently across all entries.
		return raw.replace(
			/<strong>((?:Ce qu(?:&#39;|')il faut retenir|R[eé]sum[eé]\s+Cl[eé]|L(?:&#39;|')essentiel|En bref|En r[eé]sum[eé]|Le (?:point|message)\s+(?:essentiel|cl[eé]))\s*:)/gi,
			'<strong><span class="retenir">$1</span>'
		);
	});
</script>

<div class="tab-ia">
	{#if phase === 'loading'}
		<div class="thinking" aria-label="Génération en cours…">
			<span class="dot"></span>
			<span class="dot"></span>
			<span class="dot"></span>
		</div>
	{:else if phase === 'empty'}
		<p class="empty">Aucune explication disponible pour ce paragraphe.</p>
	{:else}
		<p class="eyebrow">Explication générée par IA</p>
		<div class="ia-body">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html html}
			{#if phase === 'typing'}
				<span class="blink-cursor" aria-hidden="true">▋</span>
			{/if}
		</div>
		{#if phase === 'done'}
			<p class="disclaimer">
				Cette explication est générée par intelligence artificielle. La précision théologique peut
				varier ; référez-vous toujours au texte original du Catéchisme.
			</p>
		{/if}
	{/if}
</div>

<style>
	.tab-ia {
		padding: 1rem 1rem 2rem;
	}

	.eyebrow {
		font-family: var(--font-ui);
		font-size: 0.625rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-muted);
		margin-bottom: 0.75rem;
	}

	.disclaimer {
		margin-top: 1.25rem;
		padding-top: 0.875rem;
		border-top: 1px solid color-mix(in srgb, var(--color-fg) 8%, transparent);
		font-family: var(--font-ui);
		font-size: 0.7rem;
		line-height: 1.5;
		color: var(--color-muted);
		font-style: italic;
	}

	/* Thinking dots */
	.thinking {
		display: flex;
		gap: 5px;
		align-items: center;
		padding: 0.5rem 0;
	}
	.dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--color-accent);
		opacity: 0.3;
		animation: pulse 1.2s ease-in-out infinite;
	}
	.dot:nth-child(2) {
		animation-delay: 0.2s;
	}
	.dot:nth-child(3) {
		animation-delay: 0.4s;
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 0.3;
			transform: scale(0.85);
		}
		50% {
			opacity: 1;
			transform: scale(1);
		}
	}

	/* Blinking cursor */
	.blink-cursor {
		display: inline-block;
		color: var(--color-accent);
		animation: blink 0.7s step-end infinite;
		font-size: 0.9em;
		line-height: 1;
		vertical-align: text-bottom;
		margin-left: 1px;
	}
	@keyframes blink {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0;
		}
	}

	/* AI body prose */
	.ia-body {
		font-family: var(--font-body);
		font-size: 0.875rem;
		line-height: 1.7;
		color: var(--color-fg);
	}
	.ia-body :global(p) {
		margin-bottom: 0.75em;
	}
	.ia-body :global(p:last-child) {
		margin-bottom: 0;
	}
	.ia-body :global(ul) {
		list-style-type: disc;
		padding-left: 1.25rem;
		margin-bottom: 0.75em;
	}
	.ia-body :global(ol) {
		list-style-type: decimal;
		padding-left: 1.25rem;
		margin-bottom: 0.75em;
	}
	.ia-body :global(li) {
		margin-bottom: 0.35em;
	}
	.ia-body :global(li:last-child) {
		margin-bottom: 0;
	}
	.ia-body :global(strong) {
		font-weight: 600;
		color: var(--color-heading);
	}
	.ia-body :global(.retenir) {
		color: var(--color-accent);
	}

	.empty {
		font-family: var(--font-ui);
		font-size: 0.8rem;
		color: var(--color-muted);
		font-style: italic;
	}
</style>
