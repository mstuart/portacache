# portacache

> Portable key-value cache that auto-selects the best storage backend

## Install

```sh
npm install portacache
```

## Usage

```js
import createCache from 'portacache';

const cache = createCache({ttl: 5000});

await cache.set('user', {name: 'Alice'});

await cache.get('user');
//=> {name: 'Alice'}

await cache.has('user');
//=> true

await cache.delete('user');
//=> true

await cache.clear();
```

## API

### createCache(options?)

Returns a cache instance with `get`, `set`, `has`, `delete`, and `clear` methods. All methods are async and return promises.

#### options

Type: `object`

##### backend

Type: `'auto' | 'memory'`\
Default: `'auto'`

The storage backend to use. Currently defaults to an in-memory Map store.

##### ttl

Type: `number`

Default TTL in milliseconds for cache entries.

### cache.get(key)

Returns the cached value, or `undefined` if not found or expired.

### cache.set(key, value, ttl?)

Store a value in the cache. Optionally pass a per-entry `ttl` in milliseconds that overrides the default.

### cache.has(key)

Returns `true` if the key exists and has not expired.

### cache.delete(key)

Delete a key from the cache. Returns `true` if the key was deleted.

### cache.clear()

Clear all entries from the cache.

## Related

- [is-runtime](https://github.com/mstuart/is-runtime) - Detect the current JavaScript runtime environment

## License

MIT
