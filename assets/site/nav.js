(function () {
  const NAV_ITEMS = [
    { key: "home", label: "返回索引", href: "/index.html" },
    { key: "apps", label: "Apps", href: "/apps/index.html" },
    { key: "docs", label: "Docs", href: "/docs/index.html" },
    { key: "kids", label: "Kids", href: "/kids/index.html" },
    { key: "wiki", label: "Wiki", href: "/wiki/index.html" },
  ];

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function initTopNav(options) {
    const containerEl = options && options.containerEl;
    const current = options && options.current;
    const extraItems = Array.isArray(options && options.extraItems) ? options.extraItems : [];
    if (!containerEl) return;

    const items = NAV_ITEMS.concat(extraItems);
    containerEl.innerHTML = items.map((item) => {
      const isActive = item.key === current;
      const cls = isActive ? "nav-link active" : "nav-link";
      const currentAttr = isActive ? ' aria-current="page"' : "";
      return '<a class="' + cls + '" href="' + escapeHtml(item.href) + '"' + currentAttr + ">" + escapeHtml(item.label) + "</a>";
    }).join("");
  }

  window.initTopNav = initTopNav;
})();
