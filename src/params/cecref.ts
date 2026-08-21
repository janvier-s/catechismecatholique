export function match(param: string): boolean {
	// Single paragraph (240), a range (1-10), or a comma-separated list mixing
	// both (268,279-280,290-295) · the shape the concordance produces.
	return /^\d+(-\d+)?(,\d+(-\d+)?)*$/.test(param);
}
