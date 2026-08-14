/**
 * Same-origin Gmail print-view transport.
 */

(() => {
  const MC = (globalThis.MailContext = globalThis.MailContext || {});

  const MAX_PRINT_VIEW_BYTES = 25 * 1024 * 1024;

  /**
   * @param {{ accountIndex: number, threadId: string, messageId?: string }} identity
   * @returns {string}
   */
  function printViewUrl(identity) {
    let url =
      `https://mail.google.com/mail/u/${identity.accountIndex}/` +
      `?view=pt&search=all&th=${encodeURIComponent(identity.threadId)}`;
    if (identity.messageId) {
      url += `&msg=${encodeURIComponent(identity.messageId)}`;
    }
    return url;
  }

  /**
   * @param {Response} response
   * @param {string} html
   * @returns {boolean}
   */
  function looksLikeLogin(response, html) {
    if (/accounts\.google\.com|ServiceLogin/i.test(response.url || "")) return true;
    return /<title[^>]*>[^<]*(sign in|accedi|anmelden|connexion)[^<]*<\/title>/i.test(
      html.slice(0, 4000)
    );
  }

  /**
   * @param {Response} response
   * @returns {Promise<string>}
   */
  async function readLimited(response) {
    const declared = Number(response.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_PRINT_VIEW_BYTES) {
      const error = new Error("print view exceeds safety limit");
      error.code = "PRINT_VIEW_TOO_LARGE";
      throw error;
    }
    const text = await response.text();
    if (text.length > MAX_PRINT_VIEW_BYTES) {
      const error = new Error("print view exceeds safety limit");
      error.code = "PRINT_VIEW_TOO_LARGE";
      throw error;
    }
    return text;
  }

  /**
   * Fetch detached print HTML for a thread or one message.
   *
   * @param {{ accountIndex: number, threadId: string, messageId?: string }} identity
   * @returns {Promise<{ ok: true, html: string } | { ok: false, code: string, detail?: string }>}
   */
  async function fetchPrintView(identity) {
    try {
      const response = await fetch(printViewUrl(identity), {
        credentials: "include",
        cache: "no-store",
      });
      const html = await readLimited(response);
      if (looksLikeLogin(response, html)) {
        return { ok: false, code: "NOT_LOGGED_IN" };
      }
      if (!response.ok) {
        return {
          ok: false,
          code: "FETCH_FAILED",
          detail: `HTTP ${response.status}`,
        };
      }
      return { ok: true, html };
    } catch (error) {
      return {
        ok: false,
        code: error?.code === "PRINT_VIEW_TOO_LARGE" ? "PRINT_VIEW_TOO_LARGE" : "FETCH_FAILED",
        detail: String(error?.message || error),
      };
    }
  }

  MC.print = {
    fetchPrintView,
    printViewUrl,
  };
})();
