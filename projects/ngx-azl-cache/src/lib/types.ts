import { Injector } from '@angular/core';
import { ObserveKeyType } from '@azlabsjs/ngx-query';
import { CacheQueryConfig, QueryProviderType } from '@azlabsjs/rx-query';
import { Observable } from 'rxjs';

/**
 * @internal
 */
export type PaginationChunkReturnType = (
  total: number,
  perPage: number,
  chunkSize: number
) => number[][];

/**
 * Query object for selecting values from the
 * query data source at runtime
 */
export type SliceQueryType = (QueryConfigType | string)[];

/**
 * @internal
 */
export type RequestConfigs =
  | QueryConfigType[]
  | ((injector: Injector) => QueryConfigType[]);

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
export type CacheQueryProviderType = QueryProviderType<
  [
    string,
    string,
    ((items: Record<string, unknown>[], partial: boolean) => void) | undefined,
    Record<string, string> | undefined,
    ResponseInterceptorType | undefined
  ]
> & {
  cacheConfig: QueryCacheConfigType;

  /**
   * Provides {@property cacheConfig} property setter implementation
   */
  setCacheConfig(
    state: Partial<QueryCacheConfigType>
  ): CacheQueryProviderType;

  /**
   * Creates a copy of the {@see AzlCacheQueryProviderType} instance
   */
  copy(): CacheQueryProviderType;
};

/**
 * @internal
 */
export type ResponseInterceptorType = <T>(
  response: T
) => Record<string, unknown>[];

/**
 * Provides module configuration type
 */
export type ProviderConfigType = {
  debug: boolean;
  chunkSize?: number;
  queryInterval?: number;
  responseInterceptor?: ResponseInterceptorType;
  pagination?: {
    perPage: number;
  };
  requests: RequestConfigs;
  router?: {
    autoload: boolean;
    slicesFactory?:
      | { [k: string]: SliceQueryType }
      | ((injector: Injector) => { [k: string]: SliceQueryType });
  };
};

export type QueryConfigType = {
  key: string;
  endpoint: string;
  method?: string;
  params?: Record<string, string>;
  responseInterceptor?: ResponseInterceptorType;
  cacheConfig?: CacheQueryConfig;
};

/**
 * Database collection synchronization provider. It provides
 * developpers with method for loading part of the database at the background
 * level on a predefined time basics
 */
export interface CacheProviderType {
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

  /**
   * Returns the list of cached queries for the current provider
   */
  getRequestConfigs(): QueryConfigType[];

  /**
   * Add a new query to the configured list of queries
   * 
   * @param query 
   */
  addRequestConfig(query: QueryConfigType): void;
}

export type PageResult<T = unknown> = {
  total: number;
  data: T[];
  lastPage?: number;
  nextPageURL?: string;
  lastPageURL?: string;
  page?: number;
};
