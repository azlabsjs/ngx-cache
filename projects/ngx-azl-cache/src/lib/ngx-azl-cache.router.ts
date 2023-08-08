import {
  Inject,
  Injectable,
  Injector,
  OnDestroy,
  Optional,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import {
  debounceTime,
  filter,
  ObservableInput,
  Subject,
  takeUntil,
  tap,
} from 'rxjs';
import { defaultConfigs } from './defaults';
import { AzlCacheProvider } from './ngx-azl-cache.service';
import { AzlCacheProviderConfigType, QueryConfigType } from './types';
import { AZL_CACHE_PROVIDER_CONFIG } from './tokens';

@Injectable()
export class AzlCacheRouter implements OnDestroy {
  //#region Class properties
  private readonly _destroy$ = new Subject<void>();
  private _cache: Map<string, boolean> | null = new Map();
  private config!: AzlCacheProviderConfigType;
  //#endregion Class properties

  /**
   * Creates an instance of {@see AzlCacheRouter} service class
   */
  constructor(
    private injector: Injector,
    @Optional() private router?: Router,
    @Optional() private provider?: AzlCacheProvider,
    @Inject(AZL_CACHE_PROVIDER_CONFIG)
    @Optional()
    config?: AzlCacheProviderConfigType
  ) {
    this.config = config ?? defaultConfigs;
  }

  /**
   * Provides a subscription
   *
   * @param unsubscribeNotifier
   */
  public subscribe(unsubscribeNotifier?: ObservableInput<unknown>) {
    if (
      this.config &&
      typeof this.config.router &&
      this.config.router?.slicesFactory
    ) {
      const slices =
        typeof this.config.router.slicesFactory === 'function'
          ? this.config.router.slicesFactory(this.injector)
          : this.config.router.slicesFactory;
      this.router?.events
        .pipe(
          filter((events) => events instanceof NavigationEnd),
          debounceTime(500),
          tap((event) => {
            const _event = event as NavigationEnd;
            const url = _event.urlAfterRedirects;
            if (slices) {
              for (const path of Object.keys(slices)) {
                if (this._cache?.has(path)) {
                  continue;
                }
                const _path = path.startsWith('/') ? path : `/${path}`;
                // TODO: If required in future release use regular expression
                const _cachedQueries = this.provider?.getRequestConfigs() ?? [];
                const value = slices[path];
                if (url.startsWith(_path) && value) {
                  const slice: QueryConfigType[] = [];
                  for (const query of value) {
                    if (typeof query === 'undefined' || query === null) {
                      continue;
                    }
                    if (typeof query === 'string') {
                      const result = _cachedQueries.find(
                        (current) => current.key === query
                      );
                      if (result) {
                        slice.push(result);
                      }
                      continue;
                    }

                    // Add the query to list of configuration cache
                    this.provider?.addRequestConfig(query);

                    // Push the query on top of the query stack
                    slice.push(query);
                  }
                  this.provider?.loadSlice(slice);
                  // Case a slice is loaded for a given path, we add the path
                  // to the route load internal cache, in order to not reload it again
                  this._cache?.set(path, true);
                }
              }
            }
          }),
          takeUntil(unsubscribeNotifier ? unsubscribeNotifier : this._destroy$)
        )
        .subscribe();
    }
  }

  // Service destructor
  ngOnDestroy(): void {
    this._destroy$.next();
    this._cache = null;
  }
}
