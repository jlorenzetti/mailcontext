/**
 * Show original (`view=om`) fetch + RFC header parse.
 *
 * Self-contained for both the content script and the service worker
 * (`importScripts`). Reads only the header portion of the response so large
 * MIME bodies do not block enrichment on long threads.
 */

(() => {
  const global = globalThis;
  const MC = (global.MailContext = global.MailContext || {});

  const MAX_HEADER_BYTES = 512 * 1024;
  const OM_CONCURRENCY = 6;

  /**
   * @param {{ accountIndex: number, ik: string, permmsgid: string }} params
   * @returns {string}
   */
  function originalViewUrl(params) {
    return (
      `https://mail.google.com/mail/u/${params.accountIndex}/` +
      `?ik=${encodeURIComponent(params.ik)}` +
      `&view=om&permmsgid=${encodeURIComponent(params.permmsgid)}`
    );
  }

  /**
   * @param {Response} response
   * @param {string} text
   * @returns {boolean}
   */
  function looksLikeLogin(response, text) {
    if (/accounts\.google\.com|ServiceLogin/i.test(response.url || "")) return true;
    return /<title[^>]*>[^<]*(sign in|accedi|anmelden|connexion)[^<]*<\/title>/i.test(
      text.slice(0, 4000)
    );
  }

  /**
   * @param {string} text
   * @returns {boolean}
   */
  function headerSectionComplete(text) {
    const pre = text.match(/<pre[^>]*>([\s\S]*)/i);
    if (pre) {
      const body = pre[1];
      if (/<\/pre>/i.test(body)) return true;
      if (/\r?\n\r?\n/.test(body)) return true;
      return false;
    }
    const area = text.match(/<textarea[^>]*>([\s\S]*)/i);
    if (area && /\r?\n\r?\n/.test(area[1])) return true;
    return /^[A-Za-z0-9-]+:/m.test(text) && /\r?\n\r?\n/.test(text);
  }

  /**
   * Read from the response only until RFC headers (or a size cap) are available.
   *
   * @param {Response} response
   * @returns {Promise<string>}
   */
  async function readHeaderPrefix(response) {
    if (!response.body?.getReader) {
      const text = await response.text();
      return text.slice(0, MAX_HEADER_BYTES);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let text = "";
    try {
      while (text.length < MAX_HEADER_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        if (headerSectionComplete(text)) break;
      }
    } finally {
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
    }
    return text.slice(0, MAX_HEADER_BYTES);
  }

  /**
   * @param {string} charset
   * @param {Uint8Array} bytes
   * @returns {string}
   */
  function decodeBytes(charset, bytes) {
    try {
      return new TextDecoder(charset || "utf-8").decode(bytes);
    } catch {
      return Array.from(bytes, (b) => String.fromCharCode(b)).join("");
    }
  }

  /**
   * @param {string} input
   * @returns {string}
   */
  function decodeRfc2047(input) {
    return input.replace(
      /=\?([^?]+)\?([bqBQ])\?([^?]*)\?=/g,
      (whole, charset, encoding, data) => {
        try {
          if (encoding.toUpperCase() === "B") {
            const binary = atob(data.replace(/\s+/g, ""));
            const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
            return decodeBytes(charset, bytes);
          }
          const bytes = [];
          const q = data.replace(/_/g, " ");
          for (let i = 0; i < q.length; i += 1) {
            if (q[i] === "=" && i + 2 < q.length) {
              bytes.push(parseInt(q.slice(i + 1, i + 3), 16));
              i += 2;
            } else {
              bytes.push(q.charCodeAt(i));
            }
          }
          return decodeBytes(charset, Uint8Array.from(bytes));
        } catch {
          return whole;
        }
      }
    );
  }

  /**
   * @param {string} name
   * @returns {string}
   */
  function cleanDisplayName(name) {
    let value = (name || "").replace(/\s+/g, " ").trim();
    if (!value) return "";
    const quotedDup = value.match(
      /^(.*?)\s+[\u201c"']+\s*(.*?)\s*[\u201d"']+\s*$/
    );
    if (
      quotedDup &&
      quotedDup[1].trim().toLowerCase() === quotedDup[2].trim().toLowerCase()
    ) {
      return quotedDup[1].trim();
    }
    return value
      .replace(/^["'\u201c\u201d]+/, "")
      .replace(/["'\u201c\u201d]+$/, "")
      .trim();
  }

  /**
   * @param {string} text
   * @returns {{ name: string, email: string }}
   */
  function parsePerson(text) {
    const cleaned = decodeRfc2047(text).replace(/\s+/g, " ").trim();
    const angle = cleaned.match(/^(.*?)\s*<\s*([^>]+@[^>]+)\s*>$/);
    if (angle) {
      return { name: cleanDisplayName(angle[1]), email: angle[2].trim() };
    }
    if (/^[^@\s]+@[^@\s]+$/.test(cleaned)) {
      return { name: "", email: cleaned };
    }
    return { name: cleanDisplayName(cleaned), email: "" };
  }

  /**
   * @param {string} text
   * @returns {Array<{ name: string, email: string }>}
   */
  function parseAddressList(text) {
    if (!text.trim()) return [];
    const decoded = decodeRfc2047(text);
    const parts = [];
    let current = "";
    let inQuotes = false;
    for (const char of decoded) {
      if (char === '"') inQuotes = !inQuotes;
      if ((char === "," || char === ";") && !inQuotes) {
        if (current.trim()) parts.push(current.trim());
        current = "";
        continue;
      }
      current += char;
    }
    if (current.trim()) parts.push(current.trim());
    return parts.map(parsePerson).filter((person) => person.name || person.email);
  }

  /**
   * @param {string} text
   * @returns {Record<string, string>}
   */
  function extractRawHeaderMap(text) {
    let source = text;
    const pre = text.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (pre) {
      source = pre[1]
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"');
    } else {
      const area = text.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/i);
      if (area) {
        source = area[1]
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"');
      } else {
        source = text
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<\/(p|div|tr)>/gi, "\n")
          .replace(/<[^>]+>/g, "");
      }
    }

    const lines = source.replace(/\r\n/g, "\n").split("\n");
    /** @type {string[]} */
    const headerLines = [];
    let started = false;
    for (const line of lines) {
      if (!started) {
        if (/^[A-Za-z0-9-]+:\s*/.test(line)) started = true;
        else continue;
      }
      if (started && line.trim() === "") break;
      headerLines.push(line);
    }

    /** @type {Record<string, string>} */
    const map = {};
    let current = null;
    for (const line of headerLines) {
      if (/^[ \t]/.test(line) && current) {
        map[current] += " " + line.trim();
        continue;
      }
      const match = line.match(/^([A-Za-z0-9-]+):\s*(.*)$/);
      if (!match) continue;
      current = match[1].toLowerCase();
      map[current] = match[2].trim();
    }
    return map;
  }

  /**
   * @param {string} text
   * @returns {{
   *   from: { name: string, email: string },
   *   to: Array<{ name: string, email: string }>,
   *   cc: Array<{ name: string, email: string }>,
   *   dateRaw: string,
   *   subject: string
   * } | null}
   */
  function parseOriginalHeaders(text) {
    const map = extractRawHeaderMap(text);
    if (!map.from && !map.date) return null;
    return {
      from: map.from ? parsePerson(map.from) : { name: "", email: "" },
      to: map.to ? parseAddressList(map.to) : [],
      cc: map.cc ? parseAddressList(map.cc) : [],
      dateRaw: map.date || "",
      subject: map.subject || "",
    };
  }

  /**
   * @param {{ accountIndex: number, ik: string, permmsgid: string }} params
   * @returns {Promise<{ ok: true, headers: object } | { ok: false, code: string, detail?: string }>}
   */
  async function fetchOriginalHeaders(params) {
    try {
      const response = await fetch(originalViewUrl(params), {
        credentials: "include",
        cache: "no-store",
      });
      const text = await readHeaderPrefix(response);
      if (looksLikeLogin(response, text)) {
        return { ok: false, code: "NOT_LOGGED_IN" };
      }
      if (!response.ok) {
        return {
          ok: false,
          code: "ORIGINAL_FETCH_FAILED",
          detail: `HTTP ${response.status}`,
        };
      }
      const headers = parseOriginalHeaders(text);
      if (!headers || (!headers.from.email && !headers.from.name && !headers.dateRaw)) {
        return { ok: false, code: "ORIGINAL_PARSE_EMPTY" };
      }
      return { ok: true, headers };
    } catch (error) {
      return {
        ok: false,
        code: "ORIGINAL_FETCH_FAILED",
        detail: String(error?.message || error),
      };
    }
  }

  /**
   * @template T
   * @param {T[]} items
   * @param {number} concurrency
   * @param {(item: T, index: number) => Promise<unknown>} worker
   * @returns {Promise<unknown[]>}
   */
  async function mapPool(items, concurrency, worker) {
    /** @type {unknown[]} */
    const results = new Array(items.length);
    let next = 0;
    async function lane() {
      while (next < items.length) {
        const index = next;
        next += 1;
        results[index] = await worker(items[index], index);
      }
    }
    const lanes = Math.min(concurrency, Math.max(items.length, 1));
    await Promise.all(Array.from({ length: lanes }, () => lane()));
    return results;
  }

  /**
   * Fetch Show original headers for many messages (service worker / batch).
   *
   * @param {{
   *   accountIndex: number,
   *   ik: string,
   *   jobs: Array<{ index: number, permmsgid: string }>
   * }} params
   * @returns {Promise<Array<{ index: number, headers: object | null, code?: string }>>}
   */
  async function fetchOriginalHeadersBatch(params) {
    const jobs = params.jobs || [];
    const results = await mapPool(jobs, OM_CONCURRENCY, async (job) => {
      const result = await fetchOriginalHeaders({
        accountIndex: params.accountIndex,
        ik: params.ik,
        permmsgid: job.permmsgid,
      });
      if (result.ok) {
        return { index: job.index, headers: result.headers };
      }
      return { index: job.index, headers: null, code: result.code };
    });
    return /** @type {Array<{ index: number, headers: object | null, code?: string }>} */ (
      results
    );
  }

  const api = {
    originalViewUrl,
    parseOriginalHeaders,
    fetchOriginalHeaders,
    fetchOriginalHeadersBatch,
  };

  MC.original = api;
  global.MailContextOriginal = api;
})();
