import "@testing-library/jest-dom";
import { vi } from "vitest";

// Polyfill HTMLDialogElement for JSDOM
if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    // Dispatch 'close' event
    const event = new Event("close");
    this.dispatchEvent(event);
  };
}

// Polyfill scrollIntoView for JSDOM
if (typeof window !== "undefined") {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}
