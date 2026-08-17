import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { CEC_TOPICS, resolveTopic, topicsForPart, type TopicStructure } from '$lib/cecTopics';

const structure = JSON.parse(
	readFileSync('static/data/cec/structure-toc.json', 'utf8')
) as TopicStructure;

describe('CEC landing-page topics', () => {
	it('covers all four parts', () => {
		expect(Object.keys(CEC_TOPICS).sort()).toEqual([
			'1-profession-de-la-foi',
			'2-celebration-du-mystere',
			'3-vie-dans-le-christ',
			'4-priere-chretienne'
		]);
	});

	// The point of the whole module: curated labels, corpus-derived hrefs. If a
	// slug is renamed upstream the entry silently disappears from the page, so
	// this test is the thing that turns that into a visible failure.
	for (const [partSlug, specs] of Object.entries(CEC_TOPICS)) {
		describe(partSlug, () => {
			for (const spec of specs) {
				it(`resolves « ${spec.label} »`, () => {
					const topic = resolveTopic(structure, partSlug, spec);
					expect(topic, `path ${spec.path.join('/')} no longer exists`).not.toBeNull();
					expect(topic!.href).toBe(`/cec/${partSlug}/${spec.path.join('/')}`);
					expect(topic!.range, 'topic has no paragraph range').toBeTruthy();
					expect(topic!.range!.from).toBeLessThanOrEqual(topic!.range!.to);
				});
			}
		});
	}

	it('keeps every topic inside its own part’s range', () => {
		for (const partSlug of Object.keys(CEC_TOPICS)) {
			const part = structure.parts.find((p) => p.slug === partSlug)!;
			for (const t of topicsForPart(structure, partSlug)) {
				expect(t.range!.from, `${t.label} starts before ${partSlug}`).toBeGreaterThanOrEqual(
					part.range!.from
				);
				expect(t.range!.to, `${t.label} ends after ${partSlug}`).toBeLessThanOrEqual(
					part.range!.to
				);
			}
		}
	});

	it('lists topics in ascending paragraph order', () => {
		for (const partSlug of Object.keys(CEC_TOPICS)) {
			const froms = topicsForPart(structure, partSlug).map((t) => t.range!.from);
			expect(froms, partSlug).toEqual([...froms].sort((a, b) => a - b));
		}
	});

	it('drops an entry whose path no longer resolves', () => {
		expect(
			resolveTopic(structure, '1-profession-de-la-foi', { label: 'x', path: ['nope'] })
		).toBeNull();
		expect(resolveTopic(null, '1-profession-de-la-foi', { label: 'x', path: [] })).toBeNull();
	});
});
