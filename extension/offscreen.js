/**
 * Offscreen document: clipboard writes + print-view DOMParser.
 *
 * Keeps heavy HTML parsing and clipboard IO off the Gmail tab main thread.
 */

/**
 * @param {string} text
 * @returns {Promise<void>}
 */
async function writeText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      /* fall through to execCommand */
    }
  }

  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) {
    throw new Error("clipboard write failed");
  }
}

/**
 * @param {string} html
 * @param {{ subject: string }} identity
 * @returns {{ ok: true, thread: object } | { ok: false, code: string, detail?: string }}
 */
function parsePrint(html, identity) {
  const parse = globalThis.MailContext?.parse;
  if (!parse?.parsePrintView) {
    return { ok: false, code: "PARSE_FAILED", detail: "parser unavailable" };
  }
  return parse.parsePrintView(html, identity);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "mailcontext.offscreenWrite") {
    writeText(String(message.text ?? "")).then(
      () => sendResponse({ ok: true }),
      (error) =>
        sendResponse({ ok: false, error: String(error?.message || error) })
    );
    return true;
  }

  if (message?.type === "mailcontext.offscreenParsePrint") {
    try {
      const result = parsePrint(String(message.html ?? ""), {
        subject: String(message.identity?.subject || ""),
      });
      sendResponse(result);
    } catch (error) {
      sendResponse({
        ok: false,
        code: "PARSE_FAILED",
        detail: String(error?.message || error),
      });
    }
    return false;
  }

  return undefined;
});
