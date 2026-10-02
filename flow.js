/* =====================================================
   HOME MANAGER — flow.js
   Where should this person be right now?

     no account on this phone   → register.html
     accounts, nobody logged in → login.html
     logged in, no role yet     → role.html
     role, but no family yet    → family.html
     parent                     → parent.html
     child                      → child.html

   Every app page calls HMFlow.guard("<its step>") first;
   if the person belongs somewhere else, they are moved.
   An invite link (app.html?join=CODE) is remembered on the
   way and used on the family step.
===================================================== */

(function () {
  "use strict";

  const PAGES = {
    register: "register.html",
    login: "login.html",
    role: "role.html",
    family: "family.html",
    parent: "parent.html",
    child: "child.html",
  };

  function captureJoin() {
    let code = "";
    try { code = HMCore.normalizeCode(new URLSearchParams(location.search).get("join") || ""); } catch (err) { code = ""; }
    if (code) HMStore.setPendingJoin(code);
  }

  function step() {
    const account = HMStore.currentAccount();
    if (!account) return HMStore.accounts().length ? "login" : "register";
    if (!account.role) return "role";
    if (!HMStore.family(account.id)) return "family";
    return account.role;
  }

  function pageFor(name) {
    return PAGES[name] || PAGES.register;
  }

  function go() {
    location.replace(pageFor(step()));
  }

  /** allowed: a step name or a list of them. true = stay on this page. */
  function guard(allowed) {
    captureJoin();
    const list = Array.isArray(allowed) ? allowed : [allowed];
    const now = step();
    if (now === "parent" || now === "child") HMStore.setPendingJoin(""); // already in a family
    if (list.indexOf(now) !== -1) return true;
    location.replace(pageFor(now));
    return false;
  }

  /** Shared page setup: translations, language switch, icons, sheets, sound. */
  function boot() {
    HMI18n.mountSwitches();
    HMI18n.apply();
    HMUI.mountIcons();
    HMUI.initSheets();
    HMUI.registerWorker();

    const banners = document.querySelectorAll("[data-sound-banner]");
    const refresh = () => banners.forEach((b) => { b.hidden = HMUI.soundReady(); });
    // Browsers only allow sound after the first tap on the page.
    document.addEventListener("pointerdown", () => { HMUI.unlockSound().then(refresh); }, { passive: true });
    banners.forEach((b) => b.addEventListener("click", () => HMUI.unlockSound().then(refresh)));
    if (banners.length) refresh();
  }

  function logout() {
    HMStore.logout();
    location.replace(pageFor("login"));
  }

  window.HMFlow = {
    PAGES: PAGES,
    step: step,
    pageFor: pageFor,
    go: go,
    guard: guard,
    boot: boot,
    logout: logout,
    captureJoin: captureJoin,
  };
})();
