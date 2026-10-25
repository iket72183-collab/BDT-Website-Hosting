/*
 * BDT Talent Group — cinematic motion controller.
 *
 * Dependency-free progressive enhancement (~3 KB minified):
 *  - Native scrolling is never intercepted (no wheel/touch handlers).
 *  - One passive scroll listener feeds one requestAnimationFrame per frame.
 *  - Parallax only runs on large, fine-pointer screens and only for elements
 *    currently near the viewport (IntersectionObserver-gated).
 *  - prefers-reduced-motion and any runtime error restore a static page.
 */
(() => {
  "use strict";

  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const richMotion = window.matchMedia("(min-width: 981px) and (hover: hover) and (pointer: fine)");
  const header = document.querySelector(".site-header");
  const hero = document.querySelector(".hero");
  const heroContent = hero ? hero.querySelector(".hero-launch") : null;
  const hasIO = "IntersectionObserver" in window;

  let ambient = null;
  let frame = 0;
  let parallaxOn = false;
  const visible = new Set();
  const layers = []; // { el, target, kind }
  let layerObserver = null;
  let sectionObserver = null;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  // ── Header state + parallax: a single rAF-batched update ───────────────────
  const update = () => {
    frame = 0;
    const y = window.scrollY;
    const vh = window.innerHeight;

    if (header) header.classList.toggle("is-scrolled", y > 12);
    if (!parallaxOn) return;

    // Read phase (layout reads only; writes below never invalidate layout).
    const reads = [];
    visible.forEach((layer) => reads.push([layer, layer.el.getBoundingClientRect()]));
    const docRange = Math.max(1, root.scrollHeight - vh);

    // Write phase.
    reads.forEach(([layer, rect]) => {
      if (layer.kind === "hero") {
        const progress = clamp(-rect.top / Math.max(1, rect.height), 0, 1);
        layer.target.style.translate = `0 ${(progress * 84).toFixed(2)}px`;
        layer.target.style.opacity = (1 - progress * 0.55).toFixed(3);
        return;
      }
      // -1 when the element is entering from below, +1 when leaving at the top.
      const centre = (rect.top + rect.height / 2 - vh / 2) / (vh / 2 + rect.height / 2);
      const c = clamp(centre, -1, 1);
      if (layer.kind === "media") {
        // Image drifts slower than its frame (sits "behind" the page).
        layer.target.style.translate = `0 ${(-c * rect.height * 0.045).toFixed(2)}px`;
      } else if (layer.kind === "float") {
        // Promo artwork drifts slightly faster (sits "in front" of its copy).
        layer.target.style.translate = `0 ${(c * 22).toFixed(2)}px`;
      }
    });

    if (ambient) {
      ambient.style.translate = `0 ${(-(y / docRange) * 14).toFixed(3)}vh`;
    }
  };

  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(update);
  };

  // ── Parallax lifecycle ──────────────────────────────────────────────────────
  const collectLayers = () => {
    if (layers.length) return;
    if (hero && heroContent) layers.push({ el: hero, target: heroContent, kind: "hero" });
    document.querySelectorAll(".media-frame").forEach((el) => {
      const img = el.querySelector("img");
      if (img) layers.push({ el, target: img, kind: "media" });
    });
    document.querySelectorAll(".flyer-link").forEach((el) => {
      layers.push({ el: el.parentElement || el, target: el, kind: "float" });
    });
  };

  const enableParallax = () => {
    if (parallaxOn || !hasIO) return;
    collectLayers();
    const byElement = new Map(layers.map((layer) => [layer.el, layer]));
    layerObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const layer = byElement.get(entry.target);
          if (!layer) return;
          if (entry.isIntersecting) visible.add(layer);
          else visible.delete(layer);
        });
        schedule();
      },
      { rootMargin: "15% 0px 15% 0px" }
    );
    layers.forEach((layer) => layerObserver.observe(layer.el));
    parallaxOn = true;
    root.classList.add("cine-parallax");
    schedule();
  };

  const disableParallax = () => {
    layerObserver?.disconnect();
    layerObserver = null;
    visible.clear();
    parallaxOn = false;
    root.classList.remove("cine-parallax");
    layers.forEach((layer) => {
      layer.target.style.translate = "";
      layer.target.style.opacity = "";
    });
    if (ambient) ambient.style.translate = "";
  };

  // ── Section dividers draw in as sections arrive ────────────────────────────
  const enableSectionDividers = () => {
    if (!hasIO || sectionObserver) return;
    const sections = Array.from(document.querySelectorAll("main .section"));
    const vh = window.innerHeight;
    sections.forEach((section) => {
      if (section.getBoundingClientRect().top < vh * 0.9) section.classList.add("is-inview");
    });
    sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-inview");
          sectionObserver?.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px" }
    );
    sections.filter((s) => !s.classList.contains("is-inview")).forEach((s) => sectionObserver.observe(s));
    root.classList.add("cine-ready");
  };

  // ── Cursor spotlight on cards (fine pointers only) ─────────────────────────
  const enableSpotlight = () => {
    const cards = document.querySelectorAll(
      ".section-card, .service-card, .product-card, .promo-grid, .wide-image, .contact-form"
    );
    cards.forEach((card) => {
      let pending = 0;
      let point = null;
      card.addEventListener("pointermove", (event) => {
        if (event.pointerType !== "mouse" || !richMotion.matches || reduceMotion.matches) return;
        point = event;
        if (pending) return;
        pending = window.requestAnimationFrame(() => {
          pending = 0;
          if (!point) return;
          const rect = card.getBoundingClientRect();
          card.style.setProperty("--mx", `${(((point.clientX - rect.left) / rect.width) * 100).toFixed(1)}%`);
          card.style.setProperty("--my", `${(((point.clientY - rect.top) / rect.height) * 100).toFixed(1)}%`);
        });
      }, { passive: true });
      card.addEventListener("pointerleave", () => {
        point = null;
        card.style.removeProperty("--mx");
        card.style.removeProperty("--my");
      });
    });
  };

  // ── Boot / teardown ─────────────────────────────────────────────────────────
  const teardown = () => {
    disableParallax();
    sectionObserver?.disconnect();
    sectionObserver = null;
    root.classList.remove("cine-ready");
    document.querySelectorAll("main .section").forEach((s) => s.classList.add("is-inview"));
    ambient?.remove();
    ambient = null;
  };

  const boot = () => {
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("pageshow", schedule);
    schedule();

    if (reduceMotion.matches) return;

    ambient = document.createElement("div");
    ambient.className = "cine-ambient";
    ambient.setAttribute("aria-hidden", "true");
    document.body.prepend(ambient);

    enableSectionDividers();
    if (richMotion.matches) enableParallax();
  };

  const onPreferenceChange = () => {
    try {
      if (reduceMotion.matches) {
        teardown();
      } else {
        if (!ambient) boot();
        richMotion.matches ? enableParallax() : disableParallax();
      }
      schedule();
    } catch {
      teardown();
    }
  };

  try {
    boot();
    enableSpotlight();
    [reduceMotion, richMotion].forEach((query) => {
      if (typeof query.addEventListener === "function") query.addEventListener("change", onPreferenceChange);
      else query.addListener(onPreferenceChange);
    });
  } catch {
    teardown();
  }
})();
