/* =====================================================
   HOME MANAGER — parent.js
   The parent's screen, in three tabs:
   - Send: new messages from the children, who to send
     to, the instruction keys (a parent can change them),
     own text, and the latest instructions with answers;
   - History: every instruction and message, newest first;
   - Family: invite link, members, settings.

   Tabs follow the address hash (#send, #history, #family),
   so the phone's back button moves between them.
===================================================== */

(function () {
  "use strict";

  if (!HMFlow.guard("parent")) return;
  HMFlow.boot();

  const t = (key, vars) => HMI18n.t(key, vars);
  const h = HMUI.h;
  const EVERYONE = HMCore.EVERYONE;
  const TABS = ["send", "history", "family"];
  const ALERT_WINDOW = 10 * 60 * 1000; // older events are catch-up, not news
  const DOUBLE_TAP = 1500;
  const SENT_FLASH = 1400;
  const INBOX_MAX = 3;
  const LATEST_MAX = 3;
  const HISTORY_MAX = 100;

  const account = HMStore.currentAccount();
  const family = HMStore.family(account.id);

  const $ = (sel) => document.querySelector(sel);
  const el = {
    familyName: $("[data-family-name]"),
    screens: Array.from(document.querySelectorAll("[data-screen]")),
    tabs: Array.from(document.querySelectorAll("[data-tab]")),
    badge: $("[data-badge]"),
    inbox: $("[data-inbox]"),
    chips: $("[data-chips]"),
    noChildren: $("[data-no-children]"),
    urgent: $("[data-urgent]"),
    urgentHint: $("[data-urgent-hint]"),
    editToggle: $("[data-edit-toggle]"),
    editHint: $("[data-edit-hint]"),
    keys: $("[data-keys]"),
    restore: $("[data-restore]"),
    compose: $("[data-compose]"),
    composeInput: $("[data-compose-input]"),
    composeSend: $("[data-compose-send]"),
    latest: $("[data-latest]"),
    history: $("[data-history]"),
    code: $("[data-code]"),
    members: $("[data-members]"),
    notif: $("[data-notif]"),
    editor: $("#editor"),
    edTitle: $("#editor-title"),
    edForm: $("[data-ed-form]"),
    edField: $("[data-ed-field]"),
    edText: $("#ed-text"),
    edErr: $("[data-ed-err]"),
    edIcons: $("[data-ed-icons]"),
    edColors: $("[data-ed-colors]"),
    edPreview: $("[data-ed-preview]"),
    edRemove: $("[data-ed-remove]"),
  };

  let target = EVERYONE; // "*" or one child's id
  let urgent = false;
  let editing = false;
  let lastView = null;
  const lastTap = {}; // what was tapped → when, against accidental double sends
  const flashTimers = new WeakMap();

  // HMFamily.start() may call onChange before it returns, so ctl can still be null there.
  let ctl = null;

  /* ---------- small helpers ---------- */

  function validColor(color) {
    return HMCore.COLORS.indexOf(color) !== -1 ? color : "";
  }

  function memberName(view, id, fallbackKey) {
    const m = view.members[id];
    return m && m.name ? m.name : t(fallbackKey);
  }

  function cmdText(cmd) {
    return cmd.preset && HMI18n.has("preset.p." + cmd.preset) ? t("preset.p." + cmd.preset) : cmd.text || cmd.preset;
  }

  function msgText(m) {
    return m.preset && HMI18n.has("preset.c." + m.preset) ? t("preset.c." + m.preset) : m.text || m.preset;
  }

  function whoLabel(view, to) {
    if (to.indexOf(EVERYONE) !== -1) return t("p.everyone");
    return to.map((id) => memberName(view, id, "role.child")).join(", ");
  }

  function tooSoon(what) {
    const now = Date.now();
    if (now - (lastTap[what] || 0) < DOUBLE_TAP) return true;
    lastTap[what] = now;
    return false;
  }

  /** Replace a box's content and keep keyboard focus on "the same" button (data-fk). */
  function refill(box, nodes) {
    const active = document.activeElement;
    const key = active && box.contains(active) ? active.getAttribute("data-fk") : null;
    HMUI.clear(box);
    nodes.forEach((node) => box.appendChild(node));
    if (!key) return;
    const again = Array.from(box.querySelectorAll("[data-fk]")).find((n) => n.getAttribute("data-fk") === key);
    if (again) again.focus({ preventScroll: true });
  }

  /* ---------- tabs ---------- */

  function currentTab() {
    const name = location.hash.replace(/^#/, "");
    return TABS.indexOf(name) !== -1 ? name : "send";
  }

  function go(tab) {
    if (currentTab() === tab) window.scrollTo(0, 0);
    else location.hash = tab;
  }

  function showTab() {
    const tab = currentTab();
    el.screens.forEach((s) => { s.hidden = s.getAttribute("data-screen") !== tab; });
    el.tabs.forEach((b) => {
      const on = b.getAttribute("data-tab") === tab;
      b.classList.toggle("is-active", on);
      if (on) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    if (el.editor.classList.contains("is-open")) HMUI.closeSheet(el.editor);
    window.scrollTo(0, 0);
    render();
  }

  /* ---------- read / unread (children's messages) ---------- */

  function unread(view) {
    const since = HMStore.readUntil(account.id);
    return view.messages.filter((m) => m.at > since && m.from !== account.id);
  }

  function readUpTo(at) {
    if (at > HMStore.readUntil(account.id)) HMStore.setReadUntil(account.id, at);
  }

  function markAllRead(view) {
    view.messages.forEach((m) => { if (m.from !== account.id) readUpTo(m.at); });
  }

  function renderUnread(view) {
    const n = unread(view).length;
    el.badge.hidden = n === 0;
    el.badge.textContent = n > 9 ? "9+" : String(n);
    document.title = (n ? "(" + n + ") " : "") + t("brand");
  }

  /* ---------- everything that follows the family log ---------- */

  function render() {
    if (!ctl) return null;
    const view = ctl.view();
    const now = Date.now();
    lastView = view;
    if (currentTab() === "history" && document.visibilityState === "visible") markAllRead(view);
    el.familyName.textContent = family.name || view.familyName || t("set.family");
    renderInbox(view, now);
    renderChips(view);
    renderLatest(view, now);
    renderHistory(view, now);
    renderMembers(view);
    renderNotif();
    renderUnread(view);
    return view;
  }

  function metaLine(who, event, now, boldWho) {
    // Any finite "at" passes HMCore.cleanEvent; a date too far away would make toISOString() throw.
    const date = new Date(event.at);
    return h("p", { class: "item-meta" },
      h(boldWho ? "strong" : "span", { text: who }),
      h("time", { datetime: isNaN(date.getTime()) ? null : date.toISOString(), text: HMUI.timeAgo(event.at, now) }),
      event.urgent ? h("span", { class: "flag" }, HMUI.icon("bolt"), t("p.urgent")) : null);
  }

  /* ---------- inbox: unread messages from the children ---------- */

  function renderInbox(view, now) {
    const list = unread(view);
    el.inbox.hidden = list.length === 0;
    // The OLDEST unread ones: "Got it" marks everything up to that message as read,
    // so it must never skip past messages the parent hasn't seen yet.
    const nodes = list.slice(-INBOX_MAX).map((m) => h("div", { class: "inbox-item" + (m.urgent ? " is-urgent" : "") },
      h("span", { class: "item-icon key-" + m.color, "aria-hidden": "true", text: m.icon || "💬" }),
      h("div", { class: "item-body" },
        h("p", { class: "item-text", text: msgText(m) }),
        metaLine(memberName(view, m.from, "role.child"), m, now, true)),
      h("button", {
        type: "button",
        class: "btn btn-sm btn-quiet",
        "data-fk": "got:" + m.id,
        text: t("p.gotIt"),
        on: { click: () => { readUpTo(m.at); render(); } },
      })));
    // A long time away can pile up many messages; the keys must stay close to the top.
    if (list.length > INBOX_MAX) {
      nodes.push(h("button", {
        type: "button",
        class: "link-btn",
        "data-fk": "inbox-all",
        text: t("p.showAll") + " (" + list.length + ")",
        on: { click: () => go("history") },
      }));
    }
    refill(el.inbox, nodes);
  }

  /* ---------- who to send to ---------- */

  function renderChips(view) {
    const kids = view.children;
    if (target !== EVERYONE && !kids.some((k) => k.id === target)) target = EVERYONE;
    el.chips.hidden = kids.length === 0;
    el.noChildren.hidden = kids.length > 0;
    if (!kids.length) {
      HMUI.clear(el.chips);
      return;
    }
    const chip = (id, label, member) => h("button", {
      type: "button",
      class: "chip" + (member ? "" : " chip-all") + (id === target ? " is-active" : ""),
      "aria-pressed": String(id === target),
      "data-fk": "chip:" + id,
      on: { click: () => pickTarget(id) },
    }, member ? HMUI.avatar(member, "sm") : null, h("span", { text: label }));
    refill(el.chips, [chip(EVERYONE, t("p.everyone"), null)].concat(kids.map((k) => chip(k.id, k.name, k))));
  }

  function pickTarget(id) {
    target = id;
    el.chips.querySelectorAll(".chip").forEach((b) => {
      const on = b.getAttribute("data-fk") === "chip:" + id;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }

  /* ---------- urgent ---------- */

  function renderUrgent() {
    el.urgent.setAttribute("aria-pressed", String(urgent));
    el.keys.classList.toggle("is-urgent", urgent);
    el.urgentHint.hidden = !urgent;
  }

  // "Urgent" is for one instruction only; it switches itself off after a send.
  function useUpUrgent() {
    if (!urgent) return;
    urgent = false;
    renderUrgent();
  }

  /* ---------- the keys ---------- */

  /** Saved buttons with every field checked: { custom, hidden, overrides }. */
  function loadButtons() {
    const raw = HMStore.buttons(account.id) || {};
    const overrides = {};
    if (raw.overrides && typeof raw.overrides === "object") {
      Object.keys(raw.overrides).forEach((key) => {
        const o = raw.overrides[key];
        if (o && typeof o === "object") overrides[key] = o;
      });
    }
    return {
      custom: (Array.isArray(raw.custom) ? raw.custom : [])
        .filter((c) => c && typeof c.id === "string" && typeof c.text === "string" && c.text.trim()),
      hidden: (Array.isArray(raw.hidden) ? raw.hidden : []).filter((key) => typeof key === "string"),
      overrides: overrides,
    };
  }

  function keyList(saved) {
    const list = [];
    HMPresets.parent.forEach((p) => {
      if (saved.hidden.indexOf(p.key) !== -1) return;
      const o = saved.overrides[p.key] || {};
      const ownText = typeof o.text === "string" ? o.text.trim() : "";
      list.push({
        kind: "preset",
        id: "p:" + p.key,
        key: p.key,
        ownText: !!ownText,
        text: ownText || t("preset.p." + p.key),
        icon: typeof o.icon === "string" && o.icon ? o.icon : p.icon,
        color: validColor(o.color) || p.color,
      });
    });
    saved.custom.forEach((c) => list.push({
      kind: "custom",
      id: c.id,
      key: "",
      ownText: true,
      text: c.text.trim(),
      icon: typeof c.icon === "string" && c.icon ? c.icon : "💬",
      color: validColor(c.color) || "slate",
    }));
    return list;
  }

  // Rebuilt only when the buttons, edit mode or language change — never on network
  // events, or it would cut short the "sent" check on the key just pressed.
  function renderKeys() {
    const saved = loadButtons();
    el.keys.classList.toggle("is-editing", editing);
    el.editHint.hidden = !editing;
    el.restore.hidden = !(editing && (saved.hidden.length || Object.keys(saved.overrides).length));

    HMUI.clear(el.editToggle);
    el.editToggle.appendChild(HMUI.icon(editing ? "check" : "pencil"));
    el.editToggle.appendChild(h("span", { text: t(editing ? "p.editDone" : "p.edit") }));

    const nodes = keyList(saved).map((item) => h("button", {
      type: "button",
      class: "key key-" + item.color,
      "data-fk": "key:" + item.id,
      "aria-label": editing ? t("ed.editTitle") + ": " + item.text : null,
      on: { click: (e) => (editing ? openEditor(item) : sendKey(item, e.currentTarget)) },
    },
      h("span", { class: "key-icon", "aria-hidden": "true", text: item.icon }),
      h("span", { class: "key-label", text: item.text }),
      editing ? h("span", { class: "key-badge", "aria-hidden": "true" }, HMUI.icon("pencil")) : null));

    nodes.push(h("button", { type: "button", class: "key key-new", "data-fk": "key:new", on: { click: () => openEditor(null) } },
      h("span", { class: "key-icon", "aria-hidden": "true" }, HMUI.icon("plus")),
      h("span", { class: "key-label", text: t("p.newButton") })));

    refill(el.keys, nodes);
  }

  function flashSent(button) {
    clearTimeout(flashTimers.get(button));
    const old = button.querySelector(".key-badge");
    if (old) old.remove();
    button.appendChild(h("span", { class: "key-badge", "aria-hidden": "true" }, HMUI.icon("check")));
    button.classList.add("is-sent");
    flashTimers.set(button, setTimeout(() => {
      button.classList.remove("is-sent");
      const badge = button.querySelector(".key-badge");
      if (badge) badge.remove();
    }, SENT_FLASH));
  }

  /* ---------- sending ---------- */

  function sendCommand(to, fields, isUrgent) {
    const view = lastView || ctl.view();
    const event = ctl.emit("cmd", {
      to: to,
      preset: fields.preset || "",
      text: fields.text || "",
      icon: fields.icon || "",
      color: fields.color,
      urgent: !!isUrgent,
    });
    if (!event) return null;
    HMUI.buzz("soft");
    HMUI.toast(t("p.sent", { who: whoLabel(view, to) }));
    return event;
  }

  function sendKey(item, button) {
    if (tooSoon("key:" + item.id)) return;
    const sent = sendCommand([target], {
      // A preset goes out by its key, so each child reads it in their own language.
      preset: item.kind === "preset" && !item.ownText ? item.key : "",
      text: item.text,
      icon: item.icon,
      color: item.color,
    }, urgent);
    if (!sent) return;
    flashSent(button);
    useUpUrgent();
  }

  function resend(cmd) {
    if (tooSoon("again:" + cmd.id)) return;
    sendCommand(cmd.to, { preset: cmd.preset, text: cmd.text, icon: cmd.icon, color: cmd.color }, cmd.urgent);
  }

  /* ---------- sent instructions and messages ---------- */

  function commandItem(view, cmd, now) {
    let lost = false;
    let statuses;
    if (ctl.isPending(cmd.id)) {
      statuses = [h("span", { class: "status status-sending", text: t("st.sending") })];
    } else {
      statuses = HMCore.recipientsOf(view, cmd).map((id) => {
        const s = HMCore.recipientStatus(cmd, id, now);
        if (s === "lost") lost = true;
        const name = memberName(view, id, "role.child");
        const member = view.members[id] || { id: id, name: name, role: "child" };
        return h("span", { class: "status status-" + s, title: name },
          HMUI.avatar(member, "sm"),
          h("span", { class: "sr-only", text: name + ": " }),
          t("st." + s));
      });
      if (!statuses.length) statuses.push(h("span", { class: "status status-sent", text: t("st.sent") }));
    }
    const sender = cmd.from === account.id ? t("p.byYou") : memberName(view, cmd.from, "role.parent");
    return h("div", { class: "item" + (cmd.urgent ? " is-urgent" : "") },
      h("span", { class: "item-icon key-" + cmd.color, "aria-hidden": "true", text: cmd.icon || "💬" }),
      h("div", { class: "item-body" },
        h("p", { class: "item-text", text: cmdText(cmd) }),
        metaLine(sender, cmd, now, false),
        h("div", { class: "statuses" }, statuses),
        lost ? h("div", { class: "item-actions" },
          h("button", { type: "button", class: "btn btn-sm btn-outline", "data-fk": "again:" + cmd.id, on: { click: () => resend(cmd) } },
            HMUI.icon("refresh"), h("span", { text: t("p.resend") }))) : null));
  }

  function messageItem(view, m, now) {
    return h("div", { class: "item is-msg" + (m.urgent ? " is-urgent" : "") },
      h("span", { class: "item-icon key-" + m.color, "aria-hidden": "true", text: m.icon || "💬" }),
      h("div", { class: "item-body" },
        h("p", { class: "item-text", text: msgText(m) }),
        metaLine(memberName(view, m.from, "role.child"), m, now, true)));
  }

  function renderLatest(view, now) {
    const list = view.commands.slice(0, LATEST_MAX);
    refill(el.latest, list.length
      ? list.map((c) => commandItem(view, c, now))
      : [h("p", { class: "empty", text: t("p.nothingSent") })]);
  }

  function renderHistory(view, now) {
    const all = view.commands.concat(view.messages)
      .sort((a, b) => b.at - a.at || (a.id < b.id ? 1 : -1))
      .slice(0, HISTORY_MAX);
    refill(el.history, all.length
      ? all.map((e) => (e.t === "cmd" ? commandItem(view, e, now) : messageItem(view, e, now)))
      : [h("p", { class: "empty", text: t("p.historyEmpty") })]);
  }

  /* ---------- family tab ---------- */

  function renderMembers(view) {
    refill(el.members, view.parents.concat(view.children).map((m) => {
      const role = t(m.role === "child" ? "role.child" : "role.parent");
      return h("div", { class: "member" },
        HMUI.avatar(m),
        h("div", null,
          h("strong", { text: m.name }),
          h("span", { class: "meta", text: m.id === account.id ? role + " (" + t("set.you") + ")" : role })));
    }));
  }

  function renderNotif() {
    const state = HMUI.notifState();
    if (state === "default") {
      refill(el.notif, [h("button", {
        type: "button",
        class: "btn btn-sm btn-outline",
        "data-fk": "notif",
        text: t("set.notifTurnOn"),
        on: { click: () => HMUI.askNotifications().then(renderNotif, renderNotif) },
      })]);
      return;
    }
    const key = state === "granted" ? "set.notifOn" : state === "denied" ? "set.notifBlocked" : "set.notifUnsupported";
    refill(el.notif, [document.createTextNode(t(key))]);
  }

  /* ---------- button editor ---------- */

  const ed = { item: null, icon: "", color: "pine" };

  function fillRadios(box, values, selected, build, onPick) {
    HMUI.clear(box);
    values.forEach((value) => {
      const b = build(value);
      b.setAttribute("role", "radio");
      b.setAttribute("data-value", value);
      b.addEventListener("click", () => { markRadio(box, value); onPick(value); });
      box.appendChild(b);
    });
    markRadio(box, selected);
  }

  function markRadio(box, value) {
    const radios = Array.from(box.querySelectorAll('[role="radio"]'));
    radios.forEach((b) => {
      const on = b.getAttribute("data-value") === value;
      b.setAttribute("aria-checked", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    if (radios.length && !radios.some((b) => b.tabIndex === 0)) radios[0].tabIndex = 0;
  }

  // Arrow keys move the choice inside a radio group, like native radio buttons.
  function arrowKeys(box) {
    box.addEventListener("keydown", (e) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!step) return;
      const radios = Array.from(box.querySelectorAll('[role="radio"]'));
      const i = radios.indexOf(document.activeElement);
      if (i === -1) return;
      e.preventDefault();
      const next = radios[(i + step + radios.length) % radios.length];
      next.focus();
      next.click();
    });
  }

  function renderPreview() {
    HMUI.clear(el.edPreview).appendChild(h("div", { class: "key key-" + ed.color },
      h("span", { class: "key-icon", text: ed.icon }),
      h("span", { class: "key-label", text: el.edText.value.trim() || " " })));
  }

  function showError(message) {
    el.edErr.textContent = message;
    el.edField.classList.toggle("has-error", !!message);
    if (message) el.edText.setAttribute("aria-invalid", "true");
    else el.edText.removeAttribute("aria-invalid");
  }

  /** item: a key from keyList(), or null for a new button. */
  function openEditor(item) {
    // HMUI.closeSheet() hides the sheet 220 ms later; opening inside that gap would be undone.
    if (!el.editor.hidden && !el.editor.classList.contains("is-open")) {
      setTimeout(() => openEditor(item), 240);
      return;
    }
    ed.item = item;
    ed.icon = item ? item.icon : HMPresets.icons[0];
    ed.color = item ? item.color : "pine";
    el.edTitle.textContent = t(item ? "ed.editTitle" : "ed.newTitle");
    el.edText.value = item ? item.text : "";
    showError("");

    const icons = HMPresets.icons.indexOf(ed.icon) === -1 ? [ed.icon].concat(HMPresets.icons) : HMPresets.icons;
    fillRadios(el.edIcons, icons, ed.icon,
      (icon) => h("button", { type: "button", class: "emoji-opt", text: icon }),
      (icon) => { ed.icon = icon; renderPreview(); });
    fillRadios(el.edColors, HMCore.COLORS, ed.color,
      (color) => h("button", { type: "button", class: "swatch key-" + color, "aria-label": t("color." + color) }),
      (color) => { ed.color = color; renderPreview(); });

    el.edRemove.hidden = !item;
    if (item) el.edRemove.textContent = t(item.kind === "preset" ? "ed.hide" : "ed.delete");
    renderPreview();
    HMUI.openSheet(el.editor);
  }

  function finishEdit(message) {
    HMUI.closeSheet(el.editor);
    renderKeys();
    HMUI.toast(message);
  }

  function saveEditor(e) {
    e.preventDefault();
    const text = el.edText.value.trim();
    if (!text) {
      showError(t("err.text"));
      el.edText.focus();
      return;
    }
    const saved = loadButtons();
    const item = ed.item;
    const fields = { text: text, icon: ed.icon, color: ed.color };
    if (!item) {
      saved.custom.push(Object.assign({ id: HMCore.newId("b") }, fields));
    } else if (item.kind === "custom") {
      saved.custom = saved.custom.map((c) => (c.id === item.id ? Object.assign({}, c, fields) : c));
    } else {
      const preset = HMPresets.parent.find((p) => p.key === item.key);
      // Unchanged text stays empty, so the key keeps following the language switch.
      const ownText = text === t("preset.p." + item.key) ? "" : text;
      if (preset && !ownText && ed.icon === preset.icon && ed.color === preset.color) delete saved.overrides[item.key];
      else saved.overrides[item.key] = { text: ownText, icon: ed.icon, color: ed.color };
    }
    HMStore.saveButtons(account.id, saved);
    finishEdit(t("ed.saved"));
  }

  function removeEdited() {
    const item = ed.item;
    if (!item) return;
    const saved = loadButtons();
    if (item.kind === "custom") saved.custom = saved.custom.filter((c) => c.id !== item.id);
    else if (saved.hidden.indexOf(item.key) === -1) saved.hidden.push(item.key);
    HMStore.saveButtons(account.id, saved);
    finishEdit(t("ed.deleted"));
  }

  /* ---------- news from other phones ---------- */

  function stronger(a, b) {
    return a === "urgent" || b === "urgent" ? "urgent" : a || b;
  }

  // One chime per batch: a catch-up after the phone was asleep can bring many events at once.
  function alertFor(view, added) {
    const since = Date.now() - ALERT_WINDOW;
    let sound = "";
    let buzz = "";
    added.forEach((e) => {
      if (e.from === account.id || e.at <= since) return;
      if (e.t === "msg") {
        const kind = e.urgent ? "urgent" : "soft";
        sound = stronger(sound, kind);
        buzz = stronger(buzz, kind);
        HMUI.notify(memberName(view, e.from, "role.child"), msgText(e), { urgent: e.urgent, tag: e.id });
      } else if (e.t === "reply") {
        const line = t("p.answer", { name: memberName(view, e.from, "role.child"), answer: t("st." + e.kind) });
        const cmd = view.commands.find((c) => c.id === e.ref);
        HMUI.toast(line);
        sound = stronger(sound, e.kind === "help" ? "urgent" : "soft");
        HMUI.notify(line, cmd ? cmdText(cmd) : "", { urgent: e.kind === "help", tag: e.id });
      }
    });
    if (sound) HMUI.chime(sound);
    if (buzz) HMUI.buzz(buzz);
  }

  function onChange(added) {
    const view = render();
    if (view && added && added.length) alertFor(view, added);
  }

  /* ---------- wiring ---------- */

  el.tabs.forEach((b) => b.addEventListener("click", () => go(b.getAttribute("data-tab"))));
  window.addEventListener("hashchange", showTab);
  $("[data-show-all]").addEventListener("click", () => go("history"));
  $("[data-go-family]").addEventListener("click", () => go("family"));

  el.urgent.addEventListener("click", () => { urgent = !urgent; renderUrgent(); });
  el.editToggle.addEventListener("click", () => { editing = !editing; renderKeys(); });
  el.restore.addEventListener("click", () => {
    const saved = loadButtons();
    saved.hidden = [];
    saved.overrides = {};
    HMStore.saveButtons(account.id, saved);
    renderKeys();
    HMUI.toast(t("p.restored"));
  });

  el.composeInput.addEventListener("input", () => { el.composeSend.disabled = !el.composeInput.value.trim(); });
  el.compose.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = el.composeInput.value.trim();
    if (!text) return;
    if (!sendCommand([target], { preset: "", text: text, icon: "💬", color: "slate" }, urgent)) return;
    el.composeInput.value = "";
    el.composeSend.disabled = true;
    useUpUrgent();
  });

  el.edForm.addEventListener("submit", saveEditor);
  el.edRemove.addEventListener("click", removeEdited);
  el.edText.addEventListener("input", () => { showError(""); renderPreview(); });
  arrowKeys(el.edIcons);
  arrowKeys(el.edColors);

  el.code.textContent = HMCore.formatCode(family.code);
  $("[data-share]").addEventListener("click", () => {
    HMUI.shareLink(HMUI.inviteLink(family.code), t("share.text"));
  });
  $("[data-copy]").addEventListener("click", () => {
    HMUI.copyText(HMUI.inviteLink(family.code)).then((ok) => {
      if (ok) HMUI.toast(t("fam.copied"));
      else HMUI.toast(HMI18n.has("fam.copyFailed") ? t("fam.copyFailed") : "Couldn't copy. Use “Send the link” instead.", "error");
    });
  });
  $("[data-test-sound]").addEventListener("click", () => {
    HMUI.unlockSound().then(() => HMUI.chime("soft"));
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

  /* ---------- start ---------- */

  ctl = HMFamily.start(account, family, { onChange: onChange, onStatus: HMUI.showConnection });
  HMUI.showConnection(ctl.status());
  renderUrgent();
  renderKeys();
  showTab();

  HMI18n.onChange(() => {
    HMUI.showConnection(ctl.status()); // its texts were set in the old language
    render();
    renderKeys();
  });
  // "5 min ago" labels and "not delivered" need the clock, not only new events.
  setInterval(render, 30000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") render();
  });
})();
