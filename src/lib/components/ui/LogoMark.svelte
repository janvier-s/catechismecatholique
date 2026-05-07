<span class="logo-mark">
	<picture class="logo-light block">
		<source type="image/webp" srcset="/img/logo/logo-64.webp 1x, /img/logo/logo-128.webp 2x" />
		<img
			src="/img/logo/logo-64.png"
			srcset="/img/logo/logo-64.png 1x, /img/logo/logo-128.png 2x"
			alt="Catéchisme de l'Église Catholique"
			width="56"
			height="56"
		/>
	</picture>
	<picture class="logo-dark block">
		<source
			type="image/webp"
			srcset="/img/logo/logo-dark-64.webp 1x, /img/logo/logo-dark-128.webp 2x"
		/>
		<img
			src="/img/logo/logo-dark-64.png"
			srcset="/img/logo/logo-dark-64.png 1x, /img/logo/logo-dark-128.png 2x"
			alt="Catéchisme de l'Église Catholique"
			width="56"
			height="56"
		/>
	</picture>
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
	/* Default mark size — desktop 56 px, mobile 38 px. The shrink-on-scroll
	   topbar overrides this to 30 px when condensed. */
	.logo-mark {
		width: 38px;
		height: 38px;
	}
	@media (min-width: 768px) {
		.logo-mark {
			width: 56px;
			height: 56px;
		}
	}
</style>
