<!--
  Static wordmark. Font-sizes per line were measured once in Libre Baskerville
  to make each line render at exactly 200 viewBox units wide. Line 2 is set to
  the same font-size as line 1; letter-spacing widens it from its narrower
  regular-weight natural width up to the target width.

  If the lines, font, or weights change, re-measure with:
    document.querySelectorAll('.wordmark text').forEach(t => console.log(
      t.textContent, t.getComputedTextLength()
    ));
-->
<svg
	viewBox="0 0 200 116"
	xmlns="http://www.w3.org/2000/svg"
	preserveAspectRatio="xMidYMid meet"
	class="wordmark fill-current"
	role="img"
	aria-label="Catéchisme de l'Église Catholique"
>
	<text x="100" y="32" text-anchor="middle" font-size="32.5" font-weight="700">Catéchisme</text>
	<text
		x="100"
		y="68"
		text-anchor="middle"
		font-size="32.5"
		font-weight="400"
		letter-spacing="3.45"
	>de l'Église</text>
	<text x="100" y="104" text-anchor="middle" font-size="34.3" font-weight="700">Catholique</text>
</svg>

<style>
	.wordmark {
		display: block;
		width: 90px;
		height: auto;
		margin-top: 4px;
		font-family: 'Libre Baskerville', Georgia, serif;
	}
	.wordmark text {
		font-family: inherit;
	}
</style>
