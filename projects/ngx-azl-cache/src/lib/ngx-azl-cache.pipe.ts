import {
  ChangeDetectorRef,
  Injectable,
  OnDestroy,
  Optional,
  Pipe,
  PipeTransform
} from '@angular/core';
import { distinctUntilChanged, Subject, takeUntil, tap } from 'rxjs';
import { AzlCacheProvider } from './ngx-azl-cache.service';

function querycachedvalue(
  query: string,
  name: string,
  key: string,
  label: string
) {
  return (state: Map<string, Record<string, unknown>[]>) => {
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
    let result = '';
    const _result = state.get(name);
    if (typeof _result !== 'undefined' && _result !== null) {
      const _value = _result.find((s) => {
        return String(s[key]) === String(query);
      });
      if (_value) {
        result = (_value[label] as string) ?? '';
      }
    }
    return result;
  };
}

@Pipe({
  name: 'azlcache',
  pure: false,
})
@Injectable()
export class AzlCachePipe implements PipeTransform, OnDestroy {
  // #region Class properties
  private result: Map<string, { lastparams: string[]; value: string }> | null =
    new Map();
  private _destroy$ = new Subject<void>();
  private _ref: ChangeDetectorRef | null;
  private _cache!: Map<string, Record<string, unknown>[]>;
  // #endregion Class properties

  /**
   * Creates a new {@see AzlDbValuePipe} pipe instance
   */
  constructor(
    ref: ChangeDetectorRef,
    @Optional() private provider?: AzlCacheProvider
  ) {
    // Assign `ref` into `this._ref` manually instead of declaring `_ref` in the constructor
    // parameter list, as the type of `this._ref` includes `null` unlike the type of `ref`.
    this._ref = ref;
    // Subscribe to the cache state and set the _cache property of the pipe
    this.provider?.state$
      .pipe(
        distinctUntilChanged(),
        tap((state) => (this._cache = state)),
        tap(() => this._ref?.markForCheck()),
        takeUntil(this._destroy$)
      )
      .subscribe();
  }

  //
  /**
   * Compares the provided parameters agains the last
   * parameters values
   */
  private exists(searchkey: string, params: string[]) {
    if (typeof this.result === 'undefined' || this.result === null) {
      return false;
    }
    if (!this.result.has(searchkey)) {
      return false;
    }
    const lastparams = this.result.get(searchkey)?.lastparams ?? [];
    let exists = true;
    for (let index = 0; index < params.length; index++) {
      if (lastparams[index] !== params[index]) {
        exists = false;
        break;
      }
    }
    return exists;
  }

  /**
   * Creates a search key for the map object
   */
  private createSearchKey(query: string, name: string) {
    return `${name}::${query}`;
  }

  /**
   * Updates the internal result property of the
   * current pipe instance
   */
  private updateResult(
    query: string,
    name: string,
    key: string = 'id',
    label: string = 'label'
  ) {
    let onResult = (res: string) => {
      if (res !== undefined && res !== null) {
        if (this.result) {
          this.result = this.result.set(this.createSearchKey(query, name), {
            value: res,
            lastparams: [name, key, label],
          });
        }
      }
      // Note: `this._ref` is only cleared in `ngOnDestroy` so is known to be available when a
      // value is being updated.
      this._ref!.markForCheck();
    };
    // TODO: Remove the code below if the pipe synchronizes as expected
    // this.provider?.state$
    // .pipe(
    //   map(querycachedvalue(query, name, key, label)),
    //   tap(onResult),
    //   takeUntil(this._destroy$)
    // )
    // .subscribe();
    onResult(
      querycachedvalue(query, name, key, label)(this._cache ?? new Map())
    );
  }

  /**
   * Transform user provided query value and return
   * the corresponding label from the db provider
   */
  transform(
    query: string | number,
    name: string,
    key: string = 'id',
    label: string = 'label'
  ) {
    const _query = String(query);
    if (!_query || !_query.length) {
      return _query;
    }
    // if we ask another time for the same key, return the last value
    const searchkey = this.createSearchKey(_query, name);
    if (this.exists(searchkey, [name, key, label])) {
      return this.result?.get(searchkey)?.value ?? '';
    }
    this.updateResult(_query, name, key, label);
    return '';
  }

  /**
   * {@inheritdoc}
   *
   * Provides object destruction implementation
   */
  ngOnDestroy() {
    this._destroy$.next();
    this._ref = null;
    this.result = null;
  }
}
