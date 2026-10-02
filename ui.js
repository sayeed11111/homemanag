/* =====================================================
   HOME MANAGER — ui.js
   Small helpers every screen uses:
   - h(): build DOM safely (text is always textContent,
     never HTML — family messages come from the network);
   - icons, toasts, bottom sheets, confirm dialog;
   - time labels ("5 min ago");
   - sound, vibration and system notifications;
   - sharing and copying the invite link.
===================================================== */

(function () {
  "use strict";

  const t = (key, vars) => HMI18n.t(key, vars);

  /* ---------- DOM ---------- */

  /**
   * h("button", { class: "btn", text: "Hi", on: { click: fn }, "aria-label": "x" }, child, ...)
   * Children can be nodes, strings (as text) or arrays; null/false are skipped.
   */
  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    const p = props || {};
    Object.keys(p).forEach((key) => {
      const value = p[key];
      if (value === null || value === undefined || value === false) return;
      if (key === "class") el.className = value;
      else if (key === "text") el.textContent = value;
      else if (key === "on") Object.keys(value).forEach((ev) => el.addEventListener(ev, value[ev]));
      else if (key === "style") el.setAttribute("style", value);
      else if (key in el && typeof value !== "string") el[key] = value;
      else el.setAttribute(key, value === true ? "" : String(value));
    });
    append(el, children);
    return el;
  }

  function append(el, children) {
    children.forEach((child) => {
      if (child === null || child === undefined || child === false) return;
      if (Array.isArray(child)) append(el, child);
      else el.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    });
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
    return el;
  }

  /* ---------- icons (static, trusted SVG) ---------- */

  const ICONS = {
    send: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    users: '<path d="M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1"/><circle cx="9" cy="8" r="4"/><path d="M22 20v-1a4 4 0 0 0-3-3.87"/><path d="M16 4.13a4 4 0 0 1 0 7.75"/>',
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9"/><path d="M9.5 20v-6h5v6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>',
    share: '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    question: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    volume: '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  };

  function icon(name, className) {
    const wrap = document.createElement("span");
    wrap.className = "ico" + (className ? " " + className : "");
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || "") + "</svg>";
    return wrap;
  }

  /** Fill every <span data-icon="name"></span> already in the HTML. */
  function mountIcons(root) {
    (root || document).querySelectorAll("[data-icon]").forEach((el) => {
      if (el.firstChild) return;
      el.replaceWith(icon(el.getAttribute("data-icon"), el.className));
    });
  }

  /* ---------- people ---------- */

  function initial(name) {
    const s = (name || "?").trim();
    return s ? s[0].toUpperCase() : "?";
  }

  const AVATAR_TONES = ["pine", "ember", "gold", "sky", "plum", "slate"];

  function avatar(member, size) {
    let n = 0;
    const id = member && member.id ? member.id : "";
    for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) >>> 0;
    const tone = member && member.role === "child" ? "ember" : AVATAR_TONES[n % AVATAR_TONES.length];
    return h("span", { class: "avatar avatar-" + tone + (size ? " avatar-" + size : ""), "aria-hidden": "true", text: initial(member && member.name) });
  }

  /* ---------- time ---------- */

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function clock(d) {
    return pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function timeAgo(at, now) {
    const n = now || Date.now();
    const diff = Math.max(0, n - at);
    if (diff < 60 * 1000) return t("time.now");
    if (diff < 60 * 60 * 1000) return t("time.min", { n: Math.floor(diff / 60000) });
    const d = new Date(at);
    const today = new Date(n);
    today.setHours(0, 0, 0, 0);
    if (at >= today.getTime()) return diff < 6 * 3600 * 1000 ? t("time.hour", { n: Math.floor(diff / 3600000) }) : clock(d);
    if (at >= today.getTime() - 86400000) return t("time.yesterday", { time: clock(d) });
    return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + ", " + clock(d);
  }

  /* ---------- toast ---------- */

  let toastTimer = null;

  function toast(message, kind) {
    let box = document.querySelector(".toast");
    if (!box) {
      box = h("div", { class: "toast", role: "status", "aria-live": "polite" });
      document.body.appendChild(box);
    }
    clear(box);
    box.className = "toast" + (kind ? " toast-" + kind : "");
    box.appendChild(icon(kind === "error" ? "x" : "check"));
    box.appendChild(h("span", { text: message }));
    void box.offsetWidth; // restart the entrance transition
    box.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove("is-visible"), 2600);
  }

  /* ---------- bottom sheets ---------- */

  let lastFocus = null;

  function openSheet(sheet) {
    clearTimeout(sheet._hideTimer); // reopened right after closing: keep it visible
    lastFocus = document.activeElement;
    sheet.hidden = false;
    requestAnimationFrame(() => sheet.classList.add("is-open"));
    document.body.classList.add("sheet-open");
    const first = sheet.querySelector("input, textarea, button:not([data-sheet-close])");
    if (first) setTimeout(() => first.focus(), 60);
  }

  function closeSheet(sheet) {
    sheet.classList.remove("is-open");
    document.body.classList.remove("sheet-open");
    sheet._hideTimer = setTimeout(() => { sheet.hidden = true; }, 220);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function initSheets() {
    document.querySelectorAll(".sheet").forEach((sheet) => {
      if (sheet.dataset.ready) return;
      sheet.dataset.ready = "1";
      sheet.addEventListener("click", (e) => { if (e.target === sheet) closeSheet(sheet); });
      sheet.querySelectorAll("[data-sheet-close]").forEach((b) => b.addEventListener("click", () => closeSheet(sheet)));
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      document.querySelectorAll(".sheet.is-open").forEach(closeSheet);
    });
  }

  /** confirmBox(text, okLabel, { danger }) → Promise<boolean> */
  function confirmBox(text, okLabel, opts) {
    return new Promise((resolve) => {
      const done = (answer) => { closeSheet(sheet); setTimeout(() => sheet.remove(), 260); resolve(answer); };
      const textId = "confirm-" + Date.now();
      const sheet = h("div", { class: "sheet", hidden: true, role: "alertdialog", "aria-modal": "true", "aria-labelledby": textId },
        h("div", { class: "sheet-panel" },
          h("p", { class: "sheet-text", id: textId, text: text }),
          h("div", { class: "sheet-actions" },
            h("button", { type: "button", class: "btn btn-quiet", text: t("set.cancel"), on: { click: () => done(false) } }),
            h("button", { type: "button", class: "btn " + (opts && opts.danger ? "btn-danger" : "btn-primary"), text: okLabel, on: { click: () => done(true) } }))));
      sheet.addEventListener("click", (e) => { if (e.target === sheet) done(false); });
      document.body.appendChild(sheet);
      openSheet(sheet);
    });
  }

  /* ---------- sound ---------- */

  let audioCtx = null;

  function audio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    return audioCtx;
  }

  function soundReady() {
    const a = audio();
    return !!a && a.state === "running";
  }

  function unlockSound() {
    const a = audio();
    if (!a) return Promise.resolve(false);
    if (a.state === "running") return Promise.resolve(true);
    return a.resume().then(() => a.state === "running").catch(() => false);
  }

  function note(a, freq, start, length, volume) {
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain).connect(a.destination);
    osc.start(start);
    osc.stop(start + length + 0.05);
  }

  /** kind: "soft" (a two-note ding) or "urgent" (a louder repeated call). */
  function chime(kind) {
    const a = audio();
    if (!a || a.state !== "running") return;
    const s = a.currentTime + 0.02;
    if (kind === "urgent") {
      for (let i = 0; i < 3; i++) {
        note(a, 988, s + i * 0.42, 0.16, 0.5);
        note(a, 1319, s + i * 0.42 + 0.17, 0.2, 0.5);
      }
    } else {
      note(a, 784, s, 0.22, 0.28);
      note(a, 1047, s + 0.18, 0.35, 0.28);
    }
  }

  function buzz(kind) {
    if (!navigator.vibrate) return;
    try { navigator.vibrate(kind === "urgent" ? [300, 120, 300, 120, 300] : [160]); } catch (err) { /* not allowed yet */ }
  }

  /* ---------- system notifications ---------- */

  function notifState() {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission; // "default" | "granted" | "denied"
  }

  function askNotifications() {
    if (notifState() !== "default") return Promise.resolve(notifState());
    return Promise.resolve(Notification.requestPermission()).then(() => notifState());
  }

  /** Only when the app is not on screen — on screen the sound and the card are enough. */
  function notify(title, body, opts) {
    if (notifState() !== "granted" || document.visibilityState === "visible") return;
    const urgent = !!(opts && opts.urgent);
    const options = {
      body: body,
      tag: (opts && opts.tag) || "hm",
      renotify: true,
      icon: "img/icon-192.png",
      badge: "img/icon-192.png",
      vibrate: urgent ? [300, 120, 300, 120, 300] : [160],
      requireInteraction: urgent,
      data: { url: location.href },
    };
    const fallback = () => { try { new Notification(title, options); } catch (err) { /* Android needs the service worker */ } };
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
      navigator.serviceWorker.getRegistration().then((reg) => (reg ? reg.showNotification(title, options) : fallback())).catch(fallback);
    } else {
      fallback();
    }
  }

  function registerWorker() {
    if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return;
    navigator.serviceWorker.register("sw.js").catch(() => { /* notifications fall back to the page */ });
  }

  /* ---------- sharing ---------- */

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => legacyCopy(text));
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    const area = h("textarea", { style: "position:fixed;top:-100px;opacity:0" });
    area.value = text;
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
    area.remove();
    return ok;
  }

  /** Phone share sheet if there is one, otherwise Telegram's share page. */
  function shareLink(url, text) {
    if (navigator.share) {
      return navigator.share({ title: "Home Manager", text: text, url: url })
        .then(() => true)
        .catch((err) => (err && err.name === "AbortError" ? false : openTelegram(url, text)));
    }
    return Promise.resolve(openTelegram(url, text));
  }

  function openTelegram(url, text) {
    window.open("https://t.me/share/url?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(text), "_blank", "noopener");
    return true;
  }

  function inviteLink(code) {
    return new URL("app.html?join=" + code, location.href).href;
  }

  /* ---------- connection dot: <span data-conn></span> ---------- */

  let lastConnection = "";

  function showConnection(status) {
    lastConnection = status;
    document.querySelectorAll("[data-conn]").forEach((el) => {
      el.className = "conn conn-" + status;
      el.setAttribute("title", t("conn." + status));
      el.setAttribute("aria-label", t("conn." + status));
    });
    document.querySelectorAll("[data-conn-text]").forEach((el) => { el.textContent = t("conn." + status); });
    document.querySelectorAll("[data-offline-bar]").forEach((el) => { el.hidden = status !== "offline"; });
  }

  // The status text must follow a language switch, not only a status change.
  HMI18n.onChange(() => { if (lastConnection) showConnection(lastConnection); });

  window.HMUI = {
    h: h,
    clear: clear,
    icon: icon,
    mountIcons: mountIcons,
    avatar: avatar,
    initial: initial,
    timeAgo: timeAgo,
    toast: toast,
    openSheet: openSheet,
    closeSheet: closeSheet,
    initSheets: initSheets,
    confirm: confirmBox,
    soundReady: soundReady,
    unlockSound: unlockSound,
    chime: chime,
    buzz: buzz,
    notifState: notifState,
    askNotifications: askNotifications,
    notify: notify,
    registerWorker: registerWorker,
    copyText: copyText,
    shareLink: shareLink,
    inviteLink: inviteLink,
    showConnection: showConnection,
  };
})();
