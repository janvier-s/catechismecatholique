<script lang="ts">
	import { stripDiacritics } from '$lib/utils/searchTokenizer';

	interface HeadingEntry {
		t: string;
		s: string;
		h: string;
		k: 'part' | 'section' | 'chapter' | 'article' | 'heading';
	}

	let {
		query = '',
		onSelect
	}: {
		query: string;
		onSelect?: (href: string) => void;
	} = $props();

	// Module-level cache — fetched at most once per page load.
	let allEntries: HeadingEntry[] | null = null;
	let loadPromise: Promise<HeadingEntry[]> | null = null;

	async function loadEntries(): Promise<HeadingEntry[]> {
		if (allEntries) return allEntries;
		if (loadPromise) return loadPromise;
		loadPromise = fetch('/data/ccc/headings.json')
			.then((r) => r.json() as Promise<HeadingEntry[]>)
			.then((data) => {
				allEntries = data;
				return data;
			});
		return loadPromise;
	}

	function normalize(s: string): string {
		return stripDiacritics(s)
			.toLowerCase()
			.replace(/['']/g, ' ')
			.replace(/[^a-z0-9 ]+/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
	}

	let suggestions: HeadingEntry[] = $state([]);
	let activeIdx = $state(-1);

	$effect(() => {
		const q = query.trim();
		if (q.length < 2) {
			suggestions = [];
			activeIdx = -1;
			return;
		}
		const nq = normalize(q);
		// Trigger load then filter
		loadEntries().then((entries) => {
			const matched = entries.filter((e) => normalize(e.t).includes(nq));
			// Sort: starts-with first, then contains
			matched.sort((a, b) => {
				const na = normalize(a.t);
				const nb = normalize(b.t);
				const aStarts = na.startsWith(nq) ? 0 : 1;
				const bStarts = nb.startsWith(nq) ? 0 : 1;
				if (aStarts !== bStarts) return aStarts - bStarts;
				// Among equals, prefer larger structural items (parts > sections > chapters > articles > headings)
				const order = { part: 0, section: 1, chapter: 2, article: 3, heading: 4 };
				return order[a.k] - order[b.k];
			});
			suggestions = matched.slice(0, 8);
			activeIdx = -1;
		});
	});

	const KIND_LABEL: Record<HeadingEntry['k'], string> = {
		part: 'Partie',
		section: 'Section',
		chapter: 'Chapitre',
		article: 'Article',
		heading: 'Titre'
	};

	export function handleKeydown(e: KeyboardEvent): boolean {
		if (suggestions.length === 0) return false;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			activeIdx = Math.min(activeIdx + 1, suggestions.length - 1);
			return true;
		}
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			activeIdx = Math.max(activeIdx - 1, -1);
			return true;
		}
		if (e.key === 'Enter' && activeIdx >= 0) {
			e.preventDefault();
			const s = suggestions[activeIdx];
			if (s) pick(s);
			return true;
		}
		if (e.key === 'Escape') {
			suggestions = [];
			activeIdx = -1;
			return true;
		}
		return false;
	}

	function pick(s: HeadingEntry) {
		suggestions = [];
		activeIdx = -1;
		if (onSelect) onSelect(s.h);
	}
</script>

{#if suggestions.length > 0}
	<ul class="suggest-list" role="listbox" aria-label="Suggestions de navigation">
		{#each suggestions as s, i (s.h)}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<li
				class="suggest-item"
				class:active={i === activeIdx}
				role="option"
				aria-selected={i === activeIdx}
				onclick={() => pick(s)}
				onmouseenter={() => (activeIdx = i)}
			>
				<span class="suggest-kind">{KIND_LABEL[s.k]}</span>
				<span class="suggest-title">{s.t}</span>
				{#if s.s}
					<span class="suggest-sub">{s.s}</span>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

<style>
	.suggest-list {
		list-style: none;
		padding: 0.25rem 0;
		margin: 0;
		background: var(--color-panel);
		border: 1px solid color-mix(in srgb, var(--color-fg) 14%, transparent);
		border-radius: 6px;
		box-shadow:
			0 4px 16px color-mix(in srgb, var(--color-fg) 10%, transparent),
			0 1px 4px color-mix(in srgb, var(--color-fg) 6%, transparent);
		overflow: hidden;
	}
	.suggest-item {
		display: grid;
		grid-template-columns: 4.5rem 1fr;
		grid-template-rows: auto auto;
		column-gap: 0.5rem;
		align-items: baseline;
		padding: 0.5rem 0.75rem;
		cursor: pointer;
		transition: background 80ms ease;
	}
	.suggest-item:hover,
	.suggest-item.active {
		background: color-mix(in srgb, var(--color-accent) 8%, transparent);
	}
	.suggest-kind {
		grid-row: 1;
		grid-column: 1;
		font-family: var(--font-ui);
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-accent);
		white-space: nowrap;
		align-self: center;
	}
	.suggest-title {
		grid-row: 1;
		grid-column: 2;
		font-family: var(--font-body);
		font-size: 14px;
		color: var(--color-fg);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.suggest-sub {
		grid-row: 2;
		grid-column: 2;
		font-family: var(--font-ui);
		font-size: 10px;
		color: var(--color-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
