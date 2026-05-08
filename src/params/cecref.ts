export function match(param: string): boolean {
	return /^\d+(-\d+)?$/.test(param);
}
