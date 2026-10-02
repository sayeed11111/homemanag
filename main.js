/* =====================================================
   HOME MANAGER — main.js
   General site/UI behaviour: navigation, mobile menu,
   scroll-reveal animation. Nothing auth-related lives here
   — see js/auth.js for that.
===================================================== */

(function () {
  "use strict";

  /* ---------- Mobile navigation toggle ---------- */
  function initMobileNav() {
    const toggle = document.querySelector("[data-nav-toggle]");
    const panel = document.querySelector("[data-mobile-panel]");
    if (!toggle || !panel) return;

    toggle.addEventListener("click", function () {
      const isOpen = panel.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.classList.toggle("is-active", isOpen);
    });

    // Close the mobile panel when a link inside it is clicked
    panel.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        panel.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Scroll-reveal for sections below the fold ---------- */
  function initScrollReveal() {
    const targets = document.querySelectorAll(".will-reveal");
    if (!targets.length) return;

    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("in-view"); });
      return;
    }

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    targets.forEach(function (el) { observer.observe(el); });
  }

  /* ---------- Header shadow-on-scroll (subtle depth cue) ---------- */
  function initHeaderState() {
    const header = document.querySelector(".site-header");
    if (!header) return;

    function update() {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initMobileNav();
    initScrollReveal();
    initHeaderState();
  });
})();
