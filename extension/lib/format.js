/**
 * Format a parsed thread/message as lean Markdown (Product Definition v1).
 */

(() => {
  const MC = (globalThis.MailContext = globalThis.MailContext || {});

  /**
   * @param {string} name
   * @returns {string}
   */
  function cleanDisplayName(name) {
    let value = (name || "").replace(/\s+/g, " ").trim();
    if (!value) return "";
    const quotedDup = value.match(
      /^(.*?)\s+[\u201c"']+\s*(.*?)\s*[\u201d"']+\s*$/
    );
    if (
      quotedDup &&
      quotedDup[1].trim().toLowerCase() === quotedDup[2].trim().toLowerCase()
    ) {
      return quotedDup[1].trim();
    }
    return value.replace(/^["'\u201c\u201d]+/, "").replace(/["'\u201c\u201d]+$/, "").trim();
  }

  /**
   * @param {{ name?: string, email?: string }} person
   * @returns {string}
   */
  function formatPerson(person) {
    const email = (person?.email || "").trim();
    const name = cleanDisplayName(person?.name || "");
    if (email) {
      if (!name || name.toLowerCase() === email.toLowerCase()) return email;
      return `${name} <${email}>`;
    }
    return name || "";
  }

  /**
   * @param {Array<{ name?: string, email?: string }>} list
   * @returns {string}
   */
  function formatPeople(list) {
    return (list || []).map(formatPerson).filter(Boolean).join(", ");
  }

  /**
   * @param {object} message
   * @param {{ includeSubject?: boolean, subject?: string }} [options]
   * @returns {string}
   */
  function formatMessage(message, options = {}) {
    const lines = [];
    if (options.includeSubject && options.subject) {
      lines.push(`Subject: ${options.subject}`);
    }
    const from = formatPerson(message.from);
    if (from) lines.push(`From: ${from}`);
    if (message.dateRaw) lines.push(`Date: ${message.dateRaw}`);
    const to = formatPeople(message.to);
    if (to) lines.push(`To: ${to}`);
    const cc = formatPeople(message.cc);
    if (cc) lines.push(`Cc: ${cc}`);
    if (message.attachments?.length) {
      lines.push(`Attachments: ${message.attachments.join(", ")}`);
    }
    lines.push("");
    lines.push((message.body || "").trim());
    return lines.join("\n").trim() + "\n";
  }

  /**
   * @param {object} thread
   * @returns {string}
   */
  function formatThread(thread) {
    const parts = [];
    for (let i = 0; i < thread.messages.length; i += 1) {
      if (i > 0) parts.push("", "---", "");
      parts.push(
        formatMessage(thread.messages[i], {
          includeSubject: i === 0,
          subject: thread.subject,
        }).trimEnd()
      );
    }
    return parts.join("\n").trim() + "\n";
  }

  MC.format = {
    formatMessage,
    formatThread,
  };
})();
