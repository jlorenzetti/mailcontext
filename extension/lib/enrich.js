/**
 * Enrich print-parsed messages with Show original RFC headers when possible.
 *
 * Short threads: harvest `permmsgid`, then service-worker `view=om`.
 * Long threads (>20): skip harvest/om so Gmail stays responsive; print headers
 * remain consistent. Never copy Bcc.
 */

(() => {
  const MC = (globalThis.MailContext = globalThis.MailContext || {});

  /**
   * Above this size, skip reading-view harvest + Show original. Print headers
   * stay consistent and the Gmail tab stays responsive.
   */
  const MAX_THREAD_OM = 20;

  /**
   * @returns {Promise<void>}
   */
  function yieldToMain() {
    return new Promise((resolve) => window.setTimeout(resolve, 0));
  }

  /**
   * @param {Element | Document} [scope]
   * @returns {string[]}
   */
  function liveAttachmentNames(scope = document) {
    const root = scope && "querySelectorAll" in scope ? scope : document;
    const names = [];
    for (const el of root.querySelectorAll("span.aV3")) {
      if (el.closest("div.a3s, div.ii")) continue;
      const name = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (name && !names.includes(name)) names.push(name);
    }
    return names;
  }

  /**
   * @param {object} message
   * @param {string[]} extras
   */
  function mergeAttachments(message, extras) {
    if (!extras?.length) return;
    message.attachments = message.attachments || [];
    for (const name of extras) {
      if (name && !message.attachments.includes(name)) {
        message.attachments.push(name);
      }
    }
  }

  /**
   * @param {object} message
   * @param {object} headers
   */
  function applyOriginalHeaders(message, headers) {
    if (headers.from?.email || headers.from?.name) message.from = headers.from;
    if (headers.to?.length) message.to = headers.to;
    if (headers.cc?.length) message.cc = headers.cc;
    if (headers.dateRaw) message.dateRaw = headers.dateRaw;
    message.headerSource = "original";
  }

  /**
   * @param {{ accountIndex: number }} identity
   * @param {string} printHtml
   * @returns {Promise<string | null>}
   */
  async function seedIkFromPrint(identity, printHtml) {
    return MC.session.discoverAfterPrint(identity.accountIndex, printHtml);
  }

  /**
   * Toast copy outcome. Header source is not shown in the snackbar (success
   * should read as success); details go to the console for diagnostics.
   *
   * @param {number} messageCount
   * @param {{ enriched: number, attempted: number }} enrich
   * @returns {{ kind: "success", text: string }}
   */
  function copyFeedback(messageCount, enrich) {
    const label =
      messageCount === 1 ? "Message copied" : `${messageCount} messages copied`;

    let source = "print";
    if (enrich.attempted > 0 && enrich.enriched >= messageCount) {
      source = "original";
    } else if (enrich.enriched > 0) {
      source = "mixed";
    }

    console.info(
      `[MailContext] copy ok · messages=${messageCount}` +
        ` · headers=${source}` +
        ` · om=${enrich.enriched}/${enrich.attempted || 0}`
    );

    return { kind: "success", text: label };
  }

  /**
   * @param {object[]} messages
   * @param {Array<{ messageId: string, permmsgid: string | null, fromEmail?: string }>} roots
   * @returns {Array<{ index: number, permmsgid: string }>}
   */
  function collectEnrichJobs(messages, roots) {
    /** @type {Map<string, string>} */
    const permByIndex = new Map();
    if (roots.length === messages.length) {
      roots.forEach((root, index) => {
        if (root.permmsgid) permByIndex.set(String(index), root.permmsgid);
      });
    }

    /** @type {Map<string, string[]>} */
    const permByEmail = new Map();
    for (const root of roots) {
      if (!root.permmsgid) continue;
      const email = (root.fromEmail || "").toLowerCase();
      if (!email) continue;
      const list = permByEmail.get(email) || [];
      list.push(root.permmsgid);
      permByEmail.set(email, list);
    }

    /** @type {Array<{ index: number, permmsgid: string }>} */
    const jobs = [];
    for (let i = 0; i < messages.length; i += 1) {
      let permmsgid = permByIndex.get(String(i)) || null;
      if (!permmsgid) {
        const email = (messages[i].from?.email || "").toLowerCase();
        const list = permByEmail.get(email);
        if (list?.length === 1) permmsgid = list[0];
        else if (list?.length) permmsgid = list.shift() || null;
      }
      if (permmsgid) jobs.push({ index: i, permmsgid });
    }
    return jobs;
  }

  /**
   * @param {number} accountIndex
   * @param {string} permmsgid
   * @returns {Promise<object | null>}
   */
  async function headersForPermmsgid(accountIndex, permmsgid) {
    const batch = await fetchHeadersViaExtension(accountIndex, [
      { index: 0, permmsgid },
    ]);
    return batch[0]?.headers || null;
  }

  /**
   * @param {number} accountIndex
   * @param {Array<{ index: number, permmsgid: string }>} jobs
   * @returns {Promise<Array<{ index: number, headers: object | null }>>}
   */
  async function fetchHeadersViaExtension(accountIndex, jobs) {
    if (!jobs.length) return [];

    let ik = await MC.session.findIk(accountIndex, {
      retries: 2,
      delayMs: 300,
      context: "enrich",
    });
    if (!ik) return jobs.map((job) => ({ index: job.index, headers: null }));

    /**
     * @param {string} currentIk
     * @returns {Promise<{ ok: boolean, results?: Array<{ index: number, headers: object | null, code?: string }>, error?: string }>}
     */
    async function request(currentIk) {
      return chrome.runtime.sendMessage({
        type: "mailcontext.enrichHeaders",
        accountIndex,
        ik: currentIk,
        jobs,
      });
    }

    let response = await request(ik);
    const staleFail = response?.results?.some(
      (row) => !row.headers && row.code === "ORIGINAL_FETCH_FAILED"
    );
    if ((!response?.ok || staleFail) && ik) {
      MC.session.markStale(accountIndex, ik);
      ik = await MC.session.findIk(accountIndex, {
        retries: 3,
        delayMs: 300,
        context: "enrich-retry",
      });
      if (ik) response = await request(ik);
    }

    if (!response?.ok || !Array.isArray(response.results)) {
      return jobs.map((job) => ({ index: job.index, headers: null }));
    }
    return response.results.map((row) => ({
      index: row.index,
      headers: row.headers || null,
    }));
  }

  /**
   * Enrich print-parsed messages with Show original RFC headers when possible.
   *
   * @param {{ accountIndex: number }} identity
   * @param {object[]} messages
   * @param {{ preferredPermmsgid?: string | null }} [options]
   * @returns {Promise<{ enriched: number, attempted: number }>}
   */
  async function enrichMessages(identity, messages, options = {}) {
    let enriched = 0;
    let attempted = 0;

    if (options.preferredPermmsgid && messages.length === 1) {
      attempted = 1;
      const headers = await headersForPermmsgid(
        identity.accountIndex,
        options.preferredPermmsgid
      );
      if (headers) {
        applyOriginalHeaders(messages[0], headers);
        enriched = 1;
      }
      return { enriched, attempted };
    }

    // Long threads: harvesting permmsgid expands/scrolls Gmail and freezes the
    // tab. Prefer consistent print-view headers over a multi-minute DOM walk.
    if (messages.length > MAX_THREAD_OM) {
      return { enriched: 0, attempted: 0 };
    }

    const roots = MC.expand?.harvestMessageRoots
      ? await MC.expand.harvestMessageRoots(messages.length)
      : MC.identity.listMessageRoots().map((root) => ({
          messageId: root.messageId,
          permmsgid: root.permmsgid,
          fromEmail: "",
        }));
    await yieldToMain();

    const jobs = collectEnrichJobs(messages, roots);
    if (!jobs.length) return { enriched: 0, attempted: 0 };

    attempted = jobs.length;
    const results = await fetchHeadersViaExtension(identity.accountIndex, jobs);
    for (const row of results) {
      if (!row.headers) continue;
      applyOriginalHeaders(messages[row.index], row.headers);
      enriched += 1;
    }

    return { enriched, attempted };
  }

  MC.enrich = {
    liveAttachmentNames,
    mergeAttachments,
    seedIkFromPrint,
    enrichMessages,
    copyFeedback,
  };
})();
