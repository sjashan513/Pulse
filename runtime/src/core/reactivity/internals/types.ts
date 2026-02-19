import { Resource } from "../createResource";

export interface Reactive<T> {
  readonly value: T;
  readonly level: number;
  subscribe(observer: SignalObserver): void;
  unsubscribe(observer: SignalObserver): void;
}



export interface SignalObserver {
  readonly level: number;
  notify(): void;
  run(): void;
  trackDependency(reactiveNode: Reactive<unknown>): void;
  dispose(): void;
}

export interface Container {
  addPrimitive(primitive: SignalObserver): void;
  dispose(): void;
}

export type EffectFn = () => void;
export type ScopeFn = () => void;




// Options for any HTTP request, mirroring the standard Fetch API options.
export interface HttpClientOptions extends Omit<RequestInit, 'body'> {
  // We allow the body to be any object, and we will stringify it.
  body?: any;
}

// Specific options for a GET request.
export interface HttpGetOptions extends HttpClientOptions {
  // The optional reactive source. If provided, the request becomes reactive.
  source?: () => any;
}

// The interface for our class, defining the methods developers will use.
export interface IHttpClient {
  get<T>(url: string, options?: HttpGetOptions): Resource<T>;
  post<T>(url: string, options?: HttpClientOptions): Promise<T>;
  put<T>(url: string, options?: HttpClientOptions): Promise<T>;
  delete<T>(url: string, options?: HttpClientOptions): Promise<T>;
}
