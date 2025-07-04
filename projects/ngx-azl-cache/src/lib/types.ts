import { Injector } from '@angular/core';
import {
  CacheQueryConfig,
  QueryProviderType,
  ObserveKeyType,
} from '@azlabsjs/rx-query';
import { Observable } from 'rxjs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UnknownType = any;

/** @internal */
export type PaginationChunkReturnType = (
  total: number,
  perPage: number,
  chunkSize: number
) => number[][];

/**
 * Query object for selecting values from the query data source at runtime
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
  setCacheConfig(state: Partial<QueryCacheConfigType>): CacheQueryProviderType;

  /**
   * Creates a copy of the {@see AzlCacheQueryProviderType} instance
   */
  copy(): CacheQueryProviderType;
};

/** @internal */
export type ResponseInterceptorType = <T>(
  response: T
) => Record<string, unknown>[];

/**
 * Provides module configuration type
 */
export type ProviderConfigType = {
  debug?: boolean;
  logger?: {
    log: (message: string, ...args: unknown[]) => void | Promise<void>;
  };
  chunkSize?: number;
  queryInterval?: number;
  responseInterceptor?: ResponseInterceptorType;
  pagination?: {
    perPage: number;
  };
  requests?: RequestConfigs;
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

/** @description Type declaration for queried page */
export type PageResult<T = unknown> = {
  total: number;
  data: T[];
  lastPage?: number;
  nextPageURL?: string;
  lastPageURL?: string;
  page?: number;
};

/** @internal */
export type HttpClientType = {
  request: <T = UnknownType>(
    method: string,
    url: string,
    options?: {
      body?: UnknownType;
      headers?: {
        [header: string]: string | string[];
      };
      observe?: 'body';
      params?: {
        [param: string]:
          | string
          | number
          | boolean
          | ReadonlyArray<string | number | boolean>;
      };
      responseType?: 'json';
      reportProgress?: boolean;
      withCredentials?: boolean;
      transferCache?:
        | {
            includeHeaders?: string[];
          }
        | boolean;
    }
  ) => Observable<T>;
};

/** @internal */
export type HttpParamsType = {
  [param: string]:
    | string
    | number
    | boolean
    | ReadonlyArray<string | number | boolean>;
};

/** @description Query function type declaration */
export type QueryFnType = (
  method: string,
  endpoint: string,
  callback?: (items: Record<string, unknown>[], partial: boolean) => void,
  params?: HttpParamsType,
  responseInterceptor?: ResponseInterceptorType
) => Observable<unknown>;
