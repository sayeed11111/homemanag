/* =====================================================
   HOME MANAGER — child.js
   The child's screen (child.html), three tabs:
   - Home: the newest instruction still waiting for an
     answer, big, with OK / Done / Need help; the others
     below it; then quick messages to the parents;
   - History: every instruction with the answer given,
     plus the messages this child sent;
   - Me: the family code (a sibling can join too), the
     members, language, connection, notifications, sound.

   Delivery is family.js's job. This file draws the family
   log and turns taps into events: "reply", "msg", "seen".
===================================================== */

(function () {
  "use strict";

  if (!HMFlow.guard("child")) return;
  HMFlow.boot();

  const t = (key, vars) => HMI18n.t(key, vars);
  const tOr = (key, fallback) => (HMI18n.has(key) ? t(key) : fallback);
  const h = HMUI.h;
  const $ = (sel) => document.querySelector(sel);

  const DAY = 24 * 3600 * 1000;
  const HISTORY_MAX = 100;
  const SENT_FLASH = 1400;  // how long a quick-message key shows its check
  const RESEND_GAP = 3000;  // a second tap on the same key within this is ignored
  // After an answer the next card slides into the same spot: the second
  // tap of a double tap must not answer that one too.
  const REPLY_PAUSE = 700;
  const REPLY_ICONS = { ok: "check", done: "checkCircle", help: "question" };
  const TABS = ["home", "history", "me"];

  const account = HMStore.currentAccount();
  const family = HMStore.family(account.id);
  const me = account.id;

  const homeEl = $('[data-screen="home"]');
  const keysBlock = $("[data-keys-block]");
  const keysEl = $("[data-keys]");
  const historyEl = $("[data-history]");
  const badgeEl = $("[data-badge]");
  const meCardEl = $("[data-me-card]");
  const familyNameEl = $("[data-family-name]");
  const membersEl = $("[data-members]");
  const notifEl = $("[data-notif]");
  const screens = document.querySelectorAll("[data-screen]");
  const tabs = document.querySelectorAll("[data-tab]");

  let ctl = null;
  let currentTab = "";
  let homeNodes = [];     // what renderHome put in front of the keys block
  let homeSig = "";       // home is rebuilt only when this changes, so a card's entrance animation isn't cut
  let meSig = "";
  let sendingSeen = false;
  let repliedAt = 0;
  const fresh = new Set(); // instructions that just arrived: their card animates in once
  const lastSent = {};     // quick-message key → when it was last sent

  /* ---------- reading the family log ---------- */

  function receipt(cmd) {
    return cmd.receipts[me] || {};
  }

  function senderName(view, cmd) {
    return (view.members[cmd.from] || {}).name || t("c.parent");
  }

  // A ready-made instruction is shown in this phone's language, not the sender's.
  function cmdText(cmd) {
    return cmd.preset && HMI18n.has("preset.p." + cmd.preset) ? t("preset.p." + cmd.preset) : cmd.text || cmd.preset;
  }

  function msgText(msg) {
    return msg.preset && HMI18n.has("preset.c." + msg.preset) ? t("preset.c." + msg.preset) : msg.text || msg.preset;
  }

  function self(view) {
    return view.members[me] || { id: me, name: account.name, role: "child" };
  }

  /** Instructions for me without an answer, from the last 24 hours, newest first. */
  function waitingList(view) {
    const since = Date.now() - DAY;
    return HMCore.commandsFor(view, me).filter((c) => !receipt(c).reply && c.at > since);
  }

  /* ---------- tabs (#home, #history, #me) ---------- */

  function tabFromHash() {
    const name = location.hash.slice(1);
    return TABS.indexOf(name) === -1 ? "home" : name;
  }

  function show(name) {
    currentTab = name;
    screens.forEach((s) => { s.hidden = s.getAttribute("data-screen") !== name; });
    tabs.forEach((b) => {
      const on = b.getAttribute("data-tab") === name;
      b.classList.toggle("is-active", on);
      if (on) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    window.scrollTo(0, 0);
  }

  tabs.forEach((b) => b.addEventListener("click", () => {
    const name = b.getAttribute("data-tab");
    if (location.hash === "#" + name) show(name); // same hash fires no hashchange
    else location.hash = name;
  }));
  window.addEventListener("hashchange", () => show(tabFromHash()));

  /* ---------- home: instruction cards ---------- */

  function quiet(iconName, title, text) {
    return h("div", { class: "quiet" }, HMUI.icon(iconName), h("h2", { text: title }), h("p", { text: text }));
  }

  function card(view, cmd, small) {
    const text = cmdText(cmd);
    const isNew = fresh.has(cmd.id);
    const el = h("article", { class: "now" + (small ? " now-sm" : "") + (cmd.urgent ? " is-urgent" : "") + (isNew ? " is-new" : "") },
      h("div", { class: "now-head" },
        h("span", { class: "now-icon key-" + cmd.color, "aria-hidden": "true", text: cmd.icon || "🔔" }),
        h("div", { class: "item-body" },
          h("p", { class: "now-from", text: t("c.from", { name: senderName(view, cmd) }) }),
          h("p", { class: "now-time", "data-at": String(cmd.at), text: HMUI.timeAgo(cmd.at) })),
        cmd.urgent ? h("span", { class: "now-badge" }, HMUI.icon("bolt"), t("p.urgent")) : null),
      h(small ? "h3" : "h2", { class: "now-text", text: text }));

    const replies = h("div", { class: "replies", role: "group", "aria-label": text },
      HMPresets.replies.map((kind) => h("button", {
        type: "button",
        class: "reply reply-" + kind,
        on: { click: () => answer(cmd, kind, el) },
      }, HMUI.icon(REPLY_ICONS[kind]), h("span", { text: t("c.reply." + kind) }))));
    el.appendChild(replies);

    // Drop .is-new once it has played, or showing the tab again would replay it.
    if (isNew) {
      const last = cmd.urgent ? "shake" : "arrive";
      el.addEventListener("animationend", function done(e) {
        if (e.target !== el || e.animationName !== last) return;
        el.classList.remove("is-new");
        el.removeEventListener("animationend", done);
      });
    }
    return el;
  }

  function answer(cmd, kind, el) {
    const buttons = el.querySelectorAll(".reply");
    if (buttons[0].disabled || Date.now() - repliedAt < REPLY_PAUSE) return; // double tap
    const hadFocus = el.contains(document.activeElement); // read first: a disabled button drops focus
    buttons.forEach((b) => { b.disabled = true; });

    if (!ctl.emit("reply", { ref: cmd.id, kind: kind })) {
      buttons.forEach((b) => { b.disabled = false; });
      return;
    }
    repliedAt = Date.now();
    HMUI.buzz("soft");
    HMUI.toast(t("c.replied"));
    render();
    // The answered card is gone; keep keyboard focus on the page instead of <body>.
    if (hadFocus) {
      const next = homeEl.querySelector(".now .reply") || keysEl.querySelector(".key");
      if (next) next.focus({ preventScroll: true });
    }
  }

  function renderHome(view, list, force) {
    const hasParent = view.parents.length > 0;
    const sig = [HMI18n.lang(), hasParent ? "p" : "-"]
      .concat(list.map((c) => c.id + ":" + senderName(view, c)))
      .join("|");
    if (!force && sig === homeSig) {
      refreshTimes(homeEl);
      return;
    }
    homeSig = sig;

    const nodes = [];
    // A waiting instruction is shown even before the parent's "hello" arrives.
    if (list.length) {
      nodes.push(card(view, list[0], false));
      if (list.length > 1) {
        nodes.push(h("div", null,
          h("div", { class: "sec-head" }, h("h2", { class: "sec-title", text: t("c.more") })),
          h("div", { class: "feed" }, list.slice(1).map((c) => card(view, c, true)))));
      }
    } else if (!hasParent) {
      nodes.push(quiet("bell", t("c.waitingParent"), t("c.waitingParentText", { code: HMCore.formatCode(family.code) })));
    } else {
      nodes.push(quiet("checkCircle", t("c.allClear"), t("c.allClearText")));
    }

    homeNodes.forEach((n) => n.remove());
    homeNodes = nodes;
    nodes.forEach((n) => homeEl.insertBefore(n, keysBlock));
    // While the phone is locked, keep them: the cards animate in when it's opened.
    if (document.visibilityState === "visible") fresh.clear();
  }

  function refreshTimes(root) {
    root.querySelectorAll("[data-at]").forEach((el) => {
      el.textContent = HMUI.timeAgo(Number(el.getAttribute("data-at")));
    });
  }

  function renderCount(n) {
    badgeEl.textContent = String(n);
    badgeEl.hidden = !n;
    document.title = n ? "(" + n + ") " + t("brand") : t("brand");
  }

  /* ---------- home: quick messages to the parents ---------- */

  // Built once and on a language change only — rebuilding on every
  // incoming event would cut the "sent" check animation.
  function buildKeys() {
    HMUI.clear(keysEl);
    HMPresets.child.forEach((p) => {
      const btn = h("button", { type: "button", class: "key key-" + p.color },
        h("span", { class: "key-icon", "aria-hidden": "true", text: p.icon }),
        h("span", { class: "key-label", text: t("preset.c." + p.key) }));
      btn.addEventListener("click", () => sendQuick(p, btn));
      keysEl.appendChild(btn);
    });
  }

  function sendQuick(p, btn) {
    const now = Date.now();
    if (now - (lastSent[p.key] || 0) < RESEND_GAP) return;
    const sent = ctl.emit("msg", {
      preset: p.key,
      text: t("preset.c." + p.key),
      icon: p.icon,
      color: p.color,
      urgent: !!p.urgent,
    });
    if (!sent) return;
    lastSent[p.key] = now;

    const badge = h("span", { class: "key-badge" }, HMUI.icon("check"));
    btn.appendChild(badge);
    btn.classList.add("is-sent");
    setTimeout(() => { btn.classList.remove("is-sent"); badge.remove(); }, SENT_FLASH);
    HMUI.buzz("soft");
    HMUI.toast(t("c.sentMsg"));
  }

  /* ---------- history ---------- */

  function urgentFlag() {
    return h("span", { class: "flag" }, HMUI.icon("bolt"), t("p.urgent"));
  }

  function cmdItem(view, cmd) {
    const r = receipt(cmd);
    const status = r.reply
      ? h("span", { class: "status status-" + r.reply }, HMUI.avatar(self(view)), t("c.answered", { answer: t("c.reply." + r.reply) }))
      : h("span", { class: "status" }, HMUI.avatar(self(view)), t("c.noAnswer"));
    return h("article", { class: "item" + (cmd.urgent ? " is-urgent" : "") },
      h("span", { class: "item-icon key-" + cmd.color, "aria-hidden": "true", text: cmd.icon || "🔔" }),
      h("div", { class: "item-body" },
        h("p", { class: "item-text", text: cmdText(cmd) }),
        h("p", { class: "item-meta" },
          h("span", { text: senderName(view, cmd) }),
          h("span", { text: HMUI.timeAgo(cmd.at) }),
          cmd.urgent ? urgentFlag() : null),
        h("div", { class: "statuses" }, status)));
  }

  function msgItem(view, msg) {
    // Still in the outbox (no internet): say so — "Pick me up" that never left matters.
    const pending = ctl.isPending(msg.id)
      ? h("div", { class: "statuses" }, h("span", { class: "status status-sending" }, HMUI.avatar(self(view)), t("st.sending")))
      : null;
    return h("article", { class: "item is-msg" },
      h("span", { class: "item-icon key-" + msg.color, "aria-hidden": "true", text: msg.icon || "💬" }),
      h("div", { class: "item-body" },
        h("p", { class: "item-text", text: msgText(msg) }),
        h("p", { class: "item-meta" },
          h("span", { text: HMUI.timeAgo(msg.at) }),
          msg.urgent ? urgentFlag() : null),
        pending));
  }

  function renderHistory(view) {
    const events = HMCore.commandsFor(view, me)
      .concat(view.messages.filter((m) => m.from === me))
      .sort((a, b) => b.at - a.at)
      .slice(0, HISTORY_MAX);
    HMUI.clear(historyEl);
    if (!events.length) {
      historyEl.appendChild(h("p", { class: "empty", text: t("c.historyEmpty") }));
      return;
    }
    events.forEach((e) => historyEl.appendChild(e.t === "cmd" ? cmdItem(view, e) : msgItem(view, e)));
  }

  /* ---------- me ---------- */

  function memberRow(m) {
    const role = t("role." + m.role) + (m.id === me ? " (" + t("set.you") + ")" : "");
    return h("div", { class: "member" },
      HMUI.avatar(m),
      h("div", null, h("strong", { text: m.name }), h("span", { class: "meta", text: role })));
  }

  function renderMe(view) {
    const mine = self(view);
    const people = view.parents.concat(view.children);
    const notif = HMUI.notifState();
    const familyName = family.name || view.familyName || "";
    const sig = [HMI18n.lang(), notif, familyName, mine.name]
      .concat(people.map((m) => m.id + ":" + m.role + ":" + m.name))
      .join("|");
    if (sig === meSig) return;
    meSig = sig;

    HMUI.clear(meCardEl);
    meCardEl.appendChild(HMUI.avatar(mine, "lg"));
    meCardEl.appendChild(h("div", null, h("strong", { text: mine.name }), h("span", { class: "meta", text: t("role.child") })));

    familyNameEl.textContent = familyName;
    familyNameEl.hidden = !familyName;

    HMUI.clear(membersEl);
    people.forEach((m) => membersEl.appendChild(memberRow(m)));

    HMUI.clear(notifEl);
    if (notif === "default") {
      notifEl.appendChild(h("button", {
        type: "button",
        class: "btn btn-sm btn-outline",
        text: t("set.notifTurnOn"),
        on: { click: () => HMUI.askNotifications().then(() => render()) },
      }));
    } else {
      const key = notif === "granted" ? "set.notifOn" : notif === "denied" ? "set.notifBlocked" : "set.notifUnsupported";
      notifEl.appendChild(h("span", { class: "row-value", text: t(key) }));
    }
  }

  $("[data-share]").addEventListener("click", () => {
    HMUI.shareLink(HMUI.inviteLink(family.code), t("share.text"));
  });

  $("[data-copy]").addEventListener("click", () => {
    HMUI.copyText(HMUI.inviteLink(family.code)).then((ok) => {
      if (ok) HMUI.toast(t("fam.copied"));
      else HMUI.toast(tOr("fam.copyFailed", "Couldn't copy the link. Use “Send the link” instead."), "error");
    });
  });

  $("[data-test-sound]").addEventListener("click", () => {
    HMUI.unlockSound().then(() => HMUI.chime("urgent"));
  });

  $("[data-logout]").addEventListener("click", () => {
    ctl.stop();
    HMFlow.logout();
  });

  $("[data-leave]").addEventListener("click", () => {
    HMUI.confirm(t("set.leaveConfirm"), t("set.leave"), { danger: true }).then((yes) => {
      if (!yes) return;
      ctl.stop();
      HMStore.leaveFamily(account.id);
      HMFlow.go();
    });
  });

  /* ---------- "seen" receipts ---------- */

  // emit() puts the event in the local log right away, so the next
  // render finds nothing unseen and nothing goes out twice.
  function sendSeen(view) {
    if (sendingSeen || document.visibilityState !== "visible") return;
    const since = Date.now() - HMCore.DELIVERY_WINDOW;
    const ids = HMCore.commandsFor(view, me)
      .filter((c) => !receipt(c).seenAt && c.at > since)
      .map((c) => c.id);
    if (!ids.length) return;
    sendingSeen = true;
    try {
      ctl.emit("seen", { refs: ids.slice(0, 50) });
    } finally {
      sendingSeen = false;
    }
  }

  /* ---------- drawing + incoming events ---------- */

  function render(forceHome) {
    if (!ctl) return;
    const view = ctl.view();
    const list = waitingList(view);
    renderHome(view, list, forceHome === true);
    renderCount(list.length);
    renderHistory(view);
    renderMe(view);
    sendSeen(view);
  }

  function onChange(added) {
    if (!ctl) return; // HMFamily.start() may say "hello" before it returns
    const view = ctl.view();
    const byId = Object.create(null);
    view.commands.forEach((c) => { byId[c.id] = c; });
    const since = Date.now() - HMCore.DELIVERY_WINDOW;
    const arrived = added.filter((e) => e.t === "cmd" && HMCore.isFor(e, me) && e.at > since &&
      !(byId[e.id] && receipt(byId[e.id]).reply));

    if (arrived.length) {
      // One sound for the whole batch: a catch-up after a night offline shouldn't ring ten times.
      const urgent = arrived.some((e) => e.urgent);
      HMUI.chime(urgent ? "urgent" : "soft");
      HMUI.buzz(urgent ? "urgent" : "soft");
      arrived.forEach((e) => {
        fresh.add(e.id);
        HMUI.notify(senderName(view, e), cmdText(e), { urgent: e.urgent, tag: e.id });
      });
      if (urgent && currentTab !== "home") {
        history.replaceState(null, "", "#home");
        show("home");
      }
    }
    render();
  }

  /* ---------- start ---------- */

  $("[data-name]").textContent = account.name;
  $("[data-code]").textContent = HMCore.formatCode(family.code);
  buildKeys();

  ctl = HMFamily.start(account, family, { onChange: onChange, onStatus: HMUI.showConnection });
  HMUI.showConnection(ctl.status()); // onStatus only fires on a change
  show(tabFromHash());
  render();

  setInterval(() => render(), 30000);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") render(fresh.size > 0);
  });

  HMI18n.onChange(() => {
    buildKeys();
    HMUI.showConnection(ctl.status());
    render();
  });
})();
