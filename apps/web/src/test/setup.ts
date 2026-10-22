import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom does not implement <dialog>.showModal() / close().
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
}

// jsdom has no canvas. axe-core probes one while checking text, and jsdom logs
// "Not implemented" each time; answering "no context" is what a browser does
// when a canvas is unavailable, and axe handles it.
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: () => null });

// index.html declares the page language; jsdom's blank document does not.
document.documentElement.lang = 'en';

// React Router's <ScrollRestoration> scrolls the window, which jsdom only stubs noisily.
window.scrollTo = () => undefined;

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.classList.remove('dark');
});
