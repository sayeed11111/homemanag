/* =====================================================
   HOME MANAGER — family.js
   Connects one account to its family: keeps the family
   log on this phone, listens to the channel, says "hello"
   so the others know who is in the family, and sends new
   events. Both the parent and the child screen use it.

   const fam = HMFamily.start(account, family, {
     onChange(added) — the log changed; `added` = events that
                       just arrived from other phones
     onStatus(state) — "connecting" | "online" | "offline"
   });
   fam.view()                 → HMCore.buildView(...) for this family
   fam.emit("cmd", {...})     → sends an event, returns it
   fam.isPending(eventId)     → still waiting in the outbox?
===================================================== */

(function () {
  "use strict";

  const HELLO_EVERY = 3 * 3600 * 1000;   // remind the family we're here
  const HELLO_REPLY_GAP = 60 * 1000;     // answer a newcomer at most once a minute

  function start(account, family, handlers) {
    const code = family.code;
    const helloKey = account.id + "_" + code;
    // The saved log is checked again on load, so nothing stored by an older
    // version (or by hand) can break the screens.
    let events = HMStore.events(code).map(HMCore.cleanEvent).filter(Boolean);
    // No prototype: member ids are keys here.
    let members = Object.assign(Object.create(null), HMStore.members(code));
    let lastReply = 0;
    const cb = handlers || {};

    const mine = members[account.id];
    members[account.id] = {
      id: account.id, name: account.name, role: account.role,
      lastSeen: Date.now(), since: (mine && mine.since) || Date.now(),
    };
    HMStore.saveMembers(code, members);

    // A bug in a screen must not stop delivery: the log is already saved by then.
    function notify(name, arg) {
      if (!cb[name]) return;
      try { cb[name](arg); } catch (err) { if (window.console) console.error(err); }
    }

    const bus = HMBus.create(code, {
      onEvents: (list) => ingest(list, false),
      onStatus: (state) => notify("onStatus", state),
      onOutbox: () => notify("onChange", []),
      onDropped: (event) => {
        // ntfy.sh refused it for good: take it out of the log so nobody sees it as "sent".
        events = events.filter((e) => e.id !== event.id);
        HMStore.saveEvents(code, events);
        HMUI.toast(HMI18n.t("err.notSent"), "error");
        notify("onChange", []);
      },
    });

    function ingest(list, fromMe) {
      const knownBefore = new Set(Object.keys(members));
      const res = HMCore.mergeEvents(events, list);
      if (!res.added.length) return;
      events = HMCore.prune(res.merged);
      HMStore.saveEvents(code, events);

      let newcomer = false;
      res.added.forEach((e) => {
        if (e.t !== "hello") return;
        members[e.from] = HMCore.mergeMember(members[e.from], e);
        if (e.from !== account.id && !knownBefore.has(e.from)) newcomer = true;
        // A child (or a second parent) who joined by code learns the family name here.
        if (e.family && e.from !== account.id && !family.name) {
          family.name = e.family;
          HMStore.setFamily(account.id, family);
        }
      });
      HMStore.saveMembers(code, members);

      if (newcomer && !fromMe && Date.now() - lastReply > HELLO_REPLY_GAP) {
        lastReply = Date.now();
        hello();
      }
      notify("onChange", fromMe ? [] : res.added);
    }

    function emit(type, fields) {
      const event = HMCore.cleanEvent(Object.assign(
        { v: 1, t: type, id: HMCore.newId("e"), from: account.id, at: Date.now() },
        fields
      ));
      if (!event) return null;
      ingest([event], true);
      bus.send(event);
      return event;
    }

    function hello() {
      HMStore.setLastHello(helloKey, Date.now());
      return emit("hello", {
        name: account.name,
        role: account.role,
        family: account.role === "parent" ? family.name || "" : "",
      });
    }

    bus.start();
    // After start() has returned, so the screen already holds the controller
    // when the resulting onChange arrives.
    setTimeout(() => {
      if (Date.now() - HMStore.lastHello(helloKey) > HELLO_EVERY) hello();
    }, 0);

    return {
      code: code,
      family: family,
      account: account,
      view: () => HMCore.buildView(events, members, account.id),
      emit: emit,
      hello: hello,
      isPending: (id) => bus.isPending(id),
      status: () => bus.status(),
      stop: () => bus.stop(),
    };
  }

  window.HMFamily = { start: start };
})();
