import { expect, type Locator } from '@playwright/test';

/**
 * Open a disclosure whose trigger reflects its state in `aria-expanded`, and
 * wait until `target` is actually on the page.
 *
 * Playwright's actionability checks prove the trigger is visible, stable and
 * enabled. None of that means Svelte has attached its `onclick` yet. A click
 * dispatched in the window between the server's paint and hydration reaches
 * the DOM · the button even takes focus · but runs no handler, and `click()`
 * is a one-shot action with no retry, so the test sails on towards a panel
 * that will never open. That is what made the first click after a `goto()` or
 * `reload()` intermittently fail, in a way that always passed when the test
 * was run alone and the machine was less busy.
 *
 * The `aria-expanded` guard is what makes retrying safe rather than harmful.
 * Both triggers this wraps are toggles, so a blind second click on a panel
 * that did open would close it again and swap one flake for another. Clicking
 * only while the trigger still reads closed keeps the retry idempotent.
 */
export async function openDisclosure(trigger: Locator, target: Locator): Promise<void> {
	await expect(async () => {
		if ((await trigger.getAttribute('aria-expanded')) !== 'true') {
			await trigger.click();
		}
		await expect(target).toBeVisible({ timeout: 1000 });
	}).toPass({ timeout: 15_000 });
}
