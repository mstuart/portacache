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
    async get(key) {
      const entry = await store.get(key);

      if (entry === undefined) {
        return;
      }

      if (entry.expiry !== undefined && Date.now() >= entry.expiry) {
        await store.delete(key);
        return;
      }

      return entry.value;
    },

    async has(key) {
      const entry = await store.get(key);

      if (entry === undefined) {
        return false;
      }

      if (entry.expiry !== undefined && Date.now() >= entry.expiry) {
        await store.delete(key);
        return false;
      }

      return true;
    },

    async set(key, value, ttl) {
      const effectiveTtl = ttl ?? defaultTtl;
      validateTtl(effectiveTtl);
      const entry = {
        expiry:
          effectiveTtl === undefined ? undefined : Date.now() + effectiveTtl,
        value,
      };

      await store.set(key, entry);
    },
  };
}
