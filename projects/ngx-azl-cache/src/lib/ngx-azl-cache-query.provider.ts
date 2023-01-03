import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable, Optional } from '@angular/core';
import { map, mergeMap, Observable, of, tap } from 'rxjs';
import {
  CHUNK_SIZE_LIMIT,
  defaultConfigs,
  DEFAULT_QUERY_REFECTH_INTERVAL
} from './defaults';
import {
  createPaginationChunk,
  queryPaginationate
} from './ngx-azl-cache-query.helpers';
import {
  AzlCacheProviderConfigType, AzlCacheQueryProviderType, AZL_CACHE_PROVIDER_CONFIG,
  PageResult,
  QueryCacheConfigType,
  ResponseInterceptorType
} from './types';

@Injectable()
export class RESTQueryProvider implements AzlCacheQueryProviderType {
  // #region Service properties
  _cacheConfig!: QueryCacheConfigType;
  get cacheConfig() {
    return this._cacheConfig;
  }
  private static cacheConfigNamePrefix = `query::bindTo[RESTQueryProvider]`;
  // #endregion Service properties

  constructor(
    private http: HttpClient,
    @Inject(AZL_CACHE_PROVIDER_CONFIG)
    @Optional()
    private readonly config: AzlCacheProviderConfigType = defaultConfigs
  ) {
    this._cacheConfig = {
      observe: 'body',
      name: RESTQueryProvider.cacheConfigNamePrefix,
      refetchInterval: DEFAULT_QUERY_REFECTH_INTERVAL,
    };
  }

  // cacheConfig  Setter
  setCacheConfig(state: Partial<QueryCacheConfigType>) {
    this._cacheConfig = {
      ...(this._cacheConfig ?? {}),
      ...state,
      name: state.name
        ? `${RESTQueryProvider.cacheConfigNamePrefix}::${state.name}`
        : RESTQueryProvider.cacheConfigNamePrefix,
      // We make sure we always observe, the body of the query request
      observe: 'body',
    };
    return this;
  }

  copy() {
    return new RESTQueryProvider(this.http, this.config);
  }

  /**
   * {@inheritdoc}
   *
   * Instead of returning an observable of item we make use of a callback function
   * that can be invoked at any stage of the query implementation.
   *
   * We aim for such implementation in order to load the first page of the paginated
   * data and display it to the user whenever requested, and load the remaining pages
   * in background and notify the db provider when the data is fully loaded
   */
  query(
    method: string,
    endpoint: string,
    callback: (items: Record<string, unknown>[], partial: boolean) => void,
    params?: Record<string, string>,
    responseInterceptor?: ResponseInterceptorType
  ) {
    // First thing first, we query for the first page of the collection
    // The result of the first page query is expected to return a pgaination instance
    // and we use the pagination result meta data to query for the remaining pages
    return this.sendRequest(
      method,
      this.prepareForPagination(endpoint, 1),
      params
    ).pipe(
      mergeMap((response: PageResult) => {
        // First pagination chunk
        const items = (
          responseInterceptor ?? ((response: PageResult) => response.data)
        )(response);
        // When the first page of data is loaded, we call the callback function
        // with the loaded data with the partial flag turns on
        callback(items, true);
        if (
          response.total &&
          response.total !== null &&
          typeof response.total !== 'undefined' &&
          // Add a condition that checks if the total items
          // is not greater than the length of the list of query result items
          Number(response.total) > items.length
        ) {
          return queryPaginationate(
            (page) =>
              this.sendRequest(
                method,
                this.prepareForPagination(endpoint, page),
                params
              ).pipe(
                map(
                  responseInterceptor ??
                    ((response: PageResult) => response.data)
                )
              ),
            response.total,
            this.config.pagination?.perPage ??
              defaultConfigs.pagination?.perPage ??
              500,
            this.config.chunkSize ??
              defaultConfigs.chunkSize ??
              CHUNK_SIZE_LIMIT,
            this.config.queryInterval ?? defaultConfigs.queryInterval
          )(createPaginationChunk).pipe(
            // When the pagination data is completed loading, we fetch call the callback
            // with result items, and the partial flag turned off
            tap((state) => callback([...items, ...state.flat()], false)),
            map((_) => true)
          );
        }
        return of(true);
      })
    );
  }

  /**
   * Prepare query endpoint for pagination
   */
  private prepareForPagination(endpoint: string, page: number) {
    endpoint = endpoint ?? '';
    if (endpoint.indexOf('?') === -1) {
      endpoint += '?';
    }
    if (endpoint.indexOf('per_page') === -1) {
      // The per_page request query is set to be a number between
      // 100 - 1000 just for optimization and server performance purpose
      const paginationQuery = `page=${page}&per_page=${Math.min(
        1000,
        Math.max(this.config.pagination?.perPage ?? 100, 100)
      )}`;
      endpoint += endpoint.endsWith('?')
        ? paginationQuery
        : `&${paginationQuery}`;
    }
    return endpoint;
  }

  /**
   * Actually send HTTP request to the backend server
   */
  private sendRequest(
    method: string,
    endpoint: string,
    params?: Record<string, string>
  ) {
    return this.http.request(method, endpoint, {
      params: new HttpParams({ fromObject: params }),
      responseType: 'json',
    }) as Observable<PageResult>;
  }
}
