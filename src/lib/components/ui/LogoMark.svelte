<span class="logo-mark">
	<!-- Direct <img> with webp; PNG fallback dropped because the preload
	     scanner was prefetching the PNG before evaluating the picture's
	     <source>, leading to wasted bytes. webp is universally supported. -->
	<img
		src="/img/logo/logo-64.webp"
		srcset="/img/logo/logo-64.webp 1x, /img/logo/logo-128.webp 2x"
		alt="Catéchisme de l'Église Catholique"
		width="36"
		height="36"
		class="logo-light block"
	/>
	<img
		src="/img/logo/logo-dark-64.webp"
		srcset="/img/logo/logo-dark-64.webp 1x, /img/logo/logo-dark-128.webp 2x"
		alt="Catéchisme de l'Église Catholique"
		width="36"
		height="36"
		class="logo-dark block"
	/>
</span>

<style>
	.logo-mark {
		display: inline-flex;
		flex: 0 0 auto;
	}
	.logo-mark :global(img) {
		width: 100%;
		height: 100%;
	}
	/* Default mark size · desktop 36 px, mobile 32 px, each sized so the mark
	   plus the topbar's py-2 (16 px total) lands exactly on --topbar-height. */
	.logo-mark {
		width: 32px;
		height: 32px;
	}
	@media (min-width: 768px) {
		.logo-mark {
			width: 36px;
			height: 36px;
		}
	}
</style>
