import { InjectionToken, Injector } from "@angular/core";
import { ObserveKeyType } from "@azlabsjs/ngx-query";
import { CacheQueryConfig, QueryProviderType } from "@azlabsjs/rx-query";
import { Observable } from "rxjs";

/**
 * @internal
 */
export type PaginationChunkReturnType = (
  total: number,
  perPage: number,
  chunkSize: number
) => number[][];

/**
 * @internal
 */
export type QueryCacheConfigType = CacheQueryConfig & {
  name: string;
  observe?: ObserveKeyType;
};

/**
 * Type definition of the azl cache query provider type
 */
export type AzlCacheQueryProviderType = QueryProviderType<
  [
    string,
    string,
    (items: Record<string, unknown>[], partial: boolean) => void,
    Record<string, string> | undefined,
    ResponseInterceptorType | undefined
  ]
> & {
  cacheConfig: QueryCacheConfigType;

  /**
   * Provides {@property cacheConfig} property setter implementation
   */
  setCacheConfig(state: Partial<QueryCacheConfigType>): AzlCacheQueryProviderType;

  /**
   * Creates a copy of the {@see AzlCacheQueryProviderType} instance
   */
  copy(config?: Partial<AzlCacheProviderConfigType>): AzlCacheQueryProviderType;
};

/**
 * @internal
 */
export type ResponseInterceptorType = <T extends any>(
  response: T
) => Record<string, unknown>[];

/**
 * Provides module configuration type
 */
export type AzlCacheProviderConfigType = {
  /**
   * Enables debugging flags on the library/module. While in debug mode, any changes of the cache
   * is console logged in the application environment standard output
   */
  debug: boolean;
  /**
   * Configures the max size of a slice chunk while fetching data to cache
   */
  chunkSize?: number;
  /**
   * Configure how long or the interval between the load of a chunk and the next chunk
   */
  queryInterval?: number;
  /**
   * **Note**
   * Cached values are refetch at the background while the application is running. This property allow
   * developper to configure the ttl of the cached values. This can be modified for each slice using the
   * `cacheConfig` property
   */
  refetchInterval?: number;

  /**
   * Provides an interceptor for request response object
   */
  responseInterceptor?: ResponseInterceptorType;

  /***
   * Provides configuration for pagination request. It mainly use is to configure the `per_page` parameter 
   * of a pagination query
   */
  pagination?: {
    perPage: number;
  };
  router?: {
    autoload: boolean;
    slicesFactory?:
      | { [k: string]: SliceQueryType }
      | ((injector: Injector) => { [k: string]: SliceQueryType });
  };
};

export const AZL_CACHE_QUERY_CLIENT = new InjectionToken<AzlCacheQueryProviderType>(
  "Azl cache query provider type"
);

export const AZL_CACHE_PROVIDER_CONFIG =
  new InjectionToken<AzlCacheProviderConfigType>(
    "Provides Azl cache provider configuration values"
  );

export type QueryConfigType = {
  key: string;
  endpoint: string;
  method?: string;
  params?: Record<string, string>;
  responseInterceptor?: ResponseInterceptorType;
  cacheConfig?: CacheQueryConfig;
};

/**
 * Query object for selecting values from the
 * query data source at runtime
 */
export type SliceQueryType = QueryConfigType[];

/**
 * Database collection synchronization provider. It provides
 * developpers with method for loading part of the database at the background
 * level on a predefined time basics
 */
export interface AzlCacheProviderType {
  /**
   * Cache readonly state property
   */
  readonly state$: Observable<Map<string, Record<string, unknown>[]>>;

  /**
   * Used by the cache provider to load a slice of the
   * application data at runtime. It's beneficiary for
   * composed application for load data only when a
   * feature module is loaded
   *
   * @param query
   */
  loadSlice(query: SliceQueryType): void;
}

export type PageResult<T = any> = {
  total: number;
  data: T[];
  lastPage?: number;
  nextPageURL?: string;
  lastPageURL?: string;
  page?: number;
};
