/* =====================================================
   HOME MANAGER — store.js
   Everything this phone remembers, in localStorage:
   accounts, who is logged in, the family, the family's
   event log, custom buttons, language.

   Keys start with "hmx_" so they never mix with other
   projects opened from the same github.io address.
===================================================== */

(function () {
  "use strict";

  const P = "hmx_";

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(P + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(P + key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  function drop(key) {
    try { localStorage.removeItem(P + key); } catch (err) { /* private mode */ }
  }

  /* ---------- accounts on this phone ---------- */

  // Not real security — the PIN only keeps a sibling out of a parent's
  // account on a shared phone. It never leaves this device.
  function pinHash(pin, salt) {
    let h = 2166136261;
    const s = salt + ":" + pin;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  function accounts() {
    return read("accounts", []);
  }

  function saveAccounts(list) {
    write("accounts", list);
  }

  function createAccount(name, pin) {
    const id = HMCore.newId("m");
    const account = { id: id, name: name.trim(), pin: pinHash(pin, id), role: null, createdAt: Date.now() };
    const list = accounts();
    list.push(account);
    saveAccounts(list);
    write("session", id);
    return account;
  }

  function checkPin(accountId, pin) {
    const account = accounts().find((a) => a.id === accountId);
    return !!account && account.pin === pinHash(pin, account.id);
  }

  function updateAccount(accountId, patch) {
    const list = accounts();
    const i = list.findIndex((a) => a.id === accountId);
    if (i === -1) return null;
    list[i] = Object.assign({}, list[i], patch);
    saveAccounts(list);
    return list[i];
  }

  function currentAccount() {
    const id = read("session", null);
    return id ? accounts().find((a) => a.id === id) || null : null;
  }

  function login(accountId) {
    write("session", accountId);
  }

  function logout() {
    drop("session");
  }

  /* ---------- family ---------- */

  function family(accountId) {
    return read("family_" + accountId, null);
  }

  function setFamily(accountId, fam) {
    write("family_" + accountId, fam);
  }

  function leaveFamily(accountId) {
    drop("family_" + accountId);
  }

  function pendingJoin() {
    return read("join", "");
  }

  function setPendingJoin(code) {
    if (code) write("join", code); else drop("join");
  }

  /* ---------- family log (shared by every account of that family on this phone) ---------- */

  function events(code) {
    return read("log_" + code, []);
  }

  function saveEvents(code, list) {
    if (!write("log_" + code, list)) {
      // Storage full: keep the newest half and try again.
      write("log_" + code, list.slice(Math.floor(list.length / 2)));
    }
  }

  function members(code) {
    return read("members_" + code, {});
  }

  function saveMembers(code, map) {
    write("members_" + code, map);
  }

  function cursor(code) {
    return read("cursor_" + code, 0);
  }

  function setCursor(code, seconds) {
    write("cursor_" + code, seconds);
  }

  function outbox(code) {
    return read("outbox_" + code, []);
  }

  function saveOutbox(code, list) {
    write("outbox_" + code, list);
  }

  /* ---------- per-account settings ---------- */

  function buttons(accountId) {
    return read("buttons_" + accountId, { custom: [], hidden: [] });
  }

  function saveButtons(accountId, value) {
    write("buttons_" + accountId, value);
  }

  function readUntil(accountId) {
    return read("read_" + accountId, 0);
  }

  function setReadUntil(accountId, at) {
    write("read_" + accountId, at);
  }

  function lastHello(accountId) {
    return read("hello_" + accountId, 0);
  }

  function setLastHello(accountId, at) {
    write("hello_" + accountId, at);
  }

  function lang() {
    return read("lang", "");
  }

  function setLang(value) {
    write("lang", value);
  }

  window.HMStore = {
    accounts: accounts,
    createAccount: createAccount,
    checkPin: checkPin,
    updateAccount: updateAccount,
    currentAccount: currentAccount,
    login: login,
    logout: logout,
    family: family,
    setFamily: setFamily,
    leaveFamily: leaveFamily,
    pendingJoin: pendingJoin,
    setPendingJoin: setPendingJoin,
    events: events,
    saveEvents: saveEvents,
    members: members,
    saveMembers: saveMembers,
    cursor: cursor,
    setCursor: setCursor,
    outbox: outbox,
    saveOutbox: saveOutbox,
    buttons: buttons,
    saveButtons: saveButtons,
    readUntil: readUntil,
    setReadUntil: setReadUntil,
    lastHello: lastHello,
    setLastHello: setLastHello,
    lang: lang,
    setLang: setLang,
  };
})();
