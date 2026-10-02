/* =====================================================
   HOME MANAGER — presets.js
   Ready-made buttons. Their text lives in i18n.js under
   "preset.p.<key>" (parent → child) and "preset.c.<key>"
   (child → parents), so each phone shows them in its own
   language.
===================================================== */

(function () {
  "use strict";

  window.HMPresets = {
    // Parent → child instructions.
    parent: [
      { key: "eat", icon: "🍽️", color: "gold" },
      { key: "homework", icon: "📚", color: "sky" },
      { key: "sleep", icon: "🌙", color: "plum" },
      { key: "home", icon: "🏠", color: "pine" },
      { key: "call", icon: "📞", color: "ember" },
      { key: "room", icon: "🧹", color: "slate" },
      { key: "phone", icon: "📵", color: "plum" },
      { key: "teeth", icon: "🦷", color: "sky" },
      { key: "come", icon: "👋", color: "ember" },
      { key: "ready", icon: "🚗", color: "pine" },
    ],

    // Child → parents quick messages. "help" goes out as urgent.
    child: [
      { key: "pickup", icon: "🚗", color: "ember" },
      { key: "athome", icon: "🏠", color: "pine" },
      { key: "callme", icon: "📞", color: "sky" },
      { key: "allgood", icon: "👍", color: "pine" },
      { key: "hungry", icon: "🍎", color: "gold" },
      { key: "help", icon: "🆘", color: "ember", urgent: true },
    ],

    // Icons a parent can pick for their own buttons.
    icons: [
      "🍽️", "📚", "🌙", "🏠", "📞", "🧹", "📵", "🦷",
      "👋", "🚗", "🧥", "🛁", "🐱", "🐶", "🗑️", "🛒",
      "💊", "⚽", "🎹", "📖", "⏰", "💧", "🍎", "🙏",
    ],

    // Reply buttons a child sees under every instruction.
    replies: ["ok", "done", "help"],
  };
})();
