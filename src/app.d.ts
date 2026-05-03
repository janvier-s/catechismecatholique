declare global {
	namespace App {
		interface Platform {
			env?: {
				SEARCH_INDEX?: KVNamespace;
			};
		}
	}
	interface KVNamespace {
		get(key: string): Promise<string | null>;
		put(key: string, value: string): Promise<void>;
	}
}

export {};
