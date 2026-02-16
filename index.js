class MemoryStore {
	#store = new Map();

	async get(key) {
		return this.#store.get(key);
	}

	async set(key, value) {
		this.#store.set(key, value);
	}

	async has(key) {
		return this.#store.has(key);
	}

	async delete(key) {
		return this.#store.delete(key);
	}

	async clear() {
		this.#store.clear();
	}
}

export default function createCache(options = {}) {
	const {ttl: defaultTtl, backend: _backend = 'auto'} = options;
	const store = new MemoryStore();

	return {
		async get(key) {
			const entry = await store.get(key);

			if (entry === undefined) {
				return undefined;
			}

			if (entry.expiry !== undefined && Date.now() > entry.expiry) {
				await store.delete(key);
				return undefined;
			}

			return entry.value;
		},

		async set(key, value, ttl) {
			const effectiveTtl = ttl ?? defaultTtl;
			const entry = {
				value,
				expiry: effectiveTtl ? Date.now() + effectiveTtl : undefined,
			};

			await store.set(key, entry);
		},

		async has(key) {
			const entry = await store.get(key);

			if (entry === undefined) {
				return false;
			}

			if (entry.expiry !== undefined && Date.now() > entry.expiry) {
				await store.delete(key);
				return false;
			}

			return true;
		},

		async delete(key) {
			return store.delete(key);
		},

		async clear() {
			await store.clear();
		},
	};
}
