/* =====================================================
   HOME MANAGER — bus.js
   Delivery between phones through ntfy.sh — a free public
   message relay that needs no account. The family code is
   the private channel name: every phone in the family
   listens to it and posts its events to it.

   - receive: a live stream (Server-Sent Events) plus a
     catch-up request whenever the app opens or comes back
     online, so nothing sent while it was closed is missed
     (ntfy.sh keeps messages for 12 hours);
   - send: events wait in an outbox on this phone until
     ntfy.sh accepts them, so a bad connection only delays
     an instruction, it never loses it.
===================================================== */

(function () {
  "use strict";

  const BASE = "https://ntfy.sh";
  const RETRY_MIN = 2000;
  const RETRY_MAX = 60000;
  const REQUEST_TIMEOUT = 15000;
  const SETTLE_DELAY = 2500; // ntfy.sh writes new messages to its cache in ~1 s batches

  /**
   * handlers: {
   *   onEvents(list)   — new events arrived (already checked by HMCore.cleanEvent)
   *   onStatus(state)  — "connecting" | "online" | "offline"
   *   onOutbox()       — something was sent or queued
   *   onDropped(event) — ntfy.sh refused an event for good (it won't be retried)
   * }
   */
  function create(code, handlers) {
    const topic = HMCore.topicFor(code);
    const url = BASE + "/" + topic;
    let stream = null;
    let status = "connecting";
    let stopped = true;
    let retryDelay = RETRY_MIN;
    let reconnectTimer = null;
    let flushTimer = null;
    let settleTimer = null;
    let flushing = null;

    // A request stuck on a dead connection must fail, so the retry logic can take over.
    function request(target, options) {
      if (typeof AbortController === "undefined") return fetch(target, options);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT);
      return fetch(target, Object.assign({}, options, { signal: ctrl.signal }))
        .finally(() => clearTimeout(timer));
    }

    function setStatus(next) {
      if (next === status) return;
      status = next;
      if (handlers.onStatus) handlers.onStatus(next);
    }

    /* ---------- receiving ---------- */

    function deliver(messages) {
      const events = [];
      let newest = HMStore.cursor(code);
      for (const m of messages) {
        if (!m || m.event !== "message" || typeof m.message !== "string") continue;
        if (m.time > newest) newest = m.time;
        let parsed;
        try { parsed = JSON.parse(m.message); } catch (err) { continue; }
        const event = HMCore.cleanEvent(parsed);
        if (event) events.push(event);
      }
      HMStore.setCursor(code, newest);
      if (events.length) handlers.onEvents(events);
    }

    function since() {
      const last = HMStore.cursor(code);
      // A few seconds of overlap on purpose: duplicates are dropped by id.
      return last ? String(Math.max(0, last - 5)) : "12h";
    }

    function catchUp() {
      return request(url + "/json?poll=1&since=" + since(), { cache: "no-store" })
        .then((res) => {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.text();
        })
        .then((text) => {
          const lines = text.split("\n").filter(Boolean).map((line) => {
            try { return JSON.parse(line); } catch (err) { return null; }
          });
          deliver(lines);
        });
    }

    function closeStream() {
      if (!stream) return;
      stream.onopen = stream.onmessage = stream.onerror = null;
      stream.close();
      stream = null;
    }

    function openStream() {
      closeStream();
      if (stopped) return;
      setStatus(navigator.onLine === false ? "offline" : "connecting");
      stream = new EventSource(url + "/sse?since=" + since());
      stream.onopen = function () {
        retryDelay = RETRY_MIN;
        setStatus("online");
        flush();
        // A message sent a moment before the stream opened may be in neither the
        // catch-up (not cached yet) nor the stream (sent before we listened).
        clearTimeout(settleTimer);
        settleTimer = setTimeout(() => { catchUp().catch(function () {}); }, SETTLE_DELAY);
      };
      stream.onmessage = function (e) {
        let data;
        try { data = JSON.parse(e.data); } catch (err) { return; }
        deliver([data]);
      };
      stream.onerror = function () {
        if (!stream) return;
        if (stream.readyState === EventSource.CLOSED) {
          setStatus("offline");
          scheduleReconnect();
        } else {
          setStatus(navigator.onLine === false ? "offline" : "connecting");
        }
      };
    }

    function reconnectNow() {
      clearTimeout(reconnectTimer);
      if (stopped) return;
      catchUp().catch(function () { /* the stream will retry */ }).then(openStream);
    }

    function scheduleReconnect() {
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(reconnectNow, retryDelay);
      retryDelay = Math.min(retryDelay * 2, RETRY_MAX);
    }

    function onOnline() {
      retryDelay = RETRY_MIN;
      reconnectNow();
      flush();
    }

    function onOffline() {
      setStatus("offline");
    }

    function onVisible() {
      if (document.visibilityState !== "visible" || stopped) return;
      // Phones pause background pages and may drop the stream silently.
      if (!stream || stream.readyState !== EventSource.OPEN) reconnectNow();
      else catchUp().catch(function () {});
      flush();
    }

    /* ---------- sending ---------- */

    function scheduleFlush() {
      clearTimeout(flushTimer);
      flushTimer = setTimeout(flush, 8000);
    }

    /** Sends the outbox in order. Resolves true if it emptied, false if it has to retry later. */
    async function sendQueued() {
      let box = HMStore.outbox(code);
      while (box.length && !stopped) {
        const event = box[0];
        let dropped = false;
        try {
          const res = await request(url, { method: "POST", body: JSON.stringify(event) });
          if (res.status === 429 || res.status >= 500) throw new Error("HTTP " + res.status);
          // Any other refusal will never succeed — don't retry it forever.
          dropped = !res.ok;
        } catch (err) {
          if (navigator.onLine === false) setStatus("offline");
          scheduleFlush();
          return false;
        }
        box = HMStore.outbox(code).filter((e) => e.id !== event.id);
        HMStore.saveOutbox(code, box);
        if (dropped && handlers.onDropped) handlers.onDropped(event);
        if (handlers.onOutbox) handlers.onOutbox();
      }
      return true;
    }

    function flush() {
      if (flushing) return flushing;
      // `flushing` is cleared only after the run has finished — clearing it inside
      // the run would happen before this assignment when the outbox is empty,
      // and the flag would then stay set forever.
      flushing = sendQueued().catch(() => false).then((emptied) => {
        flushing = null;
        // Something was queued while the last request was in flight.
        if (emptied && !stopped && HMStore.outbox(code).length) flush();
      });
      return flushing;
    }

    function send(event) {
      const box = HMStore.outbox(code);
      box.push(event);
      HMStore.saveOutbox(code, box);
      if (handlers.onOutbox) handlers.onOutbox();
      return flush();
    }

    function isPending(eventId) {
      return HMStore.outbox(code).some((e) => e.id === eventId);
    }

    /* ---------- lifecycle ---------- */

    function start() {
      if (!stopped) return;
      stopped = false;
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);
      document.addEventListener("visibilitychange", onVisible);
      reconnectNow();
      flush();
    }

    function stop() {
      stopped = true;
      clearTimeout(reconnectTimer);
      clearTimeout(flushTimer);
      clearTimeout(settleTimer);
      closeStream();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
    }

    return {
      start: start,
      stop: stop,
      send: send,
      isPending: isPending,
      status: function () { return status; },
    };
  }

  window.HMBus = { create: create };
})();
