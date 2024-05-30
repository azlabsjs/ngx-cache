export { sliceQueryfactory } from './helpers';
export { NgxAzlCacheModule } from './cache.module';
export { CachePipe } from './cache.pipe';
export {
  /** @deprecated Use `Cache` instead */
  Cache as CacheProvider,
  Cache,
} from './cache.service';
export { CacheDirective } from './cache.directive';
export {
  ProviderConfigType,
  CacheProviderType,
  CacheQueryProviderType,
  PageResult,
  QueryConfigType,
  ResponseInterceptorType,
  SliceQueryType,
  RequestConfigs,
} from './types';
export {
  /** @deprecated */
  CACHE_PROVIDER_CONFIG as AZL_CACHE_PROVIDER_CONFIG,
  /** @deprecated */
  CACHE_QUERY_CLIENT as AZL_CACHE_QUERY_CLIENT,
  CACHE_PROVIDER_CONFIG,
  CACHE_QUERY_CLIENT,
} from './tokens';

/** Exported service providers */
export {
  provideCacheProviderConfig,
  provideForInitialization,
  provideQuerySlices,
} from './providers';

/** Exported standalone directives & pipes */
export { CACHE_DIRECTIVES } from './directives';
