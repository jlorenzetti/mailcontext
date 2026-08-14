/**
 * Gmail identity helpers for the open conversation.
 *
 * Prefers locale-stable data attributes over visible Italian/English strings.
 */

(() => {
  const MC = (globalThis.MailContext = globalThis.MailContext || {});

  /** @type {string} */
  const MESSAGE_BODY = "div.a3s, div.ii, blockquote, table.message";

  /**
   * @returns {number | null}
   */
  function accountIndexFromLocation() {
    const match = location.pathname.match(/\/mail\/u\/(\d+)\//);
    return match ? Number(match[1]) : null;
  }

  /**
   * @returns {{ element: HTMLElement, ambiguous: boolean } | { element: null, ambiguous: boolean }}
   */
  function subjectState() {
    const candidates = Array.from(document.querySelectorAll("h2.hP")).filter((element) => {
      if (element.closest(MESSAGE_BODY)) return false;
      if (element.closest('[aria-hidden="true"], [hidden]')) return false;
      const style = globalThis.getComputedStyle?.(element);
      return !style || (style.display !== "none" && style.visibility !== "hidden");
    });
    if (candidates.length === 1) {
      return { element: /** @type {HTMLElement} */ (candidates[0]), ambiguous: false };
    }
    const inMain = candidates.filter((element) => element.closest('[role="main"]'));
    if (inMain.length === 1) {
      return { element: /** @type {HTMLElement} */ (inMain[0]), ambiguous: false };
    }
    return { element: null, ambiguous: candidates.length > 1 };
  }

  /**
   * @param {Element | null} heading
   * @returns {string | null}
   */
  function threadIdFor(heading) {
    if (!heading) return null;
    const direct = heading.getAttribute("data-legacy-thread-id");
    if (direct && /^[0-9a-f]+$/i.test(direct)) return direct;

    let node = heading.parentElement;
    let depth = 0;
    while (node && node.getAttribute("role") !== "main" && depth < 8) {
      const own = node.getAttribute("data-legacy-thread-id");
      if (own && /^[0-9a-f]+$/i.test(own)) return own;
      node = node.parentElement;
      depth += 1;
    }
    return null;
  }

  /**
   * @returns {{ threadId: string, subject: string, accountIndex: number } | null}
   */
  function currentIdentity() {
    const { element } = subjectState();
    const threadId = threadIdFor(element);
    const subject = (element?.innerText || element?.textContent || "").trim();
    const accountIndex = accountIndexFromLocation();
    if (!threadId || !subject || accountIndex == null) return null;
    return { threadId, subject, accountIndex };
  }

  /**
   * @param {Element} start
   * @returns {HTMLElement | null}
   */
  function closestMessageRoot(start) {
    return /** @type {HTMLElement | null} */ (
      start.closest("div.adn[data-legacy-message-id], div.adn")
    );
  }

  /**
   * @param {Element} root
   * @returns {boolean}
   */
  function isExpandedMessageRoot(root) {
    if (root.closest(".kQ, .kv")) return false;
    const body = root.querySelector("div.a3s, div.ii");
    if (!body) return false;
    const style = globalThis.getComputedStyle?.(body);
    return !style || (style.display !== "none" && style.visibility !== "hidden");
  }

  /**
   * @param {HTMLElement} root
   * @returns {{ messageId: string, permmsgid: string | null, root: HTMLElement } | null}
   */
  function messageFromRoot(root) {
    if (!root) return null;
    const messageId = root.getAttribute("data-legacy-message-id");
    if (!messageId || !/^[0-9a-f]+$/i.test(messageId)) return null;
    return {
      messageId,
      permmsgid: permmsgidFor(root),
      root,
    };
  }

  /**
   * Resolve the message under a control, keyboard focus, or the only expanded
   * message in the open thread. Never silently pick an arbitrary first DOM hit.
   *
   * @param {Element | null} [fromElement]
   * @returns {{ messageId: string, permmsgid: string | null, root: HTMLElement } | null}
   */
  function targetMessage(fromElement = null) {
    if (fromElement) {
      const fromRoot = closestMessageRoot(fromElement);
      const direct = fromRoot && messageFromRoot(/** @type {HTMLElement} */ (fromRoot));
      if (direct) return direct;
    }

    const active = document.activeElement;
    if (active && active !== document.body) {
      const focusedRoot = closestMessageRoot(active);
      const focused = focusedRoot && messageFromRoot(/** @type {HTMLElement} */ (focusedRoot));
      if (focused) return focused;
    }

    const roots = listMessageRoots().filter((entry) => {
      const main = entry.root.closest('[role="main"]');
      return Boolean(main);
    });
    const pool = roots.length ? roots : listMessageRoots();
    if (pool.length === 1) return pool[0];

    const expanded = pool.filter((entry) => isExpandedMessageRoot(entry.root));
    if (expanded.length === 1) return expanded[0];

    return null;
  }

  /**
   * @param {Element} root
   * @returns {string | null}
   */
  function permmsgidFor(root) {
    const raw = root.getAttribute("data-message-id") || "";
    const value = raw.replace(/^#/, "").trim();
    return /^msg-[a-z]:/i.test(value) ? value : null;
  }

  /**
   * Expanded message roots in DOM order (after Expand all, typically chronological).
   *
   * @returns {Array<{ messageId: string, permmsgid: string | null, root: HTMLElement }>}
   */
  function listMessageRoots() {
    const roots = Array.from(
      document.querySelectorAll("div.adn[data-legacy-message-id]")
    );
    /** @type {Array<{ messageId: string, permmsgid: string | null, root: HTMLElement }>} */
    const out = [];
    for (const root of roots) {
      const messageId = root.getAttribute("data-legacy-message-id") || "";
      if (!/^[0-9a-f]+$/i.test(messageId)) continue;
      out.push({
        messageId,
        permmsgid: permmsgidFor(root),
        root: /** @type {HTMLElement} */ (root),
      });
    }
    return out;
  }

  /**
   * @returns {"thread" | "ambiguous" | "none"}
   */
  function pageState() {
    if (currentIdentity()) return "thread";
    return subjectState().ambiguous ? "ambiguous" : "none";
  }

  MC.identity = {
    accountIndexFromLocation,
    currentIdentity,
    listMessageRoots,
    pageState,
    permmsgidFor,
    subjectState,
    targetMessage,
    threadIdFor,
  };
})();
