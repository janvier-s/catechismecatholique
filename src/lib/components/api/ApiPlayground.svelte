<script lang="ts">
	import type { ApiRoute } from '$lib/api-types';

	let { routes }: { routes: ApiRoute[] } = $props();

	/**
	 * A pretty-printed glossary listing runs to several hundred kilobytes ·
	 * dropping that into the DOM in one node stalls the tab, so long bodies are
	 * cut here and the reader is pointed at the raw URL instead.
	 */
	const MAX_SHOWN = 20000;

	interface Result {
		status: number;
		ms: number;
		body: string;
		truncated: boolean;
	}

	// An empty `selected` means "the first route", so the defaults derive from
	// the prop rather than snapshotting it in a $state initialiser.
	let selected = $state('');
	let edited = $state<string | null>(null);
	let loading = $state(false);
	let result = $state<Result | null>(null);
	let failure = $state<string | null>(null);

	const current = $derived(routes.find((r) => r.path === selected) ?? routes[0]);

	// The example is the default, and typing overrides it until the reader picks
	// another route. Keeping the override separate is what lets the field follow
	// the selector without ever discarding an edit behind the reader's back.
	const url = $derived(edited ?? current?.example ?? '');

	function onRouteChange(event: Event) {
		selected = (event.currentTarget as HTMLSelectElement).value;
		edited = null;
		result = null;
		failure = null;
	}

	function format(text: string): string {
		try {
			return JSON.stringify(JSON.parse(text), null, 2);
		} catch {
			return text;
		}
	}

	async function run() {
		if (loading) return;
		const target = url.trim();
		if (!target.startsWith('/api/')) {
			failure = 'L’adresse doit commencer par /api/.';
			result = null;
			return;
		}
		loading = true;
		failure = null;
		result = null;
		const started = performance.now();
		try {
			const res = await fetch(target, { headers: { Accept: 'application/json' } });
			const text = await res.text();
			const pretty = format(text);
			result = {
				status: res.status,
				ms: Math.round(performance.now() - started),
				body: pretty.slice(0, MAX_SHOWN),
				truncated: pretty.length > MAX_SHOWN
			};
		} catch (e) {
			failure = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			run();
		}
	}
</script>

<div class="playground">
	<div class="controls">
		<label class="field">
			<span class="label">Route</span>
			<select value={current?.path ?? ''} onchange={onRouteChange}>
				{#each routes as route (route.path)}
					<option value={route.path}>{route.path}</option>
				{/each}
			</select>
		</label>

		<label class="field grow">
			<span class="label">Adresse</span>
			<input
				type="text"
				value={url}
				oninput={(e) => (edited = e.currentTarget.value)}
				onkeydown={onKeydown}
				spellcheck="false"
				autocapitalize="off"
				autocorrect="off"
			/>
		</label>

		<button type="button" onclick={run} disabled={loading}>
			{loading ? 'En cours…' : 'Envoyer'}
		</button>
	</div>

	{#if current}
		<p class="summary">{current.summary}</p>
		{#if current.params.length > 0}
			<ul class="params">
				{#each current.params as param (param.name)}
					<li>
						<code>{param.name}</code>
						<span class="kind">{param.in === 'path' ? 'chemin' : 'requête'}</span>
						{#if param.required}<span class="required">obligatoire</span>{/if}
						{param.description}
					</li>
				{/each}
			</ul>
		{/if}
	{/if}

	{#if failure}
		<p class="failure" role="status">Échec de la requête : {failure}</p>
	{/if}

	{#if result}
		<p class="status" role="status">
			<span class:ok={result.status < 400} class:ko={result.status >= 400} class="code"
				>{result.status}</span
			>
			<span>{result.ms} ms</span>
			{#if result.truncated}
				<span class="cut">
					réponse tronquée à {MAX_SHOWN} caractères ·
					<a href={url} target="_blank" rel="noopener">voir la réponse entière</a>
				</span>
			{/if}
		</p>
		<pre class="output"><code>{result.body}</code></pre>
	{/if}
</div>

<style>
	.playground {
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 1rem;
		margin: 0 0 20px;
		background: var(--color-panel);
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.6rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}

	.field.grow {
		flex: 1 1 16rem;
	}

	.label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		opacity: 0.7;
	}

	select,
	input {
		font: inherit;
		font-size: 0.88rem;
		padding: 0.45rem 0.6rem;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: var(--color-bg);
		color: inherit;
		max-width: 100%;
	}

	input {
		font-family: ui-monospace, 'SF Mono', 'Cascadia Code', 'Roboto Mono', monospace;
		width: 100%;
	}

	button {
		font: inherit;
		font-size: 0.88rem;
		padding: 0.45rem 1.1rem;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: var(--color-accent);
		border-color: var(--color-accent);
		color: #fff;
		cursor: pointer;
	}

	button:disabled {
		cursor: progress;
		opacity: 0.6;
	}

	.summary {
		margin: 0.9rem 0 0;
		font-size: 0.88rem;
		opacity: 0.85;
	}

	.params {
		margin: 0.5rem 0 0;
		padding-left: 1.1rem;
		font-size: 0.84rem;
		opacity: 0.85;
	}

	.params li {
		margin: 0.15rem 0;
	}

	.kind,
	.required {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 0 0.3em;
		margin-right: 0.3em;
		opacity: 0.75;
	}

	.status {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem;
		margin: 0.9rem 0 0.4rem;
		font-size: 0.82rem;
	}

	.code {
		font-family: ui-monospace, 'SF Mono', 'Cascadia Code', 'Roboto Mono', monospace;
		font-weight: 600;
		border-radius: 4px;
		padding: 0.05em 0.45em;
		border: 1px solid var(--color-border);
	}

	/* Theme-aware rather than a fixed green and red · the site ships four
	   palettes and hard-coded hues fail contrast in at least one of them. */
	.code.ok {
		color: var(--color-fg);
	}

	.code.ko {
		color: var(--color-accent-text);
		border-color: currentColor;
	}

	.cut {
		opacity: 0.8;
	}

	.failure {
		margin: 0.9rem 0 0;
		font-size: 0.85rem;
		color: var(--color-accent-text);
	}

	.output {
		max-height: 26rem;
		overflow: auto;
		margin: 0;
	}

	/* The playground is interactive · a printed page keeps the controls out. */
	@media print {
		.playground {
			display: none;
		}
	}
</style>
