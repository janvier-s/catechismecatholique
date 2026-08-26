// Theme + reader-layout + sidebar bootstrap — runs before SvelteKit hydrates
// so the page paints in the stored theme without a flash and the sidebar is
// sized correctly from the very first frame (preventing the layout shift caused
// when SSR renders sidebar=open and client localStorage says closed).
// Externalised from app.html so the site's CSP can drop 'unsafe-inline'
// from script-src.
//
// The source of truth is the consolidated `catechismecatholique.prefs` blob
// written by src/lib/stores/prefs.ts. This script used to read the legacy
// standalone `catechismecatholique.theme` key, which prefs.ts only consults
// once in order to migrate it — so after that migration this found nothing,
// fell back to 'auto', and every reload flashed the OS palette before
// hydration stamped the real theme. Keep the two in sync: any dataset
// attribute or CSS var here that affects colour or layout must match what
// prefs.ts sets on subscribe.
(function () {
	var root = document.documentElement;

	function readPrefs() {
		try {
			var raw = localStorage.getItem('catechismecatholique.prefs');
			if (raw) {
				var parsed = JSON.parse(raw);
				if (parsed && typeof parsed === 'object') return parsed;
			}
		} catch {
			// unparseable or localStorage unavailable — fall through
		}
		return null;
	}

	function pick(value, allowed, fallback) {
		return allowed.indexOf(value) >= 0 ? value : fallback;
	}

	var prefs = readPrefs() || {};

	try {
		// Legacy standalone key is the fallback for a profile that hasn't been
		// migrated yet (prefs.ts does the migration on its first read).
		var legacy = null;
		try {
			legacy = localStorage.getItem('catechismecatholique.theme');
		} catch {
			// no-op
		}
		var theme = pick(prefs.theme, ['auto', 'light', 'sepia', 'dark', 'oled'], null);
		if (!theme) theme = pick(legacy, ['auto', 'light', 'sepia', 'dark', 'oled'], 'auto');
		root.setAttribute('data-theme', theme);
		root.dataset.accentColor = pick(prefs.accentColor, ['red', 'blue'], 'red');
	} catch {
		// localStorage unavailable (private mode, sandboxed iframe, etc.) — fall
		// back to whatever data-theme is statically set on the html element.
	}

	// Tint the mobile browser chrome to match the theme. Read from the computed
	// --color-bg rather than a colour map duplicated here, so the five themes
	// (and 'auto' resolving through prefers-color-scheme) can never drift out of
	// step with app.css. This script runs before %sveltekit.head% injects the
	// stylesheet, so on the first attempt the variable is usually still empty —
	// retry once the render-blocking CSS has been applied.
	function syncThemeColor() {
		var bg = getComputedStyle(root).getPropertyValue('--color-bg').trim();
		if (!bg) return false;
		var meta = document.querySelector('meta[name="theme-color"]');
		if (meta) meta.setAttribute('content', bg);
		return true;
	}
	try {
		if (!syncThemeColor()) {
			document.addEventListener('DOMContentLoaded', syncThemeColor, { once: true });
		}
	} catch {
		// no-op
	}

	try {
		// Every reading pref that changes rendering. This must mirror the full
		// set written by prefs.ts on subscribe: anything missed here is applied
		// only at hydration, so the reader sees ~200ms of the *other* setting
		// first. Note the booleans are written as the strings "true"/"false" —
		// the CSS matches on the value, so an absent attribute is not the same
		// as "false".
		root.dataset.columnWidth = pick(prefs.columnWidth, ['narrow', 'default', 'wide'], 'default');
		root.dataset.crossRefsLayout = pick(prefs.crossRefsLayout, ['inline', 'side'], 'side');
		// [pref key, dataset key] · all default to false, as in prefs.ts DEFAULTS.
		var flags = [
			['hideAllNotes', 'hideAllNotes'],
			['hideCrossRefs', 'hideCrossRefs'],
			['hideBibleMarkers', 'hideBibleMarkers'],
			['hideBibleInline', 'hideBibleInline'],
			['hideSourceFootnotes', 'hideSourceFootnotes'],
			['inlineAsMarkers', 'inlineAsMarkers'],
			['justifiedText', 'justified']
		];
		for (var i = 0; i < flags.length; i++) {
			root.dataset[flags[i][1]] = String(prefs[flags[i][0]] === true);
		}
		if (typeof prefs.fontSize === 'number' && prefs.fontSize >= 10 && prefs.fontSize <= 40) {
			root.style.setProperty('--reader-font-size', prefs.fontSize + 'px');
		}
		if (typeof prefs.lineHeight === 'number' && prefs.lineHeight >= 1 && prefs.lineHeight <= 3) {
			root.style.setProperty('--reader-line-height', String(prefs.lineHeight));
		}
		// The body font stack · persisted verbatim by prefs.ts so this script
		// doesn't need a copy of the font registry (which lives in
		// $lib/data/fonts and can't be imported here).
		var stack = localStorage.getItem('catechismecatholique.fontStack');
		if (stack && stack.length < 300 && !/[{};<]/.test(stack)) {
			root.style.setProperty('--font-body', stack);
		}
	} catch {
		// no-op
	}

	try {
		var sb = localStorage.getItem('catechismecatholique.sidebar.open');
		if (sb === '0') root.setAttribute('data-sidebar', 'closed');
	} catch {
		// no-op
	}
})();
