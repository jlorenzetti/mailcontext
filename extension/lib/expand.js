/**
 * Temporary reading-view expand to harvest `permmsgid` for Show original.
 *
 * Print remains the body completeness source. Expand is only used to read ids,
 * then Collapse all + scroll restore. Snapshots are plain data (no live nodes)
 * so enrichment can continue in the service worker.
 */

(() => {
  const MC = (globalThis.MailContext = globalThis.MailContext || {});

  /**
   * @param {number} ms
   * @returns {Promise<void>}
   */
  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  /**
   * @returns {Element | null}
   */
  function scrollContainer() {
    return (
      document.querySelector("div.AO") ||
      document.querySelector('[role="main"]') ||
      document.scrollingElement
    );
  }

  /**
   * @param {RegExp} pattern
   * @returns {Element | null}
   */
  function findToolbarControl(pattern) {
    return (
      Array.from(document.querySelectorAll("button, [role='button']")).find(
        (el) => {
          const label = (
            el.getAttribute("aria-label") ||
            el.getAttribute("data-tooltip") ||
            el.textContent ||
            ""
          ).toLowerCase();
          return pattern.test(label);
        }
      ) || null
    );
  }

  /**
   * @returns {Array<{ messageId: string, permmsgid: string | null, fromEmail: string }>}
   */
  function snapshotRoots() {
    return MC.identity.listMessageRoots().map((entry) => {
      const sender = entry.root.querySelector("span.gD");
      return {
        messageId: entry.messageId,
        permmsgid: entry.permmsgid,
        fromEmail: (sender?.getAttribute("email") || "").toLowerCase(),
      };
    });
  }

  /**
   * Collect ids while scrolling so lazy-rendered rows appear.
   *
   * @param {number} expectedCount
   * @param {Map<string, { messageId: string, permmsgid: string | null, fromEmail: string }>} byId
   * @returns {Promise<void>}
   */
  async function scrollCollect(expectedCount, byId) {
    const scroller = scrollContainer();
    if (!scroller || !("scrollTop" in scroller)) return;

    let stable = 0;
    for (let step = 0; step < 50; step += 1) {
      for (const row of snapshotRoots()) {
        if (row.permmsgid) byId.set(row.messageId, row);
      }
      if (expectedCount > 0 && byId.size >= expectedCount) return;

      const before = byId.size;
      const maxScroll = Math.max(
        0,
        (scroller.scrollHeight || 0) - (scroller.clientHeight || 0)
      );
      const next = Math.min(
        maxScroll,
        Number(scroller.scrollTop || 0) + Math.max(240, (scroller.clientHeight || 400) * 0.85)
      );
      scroller.scrollTop = next;
      await sleep(80);

      if (byId.size === before) stable += 1;
      else stable = 0;
      if (stable >= 4 || Number(scroller.scrollTop) >= maxScroll - 2) break;
    }
  }

  /**
   * @param {number} expectedCount
   * @returns {Promise<void>}
   */
  async function expandForHarvest(expectedCount) {
    const expandAll = findToolbarControl(/espandi tutto|expand all/);
    if (expandAll) {
      expandAll.click();
      await sleep(250);
    }

    for (const btn of document.querySelectorAll(
      '.kQ.adv [role="button"], .kQ span.adx[role="button"], .kQ [role="button"]'
    )) {
      const label = (
        (btn.textContent || "") +
        " " +
        (btn.getAttribute("aria-label") || "")
      ).trim();
      if (!label) continue;
      btn.click();
    }
    await sleep(200);

    /** @type {Map<string, { messageId: string, permmsgid: string | null, fromEmail: string }>} */
    const byId = new Map();
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      for (const row of snapshotRoots()) {
        if (row.permmsgid) byId.set(row.messageId, row);
      }
      if (expectedCount > 0 && byId.size >= expectedCount) return;
      await sleep(100);
    }

    await scrollCollect(expectedCount, byId);
  }

  /**
   * @returns {Promise<boolean>}
   */
  async function collapseAfterHarvest() {
    const collapseAll = findToolbarControl(/comprimi tutto|collapse all/);
    if (!collapseAll) return false;
    collapseAll.click();
    await sleep(250);
    return true;
  }

  /**
   * Expand only long enough to collect message ids, then collapse + restore scroll.
   *
   * @param {number} [expectedCount]
   * @returns {Promise<Array<{ messageId: string, permmsgid: string | null, fromEmail: string }>>}
   */
  async function harvestMessageRoots(expectedCount = 0) {
    const existing = snapshotRoots().filter((row) => row.permmsgid);
    if (expectedCount > 0 && existing.length >= expectedCount) {
      return existing;
    }

    const scroller = scrollContainer();
    const scrollTop = scroller && "scrollTop" in scroller ? scroller.scrollTop : 0;

    await expandForHarvest(expectedCount);

    /** @type {Map<string, { messageId: string, permmsgid: string | null, fromEmail: string }>} */
    const byId = new Map();
    for (const row of snapshotRoots()) {
      if (row.permmsgid) byId.set(row.messageId, row);
    }
    // Preserve encounter order from the final listMessageRoots pass when possible.
    const ordered = snapshotRoots().filter((row) => row.permmsgid);
    const roots = ordered.length ? ordered : [...byId.values()];

    await collapseAfterHarvest();
    if (scroller && "scrollTop" in scroller) {
      scroller.scrollTop = scrollTop;
    }

    return roots;
  }

  MC.expand = {
    harvestMessageRoots,
  };
})();
