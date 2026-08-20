import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const KEY = 'catechismecatholique.sidebar.open';

// SSR has no access to localStorage. Server defaults to "open"; client reads
// the real value. To prevent the SSR/client mismatch from causing CLS on
// initial paint, theme-init.js sets `data-sidebar='closed'` on <html> before
// the first frame whenever the user has the sidebar closed; CSS uses that
// attribute to collapse the rail's width to 0. Toggle clicks update both the
// store (which writes localStorage) and the DOM attribute.
const initial = browser ? localStorage.getItem(KEY) !== '0' : true;

export const sidebarOpen = writable<boolean>(initial);

if (browser) {
	sidebarOpen.subscribe((v) => {
		localStorage.setItem(KEY, v ? '1' : '0');
		const html = document.documentElement;
		if (v) html.removeAttribute('data-sidebar');
		else html.setAttribute('data-sidebar', 'closed');
	});
}

// Mobile drawer variant of the same sommaire: intentionally unpersisted
// (unlike sidebarOpen above) — it should always start closed on a fresh
// visit rather than remembering the last session, since on mobile it's an
// overlay on top of the reading text rather than a rail beside it.
export const sidebarMobileOpen = writable<boolean>(false);
