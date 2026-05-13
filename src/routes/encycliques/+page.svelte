<script lang="ts">
	import MetaTags from '$lib/components/ui/MetaTags.svelte';
	import CollectionPage from '$lib/components/ui/CollectionPage.svelte';
</script>

<MetaTags
	title="Encycliques · Magistère pontifical"
	description="Recueil des encycliques majeures du Magistère pontifical. Section en préparation."
/>

<CollectionPage kicker="Magistère pontifical" title="Encycliques">
	{#snippet lede()}
		Lettres encycliques des souverains pontifes sur la doctrine, la morale et la société, hors
		documents conciliaires. Classées par pontificat, de Léon XIII à nos jours. En préparation.
	{/snippet}
</CollectionPage>
