/**
 * Gmail session helpers — discover the `ik` key required for Show original.
 *
 * Cold-start stress showed `ik` may be absent from DOM/print and only appear
 * later in Performance resource URLs. We observe Performance continuously and
 * retry briefly after print before falling back to print-view headers.
 */

(() => {
  const MC = (globalThis.MailContext = globalThis.MailContext || {});

  /** @type {Map<number, string>} */
  const cache = new Map();
  /** @type {Set<string>} */
  const stale = new Set();
  /** @type {Map<number, string>} */
  const cacheSource = new Map();
  const STORAGE_KEY = "mailcontext.ik.";

  /** @type {number | null} */
  let watchingAccount = null;
  let observerStarted = false;

  const RETRY_ATTEMPTS = 5;
  const RETRY_DELAY_MS = 350;

  /**
   * @typedef {"cache" | "storage" | "performance" | "performance-observer" | "dom" | "script" | "html" | "print" | "miss"} IkSource
   * @typedef {{ ik: string | null, source: IkSource, retries: number }} IkDiscovery
   */

  /**
   * @param {string} value
   * @returns {boolean}
   */
  function validIk(value) {
    return /^[A-Za-z0-9_-]{4,}$/.test(value) && !stale.has(value);
  }

  /**
   * @param {number} ms
   * @returns {Promise<void>}
   */
  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  /**
   * @param {IkDiscovery} result
   * @param {string} [context]
   */
  function logDiscovery(result, context) {
    const where = context ? ` (${context})` : "";
    if (result.ik) {
      console.info(
        `[MailContext] ik ok${where} · source=${result.source} · retries=${result.retries}`
      );
    } else {
      console.info(
        `[MailContext] ik miss${where} · source=miss · retries=${result.retries}`
      );
    }
  }

  /**
   * @param {number} accountIndex
   * @param {string} ik
   * @param {IkSource} [source]
   */
  function rememberIk(accountIndex, ik, source = "cache") {
    if (!validIk(ik)) return;
    cache.set(accountIndex, ik);
    cacheSource.set(accountIndex, source);
    try {
      chrome.storage?.session?.set({ [STORAGE_KEY + accountIndex]: ik });
    } catch {
      /* optional */
    }
  }

  /**
   * @param {number} accountIndex
   * @param {string} ik
   */
  function markStale(accountIndex, ik) {
    if (ik) stale.add(ik);
    if (cache.get(accountIndex) === ik) {
      cache.delete(accountIndex);
      cacheSource.delete(accountIndex);
    }
    try {
      chrome.storage?.session?.remove(STORAGE_KEY + accountIndex);
    } catch {
      /* optional */
    }
  }

  /**
   * @param {string} text
   * @returns {string | null}
   */
  function findIkInText(text) {
    if (!text) return null;
    const match =
      text.match(/[?&;]ik=([A-Za-z0-9_-]{4,})/i) ||
      text.match(/["']ik["']\s*[:=]\s*["']([A-Za-z0-9_-]{4,})["']/i) ||
      text.match(/[?&]ik%3D([A-Za-z0-9_-]{4,})/i);
    return match && validIk(match[1]) ? match[1] : null;
  }

  /**
   * @param {number} accountIndex
   * @param {string} html
   * @returns {string | null}
   */
  function ingestIkFromHtml(accountIndex, html) {
    const ik = findIkInText(html);
    if (ik) rememberIk(accountIndex, ik, "print");
    return ik;
  }

  /**
   * Gmail often keeps `ik` only in XHR/resource URLs, not in the DOM.
   *
   * @returns {string | null}
   */
  function findIkInPerformance() {
    try {
      const entries = performance.getEntriesByType("resource");
      for (let i = entries.length - 1; i >= 0; i -= 1) {
        const ik = findIkInText(entries[i].name || "");
        if (ik) return ik;
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  /**
   * Catch late XHR/resource URLs that appear after the initial page snapshot.
   *
   * @param {number} accountIndex
   */
  function ensurePerformanceWatch(accountIndex) {
    watchingAccount = accountIndex;
    if (observerStarted || typeof PerformanceObserver !== "function") return;
    try {
      const observer = new PerformanceObserver((list) => {
        if (watchingAccount == null) return;
        if (cache.has(watchingAccount)) return;
        for (const entry of list.getEntries()) {
          const ik = findIkInText(entry.name || "");
          if (ik) {
            rememberIk(watchingAccount, ik, "performance-observer");
            return;
          }
        }
      });
      observer.observe({ type: "resource", buffered: true });
      observerStarted = true;
    } catch {
      /* older engines / restricted contexts */
    }
  }

  /**
   * @param {number} accountIndex
   * @returns {Promise<string | null>}
   */
  async function loadStoredIk(accountIndex) {
    try {
      if (!chrome.storage?.session) return null;
      const key = STORAGE_KEY + accountIndex;
      const stored = await chrome.storage.session.get(key);
      const ik = stored?.[key];
      if (typeof ik === "string" && validIk(ik)) {
        cache.set(accountIndex, ik);
        cacheSource.set(accountIndex, "storage");
        return ik;
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  /**
   * @param {Element} el
   * @returns {string | null}
   */
  function findIkInElement(el) {
    const attrs = [
      "href",
      "src",
      "action",
      "data-href",
      "data-url",
      "data-params",
    ];
    for (const name of attrs) {
      const value = el.getAttribute?.(name);
      if (!value) continue;
      const ik = findIkInText(value);
      if (ik) return ik;
      try {
        const url = new URL(value, location.origin);
        const param = url.searchParams.get("ik") || "";
        if (validIk(param)) return param;
      } catch {
        /* ignore */
      }
    }
    return null;
  }

  /**
   * @param {number} accountIndex
   * @returns {string | null}
   */
  function findIkInDom(accountIndex) {
    const selectors = [
      'a[href*="ik="], a[href*="ik%3D"]',
      'img[src*="ik="], img[src*="ik%3D"]',
      'form[action*="ik="]',
      '[data-href*="ik="], [data-url*="ik="]',
    ];
    for (const selector of selectors) {
      for (const el of document.querySelectorAll(selector)) {
        const ik = findIkInElement(el);
        if (ik) {
          rememberIk(accountIndex, ik, "dom");
          return ik;
        }
      }
    }
    return null;
  }

  /**
   * @param {number} accountIndex
   * @returns {{ ik: string, source: IkSource } | null}
   */
  function findIkSync(accountIndex) {
    ensurePerformanceWatch(accountIndex);

    if (cache.has(accountIndex)) {
      return {
        ik: /** @type {string} */ (cache.get(accountIndex)),
        source: /** @type {IkSource} */ (
          cacheSource.get(accountIndex) || "cache"
        ),
      };
    }

    const fromPerf = findIkInPerformance();
    if (fromPerf) {
      rememberIk(accountIndex, fromPerf, "performance");
      return { ik: fromPerf, source: "performance" };
    }

    const fromDom = findIkInDom(accountIndex);
    if (fromDom) return { ik: fromDom, source: "dom" };

    for (const script of document.scripts) {
      if (script.src) continue;
      const body = script.textContent || "";
      if (body.length > 2_000_000) continue;
      const ik = findIkInText(body);
      if (ik) {
        rememberIk(accountIndex, ik, "script");
        return { ik, source: "script" };
      }
    }

    const ik = findIkInText(document.documentElement.innerHTML);
    if (ik) {
      rememberIk(accountIndex, ik, "html");
      return { ik, source: "html" };
    }

    return null;
  }

  /**
   * Resolve `ik` with source metadata for diagnostics.
   *
   * @param {number} accountIndex
   * @param {{ retries?: number, delayMs?: number, context?: string, log?: boolean }} [options]
   * @returns {Promise<IkDiscovery>}
   */
  async function discoverIk(accountIndex, options = {}) {
    ensurePerformanceWatch(accountIndex);
    const shouldLog = options.log !== false;
    const context = options.context;

    const stored = await loadStoredIk(accountIndex);
    if (stored) {
      const result = {
        ik: stored,
        source: /** @type {IkSource} */ (
          cacheSource.get(accountIndex) || "storage"
        ),
        retries: 0,
      };
      if (shouldLog) logDiscovery(result, context);
      return result;
    }

    const sync = findIkSync(accountIndex);
    if (sync) {
      const result = { ik: sync.ik, source: sync.source, retries: 0 };
      if (shouldLog) logDiscovery(result, context);
      return result;
    }

    const retries = options.retries ?? 0;
    const delayMs = options.delayMs ?? RETRY_DELAY_MS;
    for (let attempt = 0; attempt < retries; attempt += 1) {
      await sleep(delayMs);
      const again = findIkSync(accountIndex);
      if (again) {
        const result = {
          ik: again.ik,
          source: again.source,
          retries: attempt + 1,
        };
        if (shouldLog) logDiscovery(result, context);
        return result;
      }
      const fromStore = await loadStoredIk(accountIndex);
      if (fromStore) {
        const result = {
          ik: fromStore,
          source: /** @type {IkSource} */ (
            cacheSource.get(accountIndex) || "storage"
          ),
          retries: attempt + 1,
        };
        if (shouldLog) logDiscovery(result, context);
        return result;
      }
    }

    const miss = /** @type {IkDiscovery} */ ({
      ik: null,
      source: "miss",
      retries,
    });
    if (shouldLog) logDiscovery(miss, context);
    return miss;
  }

  /**
   * Resolve `ik`, optionally waiting for late Performance entries.
   *
   * @param {number} accountIndex
   * @param {{ retries?: number, delayMs?: number, context?: string, log?: boolean }} [options]
   * @returns {Promise<string | null>}
   */
  async function findIk(accountIndex, options = {}) {
    const result = await discoverIk(accountIndex, options);
    return result.ik;
  }

  /**
   * Post-print path: ingest HTML, then bounded Performance rediscovery.
   *
   * @param {number} accountIndex
   * @param {string} [html]
   * @returns {Promise<string | null>}
   */
  async function discoverAfterPrint(accountIndex, html) {
    ensurePerformanceWatch(accountIndex);
    if (html) ingestIkFromHtml(accountIndex, html);
    const result = await discoverIk(accountIndex, {
      retries: RETRY_ATTEMPTS,
      delayMs: RETRY_DELAY_MS,
      context: "after-print",
    });
    return result.ik;
  }

  MC.session = {
    findIk,
    discoverIk,
    findIkInText,
    ingestIkFromHtml,
    discoverAfterPrint,
    markStale,
    rememberIk,
    ensurePerformanceWatch,
  };
})();
