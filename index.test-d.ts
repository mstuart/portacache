import {expectType, expectError} from 'tsd';
import createCache, {type Cache, type CacheOptions} from './index.js';

const cache = createCache();
expectType<Cache>(cache);

const cacheWithOptions = createCache({backend: 'memory', ttl: 5000});
expectType<Cache>(cacheWithOptions);

expectType<Promise<unknown>>(cache.get('key'));
expectType<Promise<void>>(cache.set('key', 'value'));
expectType<Promise<void>>(cache.set('key', 'value', 1000));
expectType<Promise<boolean>>(cache.has('key'));
expectType<Promise<boolean>>(cache.delete('key'));
expectType<Promise<void>>(cache.clear());

expectError(createCache({backend: 'invalid'}));
