/**
 * Toast feedback and Gmail More (⋮) menu injection.
 *
 * Supports classic (`J-M` / `J-N`) and Material (`ul[role=menu]`) overflow menus.
 */

(() => {
  const MC = (globalThis.MailContext = globalThis.MailContext || {});

  const ROOT_ID = "mailcontext-root";
  const TOAST_ID = "mailcontext-toast";
  const ITEM_ATTR = "data-mailcontext-item";
  /** Material snackbar `LENGTH_LONG` (no action). @see SnackbarManager.LONG_DURATION_MS */
  const TOAST_DURATION_MS = 2750;

  /** @type {Element | null} */
  let lastMoreButton = null;
  let trackerBound = false;
  /** @type {MutationObserver | null} */
  let menuObserver = null;
  /** @type {{ onCopyThread: () => void, onCopyMessage: (el: Element | null) => void } | null} */
  let handlersRef = null;

  /**
   * @returns {HTMLElement}
   */
  function ensureRoot() {
    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement("div");
      root.id = ROOT_ID;
      document.documentElement.appendChild(root);
    }
    return root;
  }

  /**
   * @param {string} message
   * @param {"success" | "notice" | "error"} [kind]
   */
  function toast(message, kind = "success") {
    const root = ensureRoot();
    let el = document.getElementById(TOAST_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = TOAST_ID;
      el.setAttribute("role", "alert");
      el.setAttribute("aria-live", "assertive");
      el.setAttribute("aria-atomic", "true");
      root.appendChild(el);
    }
    el.dataset.kind = kind;
    el.textContent = message;
    el.dataset.visible = "true";
    window.clearTimeout(el._mcTimer);
    el._mcTimer = window.setTimeout(() => {
      el.dataset.visible = "false";
    }, TOAST_DURATION_MS);
  }

  /**
   * @param {string} label
   * @returns {boolean}
   */
  function isMessageMoreLabel(label) {
    return /opzioni\s+messaggio|more\s+message\s+options/i.test(label);
  }

  /**
   * @param {string} label
   * @returns {boolean}
   */
  function isThreadMoreLabel(label) {
    return /opzioni\s+email|more\s+email\s+options|more\s+conversation\s+options/i.test(
      label
    );
  }

  /**
   * @param {Element | null} target
   */
  function rememberMoreButton(target) {
    const btn = target?.closest?.("[aria-label]");
    if (!btn) return;
    const label = btn.getAttribute("aria-label") || "";
    if (isMessageMoreLabel(label) || isThreadMoreLabel(label)) {
      lastMoreButton = btn;
    }
  }

  /**
   * Track More openers on pointerdown (menus often mount before click).
   */
  function ensureMoreTracker() {
    if (trackerBound) return;
    trackerBound = true;
    document.addEventListener(
      "pointerdown",
      (event) => rememberMoreButton(/** @type {Element | null} */ (event.target)),
      true
    );
    document.addEventListener(
      "click",
      (event) => rememberMoreButton(/** @type {Element | null} */ (event.target)),
      true
    );
  }

  /**
   * @returns {HTMLElement[]}
   */
  function visibleMenus() {
    return [...document.querySelectorAll('[role="menu"]')].filter((menu) => {
      const rect = menu.getClientRects()[0];
      return Boolean(rect && rect.width > 0 && rect.height > 0);
    });
  }

  /**
   * @param {HTMLElement} menu
   * @returns {"classic" | "material"}
   */
  function menuFlavor(menu) {
    if (menu.classList.contains("J-M") || menu.querySelector(":scope .J-N, .J-N")) {
      return "classic";
    }
    if (menu.tagName === "UL" || menu.querySelector(':scope > li[role="menuitem"], li[role="menuitem"]')) {
      return "material";
    }
    return "classic";
  }

  /**
   * Prefer stable menu contents over opener state (opener can lag when menus
   * mount on mousedown).
   *
   * @param {HTMLElement} menu
   * @returns {"message" | "thread" | null}
   */
  function classifyMenu(menu) {
    const text = menu.textContent || "";
    const hasShowOriginal = /mostra originale|show original/i.test(text);
    const hasForwardAll = /inoltra tutto|forward all/i.test(text);
    // Inbox list More often only has "Mark all as read".
    const hasMarkAllRead =
      /segna tutti come (già )?lett|mark all as read/i.test(text);

    if (hasMarkAllRead && !hasForwardAll && !hasShowOriginal) return null;
    if (hasForwardAll && !hasShowOriginal) return "thread";
    if (hasShowOriginal && !hasForwardAll) return "message";

    const aria = (menu.getAttribute("aria-label") || "").toLowerCase();
    if (/messaggio|message options|opzioni messaggio/.test(aria)) return "message";
    if (/email|conversation|thread|conversazione|opzioni email/.test(aria)) {
      return "thread";
    }

    const opener = lastMoreButton;
    if (opener) {
      const label = opener.getAttribute("aria-label") || "";
      if (isMessageMoreLabel(label)) return "message";
      if (isThreadMoreLabel(label)) return "thread";
    }

    if (hasForwardAll) return "thread";
    if (hasShowOriginal) return "message";
    return null;
  }

  /**
   * @param {HTMLElement} menu
   * @param {"message" | "thread"} kind
   */
  function pruneWrongItems(menu, kind) {
    const wrong = kind === "thread" ? "copy-message" : "copy-thread";
    for (const el of menu.querySelectorAll(`[${ITEM_ATTR}="${wrong}"]`)) {
      el.remove();
    }
  }

  /**
   * Message root for the More control that opened the current menu.
   * Prefer the tracked opener; never grab an unrelated expanded control.
   *
   * @returns {Element | null}
   */
  function messageRootFromContext() {
    if (lastMoreButton) {
      const label = lastMoreButton.getAttribute("aria-label") || "";
      if (isMessageMoreLabel(label)) {
        const fromOpener = lastMoreButton.closest(
          "div.adn[data-legacy-message-id]"
        );
        if (fromOpener) return fromOpener;
      }
    }

    const messageMore = [
      ...document.querySelectorAll("[aria-label][aria-expanded='true']"),
    ].find((el) => isMessageMoreLabel(el.getAttribute("aria-label") || ""));
    return (
      messageMore?.closest?.("div.adn[data-legacy-message-id]") || null
    );
  }

  /**
   * Close the open Gmail overflow menu after our action.
   * Classic `.J-M` menus do not reliably toggle via the More button / Escape
   * once we stopPropagation, so hide them directly.
   */
  function dismissOpenMenu() {
    for (const menu of visibleMenus()) {
      if (menuFlavor(menu) === "classic") {
        menu.style.display = "none";
        menu.setAttribute("aria-hidden", "true");
      }
    }

    const expanded = [
      ...document.querySelectorAll("[aria-label][aria-expanded='true']"),
    ].find((el) => {
      const label = el.getAttribute("aria-label") || "";
      return isMessageMoreLabel(label) || isThreadMoreLabel(label);
    });
    if (expanded) {
      expanded.click();
    }

    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
        keyCode: 27,
        which: 27,
        bubbles: true,
        cancelable: true,
      })
    );

    // Classic menus also dismiss on outside mousedown.
    document.documentElement.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window })
    );
  }

  /**
   * @param {HTMLElement} item
   * @param {() => void} onActivate
   */
  function bindActivate(item, onActivate) {
    const activate = (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      dismissOpenMenu();
      onActivate();
    };
    item.addEventListener("click", activate, true);
    item.addEventListener(
      "mousedown",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
      },
      true
    );
    item.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Enter" || event.key === " ") activate(event);
      },
      true
    );
  }

  /**
   * Classic Gmail menuitem: `.J-N` > `.J-N-Jz` > `.J-N-JX` + label.
   * Hover highlight uses `.J-N-JT` (not CSS :hover alone).
   *
   * @param {string} label
   * @param {"copy-message" | "copy-thread"} itemId
   * @param {() => void} onActivate
   * @returns {HTMLElement}
   */
  function buildClassicMenuItem(label, itemId, onActivate) {
    const item = document.createElement("div");
    item.className = "J-N";
    item.setAttribute("role", "menuitem");
    item.setAttribute(ITEM_ATTR, itemId);
    item.setAttribute("aria-label", label);
    item.tabIndex = -1;
    item.style.userSelect = "none";

    const row = document.createElement("div");
    row.className = "J-N-Jz";
    row.style.userSelect = "none";

    const icon = document.createElement("div");
    icon.className = "mailcontext-menu-icon sVHnob J-N-JX";
    icon.style.userSelect = "none";
    icon.setAttribute("aria-hidden", "true");

    row.append(icon, document.createTextNode(label));
    item.append(row);

    item.addEventListener("mouseenter", () => {
      item.classList.add("J-N-JT");
    });
    item.addEventListener("mouseleave", () => {
      item.classList.remove("J-N-JT");
    });
    bindActivate(item, onActivate);
    return item;
  }

  /**
   * Material menuitem: clone a sibling so spacing/typography match.
   * Hover highlight is a ripple layer on `.UTNHae` toggled via class `J58z0d`
   * (Gmail’s own mouseenter handler is stripped with jsaction).
   *
   * @param {HTMLElement} sample
   * @param {string} label
   * @param {"copy-message" | "copy-thread"} itemId
   * @param {() => void} onActivate
   * @returns {HTMLElement}
   */
  function buildMaterialMenuItem(sample, label, itemId, onActivate) {
    const item = /** @type {HTMLElement} */ (sample.cloneNode(true));
    item.setAttribute(ITEM_ATTR, itemId);
    item.removeAttribute("id");
    item.removeAttribute("jsaction");
    item.removeAttribute("data-action-type");
    item.removeAttribute("jslog");
    item.removeAttribute("data-menu-item-skip-restore-focus");
    item.removeAttribute("data-cursor-ref");
    item.setAttribute("role", "menuitem");
    item.setAttribute("tabindex", "-1");
    item.setAttribute("aria-label", label);

    const iconHost = item.querySelector(
      ".aqdrmf-Kf-KkROqb [aria-hidden='true'], [class*='KkROqb'] [aria-hidden='true']"
    );
    if (iconHost) {
      const slot = document.createElement("div");
      // `f4` is Gmail’s 20dp icon box; negative margin matches native sprites.
      slot.className = "f4 mailcontext-menu-icon mailcontext-menu-icon--material";
      slot.setAttribute("aria-hidden", "true");
      iconHost.replaceChildren(slot);
    }

    const textHost =
      item.querySelector('[jsname="K4r5Ff"]') ||
      item.querySelector(".aqdrmf-Kf-Gtdoyb span") ||
      [...item.querySelectorAll("span")].find(
        (span) =>
          span.childElementCount === 0 &&
          (span.textContent || "").trim().length > 0 &&
          !span.closest('[aria-hidden="true"]')
      );
    if (textHost) textHost.textContent = label;

    const ripple = item.querySelector(".UTNHae");
    item.addEventListener("mouseenter", () => {
      ripple?.classList.add("J58z0d");
    });
    item.addEventListener("mouseleave", () => {
      ripple?.classList.remove("J58z0d");
    });

    bindActivate(item, onActivate);
    return item;
  }

  /**
   * @param {HTMLElement} menu
   * @param {string} itemId
   * @returns {boolean}
   */
  function alreadyInjected(menu, itemId) {
    return Boolean(menu.querySelector(`[${ITEM_ATTR}="${itemId}"]`));
  }

  /**
   * @param {HTMLElement} menu
   * @param {RegExp} pattern
   * @returns {HTMLElement | null}
   */
  function findMenuItem(menu, pattern) {
    return (
      [...menu.querySelectorAll('[role="menuitem"]')].find((el) =>
        pattern.test(el.textContent || "")
      ) || null
    );
  }

  /**
   * @param {HTMLElement} menu
   * @param {HTMLElement} item
   * @param {"message" | "thread"} kind
   */
  function insertMenuItem(menu, item, kind) {
    const sample = menu.querySelector('[role="menuitem"]');
    if (!sample?.parentElement) return;

    if (kind === "thread") {
      const forwardAll = findMenuItem(menu, /inoltra tutto|forward all/i);
      if (forwardAll?.parentElement) {
        forwardAll.insertAdjacentElement("afterend", item);
        return;
      }
      const separator = menu.querySelector('[role="separator"]');
      if (separator?.parentElement) {
        separator.insertAdjacentElement("beforebegin", item);
        return;
      }
    }

    if (kind === "message") {
      const showOriginal = findMenuItem(menu, /mostra originale|show original/i);
      if (showOriginal) {
        const wrapper = showOriginal.closest("[data-is-tooltip-wrapper='true']");
        const anchor = wrapper || showOriginal;
        anchor.insertAdjacentElement("afterend", item);
        return;
      }
      const printItem = findMenuItem(menu, /^\\s*(stampa|print)\\s*$/i);
      if (printItem?.parentElement) {
        const wrapper = printItem.closest("[data-is-tooltip-wrapper='true']");
        const anchor = wrapper || printItem;
        anchor.insertAdjacentElement("beforebegin", item);
        return;
      }
    }

    sample.parentElement.appendChild(item);
  }

  /**
   * @param {HTMLElement} menu
   * @param {{ onCopyThread: () => void, onCopyMessage: (el: Element | null) => void }} handlers
   */
  function injectIntoMenu(menu, handlers) {
    const kind = classifyMenu(menu);
    if (!kind) return;

    // List/inbox toolbar More shares labels with conversation overflow
    // ("Altre opzioni email"). Only offer Copy thread when a conversation
    // is actually open.
    if (kind === "thread" && MC.identity?.pageState?.() !== "thread") {
      for (const el of menu.querySelectorAll(`[${ITEM_ATTR}="copy-thread"]`)) {
        el.remove();
      }
      return;
    }

    pruneWrongItems(menu, kind);

    const itemId = kind === "message" ? "copy-message" : "copy-thread";
    if (alreadyInjected(menu, itemId)) return;

    const label = kind === "message" ? "Copy message" : "Copy thread";
    // Capture root when the menu opens so activation cannot pick another message.
    const messageRoot = kind === "message" ? messageRootFromContext() : null;
    const onActivate =
      kind === "message"
        ? () => handlers.onCopyMessage(messageRoot || messageRootFromContext())
        : () => handlers.onCopyThread();

    const flavor = menuFlavor(menu);
    let item;
    if (flavor === "classic") {
      item = buildClassicMenuItem(label, itemId, onActivate);
    } else {
      const sample = [...menu.querySelectorAll('[role="menuitem"]')].find(
        (el) => !el.hasAttribute(ITEM_ATTR)
      );
      if (!sample) return;
      item = buildMaterialMenuItem(
        /** @type {HTMLElement} */ (sample),
        label,
        itemId,
        onActivate
      );
    }

    insertMenuItem(menu, item, kind);
  }

  /**
   * Watch open Gmail More menus and inject Copy message / Copy thread.
   *
   * @param {{ onCopyThread: () => void, onCopyMessage: (el: Element | null) => void }} handlers
   */
  function mountControls(handlers) {
    ensureMoreTracker();
    handlersRef = handlers;
    if (!menuObserver) {
      menuObserver = new MutationObserver(() => {
        if (!handlersRef) return;
        for (const openMenu of visibleMenus()) {
          injectIntoMenu(openMenu, handlersRef);
        }
      });
      menuObserver.observe(document.body, { childList: true, subtree: true });
    }
    for (const openMenu of visibleMenus()) {
      injectIntoMenu(openMenu, handlers);
    }
  }

  MC.ui = {
    mountControls,
    toast,
  };
})();
