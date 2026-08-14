/**
 * Clipboard helpers for the MailContext content script.
 *
 * Writes go through the extension offscreen document so the Gmail tab does
 * not need to stay focused after Copy message / Copy thread (print + enrich
 * are async; users often switch to the paste destination immediately).
 */

(() => {
  const MC = (globalThis.MailContext = globalThis.MailContext || {});

  /**
   * @param {unknown} error
   * @returns {boolean}
   */
  function isDeadExtensionContext(error) {
    const message = String(error?.message || error || "");
    return /extension context invalidated|message port closed|receiving end does not exist/i.test(
      message
    );
  }

  /**
   * @param {string} text
   * @returns {Promise<void>}
   */
  async function writeInPage(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    if (!ok) {
      throw new Error("clipboard write failed");
    }
  }

  /**
   * @param {string} text
   * @returns {Promise<void>}
   */
  async function writeViaExtension(text) {
    if (!chrome?.runtime?.id) {
      throw new Error("extension context invalidated");
    }
    const response = await chrome.runtime.sendMessage({
      type: "mailcontext.clipboardWrite",
      text,
    });
    if (response?.ok) return;
    if (response && response.ok === false) {
      throw new Error(response.error || "clipboard write failed");
    }
    throw new Error("clipboard write failed");
  }

  /**
   * @param {string} text
   * @returns {Promise<void>}
   */
  async function writeText(text) {
    try {
      await writeViaExtension(text);
      return;
    } catch (error) {
      if (!isDeadExtensionContext(error)) {
        // Offscreen path failed for another reason — still try in-page once.
        try {
          await writeInPage(text);
          return;
        } catch {
          throw error;
        }
      }
    }
    await writeInPage(text);
  }

  MC.clipboard = { writeText };
})();
