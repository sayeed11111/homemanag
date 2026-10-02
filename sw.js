/* =====================================================
   HOME MANAGER — sw.js
   A minimal service worker. It is here for two things:
   - notifications on Android: Chrome there refuses
     `new Notification()` and shows notifications only
     through a service worker (registration.showNotification,
     see HMUI.notify in js/ui.js);
   - installing: together with manifest.webmanifest the
     app can be added to the home screen and opens like
     a normal app (starting at app.html).

   NO fetch handler and NO cache — on purpose. The app is
   hosted on GitHub Pages, and every update must reach the
   phones right away. A cache-first worker would keep
   serving the old files from the phone until it updated
   itself. Without a fetch handler every request simply
   goes to the network, exactly as if there were no worker.
   (Chrome still lets you install from the browser menu
   without one; only its automatic install banner wants a
   fetch handler, and the app tells people to use the menu.)
===================================================== */

"use strict";

// A new version of this file takes over at once, not after every tab is closed.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/* ---------- tapping a notification ---------- */

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data;
  const target = new URL((data && data.url) || "app.html", self.registration.scope).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      // A github.io address is shared by all of the owner's sites —
      // only count windows of this app.
      const ours = windows.filter((w) => w.url.indexOf(self.registration.scope) === 0);
      const open = ours.find((w) => w.url === target) || ours[0];
      if (open && "focus" in open) return open.focus();
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return undefined;
    })
  );
});
