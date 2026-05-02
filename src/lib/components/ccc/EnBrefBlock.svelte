<script lang="ts">
	import type { EnBrefBlock } from '$lib/data/types';
	let { enBref }: { enBref: EnBrefBlock } = $props();
</script>

<aside class="mt-16 p-6 bg-accent/10 border-l-4 border-accent">
	<p class="font-ui text-xs uppercase tracking-wider text-accent font-bold">En Bref</p>
	<p class="text-sm text-muted mt-2">Paragraphes de résumé : {enBref.paragraphs.join(', ')}</p>
</aside>
