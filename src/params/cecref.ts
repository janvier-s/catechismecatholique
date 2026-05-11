export function match(param: string): boolean {
	// Single paragraph, range (1-10), or comma-separated list (1,3,240,500)
	return /^\d+(-\d+)?$/.test(param) || /^\d+(,\d+)+$/.test(param);
}
