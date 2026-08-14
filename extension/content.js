/**
 * MailContext content script — orchestrates copy message / copy thread.
 *
 * Heavy print fetch/parse and Show original fetches run in the extension
 * service worker / offscreen document so the Gmail tab stays responsive.
 */

(() => {
  const MC = globalThis.MailContext;
  if (
    !MC?.identity ||
    !MC.format ||
    !MC.clipboard ||
    !MC.ui ||
    !MC.session ||
    !MC.enrich
  ) {
    console.error("[MailContext] libraries failed to load");
    return;
  }

  let busy = false;

  /**
   * Show `Copying…` only if the thread copy is still running after this delay.
   * Tuned above typical short-thread print + OM enrich (~1–1.5 s) to avoid flicker.
   */
  const COPYING_DEFER_MS = 2000;

  /**
   * Schedule a deferred in-progress toast for slow thread copies.
   *
   * @returns {() => void} Cancel (call from `finally` before clearing `busy`)
   */
  function scheduleCopyingToast() {
    const timer = window.setTimeout(() => {
      if (busy) MC.ui.toast("Copying…", "notice");
    }, COPYING_DEFER_MS);
    return () => window.clearTimeout(timer);
  }

  /**
   * @param {string} code
   * @param {string} [detail]
   */
  function fail(code, detail) {
    const messages = {
      NOT_ON_THREAD: "Open a Gmail conversation first",
      AMBIGUOUS_PAGE: "Couldn't identify the open thread",
      NO_MESSAGE: "Couldn't identify the target message",
      NOT_LOGGED_IN: "Gmail session expired — sign in again",
      FETCH_FAILED: "Couldn't load Gmail print view",
      PRINT_VIEW_TOO_LARGE: "Print view is too large to copy safely",
      WRONG_THREAD: "Print view didn't match the open thread",
      PARSE_EMPTY: "No messages found in print view",
      PARSE_FAILED: "Couldn't parse print view",
      INCOMPLETE_HEADERS: "Couldn't establish From or Date for a message",
      CLIPBOARD_FAILED: "Couldn't write to the clipboard",
    };
    const base = messages[code] || "Copy failed";
    MC.ui.toast(detail ? `${base} · ${detail}` : base, "error");
  }

  /**
   * @param {{ accountIndex: number, threadId: string, subject: string, messageId?: string }} identity
   * @returns {Promise<object>}
   */
  async function fetchParsePrint(identity) {
    return chrome.runtime.sendMessage({
      type: "mailcontext.fetchParsePrint",
      identity,
    });
  }

  /**
   * @param {number} accountIndex
   * @param {string | null | undefined} ikFromPrint
   */
  function rememberPrintIk(accountIndex, ikFromPrint) {
    if (!ikFromPrint) return;
    MC.session.rememberIk?.(accountIndex, ikFromPrint, "print");
  }

  /**
   * @returns {Promise<void>}
   */
  async function copyThread() {
    if (busy) return;
    const identity = MC.identity.currentIdentity();
    if (!identity) {
      fail(MC.identity.pageState() === "ambiguous" ? "AMBIGUOUS_PAGE" : "NOT_ON_THREAD");
      return;
    }

    busy = true;
    const cancelCopying = scheduleCopyingToast();
    try {
      const parsed = await fetchParsePrint(identity);
      if (!parsed?.ok) {
        fail(parsed?.code || "FETCH_FAILED", parsed?.detail);
        return;
      }
      rememberPrintIk(identity.accountIndex, parsed.ikFromPrint);
      const thread = parsed.thread;
      if (thread.messages.length === 1) {
        MC.enrich.mergeAttachments(
          thread.messages[0],
          MC.enrich.liveAttachmentNames()
        );
      }
      const enrich = await MC.enrich.enrichMessages(identity, thread.messages);
      const markdown = MC.format.formatThread(thread);
      await MC.clipboard.writeText(markdown);
      const feedback = MC.enrich.copyFeedback(thread.messages.length, enrich);
      MC.ui.toast(feedback.text, feedback.kind);
    } catch (error) {
      fail("CLIPBOARD_FAILED", String(error?.message || error));
    } finally {
      cancelCopying();
      busy = false;
    }
  }

  /**
   * @param {Element | null} [fromElement]
   * @returns {Promise<void>}
   */
  async function copyMessage(fromElement = null) {
    if (busy) return;
    const identity = MC.identity.currentIdentity();
    if (!identity) {
      fail(MC.identity.pageState() === "ambiguous" ? "AMBIGUOUS_PAGE" : "NOT_ON_THREAD");
      return;
    }
    const target = MC.identity.targetMessage(fromElement);
    if (!target) {
      fail("NO_MESSAGE");
      return;
    }

    busy = true;
    try {
      const parsed = await fetchParsePrint({
        ...identity,
        messageId: target.messageId,
      });
      if (!parsed?.ok) {
        fail(parsed?.code || "FETCH_FAILED", parsed?.detail);
        return;
      }
      rememberPrintIk(identity.accountIndex, parsed.ikFromPrint);
      const thread = parsed.thread;
      if (thread.messages.length !== 1) {
        fail("PARSE_EMPTY", "expected a single message");
        return;
      }
      MC.enrich.mergeAttachments(
        thread.messages[0],
        MC.enrich.liveAttachmentNames(target.root)
      );
      const enrich = await MC.enrich.enrichMessages(identity, thread.messages, {
        preferredPermmsgid: target.permmsgid,
      });
      const markdown = MC.format.formatMessage(thread.messages[0], {
        includeSubject: true,
        subject: identity.subject,
      });
      await MC.clipboard.writeText(markdown);
      const feedback = MC.enrich.copyFeedback(1, enrich);
      MC.ui.toast(feedback.text, feedback.kind);
    } catch (error) {
      fail("CLIPBOARD_FAILED", String(error?.message || error));
    } finally {
      busy = false;
    }
  }

  function refreshUi() {
    if (MC.identity.pageState() !== "thread") return;
    MC.ui.mountControls({
      onCopyThread: () => {
        copyThread();
      },
      onCopyMessage: (el) => {
        copyMessage(el);
      },
    });
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== "mailcontext.command") return;
    if (message.command === "copy-thread") copyThread();
    if (message.command === "copy-message") copyMessage();
  });

  refreshUi();
  const identityBoot = MC.identity.currentIdentity?.() || null;
  if (identityBoot?.accountIndex != null) {
    MC.session.ensurePerformanceWatch(identityBoot.accountIndex);
  } else {
    const accountMatch = location.pathname.match(/\/u\/(\d+)/);
    MC.session.ensurePerformanceWatch(
      accountMatch ? Number(accountMatch[1]) : 0
    );
  }
  const observer = new MutationObserver(() => {
    window.clearTimeout(refreshUi._t);
    refreshUi._t = window.setTimeout(refreshUi, 250);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  console.info("[MailContext] content script ready");
})();
