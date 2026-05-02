export function assert(cond: unknown, msg: string): asserts cond {
	if (!cond) throw new Error(`prepare-data: ${msg}`);
}

export function logStep(name: string): void {
	process.stdout.write(`  ${name}…`);
}

export function endStep(detail = ''): void {
	process.stdout.write(` ✓ ${detail}\n`);
}

export function logHeader(title: string): void {
	process.stdout.write(`\n→ ${title}\n`);
}
