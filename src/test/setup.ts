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

// Mock IntersectionObserver
globalThis.IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
  constructor() {}
} as any;

window.scrollTo = () => {};

import axiosClient from '../api/axiosClient';

axiosClient.defaults.adapter = async (config) => {
  if (globalThis.fetch && (globalThis.fetch as any).mock) {
    const url = (config.baseURL || '') + config.url;
    
    let fullUrl = url;
    if (config.params) {
      const qs = new URLSearchParams(config.params).toString();
      fullUrl += '?' + qs;
    }

    const options = {
      method: (config.method || 'get').toUpperCase(),
      headers: (() => { const h = { ...config.headers }; delete h['Accept']; delete h['User-Agent']; return h; })(),
      body: config.data ? (typeof config.data === 'string' ? config.data : JSON.stringify(config.data)) : undefined,
      credentials: config.withCredentials ? 'include' : undefined
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
      request: {}
    };

    if (res.ok === false) {
      const error = new Error(data?.message || 'Request failed with status code ' + response.status);
      (error as any).response = response;
      (error as any).isAxiosError = true;
      throw error;
    }

    return response;
  }

  throw new Error('globalThis.fetch is not mocked! Make sure to mock it in your tests.');
};
