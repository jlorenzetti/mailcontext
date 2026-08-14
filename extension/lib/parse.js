/**
 * Parse Gmail print-view HTML into a structured thread model.
 *
 * Locale-tolerant for common IT/EN header labels. Dates are passed through as
 * absolute strings from print (no house reformatting).
 *
 * Important: print HTML is parsed with DOMParser (no layout). Never use
 * `innerText` here — it is empty on detached documents; use text extraction
 * via `textContent` after normalizing `<br>` / block boundaries.
 */

(() => {
  const MC = (globalThis.MailContext = globalThis.MailContext || {});

  /** @type {Record<string, string>} */
  const LABEL_MAP = {
    from: "from",
    da: "from",
    to: "to",
    a: "to",
    cc: "cc",
    ccn: "bcc",
    bcc: "bcc",
    date: "date",
    data: "date",
    "reply-to": "replyTo",
    "rispondi a": "replyTo",
    attachments: "attachments",
    allegati: "attachments",
    allegato: "attachments",
  };

  const HIDDEN_QUOTE_RE =
    /^\[(?:Testo tra virgolette nascosto|Quoted text hidden|Texte des citations masqué|Zitierter Text ausgeblendet)\]$/i;

  /**
   * @param {string} openSubject
   * @param {string} printTitle
   * @returns {boolean}
   */
  function subjectsCompatible(openSubject, printTitle) {
    const norm = (value) =>
      value
        .toLowerCase()
        .replace(/^(re|fw|fwd|i|r|rif)\s*:\s*/gi, "")
        .replace(/\s+/g, " ")
        .trim();
    const a = norm(openSubject);
    const b = norm(printTitle);
    if (!a || !b) return false;
    return a === b || b.includes(a) || a.includes(b);
  }

  /**
   * Build readable lines from a detached DOM subtree.
   *
   * @param {Element} root
   * @returns {string[]}
   */
  function textLines(root) {
    const doc = root.ownerDocument;
    const clone = /** @type {HTMLElement} */ (root.cloneNode(true));
    clone.querySelectorAll("script, style, noscript").forEach((node) => node.remove());
    clone.querySelectorAll("br").forEach((br) => {
      br.parentNode?.insertBefore(doc.createTextNode("\n"), br);
      br.remove();
    });
    for (const el of clone.querySelectorAll("div, p, tr, li, h1, h2, h3, h4")) {
      el.appendChild(doc.createTextNode("\n"));
    }
    return (clone.textContent || "")
      .replace(/\u00a0/g, " ")
      .split(/\n+/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }

  /**
   * Decode RFC 2047 encoded-words in header phrases.
   * Example: `=?UTF-8?Q?Cemea_del_Lazio_APS_=E2=80=9C...?= `
   *
   * @param {string} input
   * @returns {string}
   */
  function decodeRfc2047(input) {
    if (!input || !/=\?/.test(input)) return input;

    /**
     * @param {string} charset
     * @param {Uint8Array} bytes
     * @returns {string}
     */
    function decodeBytes(charset, bytes) {
      try {
        return new TextDecoder(charset || "utf-8").decode(bytes);
      } catch {
        try {
          return new TextDecoder("utf-8").decode(bytes);
        } catch {
          return Array.from(bytes, (b) => String.fromCharCode(b)).join("");
        }
      }
    }

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
   * Collapse duplicated quoted display names and strip wrapping quotes.
   * Example: `Acme “Acme”` → `Acme`
   *
   * @param {string} name
   * @returns {string}
   */
  function cleanDisplayName(name) {
    let value = (name || "").replace(/\s+/g, " ").trim();
    if (!value) return "";

    // Prefer matching a trailing quoted copy of the leading name.
    const quotedDup = value.match(
      /^(.*?)\s+[\u201c"']+\s*(.*?)\s*[\u201d"']+\s*$/
    );
    if (
      quotedDup &&
      quotedDup[1].trim().toLowerCase() === quotedDup[2].trim().toLowerCase()
    ) {
      return quotedDup[1].trim();
    }

    // Do not strip a single trailing fancy quote before duplicate detection —
    // that previously turned `Acme “Acme”` into `Acme “Acme` and broke To:.
    value = value.replace(/^["'\u201c\u201d]+/, "").replace(/["'\u201c\u201d]+$/, "");
    return value.trim();
  }

  /**
   * @param {string} text
   * @returns {{ name: string, email: string }}
   */
  function parsePerson(text) {
    const cleaned = decodeRfc2047(text).replace(/\s+/g, " ").trim();
    const angle = cleaned.match(/^(.*?)\s*<\s*([^>]+@[^>]+)\s*>$/);
    if (angle) {
      return {
        name: cleanDisplayName(angle[1]),
        email: angle[2].trim(),
      };
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
   * Gmail print often puts From + Date on one line, sometimes without a space:
   * `Name <email@domain> 8 dicembre 2025 alle ore 14:25`
   * `Name <email@domain>8 dicembre 2025 alle ore 14:25`
   *
   * @param {string} line
   * @returns {{ from: { name: string, email: string }, dateRaw: string } | null}
   */
  function parseFromDateCombo(line) {
    const angled = line.match(/^(.*?<\s*[^>]+@[^>]+\s*>)\s*(.+)$/);
    if (angled && looksLikeDate(angled[2])) {
      return { from: parsePerson(angled[1]), dateRaw: angled[2].trim() };
    }
    const plain = line.match(
      /^(.*?)(\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\s*(.+)$/
    );
    if (plain && looksLikeDate(plain[3])) {
      const name = plain[1].trim();
      return {
        from: { name, email: plain[2] },
        dateRaw: plain[3].trim(),
      };
    }
    return null;
  }

  /**
   * @param {string} text
   * @returns {boolean}
   */
  function looksLikeDate(text) {
    const value = text.trim();
    if (value.length > 80) return false;
    if (!/\d{1,2}:\d{2}/.test(value)) return false;
    return (
      /20\d{2}/.test(value) ||
      /\balle\s+ore\b/i.test(value) ||
      /\bat\b/i.test(value) ||
      /\b(gen|feb|mar|apr|mag|giu|lug|ago|set|ott|nov|dic|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(
        value
      )
    );
  }

  /**
   * @param {Element} root
   * @returns {string}
   */
  function htmlToMarkdown(root) {
    const clone = /** @type {HTMLElement} */ (root.cloneNode(true));
    clone.querySelectorAll("script, style, noscript").forEach((node) => node.remove());
    clone
      .querySelectorAll(".gmail_quote, .gmail_extra, blockquote.gmail_quote, table.att")
      .forEach((node) => node.remove());

    /** @param {Node} node @returns {string} */
    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent || "").replace(/\s+/g, " ");
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      const el = /** @type {HTMLElement} */ (node);
      const tag = el.tagName.toLowerCase();
      if (tag === "br") return "\n";
      if (tag === "img") return "";
      if (tag === "a") {
        const href = el.getAttribute("href") || "";
        const label = Array.from(el.childNodes).map(walk).join("").trim() || href;
        if (!href || href.startsWith("mailto:") || /^[?]/.test(href)) return label;
        if (label === href) return href;
        return `[${label}](${href})`;
      }
      if (tag === "strong" || tag === "b") {
        let inner = Array.from(el.childNodes).map(walk).join("").trim();
        const fullyBold = inner.match(/^\*\*([\s\S]*)\*\*$/);
        if (fullyBold) inner = fullyBold[1];
        return inner ? `**${inner}**` : "";
      }
      if (tag === "em" || tag === "i") {
        let inner = Array.from(el.childNodes).map(walk).join("").trim();
        const fullyItalic = inner.match(/^\*([^*][\s\S]*)\*$/);
        if (fullyItalic) inner = fullyItalic[1];
        return inner ? `*${inner}*` : "";
      }
      if (tag === "li") {
        return `- ${Array.from(el.childNodes).map(walk).join("").trim()}\n`;
      }
      if (tag === "ul" || tag === "ol") {
        return `\n${Array.from(el.childNodes).map(walk).join("")}\n`;
      }
      if (tag === "table") {
        const md = tableToMarkdown(el);
        return md ? `\n${md}\n\n` : `\n${Array.from(el.childNodes).map(walk).join("")}\n`;
      }
      if (tag === "p") {
        const inner = Array.from(el.childNodes).map(walk).join("").trim();
        return inner ? `${inner}\n\n` : "";
      }
      if (tag === "div") {
        const inner = Array.from(el.childNodes).map(walk).join("").trim();
        return inner ? `${inner}\n` : "";
      }
      if (tag === "tr" || tag === "td" || tag === "th" || tag === "thead" || tag === "tbody" || tag === "tfoot") {
        // Handled by tableToMarkdown when nested under a converted table.
        return Array.from(el.childNodes).map(walk).join("");
      }
      return Array.from(el.childNodes).map(walk).join("");
    }

    return collapseAdjacentEmphasis(
      walk(clone)
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    );
  }

  /**
   * Convert a simple HTML table to GitHub-flavored Markdown. Layout / nested
   * tables fall back to null so the caller can flatten.
   *
   * @param {HTMLElement} table
   * @returns {string | null}
   */
  function tableToMarkdown(table) {
    if (table.classList.contains("message") || table.classList.contains("att")) {
      return null;
    }
    if (table.querySelector("table")) return null;

    const rows = Array.from(table.querySelectorAll(":scope > tbody > tr, :scope > thead > tr, :scope > tr"));
    if (rows.length < 2) return null;

    /** @type {string[][]} */
    const grid = [];
    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll(":scope > th, :scope > td"));
      if (!cells.length) continue;
      grid.push(
        cells.map((cell) =>
          (cell.textContent || "")
            .replace(/\s+/g, " ")
            .replace(/\|/g, "\\|")
            .trim()
        )
      );
    }
    if (grid.length < 2) return null;
    const width = Math.max(...grid.map((r) => r.length));
    if (width < 2) return null;

    const norm = grid.map((row) => {
      const copy = row.slice();
      while (copy.length < width) copy.push("");
      return copy;
    });

    const header = norm[0];
    const sep = header.map(() => "---");
    const lines = [
      `| ${header.join(" | ")} |`,
      `| ${sep.join(" | ")} |`,
      ...norm.slice(1).map((row) => `| ${row.join(" | ")} |`),
    ];
    return lines.join("\n");
  }

  /**
   * @param {object} message
   * @returns {boolean}
   */
  function messageHasRequiredHeaders(message) {
    const fromOk = Boolean(
      (message?.from?.email || "").trim() || (message?.from?.name || "").trim()
    );
    const dateOk = Boolean((message?.dateRaw || "").trim());
    return fromOk && dateOk;
  }

  /**
   * Merge back-to-back bold/italic runs from adjacent HTML tags
   * (e.g. `<b>A</b><b>B</b>` → `**A****B**`, signatures with nested em).
   *
   * @param {string} text
   * @returns {string}
   */
  function collapseAdjacentEmphasis(text) {
    let previous;
    let current = text;
    do {
      previous = current;
      current = current
        // **a*b*** (bold wrapping broken italic) → **a b**
        .replace(/\*\*([^*]+)\*([^*]+)\*\*\*/g, "**$1 $2**")
        // **a****b** → **ab**
        .replace(/\*\*((?:[^*]|\*(?!\*))+?)\*\*\*\*((?:[^*]|\*(?!\*))+?)\*\*/g, "**$1$2**")
        // **a*****b*** → **ab**
        .replace(
          /\*\*((?:[^*]|\*(?!\*))+?)\*\*\*\*\*((?:[^*]|\*(?!\*))+?)\*\*\*/g,
          "**$1$2**"
        );
    } while (current !== previous);
    return current;
  }

  /**
   * @param {string} body
   * @returns {string}
   */
  function cleanBody(body) {
    return body
      .split("\n")
      .filter((line) => !HIDDEN_QUOTE_RE.test(line.trim()))
      .join("\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      // Avoid blank lines between list items
      .replace(/\n\n(?=[-*•]|\d+\.\s)/g, "\n")
      .trim();
  }

  /**
   * Filenames live in `table.att` as `<b>file.pdf</b>` beside an icon link
   * whose own text is empty.
   *
   * @param {HTMLElement} table
   * @returns {string[]}
   */
  function extractAttachments(table) {
    const names = [];
    for (const att of table.querySelectorAll("table.att")) {
      for (const bold of att.querySelectorAll("b")) {
        const name = (bold.textContent || "").replace(/\s+/g, " ").trim();
        if (name && !names.includes(name)) names.push(name);
      }
    }
    if (names.length) return names;

    for (const anchor of table.querySelectorAll('a[href*="view=att"], a[href*="attid="]')) {
      const direct = (anchor.textContent || "").replace(/\s+/g, " ").trim();
      if (direct && !names.includes(direct)) {
        names.push(direct);
        continue;
      }
      const cell = anchor.closest("td")?.parentElement?.querySelector("b, span");
      const nearby = (cell?.textContent || "").replace(/\s+/g, " ").trim();
      if (nearby && !names.includes(nearby)) names.push(nearby);
    }
    return names;
  }

  /**
   * Prefer the overflow body container; never the first header `<font>`.
   *
   * @param {HTMLElement} table
   * @returns {HTMLElement}
   */
  function findBodyRoot(table) {
    const overflow = table.querySelector("div[style*='overflow']");
    if (overflow && (overflow.textContent || "").trim().length > 20) {
      return /** @type {HTMLElement} */ (overflow);
    }
    const att = table.querySelector("table.att");
    if (att?.previousElementSibling instanceof HTMLElement) {
      return att.previousElementSibling;
    }
    const fonts = Array.from(table.querySelectorAll("font"));
    if (fonts.length) {
      return /** @type {HTMLElement} */ (fonts[fonts.length - 1]);
    }
    return table;
  }

  /**
   * @param {HTMLElement} table
   * @returns {object}
   */
  function parseMessageTable(table) {
    const plainLines = textLines(table);

    /** @type {{ from?: {name:string,email:string}, to: Array<{name:string,email:string}>, cc: Array<{name:string,email:string}>, dateRaw?: string, attachments: string[] }} */
    const headers = { to: [], cc: [], attachments: extractAttachments(table) };

    let bodyStartIndex = 0;
    for (let i = 0; i < Math.min(plainLines.length, 30); i += 1) {
      const line = plainLines[i];

      const combo = parseFromDateCombo(line);
      if (combo && !headers.from) {
        headers.from = combo.from;
        headers.dateRaw = combo.dateRaw;
        bodyStartIndex = i + 1;
        continue;
      }

      const labeled = line.match(/^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ -]*):\s*(.*)$/);
      if (labeled) {
        const key = LABEL_MAP[labeled[1].trim().toLowerCase()];
        if (key === "to") headers.to = parseAddressList(labeled[2]);
        else if (key === "cc") headers.cc = parseAddressList(labeled[2]);
        else if (key === "replyTo") {
          /* keep for future; not in default markdown metadata */
        } else if (key === "attachments") {
          for (const part of labeled[2].split(",").map((value) => value.trim()).filter(Boolean)) {
            if (!headers.attachments.includes(part)) headers.attachments.push(part);
          }
        } else if (key === "date") headers.dateRaw = labeled[2].trim();
        else if (key === "from") headers.from = parsePerson(labeled[2]);
        else if (!key) {
          // Body section headings like "ISSUE DESCRIPTION:" — stop header scan
          bodyStartIndex = i;
          break;
        }
        bodyStartIndex = i + 1;
        continue;
      }

      if (!headers.from && /@/.test(line) && line.length < 160) {
        headers.from = parsePerson(line);
        bodyStartIndex = i + 1;
        continue;
      }

      if (!headers.dateRaw && looksLikeDate(line)) {
        headers.dateRaw = line;
        bodyStartIndex = i + 1;
        continue;
      }

      if (headers.from && (headers.dateRaw || headers.to.length) && !labeled) {
        bodyStartIndex = i;
        break;
      }
    }

    const bodyRoot = findBodyRoot(table);
    let body = cleanBody(htmlToMarkdown(bodyRoot));

    // Only fall back to plain lines when markdown still *starts* with header
    // debris. Do not trigger just because the sender email appears in a
    // signature — that previously forced `\n\n` between every line.
    const head = body.slice(0, 180).toLowerCase();
    const fromEmail = (headers.from?.email || "").toLowerCase();
    const fromName = (headers.from?.name || "").toLowerCase();
    const looksLikeHeaderDebris =
      (fromEmail && head.startsWith(fromEmail)) ||
      (fromName && head.startsWith(fromName)) ||
      /^(from|to|cc|date|da|a|data)\s*:/.test(head);
    if ((!body || looksLikeHeaderDebris) && bodyStartIndex > 0) {
      body = cleanBody(plainLines.slice(bodyStartIndex).join("\n"));
    }
    if (!body) {
      body = cleanBody(plainLines.slice(bodyStartIndex).join("\n"));
    }

    return {
      from: headers.from || { name: "", email: "" },
      to: headers.to,
      cc: headers.cc,
      dateRaw: headers.dateRaw || "",
      attachments: headers.attachments,
      body,
    };
  }

  /**
   * @param {string} html
   * @param {{ subject: string }} identity
   * @returns {{ ok: true, thread: object } | { ok: false, code: string, detail?: string }}
   */
  function parsePrintView(html, identity) {
    let doc;
    try {
      doc = new DOMParser().parseFromString(html, "text/html");
    } catch (error) {
      return {
        ok: false,
        code: "PARSE_FAILED",
        detail: String(error?.message || error),
      };
    }

    const title = (doc.querySelector("title")?.textContent || "").trim();
    if (title && identity.subject && !subjectsCompatible(identity.subject, title)) {
      return {
        ok: false,
        code: "WRONG_THREAD",
        detail: "print title does not match open subject",
      };
    }

    const tables = Array.from(doc.querySelectorAll("table.message"));
    if (!tables.length) {
      return { ok: false, code: "PARSE_EMPTY" };
    }

    const messages = tables.map((table, index) => ({
      n: index + 1,
      ...parseMessageTable(/** @type {HTMLElement} */ (table)),
    }));

    for (const message of messages) {
      if (!messageHasRequiredHeaders(message)) {
        return {
          ok: false,
          code: "INCOMPLETE_HEADERS",
          detail: "From or Date missing after parse",
        };
      }
    }

    return {
      ok: true,
      thread: {
        subject: identity.subject,
        printTitle: title,
        messageCandidates: tables.length,
        messages,
      },
    };
  }

  MC.parse = {
    parsePrintView,
    subjectsCompatible,
    parsePerson,
    parseAddressList,
    messageHasRequiredHeaders,
  };
})();
