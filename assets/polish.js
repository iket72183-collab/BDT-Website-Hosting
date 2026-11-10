/*
 * BDT Talent Group — navigation polish (progressive enhancement).
 *
 *  - Mirrors the mobile menu's open state onto <html> (page dim + scroll
 *    lock), swaps the toggle label, and closes the menu on an outside tap.
 *  - On desktop, tucks the social links behind a "Follow" button.
 * site.js still owns opening/closing the menu; if this file fails to load the
 * site behaves exactly as before.
 */
(() => {
  "use strict";

  try {
    const root = document.documentElement;
    const toggle = document.querySelector(".menu-toggle");
    const menu = document.getElementById("primary-menu");
    const desktop = window.matchMedia("(min-width: 981px)");

    const onChange = (query, handler) => {
      if (typeof query.addEventListener === "function") query.addEventListener("change", handler);
      else query.addListener(handler);
    };

    if (toggle && menu) {
      const label = Array.from(toggle.childNodes)
        .reverse()
        .find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());

      const closeMenu = () => {
        menu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      };

      const sync = () => {
        const isOpen = menu.classList.contains("is-open");
        root.classList.toggle("menu-open", isOpen);
        if (label) label.textContent = isOpen ? "Close" : "Menu";
      };

      new MutationObserver(sync).observe(menu, { attributes: true, attributeFilter: ["class"] });

      document.addEventListener("pointerdown", (event) => {
        if (!menu.classList.contains("is-open")) return;
        const target = event.target;
        if (target instanceof Node && (menu.contains(target) || toggle.contains(target))) return;
        closeMenu();
      });

      onChange(desktop, (event) => {
        if (event.matches) closeMenu();
      });
    }

    const socials = menu ? menu.querySelector(".menu-socials") : null;

    if (socials) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "social-toggle";
      button.textContent = "Follow";
      if (!socials.id) socials.id = "social-links";
      button.setAttribute("aria-controls", socials.id);
      button.setAttribute("aria-expanded", "false");
      socials.before(button);
      root.classList.add("has-social-toggle");

      const isOpen = () => socials.classList.contains("is-open");
      const setOpen = (open) => {
        socials.classList.toggle("is-open", open);
        button.setAttribute("aria-expanded", String(open));
      };

      button.addEventListener("click", () => setOpen(!isOpen()));

      document.addEventListener("pointerdown", (event) => {
        if (!isOpen()) return;
        const target = event.target;
        if (target instanceof Node && (socials.contains(target) || button.contains(target))) return;
        setOpen(false);
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && isOpen()) {
          setOpen(false);
          button.focus();
        }
      });

      socials.addEventListener("click", (event) => {
        if (event.target instanceof Element && event.target.closest("a")) setOpen(false);
      });

      onChange(desktop, () => setOpen(false));
    }
  } catch {
    document.documentElement.classList.remove("menu-open", "has-social-toggle");
  }
})();
