import { CUSTOM_ELEMENTS_SCHEMA, Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CacheDirective } from './ngx-azl-cache.directive';
import { CacheProvider } from './ngx-azl-cache.service';
import {
  AZL_CACHE_PROVIDER_CONFIG,
  AZL_CACHE_QUERY_CLIENT,
  REQUESTS,
} from './tokens';
import { defaultConfigs } from './defaults';
import { RequestConfigs } from './types';
import { HttpClient } from '@angular/common/http';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { HTTPQueryProvider } from './ngx-azl-cache-query.provider';
import { By } from '@angular/platform-browser';

type Post = {
  title?: string;
  label: string;
  id: number;
};

const testData: Post[] = [
  {
    title: 'Environments',
    label: 'More News',
    id: 2,
  },
  {
    label: 'Sports',
    id: 7,
  },
  {
    label: 'News',
    id: 8,
  },
];

@Component({
  template: `
    <p
      [azlCache]="'posts'"
      [template]="template"
      [search]="'id'"
      [query]="query"
    ></p>
  `,
})
export class TestComponent {
  @Input() query = 2;
  @Input() template: string | string[] = '{title}, {label} ({id})';
}

describe('HttpClient testing', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let fixture!: ComponentFixture<TestComponent>;

  beforeEach(() => {
    fixture = TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [TestComponent, CacheDirective],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        CacheProvider,
        HTTPQueryProvider,
        {
          provide: AZL_CACHE_PROVIDER_CONFIG,
          useValue: defaultConfigs,
        },
        {
          provide: REQUESTS,
          useValue: [
            {
              key: 'posts',
              endpoint: '/posts',
              method: 'POST',
            },
          ] as RequestConfigs,
        },
        {
          provide: AZL_CACHE_QUERY_CLIENT,
          useFactory: () => {
            return new HTTPQueryProvider(httpClient, defaultConfigs);
          },
        },
      ],
    }).createComponent(TestComponent);
    // Inject the http service and test controller for each test
    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  it('should have an HTML element with innerHTML equals `Environments, More News` when template equals `{title}, {label}`', () => {
    const el = fixture.debugElement.query(By.directive(CacheDirective));
    fixture.detectChanges(); // Trigger ngOnInit

    // Simulate HTTP request
    const req = httpTestingController.expectOne(
      '/posts?page=1&per_page=500&id=2'
    );
    req.flush({ data: testData });

    // Detect changes
    fixture.detectChanges();

    expect(el.nativeElement.textContent).toEqual('Environments, More News (2)');
  });

  it('should have an HTML element with innerHTML equals `Environments More News` when template equals ["title", "label"]', () => {
    const el = fixture.debugElement.query(By.directive(CacheDirective));

    fixture.componentInstance.template = ['title', 'label'];

    fixture.detectChanges(); // Trigger ngOnInit

    // Simulate HTTP request
    const req = httpTestingController.expectOne(
      '/posts?page=1&per_page=500&id=2'
    );
    req.flush({ data: testData });

    // Detect changes
    fixture.detectChanges();

    expect(el.nativeElement.textContent).toEqual('Environments More News');
  });

  it('should have an HTML element with innerHTML equals `Environments` when template equals `title`', () => {
    const el = fixture.debugElement.query(By.directive(CacheDirective));

    fixture.componentInstance.template = 'title';

    fixture.detectChanges(); // Trigger ngOnInit

    // Simulate HTTP request
    const req = httpTestingController.expectOne(
      '/posts?page=1&per_page=500&id=2'
    );
    req.flush({ data: testData });

    // Detect changes
    fixture.detectChanges();

    expect(el.nativeElement.textContent).toEqual('Environments');
  });

  it('should expect the http request to be sent with id=8 on intialization', () => {
    fixture.componentInstance.query = 8;

    fixture.detectChanges(); // Trigger ngOnInit
    // The following `expectOne()` will match the request's URL.
    // If no requests or multiple requests matched that URL
    // `expectOne()` would throw.
    const req = httpTestingController.expectOne(
      '/posts?page=1&per_page=500&id=8'
    );

    // Assert that the request is a POST request.
    expect(req.request.method).toEqual('POST');

    // Respond with mock data, causing Observable to resolve.
    // Subscribe callback asserts that correct data was returned.
    req.flush({ data: testData });
  });

  afterEach(() => {
    // After every test, assert that there are no more pending requests.
    httpTestingController.verify();
    // simulate the completion of time
    // discardPeriodicTasks();
  });
});
