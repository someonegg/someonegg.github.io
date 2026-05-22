(function () {
  const NAV_ITEMS = [
    { key: "apps", label: "Apps", href: "/apps/index.html" },
    { key: "docs", label: "Docs", href: "/docs/index.html" },
    { key: "kids", label: "Kids", href: "/kids/index.html" },
    { key: "wiki", label: "Wiki", href: "/wiki/index.html" },
    { key: "github", label: "GitHub", href: "https://github.com/someonegg", external: true },
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
      const externalIcon = item.external
        ? '<svg class="nav-external-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>'
        : "";
      return '<a class="' + cls + '" href="' + escapeHtml(item.href) + '"' + currentAttr + ">" + escapeHtml(item.label) + externalIcon + "</a>";
    }).join("");
  }

  window.initTopNav = initTopNav;
})();
