/**
 * MailContext background service worker (MV3).
 *
 * Relays keyboard commands, fetches/parses print view off the Gmail tab,
 * enriches Show original headers, and writes the clipboard via offscreen.
 */

importScripts("lib/print.js", "lib/original.js");

/** @type {Promise<void> | null} */
let offscreenReady = null;

chrome.runtime.onInstalled.addListener(() => {
  console.info("[MailContext] installed");
});

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
  const value = match?.[1] || "";
  return /^[A-Za-z0-9_-]{4,}$/.test(value) ? value : null;
}

/**
 * Forward a keyboard command to the active Gmail tab's content script.
 *
 * @param {string} command
 * @returns {Promise<void>}
 */
async function relayCommand(command) {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true,
    url: "https://mail.google.com/*",
  });
  const tab = tabs[0];
  if (!tab?.id) {
    return;
  }
  await chrome.tabs.sendMessage(tab.id, { type: "mailcontext.command", command });
}

/**
 * Ensure the offscreen document exists (clipboard + DOMParser).
 * Prefer runtime.getContexts (Chrome 116+); hasDocument is Chrome 150+ only.
 *
 * @returns {Promise<void>}
 */
async function ensureOffscreen() {
  if (!chrome.offscreen?.createDocument) {
    throw new Error("offscreen API unavailable");
  }

  const path = "offscreen.html";
  const offscreenUrl = chrome.runtime.getURL(path);

  /**
   * @returns {Promise<boolean>}
   */
  async function documentExists() {
    if (chrome.runtime.getContexts) {
      const contexts = await chrome.runtime.getContexts({
        contextTypes: ["OFFSCREEN_DOCUMENT"],
        documentUrls: [offscreenUrl],
      });
      return contexts.length > 0;
    }
    if (chrome.offscreen.hasDocument) {
      return chrome.offscreen.hasDocument();
    }
    const matched = await clients.matchAll();
    return matched.some((client) => client.url.includes(chrome.runtime.id));
  }

  if (await documentExists()) return;
  if (!offscreenReady) {
    offscreenReady = chrome.offscreen
      .createDocument({
        url: path,
        reasons: ["CLIPBOARD", "DOM_PARSER"],
        justification:
          "Parse Gmail print HTML and write Markdown to the clipboard without blocking the Gmail tab.",
      })
      .catch(async (error) => {
        if (await documentExists()) return;
        throw error;
      })
      .finally(() => {
        offscreenReady = null;
      });
  }
  await offscreenReady;
}

/**
 * @param {string} text
 * @returns {Promise<void>}
 */
async function writeClipboard(text) {
  await ensureOffscreen();
  const response = await chrome.runtime.sendMessage({
    type: "mailcontext.offscreenWrite",
    text,
  });
  if (!response?.ok) {
    throw new Error(response?.error || "clipboard write failed");
  }
}

/**
 * Fetch print view in the service worker and parse it in the offscreen page.
 *
 * @param {{ accountIndex: number, threadId: string, subject: string, messageId?: string }} identity
 * @returns {Promise<object>}
 */
async function fetchParsePrint(identity) {
  const print = globalThis.MailContext?.print;
  if (!print?.fetchPrintView) {
    return { ok: false, code: "FETCH_FAILED", detail: "print API unavailable" };
  }

  const fetched = await print.fetchPrintView(identity);
  if (!fetched.ok) return fetched;

  const ikFromPrint = findIkInText(fetched.html);
  await ensureOffscreen();
  const parsed = await chrome.runtime.sendMessage({
    type: "mailcontext.offscreenParsePrint",
    html: fetched.html,
    identity: { subject: identity.subject },
  });
  if (!parsed || parsed.ok !== true) {
    return parsed && parsed.ok === false
      ? parsed
      : { ok: false, code: "PARSE_FAILED", detail: "offscreen parse failed" };
  }
  return { ok: true, thread: parsed.thread, ikFromPrint };
}

/**
 * @param {{
 *   accountIndex: number,
 *   ik: string,
 *   jobs: Array<{ index: number, permmsgid: string }>
 * }} params
 * @returns {Promise<{ ok: true, results: object[] } | { ok: false, error: string }>}
 */
async function enrichHeaders(params) {
  const api = globalThis.MailContextOriginal || globalThis.MailContext?.original;
  if (!api?.fetchOriginalHeadersBatch) {
    return { ok: false, error: "original header API unavailable" };
  }
  const results = await api.fetchOriginalHeadersBatch({
    accountIndex: Number(params.accountIndex),
    ik: String(params.ik || ""),
    jobs: Array.isArray(params.jobs) ? params.jobs : [],
  });
  return { ok: true, results };
}

chrome.commands.onCommand.addListener((command) => {
  relayCommand(command).catch((error) => {
    console.warn("[MailContext] command relay failed", error);
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "mailcontext.clipboardWrite") {
    writeClipboard(String(message.text ?? "")).then(
      () => sendResponse({ ok: true }),
      (error) => sendResponse({ ok: false, error: String(error?.message || error) })
    );
    return true;
  }

  if (message?.type === "mailcontext.fetchParsePrint") {
    fetchParsePrint(message.identity).then(
      (result) => sendResponse(result),
      (error) =>
        sendResponse({
          ok: false,
          code: "FETCH_FAILED",
          detail: String(error?.message || error),
        })
    );
    return true;
  }

  if (message?.type === "mailcontext.enrichHeaders") {
    enrichHeaders({
      accountIndex: message.accountIndex,
      ik: message.ik,
      jobs: message.jobs,
    }).then(
      (result) => sendResponse(result),
      (error) => sendResponse({ ok: false, error: String(error?.message || error) })
    );
    return true;
  }

  return undefined;
});
