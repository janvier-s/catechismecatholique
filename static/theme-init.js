// Theme + sidebar bootstrap — runs before SvelteKit hydrates so the page
// paints in the stored theme without a flash and the sidebar is sized
// correctly from the very first frame (preventing the layout shift caused
// when SSR renders sidebar=open and client localStorage says closed).
// Externalised from app.html so the site's CSP can drop 'unsafe-inline'
// from script-src.
(function () {
	try {
		var stored = localStorage.getItem('catechismecatholique.theme');
		var allowed = ['auto', 'light', 'sepia', 'dark', 'oled'];
		var theme = stored && allowed.indexOf(stored) >= 0 ? stored : 'auto';
		document.documentElement.setAttribute('data-theme', theme);
	} catch {
		// localStorage unavailable (private mode, sandboxed iframe, etc.) — fall
		// back to whatever data-theme is statically set on the html element.
	}
	try {
		var sb = localStorage.getItem('catechismecatholique.sidebar.open');
		if (sb === '0') document.documentElement.setAttribute('data-sidebar', 'closed');
	} catch {
		// no-op
	}
})();
