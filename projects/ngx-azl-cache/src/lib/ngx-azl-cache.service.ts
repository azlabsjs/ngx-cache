import {
  Inject,
  Injectable,
  Injector,
  OnDestroy,
  Optional
} from '@angular/core';
import { useQuery } from '@azlabsjs/ngx-query';
import {
  BehaviorSubject,
  forkJoin,
  interval,
  mergeMap,
  Subject,
  take,
  takeUntil
} from 'rxjs';
import { CHUNK_SIZE_LIMIT, defaultConfigs, QUERY_INTERVAL } from './defaults';
import {
  AzlCacheProviderConfigType,
  AzlCacheProviderType,
  AZL_CACHE_PROVIDER_CONFIG,
  AZL_CACHE_QUERY_CLIENT,
  QueryConfigType,
  SliceQueryType
} from './types';

@Injectable()
export class AzlCacheProvider implements AzlCacheProviderType, OnDestroy {
  // #region class properties
  private _state$ = new BehaviorSubject(
    new Map<string, Record<string, unknown>[]>()
  );
  get state$() {
    return this._state$.asObservable();
  }
  private _destroy$ = new Subject<void>();
  // #region class properties

  constructor(
    private injector: Injector,
    @Inject(AZL_CACHE_PROVIDER_CONFIG)
    @Optional()
    private config: AzlCacheProviderConfigType = defaultConfigs
  ) {
    // For debugging purpose
    if (this.config.debug) {
      this.state$
        .pipe(takeUntil(this._destroy$))
        .subscribe((state) => console.log('azl cache state: ', state));
    }
  }

  loadSlice(query: SliceQueryType) {
    // For better performance and in order not to load the server
    // with request, we will create a chunk of query parameters
    // We default the chunk size to 5, if configuration instance is not injected
    let chunksize = this.config?.chunkSize ?? CHUNK_SIZE_LIMIT;
    //  Block the maximum of request to 15 request per chunk to avoid
    // server overload and rate limit request errors
    chunksize = Math.min(chunksize, 15); //
    const chunks = this.chunkQueryParams(query, chunksize);
    let _interval = 0;
    // For the first chunk we do not provide any delay
    // const requests = [
    //   forkJoin(chunks[0].map((param) => this.querySlice(param))),
    // ];
    forkJoin(chunks[0].map((param) => this.querySlice(param)))
      .pipe(takeUntil(this._destroy$))
      .subscribe();
    for (const chunk of chunks.slice(1)) {
      // We assume each request takes a maximum of 1 seconds, we use a query interval of number
      // of chunks divided by 2 for each chunk
      _interval +=
        this.config?.queryInterval ??
        (chunksize ? (chunksize * 1000) / 2 : QUERY_INTERVAL);
      interval(_interval)
        .pipe(
          take(1),
          mergeMap(() => forkJoin(chunk.map((param) => this.querySlice(param))))
        )
        .pipe(takeUntil(this._destroy$))
        .subscribe();
    }
    // forkJoin(requests).pipe(takeUntil(this._destroy$)).subscribe();
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
    const _instance = this.injector.get(AZL_CACHE_QUERY_CLIENT);
    // Check if the provider was resolved successfully. If the provider
    // value resolves to undefined or null, we throw an exception like the
    // angular internal dependency injector
    if (typeof _instance === 'undefined' || _instance === null) {
      throw new Error(`No Provider for ${AZL_CACHE_QUERY_CLIENT.toString()}`);
    }
    // Make a copy of the query provider, to avoid object mutation when updating cache
    // configuration
    const provider = _instance.copy();
    // To support cache configuration for each query data to be loaded,
    // We update the state of the query client using developper provided one
    if (param.cacheConfig) {
      provider.setCacheConfig({
        ...param.cacheConfig,
        // We add the name attribe to add more caching customization
        // to the query library cache calls
        name: key,
        // We make sure we always observe, the body of the query request
        observe: 'body',
      });
    } else {
      provider.setCacheConfig({
        // We add the name attribe to add more caching customization
        // to the query library cache calls
        name: key,
        // We make sure we always observe, the body of the query request
        observe: 'body',
      });
    }
    // Returns the result of the useQuery() function implementation
    return useQuery(
      provider,
      method ?? 'GET',
      endpoint,
      this.createResponseCallback(key).bind(this),
      params,
      responseInterceptor ?? this.config?.responseInterceptor
    );
  }

  /**
   * Creates a callback that is invoked whenever a new slice of
   * data is loaded from the backend server. It will notify the cache
   * store whenever the data became available
   */
  createResponseCallback(key: string) {
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
    this._destroy$.next();
  }
}
