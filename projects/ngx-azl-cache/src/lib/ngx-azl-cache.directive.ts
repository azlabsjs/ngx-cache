import {
  AfterViewInit,
  ChangeDetectorRef,
  Directive,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  OnDestroy,
  Optional,
  Output,
  ViewContainerRef,
} from '@angular/core';
import { CacheProvider } from './ngx-azl-cache.service';
import { Subscription, distinctUntilChanged, filter, map, tap } from 'rxjs';
import { DOCUMENT } from '@angular/common';
import { templateFactory } from './helpers';

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: '[azlCache]',
})
export class CacheDirective implements AfterViewInit, OnDestroy {
  // #region Directive inputs
  @Input('azlCache') key!: string;
  @Input() query!: string;
  @Input() search = 'id';
  @Input() template: string | string[] = 'label';
  // #endregion Directive inputs

  // #region Directive outputs
  @Output() valueChange = new EventEmitter<unknown>();
  // #endregion Directive outputs

  // #region Directive properties
  private _subscriptions: Subscription[] = [];
  // #endregion Directive properties

  // Directive constructor
  constructor(
    private element: ElementRef,
    private ref: ViewContainerRef,
    private changes: ChangeDetectorRef,
    @Inject(DOCUMENT) private document?: Document,
    @Optional() private provider?: CacheProvider
  ) {
    const _subscription = this.provider?.state$
      .pipe(
        map((state) => state.get(this.key)),
        filter((values) => typeof values !== 'undefined' && values !== null),
        map((records) => {
          const record =
            records?.find((c) => c[this.search] === this.query) ?? undefined;
          return record ? templateFactory(this.template)(record) : undefined;
        }),
        distinctUntilChanged(),
        // Case the text value is undefined, we append ... to indicate value is being loaded
        tap((text) => text ? this.appendTextNode(String(text)) : this.appendTextNode('...'))
      )
      .subscribe();
    if (_subscription) {
      this._subscriptions.push(_subscription);
    }
  }

  ngAfterViewInit(): void {
    if (typeof this.provider === 'undefined' || this.provider === null) {
      return;
    }
    const cachedQueries = this.provider?.getRequestConfigs() ?? [];
    const query = cachedQueries.find((value) => value.key === this.key);
    // Try a load slice call that might send a request to backend server
    // with the query parameter provided
    if (query) {
      this.provider.loadSlice([
        {
          ...query,
          params: { ...(query.params ?? {}), [this.search]: this.query },
        },
      ]);
    }
  }

  ngOnDestroy(): void {
    for (const subscription of this._subscriptions) {
      subscription.unsubscribe();
    }
  }

  private appendTextNode(text: string) {
    // Dispatch vent for new text value
    this.valueChange.emit(text);
    if (typeof this.document !== 'undefined' && this.document !== null) {
      // Clear container to append the newly created text node
      this.ref.clear();
      const textNode = this.document?.createTextNode(text);
      (this.element.nativeElement as Node).appendChild(textNode);
    }
    // Mark the directive for change detection
    this.changes?.markForCheck();
  }
}
