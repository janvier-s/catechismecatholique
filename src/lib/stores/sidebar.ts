import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const KEY = 'catechismecatholique.sidebar.open';
const initial = browser ? localStorage.getItem(KEY) !== '0' : true;

export const sidebarOpen = writable<boolean>(initial);

if (browser) {
	sidebarOpen.subscribe((v) => localStorage.setItem(KEY, v ? '1' : '0'));
}
