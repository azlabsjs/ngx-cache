import {
  Inject,
  Injectable,
  OnDestroy,
  Optional,
} from '@angular/core';
import {
  BehaviorSubject,
  forkJoin,
  interval,
  mergeMap,
  Subscription,
  take,
} from 'rxjs';
import {
  CHUNK_SIZE_LIMIT,
  DEFAULT_QUERY_REFECTH_INTERVAL,
  defaultConfigs,
  QUERY_INTERVAL,
} from './defaults';
import {
  ProviderConfigType,
  CacheProviderType,
  QueryConfigType,
} from './types';

import { CACHE_PROVIDER_CONFIG, REQUESTS } from './tokens';
import { CacheQueryConfig, useDebug, useQuery } from '@azlabsjs/rx-query';
import { HttpClient } from '@angular/common/http';
import { useHTTPQuery } from './helpers';

const CACHE_NAME_PREFIX = `query::bindTo[RESTQueryProvider]`;

@Injectable({
  providedIn: 'root',
})
export class Cache implements CacheProviderType, OnDestroy {
  // #region class properties
  private _state$ = new BehaviorSubject(
    new Map<string, Record<string, unknown>[]>()
  );
  get state$() {
    return this._state$.asObservable();
  }
  private _subscriptions: Subscription[] = [];

  // Private property used in caching slice queries
  private requests: QueryConfigType[] = [];
  private aliases: string[] = [];
  private config!: ProviderConfigType;
  // #region class properties

  constructor(
    private httpClient: HttpClient,
    @Inject(REQUESTS) _requests: QueryConfigType[],
    @Inject(CACHE_PROVIDER_CONFIG)
    @Optional()
    config?: ProviderConfigType
  ) {
    this.config = config ?? defaultConfigs;
    this.requests = Array.isArray(this.requests) ? [..._requests] : [];

    const { config: c } = this;
    // For debugging purpose
    if (c.debug) {
      this._subscriptions.push(
        this.state$.subscribe((state) =>
          c.logger
            ? c.logger.log('ngx-cache state: ', state)
            : console.log('ngx-cache state: ', state)
        )
      );
    }

    // Add all request aliases to the aliases array
    for (const request of this.requests) {
      this.aliases.push(request.key);
    }
  }

  loadSlice(query: QueryConfigType[]) {
    // For better performance and in order not to load the server
    // with request, we will create a chunk of query parameters
    // We default the chunk size to 5, if configuration instance is not injected
    let chunksize = this.config?.chunkSize ?? CHUNK_SIZE_LIMIT;
    //  Block the maximum of request to 15 request per chunk to avoid
    // server overload and rate limit request errors
    chunksize = Math.min(chunksize, 15); //
    const chunks = this.chunkQueryParams(query, chunksize);
    let _interval = 0;
    this._subscriptions.push(
      forkJoin(chunks[0].map((param) => this.querySlice(param))).subscribe()
    );
    for (const chunk of chunks.slice(1)) {
      // We assume each request takes a maximum of 1 seconds, we use a query interval of number
      // of chunks divided by 2 for each chunk
      _interval +=
        this.config?.queryInterval ??
        (chunksize ? (chunksize * 1000) / 2 : QUERY_INTERVAL);
      const _subscription = interval(_interval)
        .pipe(
          take(1),
          mergeMap(() => forkJoin(chunk.map((param) => this.querySlice(param))))
        )
        .subscribe();
      this._subscriptions.push(_subscription);
    }
  }

  getRequestConfigs() {
    return this.requests;
  }

  addRequestConfig(query: QueryConfigType): void {
    if (this.aliases.indexOf(query.key) !== -1) {
      return;
    }
    this.requests.push(query);
  }

  /**
   * Chuck the query parameters in a predefined size
   */
  private chunkQueryParams<T>(list: T[], size: number): T[][] {
    const temp = [];
    for (let index = 0; index < list.length; index += size) {
      temp.push(list.slice(index, index + size));
    }
    return temp;
  }

  /**
   * Send Query for a given database collection query parameter using the query
   * cache provider
   */
  private querySlice(param: QueryConfigType) {
    const { method, endpoint, params, responseInterceptor, key } = param;
    const provider = useHTTPQuery(this.httpClient, this.config);

    // To support cache configuration for each query data to be loaded,
    // We update the state of the query client using developper provided one
    const cacheConfig: CacheQueryConfig & {
      name: string;
      cacheQuery: boolean;
      observe: string;
    } = param.cacheConfig
      ? {
          refetchInterval: DEFAULT_QUERY_REFECTH_INTERVAL,
          ...param.cacheConfig,
          name: key ? `${CACHE_NAME_PREFIX}::${key}` : CACHE_NAME_PREFIX,
          // We make sure we always observe, the body of the query request
          observe: 'body',
          cacheQuery: true,
        }
      : {
          refetchInterval: DEFAULT_QUERY_REFECTH_INTERVAL,
          name: key,
          // We make sure we always observe, the body of the query request
          observe: 'body',
          cacheQuery: true,
        };

    return this.config && true === Boolean(this.config.debug)
      ? useDebug(
          this.config.logger ?? {
            log: console.log,
          }
        )(
          provider,
          method ?? 'GET',
          endpoint,
          this.createResponseCallback(key).bind(this),
          params,
          responseInterceptor ?? this.config?.responseInterceptor,
          cacheConfig
        )
      : useQuery(
          provider,
          method ?? 'GET',
          endpoint,
          this.createResponseCallback(key).bind(this),
          params,
          responseInterceptor ?? this.config?.responseInterceptor,
          cacheConfig
        );
  }

  /**
   * Creates a callback that is invoked whenever a new slice of
   * data is loaded from the backend server. It will notify the cache
   * store whenever the data became available
   */
  private createResponseCallback(key: string) {
    return (items: Record<string, unknown>[], partial: boolean) => {
      const cache = this._state$.getValue();
      if (partial && cache.has(key) && (cache.get(key) ?? []).length !== 0) {
        return;
      }
      this._state$.next(cache.set(key, items));
    };
  }

  /**
   * {@inheritdoc}
   *
   * Provides object destruction implementation
   */
  ngOnDestroy() {
    for (const subscription of this._subscriptions) {
      subscription.unsubscribe();
    }
  }
}
