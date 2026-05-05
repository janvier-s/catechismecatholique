<div class="wordmark" aria-label="Catéchisme de l'Église Catholique">
	<span class="wm-line wm-line-1">Catéchisme</span>
	<span class="wm-line wm-line-2">
		<span class="wm-flank" aria-hidden="true"></span>
		<i>de</i>
		<span class="wm-flank" aria-hidden="true"></span>
	</span>
	<span class="wm-line wm-line-3">l'Église Catholique</span>
</div>

<style>
	.wordmark {
		display: flex;
		flex-direction: column;
		align-items: center;
		font-family: 'Libre Baskerville', Georgia, serif;
		line-height: 1.05;
		text-align: center;
		color: var(--color-fg);
	}
	.wm-line {
		display: block;
	}
	.wm-line-1,
	.wm-line-3 {
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.wm-line-1,
	.wm-line-3 {
		font-size: 11px;
	}
	.wm-line-2 {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		font-weight: 400;
		font-size: 8px;
		color: var(--color-muted);
		margin: 3px 0;
	}
	.wm-line-2 i {
		font-style: italic;
	}
	.wm-flank {
		display: inline-block;
		width: 14px;
		height: 1px;
		background: currentColor;
		opacity: 0.55;
	}
</style>
