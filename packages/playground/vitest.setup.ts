import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from './src/test/msw-server';

// Polyfill matchMedia for jsdom test environment
// playground-store eagerly calls window.matchMedia during module init
if (typeof globalThis.window !== 'undefined' && !window.matchMedia) {
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
}

// jsdom does not implement Element.prototype.scrollTo
if (typeof globalThis.Element !== 'undefined' && !Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}

// jsdom's Blob predates Blob.prototype.arrayBuffer, which anything that uploads
// a File reaches for. It has no `stream()` either, so the polyfill has to go
// through FileReader rather than wrapping the blob in a Response.
if (typeof globalThis.Blob !== 'undefined' && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function arrayBuffer(this: Blob) {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
