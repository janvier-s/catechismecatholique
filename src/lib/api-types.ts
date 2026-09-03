/**
 * Shape of the public API surface description.
 *
 * The data itself lives in `$lib/server/api/spec`, which cannot be imported
 * into a component. These types are declared here so the docs page and the
 * playground can be typed against the same contract the server builds.
 */
export interface ApiParam {
	name: string;
	in: 'path' | 'query';
	required: boolean;
	description: string;
}

export interface ApiRoute {
	path: string;
	summary: string;
	params: ApiParam[];
	codes: string[];
	/** A working URL a reader can paste into a browser. */
	example: string;
}
