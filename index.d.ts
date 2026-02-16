export type CacheOptions = {
	/**
	The storage backend to use.

	@default 'auto'
	*/
	readonly backend?: 'auto' | 'memory';

	/**
	Default TTL in milliseconds for cache entries.
	*/
	readonly ttl?: number;
};

export type Cache = {
	/**
	Get a value from the cache.

	@param key - The cache key.
	@returns The cached value, or `undefined` if not found or expired.

	@example
	```
	import createCache from 'portacache';

	const cache = createCache();
	await cache.set('key', 'value');
	await cache.get('key');
	//=> 'value'
	```
	*/
	get(key: string): Promise<unknown>;

	/**
	Set a value in the cache.

	@param key - The cache key.
	@param value - The value to store.
	@param ttl - Optional TTL in milliseconds, overrides the default.
	*/
	set(key: string, value: unknown, ttl?: number): Promise<void>;

	/**
	Check if a key exists in the cache (respects TTL).

	@param key - The cache key.
	@returns `true` if the key exists and has not expired.
	*/
	has(key: string): Promise<boolean>;

	/**
	Delete a key from the cache.

	@param key - The cache key.
	@returns `true` if the key was deleted.
	*/
	delete(key: string): Promise<boolean>;

	/**
	Clear all entries from the cache.
	*/
	clear(): Promise<void>;
};

/**
Create a portable key-value cache.

@param options - Cache configuration options.
@returns A cache instance with get, set, has, delete, and clear methods.

@example
```
import createCache from 'portacache';

const cache = createCache({ttl: 5000});
await cache.set('key', 'value');
await cache.get('key');
//=> 'value'
```
*/
export default function createCache(options?: CacheOptions): Cache;
