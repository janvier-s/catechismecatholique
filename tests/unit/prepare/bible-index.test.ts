import { describe, it, expect } from 'vitest';
import { processBibleIndex } from '../../../scripts/prepare/bible-index';

describe('processBibleIndex', () => {
	it('passes through ref → paragraph mappings', () => {
		const input = { 'Mt 28:19-20': [849, 1257], 'Mt 28:20': [80] };
		const output = processBibleIndex(input, new Set([80, 849, 1257]));
		expect(output['Mt 28:19-20']).toEqual([849, 1257]);
	});

	it('drops references to nonexistent paragraphs (with warning)', () => {
		const input = { 'Mt 1:1': [99999] };
		const output = processBibleIndex(input, new Set([1, 2, 3]));
		expect(output['Mt 1:1']).toBeUndefined();
	});
});
