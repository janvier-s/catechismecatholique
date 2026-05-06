<span class="logo-mark">
	<img
		src="/img/logo/logo-64.png"
		srcset="/img/logo/logo-64.png 1x, /img/logo/logo-128.png 2x"
		alt="Catéchisme de l'Église catholique"
		width="56"
		height="56"
		class="logo-light block"
	/>
	<img
		src="/img/logo/logo-dark-64.png"
		srcset="/img/logo/logo-dark-64.png 1x, /img/logo/logo-dark-128.png 2x"
		alt=""
		aria-hidden="true"
		width="56"
		height="56"
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
