class MemoryStore {
  #store = new Map();

  get(key) {
    return this.#store.get(key);
  }

  set(key, value) {
    this.#store.set(key, value);
  }

  has(key) {
    return this.#store.has(key);
  }

  delete(key) {
    return this.#store.delete(key);
  }

  clear() {
    this.#store.clear();
  }

  prune() {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.#store) {
      if (entry.expiry !== undefined && now >= entry.expiry) {
        this.#store.delete(key);
        removed += 1;
      }
    }
    return removed;
  }
}

export default function createCache(options = {}) {
  const { ttl: defaultTtl, backend: _backend = "auto" } = options;
  const validateTtl = (ttl) => {
    if (ttl !== undefined && (!Number.isFinite(ttl) || ttl < 0)) {
      throw new TypeError("Expected `ttl` to be a non-negative finite number");
    }
  };
  validateTtl(defaultTtl);
  const store = new MemoryStore();

  return {
    async clear() {
      await store.clear();
    },

    delete(key) {
      return Promise.resolve(store.delete(key));
    },
    // biome-ignore lint/suspicious/useAwait: Keep the Promise API while checking memory-store expiry atomically.
    async get(key) {
      const entry = store.get(key);

      if (entry === undefined) {
        return;
      }

      if (entry.expiry !== undefined && Date.now() >= entry.expiry) {
        store.delete(key);
        return;
      }

      return entry.value;
    },

    // biome-ignore lint/suspicious/useAwait: Keep the Promise API while checking memory-store expiry atomically.
    async has(key) {
      const entry = store.get(key);

      if (entry === undefined) {
        return false;
      }

      if (entry.expiry !== undefined && Date.now() >= entry.expiry) {
        store.delete(key);
        return false;
      }

      return true;
    },

    prune() {
      return Promise.resolve(store.prune());
    },

    async set(key, value, ttl) {
      validateTtl(ttl);
      const effectiveTtl = ttl ?? defaultTtl;
      const entry = {
        expiry:
          effectiveTtl === undefined ? undefined : Date.now() + effectiveTtl,
        value,
      };

      await store.set(key, entry);
    },
  };
}
