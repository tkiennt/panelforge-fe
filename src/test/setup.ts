import '@testing-library/jest-dom/vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver: jsdom không có layout nên coi mọi phần tử là đang hiển thị
globalThis.IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds = [];
  private callback: IntersectionObserverCallback;
  observe(target: Element) {
    this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as any);
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
} as any;

window.scrollTo = () => {};

if (typeof window !== 'undefined') {
  if (typeof Range !== 'undefined') {
    Range.prototype.getClientRects = Range.prototype.getClientRects || (() => [] as any);
    Range.prototype.getBoundingClientRect =
      Range.prototype.getBoundingClientRect ||
      (() =>
        ({
          x: 0,
          y: 0,
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          width: 0,
          height: 0,
          toJSON: () => {},
        }) as any);
  }
  if (typeof Element !== 'undefined') {
    Element.prototype.getClientRects = Element.prototype.getClientRects || (() => [] as any);
  }
  if (typeof Node !== 'undefined' && !(Node.prototype as any).getClientRects) {
    (Node.prototype as any).getClientRects = () => [] as any;
    (Node.prototype as any).getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: 0,
        height: 0,
        toJSON: () => {},
      }) as any;
  }
}

import axiosClient from '../api/axiosClient';

axiosClient.defaults.adapter = async (config) => {
  if (globalThis.fetch && (globalThis.fetch as any).mock) {
    const url = (config.baseURL || '') + config.url;

    let fullUrl = url;
    if (config.params) {
      const qs = new URLSearchParams(config.params).toString();
      fullUrl += '?' + qs;
    }

    const options: RequestInit = {
      method: (config.method || 'get').toUpperCase(),
      headers: (() => {
        const h = { ...config.headers };
        delete h['Accept'];
        delete h['User-Agent'];
        return h;
      })(),
      body: config.data
        ? typeof config.data === 'string'
          ? config.data
          : JSON.stringify(config.data)
        : undefined,
      credentials: config.withCredentials ? 'include' : undefined,
    };

    const res = await globalThis.fetch(fullUrl, options);

    let data;
    try {
      data = res.json ? await res.json() : res;
    } catch (e) {
      data = (res as any).message ? res : null;
    }

    const response = {
      data: data !== null ? data : res,
      status: res.status || (res.ok === false ? 400 : 200),
      statusText: res.statusText || 'OK',
      headers: res.headers || {},
      config,
      request: {},
    };

    if (res.ok === false) {
      const error = new Error(
        data?.message || 'Request failed with status code ' + response.status,
      );
      (error as any).response = response;
      (error as any).isAxiosError = true;
      throw error;
    }

    return response;
  }

  throw new Error('globalThis.fetch is not mocked! Make sure to mock it in your tests.');
};
