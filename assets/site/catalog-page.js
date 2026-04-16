(function () {
  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function parseIndex(indexMd) {
    const groups = [];
    const lines = indexMd.split(/\r?\n/);
    let currentGroup = null;

    for (const line of lines) {
      const groupMatch = line.match(/^##\s+(.+)$/);
      if (groupMatch) {
        currentGroup = { name: groupMatch[1].trim(), items: [] };
        groups.push(currentGroup);
        continue;
      }

      const itemMatch = line.match(/^-\s+\[\[([^\]|]+)(?:\|([^\]]+))?\]\]\s*(.*)$/);
      if (!itemMatch || !currentGroup) continue;

      const rawPath = itemMatch[1].trim();
      const alias = itemMatch[2] ? itemMatch[2].trim() : "";
      const trailing = (itemMatch[3] || "").trim().replace(/^[-:：]\s*/, "");
      const file = rawPath;
      const title = alias || trailing || rawPath;
      currentGroup.items.push({ file, title });
    }

    return groups.filter((group) => group.items.length > 0);
  }

  function renderGroups(listEl, groups, options) {
    if (groups.length === 0) {
      listEl.innerHTML = '<p class="hint">' + escapeHtml(options.emptyText || "index.md 中没有可展示条目。") + "</p>";
      return;
    }

    listEl.innerHTML = "";
    groups.forEach((group) => {
      const groupTitle = document.createElement("button");
      groupTitle.type = "button";
      groupTitle.className = "group-toggle";
      groupTitle.setAttribute("aria-expanded", "true");
      groupTitle.innerHTML =
        "<span>" + escapeHtml(group.name) + "</span>" +
        '<span class="group-caret">▾</span>';
      listEl.appendChild(groupTitle);

      const ul = document.createElement("ul");
      ul.className = "doc-list";

      group.items.forEach((item) => {
        const li = document.createElement("li");
        li.innerHTML =
          '<a class="catalog-item" href="./' + encodeURIComponent(item.file) + '">' +
            '<div><p class="catalog-item-title">' + escapeHtml(item.title) + "</p>" +
            '<div class="catalog-item-file">' + escapeHtml(item.file) + "</div></div>" +
          "</a>";
        ul.appendChild(li);
      });

      listEl.appendChild(ul);
      groupTitle.addEventListener("click", () => {
        const collapsed = ul.classList.toggle("is-collapsed");
        groupTitle.setAttribute("aria-expanded", collapsed ? "false" : "true");
      });
    });
  }

  async function initCatalogPage(options) {
    const listEl = options && options.listEl;
    const indexUrl = (options && options.indexUrl) || "./index.md";

    if (!listEl) return;

    try {
      const resp = await fetch(indexUrl, { cache: "no-store" });
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const indexMd = await resp.text();
      const groups = parseIndex(indexMd);
      renderGroups(listEl, groups, options || {});
    } catch (err) {
      listEl.innerHTML =
        '<p class="hint">加载索引失败：' + escapeHtml(String(err)) + "</p>" +
        '<p class="hint"><a href="./index.md" target="_blank">' +
        escapeHtml((options && options.errorLinkText) || "直接打开 index.md") +
        "</a></p>";
    }
  }

  window.initCatalogPage = initCatalogPage;
})();
