/* =====================================================
   HOME MANAGER — core.js
   Pure logic with no page and no storage in it:
   - family codes (the family's private channel name),
   - checking events that arrive from the network,
   - turning the family's event log into what screens show.

   Everything the family does is an EVENT in one shared log:
     hello  — "I am in this family" (name, role)
     cmd    — a parent's instruction for a child (or all children)
     seen   — a child's phone has shown these instructions
     reply  — a child's answer: ok / done / help
     msg    — a child's quick message to the parents

   Works in the browser (window.HMCore) and in Node for tests.
===================================================== */

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.HMCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O and 1/I — easy to read aloud
  const CODE_LENGTH = 16;
  const ID_ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";
  const TEXT_MAX = 140;
  const NAME_MAX = 40;
  const LOG_MAX = 600;
  const LOG_MAX_AGE = 30 * 24 * 3600 * 1000;
  const DELIVERY_WINDOW = 12 * 3600 * 1000; // ntfy.sh keeps messages for 12 hours
  const MAX_CLOCK_AHEAD = 24 * 3600 * 1000; // later than this = junk, not a wrong clock
  const COLORS = ["pine", "gold", "ember", "sky", "plum", "slate"];
  const REPLIES = ["ok", "done", "help"];
  const ROLES = ["parent", "child"];
  const EVERYONE = "*";

  /* ---------- ids and codes ---------- */

  function randomChars(alphabet, count) {
    const buf = new Uint32Array(count);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(buf);
    else for (let i = 0; i < count; i++) buf[i] = Math.floor(Math.random() * 4294967296);
    let out = "";
    for (let i = 0; i < count; i++) out += alphabet[buf[i] % alphabet.length];
    return out;
  }

  function newId(prefix) {
    return prefix + "_" + randomChars(ID_ALPHABET, 12);
  }

  function newFamilyCode() {
    return randomChars(CODE_ALPHABET, CODE_LENGTH);
  }

  /** "abcd-efgh ..." typed by a person → "ABCDEFGH..." or "" if it can't be a code. */
  function normalizeCode(input) {
    if (typeof input !== "string") return "";
    const code = input.toUpperCase().replace(/[\s-]/g, "");
    if (code.length !== CODE_LENGTH) return "";
    for (const ch of code) if (CODE_ALPHABET.indexOf(ch) === -1) return "";
    return code;
  }

  function formatCode(code) {
    return (code.match(/.{1,4}/g) || []).join("-");
  }

  function topicFor(code) {
    return "hmx-" + code;
  }

  /* ---------- checking events from the network ---------- */

  function str(value, max) {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
  }

  // Ids look exactly like newId() makes them ("e_k3x9…"). Anything else — "__proto__",
  // "constructor" — is refused, because ids become keys of lookup objects.
  const ID_RE = /^[a-z]_[a-z0-9]{8,16}$/;

  function id(value) {
    return typeof value === "string" && ID_RE.test(value) ? value : "";
  }

  function idList(value, max, allowEveryone) {
    if (!Array.isArray(value)) return [];
    return value.map((x) => (allowEveryone && x === EVERYONE ? x : id(x))).filter(Boolean).slice(0, max);
  }

  /**
   * Anyone who knows the family code can post to the channel, so every
   * event is rebuilt field by field: unknown fields are dropped, text is
   * trimmed, colors must be from our list. Returns null for junk.
   */
  function cleanEvent(raw) {
    if (!raw || typeof raw !== "object" || raw.v !== 1) return null;
    const eventId = id(raw.id);
    const from = id(raw.from);
    let at = Number(raw.at);
    const now = Date.now();
    if (!eventId || !from || !isFinite(at) || at <= 0 || at > now + MAX_CLOCK_AHEAD) return null;
    // A phone whose clock runs a little ahead: treat it as "now",
    // otherwise its events would sort above everything sent later.
    if (at > now) at = now;
    const base = { v: 1, t: raw.t, id: eventId, from: from, at: at };

    switch (raw.t) {
      case "hello": {
        const name = str(raw.name, NAME_MAX);
        if (!name || ROLES.indexOf(raw.role) === -1) return null;
        const family = str(raw.family, NAME_MAX);
        return Object.assign(base, { name: name, role: raw.role }, family ? { family: family } : {});
      }
      case "cmd":
      case "msg": {
        const text = str(raw.text, TEXT_MAX);
        const preset = str(raw.preset, 20);
        if (!text && !preset) return null;
        const out = Object.assign(base, {
          text: text,
          preset: preset,
          icon: str(raw.icon, 16),
          color: COLORS.indexOf(raw.color) === -1 ? "pine" : raw.color,
          urgent: raw.urgent === true,
        });
        if (raw.t === "cmd") {
          out.to = idList(raw.to, 20, true);
          if (!out.to.length) return null;
        }
        return out;
      }
      case "seen": {
        const refs = idList(raw.refs, 50, false);
        return refs.length ? Object.assign(base, { refs: refs }) : null;
      }
      case "reply": {
        const ref = id(raw.ref);
        if (!ref || REPLIES.indexOf(raw.kind) === -1) return null;
        return Object.assign(base, { ref: ref, kind: raw.kind });
      }
      default:
        return null;
    }
  }

  /* ---------- the event log ---------- */

  function mergeEvents(existing, incoming) {
    const known = new Set(existing.map((e) => e.id));
    const added = [];
    for (const e of incoming) {
      if (!e || known.has(e.id)) continue;
      known.add(e.id);
      added.push(e);
    }
    return { merged: added.length ? existing.concat(added) : existing, added: added };
  }

  function byTime(a, b) {
    return a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  }

  function prune(events, now) {
    const limit = (now || Date.now()) - LOG_MAX_AGE;
    const recent = events.filter((e) => e.at >= limit).sort(byTime);
    return recent.length > LOG_MAX ? recent.slice(recent.length - LOG_MAX) : recent;
  }

  /**
   * A member after one more "hello": the newest name and role win,
   * `since` remembers the first time the family heard from them.
   */
  function mergeMember(prev, hello) {
    const since = prev ? Math.min(prev.since || prev.lastSeen || hello.at, hello.at) : hello.at;
    if (prev && (prev.lastSeen || 0) > hello.at) return Object.assign({}, prev, { since: since });
    return { id: hello.from, name: hello.name, role: hello.role, lastSeen: hello.at, since: since };
  }

  /**
   * events: the family log; savedMembers: members remembered from earlier
   * (hello events older than the log still count). Returns what screens need.
   */
  function buildView(events, savedMembers, meId) {
    // Lookup objects without a prototype: a key can never reach Object.prototype.
    const members = Object.create(null);
    Object.keys(savedMembers || {}).forEach((key) => {
      if (id(key)) members[key] = Object.assign({}, savedMembers[key]);
    });

    const sorted = events.slice().sort(byTime);
    const commands = [];
    const messages = [];
    const byId = Object.create(null);
    let familyName = "";

    for (const e of sorted) {
      if (e.t === "hello") {
        members[e.from] = mergeMember(members[e.from], e);
        if (e.family) familyName = e.family;
      } else if (e.t === "cmd") {
        const c = Object.assign({}, e, { receipts: Object.create(null) });
        commands.push(c);
        byId[e.id] = c;
      } else if (e.t === "msg") {
        messages.push(Object.assign({}, e));
      }
    }

    for (const e of sorted) {
      if (e.t === "seen") {
        for (const ref of e.refs) {
          const c = byId[ref];
          if (!c) continue;
          const r = c.receipts[e.from] || (c.receipts[e.from] = {});
          if (!r.seenAt) r.seenAt = e.at;
        }
      } else if (e.t === "reply") {
        const c = byId[e.ref];
        if (!c) continue;
        const r = c.receipts[e.from] || (c.receipts[e.from] = {});
        r.reply = e.kind;
        r.replyAt = e.at;
        if (!r.seenAt) r.seenAt = e.at;
      }
    }

    const list = Object.keys(members).map((key) => members[key]);
    const byName = (a, b) => a.name.localeCompare(b.name);
    return {
      me: meId,
      members: members,
      parents: list.filter((m) => m.role === "parent").sort(byName),
      children: list.filter((m) => m.role === "child").sort(byName),
      familyName: familyName,
      commands: commands.reverse(), // newest first
      messages: messages.reverse(),
    };
  }

  function isFor(cmd, memberId) {
    return cmd.to.indexOf(EVERYONE) !== -1 || cmd.to.indexOf(memberId) !== -1;
  }

  function commandsFor(view, memberId) {
    return view.commands.filter((c) => isFor(c, memberId));
  }

  /** Children a command was meant for. "*" = every child who was in the family when it was sent. */
  function recipientsOf(view, cmd) {
    if (cmd.to.indexOf(EVERYONE) !== -1) {
      const ids = view.children.filter((m) => !m.since || m.since <= cmd.at).map((m) => m.id);
      Object.keys(cmd.receipts).forEach((key) => { if (ids.indexOf(key) === -1) ids.push(key); });
      return ids;
    }
    return cmd.to.slice();
  }

  /** "sent" | "seen" | "ok" | "done" | "help" | "lost" (not delivered in time). */
  function recipientStatus(cmd, memberId, now) {
    const r = cmd.receipts[memberId];
    if (r && r.reply) return r.reply;
    if (r && r.seenAt) return "seen";
    return (now || Date.now()) - cmd.at > DELIVERY_WINDOW ? "lost" : "sent";
  }

  return {
    CODE_LENGTH: CODE_LENGTH,
    TEXT_MAX: TEXT_MAX,
    NAME_MAX: NAME_MAX,
    LOG_MAX: LOG_MAX,
    DELIVERY_WINDOW: DELIVERY_WINDOW,
    COLORS: COLORS,
    REPLIES: REPLIES,
    EVERYONE: EVERYONE,
    newId: newId,
    newFamilyCode: newFamilyCode,
    normalizeCode: normalizeCode,
    formatCode: formatCode,
    topicFor: topicFor,
    cleanEvent: cleanEvent,
    mergeEvents: mergeEvents,
    mergeMember: mergeMember,
    prune: prune,
    buildView: buildView,
    isFor: isFor,
    commandsFor: commandsFor,
    recipientsOf: recipientsOf,
    recipientStatus: recipientStatus,
  };
});
