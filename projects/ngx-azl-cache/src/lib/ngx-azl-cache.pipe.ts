import {
  ChangeDetectorRef,
  Injectable,
  OnDestroy,
  Optional,
  Pipe,
  PipeTransform,
} from '@angular/core';
import { map, Subscription } from 'rxjs';
import { CacheProvider } from './ngx-azl-cache.service';
import { templateFactory } from './helpers';

@Pipe({
  name: 'azlcache',
  pure: false,
})
@Injectable()
export class CachePipe implements PipeTransform, OnDestroy {
  // #region Class properties
  private _latestValue: string | unknown = '...';
  private _ref: ChangeDetectorRef | null;
  private _subscription!: Subscription | null;
  private _search!: string | null;
  // #endregion Class properties

  /**
   * Creates a new {@see AzlDbValuePipe} pipe instance
   */
  constructor(
    ref: ChangeDetectorRef,
    @Optional() private provider: CacheProvider
  ) {
    // Assign `ref` into `this._ref` manually instead of declaring `_ref` in the constructor
    // parameter list, as the type of `this._ref` includes `null` unlike the type of `ref`.
    this._ref = ref;
  }

  /**
   * Creates a search key for the map object
   */
  private createSearchKey(
    query: string,
    name: string,
    key: string,
    value: string
  ) {
    return `${name}::${query}(${key}, ${value})`;
  }

  /**
   * Updates the internal result property of the
   * current pipe instance
   */
  private updateResult(
    search: string,
    query: string,
    name: string,
    prop = 'id',
    template: string | string[] = 'label'
  ) {
    if (
      typeof query === 'undefined' ||
      query === null ||
      !String(query).length
    ) {
      throw new Error(`"value" parameter required`);
    }
    if (typeof name === 'undefined' || name === null || !String(name).length) {
      throw new Error(`"name" parameter required`);
    }
    // Set the current search string to equals the search argument value
    this._search = search;

    // Trigger query
    this._triggerSliceQuery(name, prop, query);

    // Subscribe to provider state change to query
    this._subscription = this.provider.state$
      .pipe(
        map((state) => {
          let result!: unknown | null;
          const _result = state.get(name);
          if (typeof _result !== 'undefined' && _result !== null) {
            const _value = _result.find((s) => {
              return String(s[prop]) === String(query);
            });
            result = _value
              ? !template
                ? _value
                : templateFactory(template)(_value)
              : '';
          }
          return result;
        })
      )
      .subscribe((result: unknown) => {
        this._updateLatestValue(search, result);
      });
  }

  private _updateLatestValue(search: string, value: unknown): void {
    if (search === this._search) {
      this._latestValue = value ?? '...';
      // Note: `this._ref` is only cleared in `ngOnDestroy` so is known to be available when a
      // value is being updated.
      this._ref?.markForCheck();
    }
  }

  private dispose() {
    if (this._subscription) {
      this._subscription.unsubscribe();
    }
    this._latestValue = null;
    this._subscription = null;
    this._search = null;
  }

  /**
   * Trigger _slice query for the search key
   */
  private _triggerSliceQuery(key: string, search: string, value: string) {
    const cachedQueries = this.provider?.getRequestConfigs() ?? [];
    const query = cachedQueries.find((value) => value.key === key);
    // Try a load slice call that might send a request to backend server
    // with the query parameter provided
    if (query) {
      this.provider.loadSlice([
        {
          ...query,
          params: { ...(query.params ?? {}), [search]: value },
        },
      ]);
    }
  }

  /**
   * Transform user provided query value and return
   * the corresponding label from the db provider
   */
  transform(
    query: string | number,
    name: string,
    prop = 'id',
    template: string | string[] = 'label'
  ) {
    const _query = String(query);
    if (!_query || !_query.length) {
      return _query;
    }

    if (!name) {
      return _query;
    }

    if (typeof prop === 'undefined' || prop === null || !String(prop).length) {
      throw new Error(`"value" parameter required`);
    }

    const search = this.createSearchKey(
      _query,
      name,
      prop ?? 'id',
      Array.isArray(template) ? template.join() : String(template)
    );
    if (!this._search) {
      // if we ask another time for the same key, return the last value
      this.updateResult(search, _query, name, prop, template);
      return this._latestValue;
    }

    if (search !== this._search) {
      this.dispose();
      this.transform(query, name, prop, template);
    }

    return this._latestValue;
  }

  ngOnDestroy() {
    this.dispose();
    this._ref = null;
  }
}
