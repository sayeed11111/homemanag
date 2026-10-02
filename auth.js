/* =====================================================
   HOME MANAGER — auth.js
   The steps before the main screen, one per page
   (the page says which one in <body data-page="...">):

     register — name + 4-digit PIN, account lives on this phone
     login    — pick your name on this phone, enter the PIN
     role     — parent or child (chosen once)
     family   — parent: create a family and invite children
                child:  join with the invite link or the code
===================================================== */

(function () {
  "use strict";

  const t = (key, vars) => HMI18n.t(key, vars);
  const page = document.body.getAttribute("data-page");
  const $ = (id) => document.getElementById(id);

  const STEPS = {
    register: ["register", "login"],
    login: ["register", "login"],
    role: ["role"],
    family: ["family"],
  };
  if (!HMFlow.guard(STEPS[page] || [])) return;
  HMFlow.boot();

  /* ---------- form helpers ---------- */

  function setError(id, key) {
    const err = $(id + "-err");
    const field = $(id) && $(id).closest(".field");
    if (err) err.textContent = key ? t(key) : "";
    if (field) field.classList.toggle("has-error", !!key);
    if ($(id)) $(id).setAttribute("aria-invalid", key ? "true" : "false");
  }

  function focusFirstError(ids) {
    for (const id of ids) {
      const field = $(id) && $(id).closest(".field");
      if (field && field.classList.contains("has-error")) { $(id).focus(); return; }
    }
  }

  // Keep only digits while typing a PIN.
  function digitsOnly(input) {
    input.addEventListener("input", () => {
      const clean = input.value.replace(/\D/g, "").slice(0, 4);
      if (clean !== input.value) input.value = clean;
    });
  }

  // Show the family code as XXXX-XXXX-XXXX-XXXX while typing.
  function codeMask(input) {
    input.addEventListener("input", () => {
      const raw = input.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
      const pretty = (raw.match(/.{1,4}/g) || []).join("-");
      if (pretty !== input.value) input.value = pretty;
    });
  }

  /* ---------- register ---------- */

  function initRegister() {
    if (HMStore.pendingJoin()) $("join-note").hidden = false;
    digitsOnly($("pin"));
    digitsOnly($("pin2"));

    $("register-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("name").value.trim();
      const pin = $("pin").value;
      const pin2 = $("pin2").value;
      setError("name", name ? "" : "err.name");
      setError("pin", /^\d{4}$/.test(pin) ? "" : "err.pin");
      setError("pin2", /^\d{4}$/.test(pin) && pin !== pin2 ? "err.pin2" : "");
      if (!name || !/^\d{4}$/.test(pin) || pin !== pin2) {
        focusFirstError(["name", "pin", "pin2"]);
        return;
      }
      HMStore.createAccount(name.slice(0, HMCore.NAME_MAX), pin);
      location.replace("role.html");
    });
  }

  /* ---------- login ---------- */

  function initLogin() {
    const list = HMStore.accounts();
    const box = $("accounts");
    if (!list.length) {
      $("login-form").hidden = true;
      $("login-lead").hidden = true;
      $("login-alt").hidden = true;
      $("login-empty").hidden = false;
      return;
    }

    list.forEach((account) => {
      const roleKey = account.role ? "role." + account.role : "role.none";
      const option = HMUI.h("label", { class: "account-opt" },
        HMUI.h("input", { type: "radio", name: "account", value: account.id, checked: list.length === 1 }),
        HMUI.avatar(account),
        HMUI.h("span", null,
          HMUI.h("strong", { text: account.name }),
          HMUI.h("span", { class: "meta", "data-i18n": roleKey, text: t(roleKey) })));
      box.appendChild(option);
    });

    // Highlight the chosen name (CSS :has() would do it, but not on older iPhones).
    const options = box.querySelectorAll(".account-opt");
    const paintChoice = () => options.forEach((o) => {
      const input = o.querySelector("input");
      o.classList.toggle("is-checked", input.checked);
      o.classList.toggle("is-focused", document.activeElement === input);
    });
    box.addEventListener("change", paintChoice);
    box.addEventListener("focusin", paintChoice);
    box.addEventListener("focusout", () => setTimeout(paintChoice, 0));
    paintChoice();
    digitsOnly($("pin"));

    $("login-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const picked = document.querySelector("input[name='account']:checked");
      $("login-error").textContent = "";
      if (!picked) {
        $("login-error").textContent = t("err.pickAccount");
        return;
      }
      if (!HMStore.checkPin(picked.value, $("pin").value)) {
        $("login-error").textContent = t("err.wrongPin");
        $("pin").value = "";
        $("pin").focus();
        return;
      }
      HMStore.login(picked.value);
      HMFlow.go();
    });
  }

  /* ---------- role ---------- */

  function initRole() {
    const account = HMStore.currentAccount();
    const hello = $("role-hello");
    const paint = () => { hello.textContent = t("role.hello", { name: account.name }); };
    paint();
    HMI18n.onChange(paint);

    document.querySelectorAll("[data-role]").forEach((card) => {
      card.addEventListener("click", () => {
        HMStore.updateAccount(account.id, { role: card.getAttribute("data-role") });
        HMFlow.go();
      });
    });
  }

  /* ---------- family ---------- */

  function initFamily() {
    const account = HMStore.currentAccount();
    const pending = HMStore.pendingJoin();
    const isParent = account.role === "parent";

    // A child who came through the invite link is already in: no extra tap.
    if (!isParent && pending) {
      HMStore.setFamily(account.id, { code: pending, name: "", createdAt: Date.now() });
      HMStore.setPendingJoin("");
      HMFlow.go();
      return;
    }
    codeMask($("code"));

    if (pending) $("code").value = HMCore.formatCode(pending);

    // Parent: create first; "I have a code" or an invite link switches to joining.
    // Child: joining is the only way in.
    function show(panel) {
      $("create-panel").hidden = panel !== "create";
      $("join-panel").hidden = panel !== "join";
      $("invite-panel").hidden = panel !== "invite";
    }

    if (isParent) {
      show(pending ? "join" : "create");
      $("join-lead").setAttribute("data-i18n", "fam.joinParentLead");
      $("back-to-create").hidden = false;
    } else {
      show("join");
      $("back-to-create").hidden = true;
    }
    HMI18n.apply();

    $("show-join").addEventListener("click", () => { show("join"); $("code").focus(); });
    $("back-to-create").addEventListener("click", () => { show("create"); $("family-name").focus(); });

    $("create-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("family-name").value.trim();
      setError("family-name", name ? "" : "err.familyName");
      if (!name) { $("family-name").focus(); return; }
      const code = HMCore.newFamilyCode();
      HMStore.setFamily(account.id, { code: code, name: name.slice(0, HMCore.NAME_MAX), createdAt: Date.now() });
      HMStore.setPendingJoin("");
      $("invite-code").textContent = HMCore.formatCode(code);
      show("invite");
      $("share-link").focus();
    });

    $("join-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const code = HMCore.normalizeCode($("code").value);
      setError("code", code ? "" : "err.code");
      if (!code) { $("code").focus(); return; }
      HMStore.setFamily(account.id, { code: code, name: "", createdAt: Date.now() });
      HMStore.setPendingJoin("");
      HMFlow.go();
    });

    $("share-link").addEventListener("click", () => {
      const fam = HMStore.family(account.id);
      HMUI.shareLink(HMUI.inviteLink(fam.code), t("share.text"));
    });
    $("copy-link").addEventListener("click", () => {
      const fam = HMStore.family(account.id);
      HMUI.copyText(HMUI.inviteLink(fam.code)).then((ok) => {
        HMUI.toast(t(ok ? "fam.copied" : "fam.copyFailed"), ok ? "" : "error");
      });
    });
    $("invite-done").addEventListener("click", () => HMFlow.go());
  }

  if (page === "register") initRegister();
  else if (page === "login") initLogin();
  else if (page === "role") initRole();
  else if (page === "family") initFamily();
})();
