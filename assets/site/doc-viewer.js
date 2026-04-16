(function () {
  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function toFilePath(rawPath) {
    if (!rawPath) return "";
    return rawPath.endsWith(".md") ? rawPath : rawPath + ".md";
  }

  function prettifyTitle(rawPath, fallback, titleCaseFallback) {
    if (fallback) return fallback;
    const tail = rawPath.split("/").pop() || rawPath;
    const plain = tail.replace(/[-_]/g, " ");
    if (!titleCaseFallback) return plain;
    return plain.replace(/\b\w/g, (m) => m.toUpperCase());
  }

  function parseIndex(indexMd, docMap, options) {
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
      const file = (options.alwaysAppendMarkdownExt === false) ? rawPath : toFilePath(rawPath);
      const title = prettifyTitle(rawPath, alias || trailing, !!options.titleCaseFallback);
      const item = { file, title, group: currentGroup.name };

      currentGroup.items.push(item);
      docMap.set(file, item);
    }

    return groups.filter((group) => group.items.length > 0);
  }

  function convertWikiLinks(md) {
    return md.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, path, alias) => {
      const file = toFilePath(path.trim());
      const label = (alias || path).trim();
      return "[" + label + "](?file=" + encodeURIComponent(file) + ")";
    });
  }

  function stripYamlScalar(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return "";
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  }

  function parseInlineYamlList(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return null;
    const content = trimmed.slice(1, -1).trim();
    if (!content) return [];
    return content
      .split(",")
      .map((item) => stripYamlScalar(item))
      .filter((item) => item.length > 0);
  }

  function parseFrontmatterMeta(rawMeta) {
    const lines = String(rawMeta || "").split(/\r?\n/);
    const meta = {};
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || !line.trim()) continue;
      const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (!match) continue;

      const key = match[1];
      const rest = match[2] || "";
      const inlineList = parseInlineYamlList(rest);
      if (inlineList) {
        meta[key] = inlineList;
        continue;
      }

      if (!rest.trim()) {
        const list = [];
        let j = i + 1;
        while (j < lines.length) {
          const itemMatch = lines[j].match(/^\s*-\s+(.*)\s*$/);
          if (!itemMatch) break;
          list.push(stripYamlScalar(itemMatch[1]));
          j++;
        }
        if (list.length > 0) {
          meta[key] = list;
          i = j - 1;
          continue;
        }
        meta[key] = "";
        continue;
      }

      meta[key] = stripYamlScalar(rest);
    }
    return meta;
  }

  function extractFrontmatter(md) {
    const source = String(md || "");
    const lines = source.split(/\r?\n/);
    if (lines.length < 3 || lines[0].trim() !== "---") {
      return { meta: null, body: source, raw: "" };
    }

    let endIndex = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") {
        endIndex = i;
        break;
      }
    }
    if (endIndex < 0) {
      return { meta: null, body: source, raw: "" };
    }

    const rawMeta = lines.slice(1, endIndex).join("\n");
    const body = lines.slice(endIndex + 1).join("\n");
    return {
      meta: parseFrontmatterMeta(rawMeta),
      body,
      raw: "---\n" + rawMeta + "\n---",
    };
  }

  function isWikiRefPath(value) {
    return /^(sources|entities|concepts|queries)\//.test(String(value || "").trim());
  }

  function renderFrontmatterCardValue(key, value, options) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return '<span class="frontmatter-empty">[]</span>';
      }
      const tags = value.map((item) => {
        const text = String(item || "").trim();
        if (key === "source_refs" && options.frontmatterLinkRefs && isWikiRefPath(text)) {
          const href = "?file=" + encodeURIComponent(toFilePath(text));
          return '<a class="frontmatter-tag is-link" href="' + href + '">' + escapeHtml(text) + "</a>";
        }
        return '<span class="frontmatter-tag">' + escapeHtml(text) + "</span>";
      });
      return '<div class="frontmatter-tags">' + tags.join("") + "</div>";
    }

    const text = String(value || "").trim();
    if (key === "source_refs" && options.frontmatterLinkRefs && isWikiRefPath(text)) {
      const href = "?file=" + encodeURIComponent(toFilePath(text));
      return '<a class="frontmatter-tag is-link" href="' + href + '">' + escapeHtml(text) + "</a>";
    }
    if (!text) {
      return '<span class="frontmatter-empty">-</span>';
    }
    return '<span class="frontmatter-value">' + escapeHtml(text) + "</span>";
  }

  function renderFrontmatterCard(meta, options) {
    if (!meta || typeof meta !== "object") return "";
    const keys = Object.keys(meta);
    if (keys.length === 0) return "";

    const preferred = ["id", "type", "updated_at", "source_refs"];
    const ordered = preferred.filter((key) => keys.includes(key)).concat(keys.filter((key) => !preferred.includes(key)));
    const rows = ordered.map((key) => {
      const valueHtml = renderFrontmatterCardValue(key, meta[key], options);
      return '<div class="frontmatter-row"><dt>' + escapeHtml(key) + "</dt><dd>" + valueHtml + "</dd></div>";
    });

    return (
      '<section class="frontmatter-card" aria-label="Metadata">' +
      '<h2 class="frontmatter-title">Metadata</h2>' +
      '<dl class="frontmatter-grid">' +
      rows.join("") +
      "</dl>" +
      "</section>"
    );
  }

  function renderFrontmatterRaw(raw) {
    if (!raw) return "";
    return (
      '<section class="frontmatter-card is-raw" aria-label="Frontmatter">' +
      '<h2 class="frontmatter-title">Frontmatter</h2>' +
      '<pre class="frontmatter-raw"><code>' +
      escapeHtml(raw) +
      "</code></pre>" +
      "</section>"
    );
  }

  function createRenderer(viewerEl, options) {
    function wrapWideNodes(selector, wrapperClass) {
      viewerEl.querySelectorAll(selector).forEach((node) => {
        if (!node || !node.parentElement) return;
        if (node.closest("." + wrapperClass)) return;
        const wrapper = document.createElement("div");
        wrapper.className = wrapperClass;
        node.parentElement.insertBefore(wrapper, node);
        wrapper.appendChild(node);
      });
    }

    function enhanceWideContent() {
      wrapWideNodes(".markdown table", "table-scroll");
      wrapWideNodes(".markdown .mermaid", "diagram-scroll");
      wrapWideNodes(".markdown svg, .markdown canvas", "diagram-scroll");
    }

    return function renderMarkdown(md) {
      const frontmatterMode = (options.frontmatterMode || "none").toLowerCase();
      const frontmatter = frontmatterMode === "none" ? { meta: null, body: md, raw: "" } : extractFrontmatter(md);
      const renderSource = frontmatter.body;

      const codeTokens = [];
      const stashCode = (text) => {
        let out = text;
        out = out.replace(
          /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\1[ \t]*$/gm,
          (m) => {
            const token = "@@CODE_" + codeTokens.length + "@@";
            codeTokens.push(m);
            return token;
          }
        );
        out = out.replace(/`[^`\n]+`/g, (m) => {
          const token = "@@CODE_" + codeTokens.length + "@@";
          codeTokens.push(m);
          return token;
        });
        return out;
      };
      const restoreCode = (text) => {
        let out = text;
        for (let i = 0; i < codeTokens.length; i++) {
          out = out.split("@@CODE_" + i + "@@").join(codeTokens[i]);
        }
        return out;
      };

      const mathTokens = [];
      const stashMath = (text) => {
        let out = text;
        out = out.replace(/\$\$[\s\S]*?\$\$/g, (m) => {
          const token = "@@MATH_" + mathTokens.length + "@@";
          mathTokens.push(m);
          return token;
        });
        out = out.replace(/\$(?!\$)(?:\\.|[^$\\\n])+\$/g, (m) => {
          const token = "@@MATH_" + mathTokens.length + "@@";
          mathTokens.push(m);
          return token;
        });
        return out;
      };
      const restoreMath = (html) => {
        let out = html;
        for (let i = 0; i < mathTokens.length; i++) {
          const token = "@@MATH_" + i + "@@";
          const safeMath = mathTokens[i]
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          out = out.split(token).join(safeMath);
        }
        return out;
      };

      const bothStashed = stashMath(stashCode(renderSource));
      const converted = options.convertWikiLinks ? convertWikiLinks(bothStashed) : bothStashed;
      const input = restoreCode(converted);
      const frontmatterHtml =
        frontmatterMode === "card"
          ? renderFrontmatterCard(frontmatter.meta, options)
          : frontmatterMode === "raw"
            ? renderFrontmatterRaw(frontmatter.raw)
            : "";
      if (window.marked && typeof window.marked.parse === "function") {
        const parsed = window.marked.parse(input);
        viewerEl.innerHTML = frontmatterHtml + '<div class="markdown">' + restoreMath(parsed) + "</div>";
      } else {
        viewerEl.innerHTML = frontmatterHtml + "<pre>" + escapeHtml(input) + "</pre>";
      }

      if (window.renderMathInElement) {
        window.renderMathInElement(viewerEl, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
            { left: "\\(", right: "\\)", display: false },
            { left: "\\[", right: "\\]", display: true },
          ],
          throwOnError: false,
        });
      }
      enhanceWideContent();
    };
  }

  function shouldScrollViewerToStart(viewerEl) {
    const rect = viewerEl.getBoundingClientRect();
    const lowerBound = Math.max(120, window.innerHeight * 0.2);
    return rect.top > lowerBound || rect.top < -40;
  }

  function ensureViewerStartVisible(viewerEl) {
    if (!shouldScrollViewerToStart(viewerEl)) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    viewerEl.scrollIntoView({
      block: "start",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  function renderSidebar(sidebarEl, groups, onDocClick, headerTitle) {
    sidebarEl.innerHTML = "";
    const fragment = document.createDocumentFragment();

    const headerEl = document.createElement("div");
    headerEl.className = "list-header";
    headerEl.innerHTML =
      '<h2 class="list-header-title">' + escapeHtml(headerTitle) + '</h2>' +
      '<button id="collapseAllBtn" class="collapse-all-btn" type="button">全部折叠</button>';
    fragment.appendChild(headerEl);

    groups.forEach((group) => {
      const heading = document.createElement("button");
      heading.type = "button";
      heading.className = "group-toggle";
      heading.setAttribute("aria-expanded", "true");
      heading.innerHTML =
        "<span>" + escapeHtml(group.name) + "</span>" +
        '<span class="group-caret">▾</span>';
      fragment.appendChild(heading);

      const list = document.createElement("ul");
      list.className = "doc-list";

      group.items.forEach((doc) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "doc-btn";
        btn.dataset.file = doc.file;
        btn.innerHTML =
          '<p class="doc-title">' + escapeHtml(doc.title) + '</p>' +
          '<p class="doc-file">' + escapeHtml(doc.file) + "</p>";
        btn.addEventListener("click", () => onDocClick(doc.file));
        li.appendChild(btn);
        list.appendChild(li);
      });

      fragment.appendChild(list);
      heading.addEventListener("click", () => {
        const collapsed = list.classList.toggle("is-collapsed");
        heading.setAttribute("aria-expanded", collapsed ? "false" : "true");
        refreshCollapseAllButton(sidebarEl);
      });
    });

    sidebarEl.appendChild(fragment);
    const collapseAllBtnEl = sidebarEl.querySelector("#collapseAllBtn");
    if (collapseAllBtnEl) {
      collapseAllBtnEl.addEventListener("click", () => {
        const lists = sidebarEl.querySelectorAll(".doc-list");
        const allCollapsed = lists.length > 0 && Array.from(lists).every((ul) => ul.classList.contains("is-collapsed"));
        setAllGroupsCollapsed(sidebarEl, !allCollapsed);
      });
    }
    refreshCollapseAllButton(sidebarEl);
  }

  function setAllGroupsCollapsed(sidebarEl, collapsed) {
    const lists = sidebarEl.querySelectorAll(".doc-list");
    lists.forEach((ul) => {
      ul.classList.toggle("is-collapsed", collapsed);
      const toggle = ul.previousElementSibling;
      if (toggle && toggle.classList.contains("group-toggle")) {
        toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
      }
    });
    refreshCollapseAllButton(sidebarEl);
  }

  function refreshCollapseAllButton(sidebarEl) {
    const collapseAllBtnEl = sidebarEl.querySelector("#collapseAllBtn");
    if (!collapseAllBtnEl) return;
    const lists = sidebarEl.querySelectorAll(".doc-list");
    if (lists.length === 0) {
      collapseAllBtnEl.disabled = true;
      collapseAllBtnEl.textContent = "全部折叠";
      return;
    }
    collapseAllBtnEl.disabled = false;
    const allCollapsed = Array.from(lists).every((ul) => ul.classList.contains("is-collapsed"));
    collapseAllBtnEl.textContent = allCollapsed ? "全部展开" : "全部折叠";
  }

  async function initDocViewer(options) {
    const sidebarEl = options && options.sidebarEl;
    const viewerEl = options && options.viewerEl;
    const backTopBtnEl = options && options.backTopBtnEl;
    const indexUrl = (options && options.indexUrl) || "./index.md";

    if (!sidebarEl || !viewerEl) return;

    const docMap = new Map();
    const renderMarkdown = createRenderer(viewerEl, options || {});

    function setViewerVisible(visible) {
      if (options.hideViewerByDefault) {
        viewerEl.classList.toggle("is-hidden", !visible);
      }
    }

    function syncFileToUrl(file, mode) {
      if (!options.enableHistorySync || mode === "skip") return;
      const url = new URL(window.location.href);
      const currentFile = url.searchParams.get("file");
      if (mode === "push" && currentFile === file) return;
      url.searchParams.set("file", file);
      const nextUrl = url.pathname + "?" + url.searchParams.toString() + url.hash;
      if (mode === "push") {
        history.pushState({ file: file }, "", nextUrl);
      } else {
        history.replaceState({ file: file }, "", nextUrl);
      }
    }

    function markActive(file, opts) {
      const settings = opts || {};
      const buttons = sidebarEl.querySelectorAll(".doc-btn");
      buttons.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.file === file);
        if (btn.dataset.file === file) {
          const groupList = btn.closest(".doc-list");
          if (groupList && groupList.classList.contains("is-collapsed")) {
            groupList.classList.remove("is-collapsed");
            const toggle = groupList.previousElementSibling;
            if (toggle && toggle.classList.contains("group-toggle")) {
              toggle.setAttribute("aria-expanded", "true");
            }
          }
        }
      });
      refreshCollapseAllButton(sidebarEl);
      syncFileToUrl(file, settings.historyMode || "replace");
    }

    function updateBackTopVisible() {
      if (!backTopBtnEl) return;
      backTopBtnEl.classList.toggle("is-visible", window.scrollY > 260);
    }

    function scrollToTop() {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({
        top: 0,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }

    let activeLoadSeq = 0;

    async function loadDocument(file, opts) {
      const settings = opts || {};
      const loadSeq = ++activeLoadSeq;
      setViewerVisible(true);
      viewerEl.classList.add("loading");

      try {
        const resp = await fetch("./" + file, { cache: "no-store" });
        if (!resp.ok) {
          throw new Error("HTTP " + resp.status + (options.errorIncludeFile ? " " + file : ""));
        }
        const md = await resp.text();
        if (loadSeq !== activeLoadSeq) return;

        renderMarkdown(md);
        if (settings.markActive !== false) {
          markActive(file);
        }
        if (settings.ensureViewerStart) {
          ensureViewerStartVisible(viewerEl);
        }
      } catch (err) {
        if (loadSeq !== activeLoadSeq) return;
        const msg = escapeHtml(String((err && err.message) || err));
        viewerEl.innerHTML = '<p class="hint">加载失败：' + msg + "</p>";
        if (options.showRawLinkOnLoadError) {
          viewerEl.innerHTML += '<p><a href="./' + encodeURIComponent(file) + '" target="_blank">直接打开原始 Markdown</a></p>';
        }
      } finally {
        if (loadSeq !== activeLoadSeq) return;
        viewerEl.classList.remove("loading");
      }
    }

    function getInitialFile(groups) {
      const params = new URLSearchParams(window.location.search);
      const queryFile = params.get("file");
      if (queryFile && docMap.has(queryFile)) return queryFile;

      if (typeof options.initialFileFallback === "string" && docMap.has(options.initialFileFallback)) {
        return options.initialFileFallback;
      }

      if (groups.length > 0 && groups[0].items.length > 0) {
        return groups[0].items[0].file;
      }
      return null;
    }

    if (options.enableInDocFileLink) {
      viewerEl.addEventListener("click", (event) => {
        const link = event.target.closest("a");
        if (!link) return;

        const href = link.getAttribute("href") || "";
        if (!href.startsWith("?file=")) return;

        event.preventDefault();
        const file = decodeURIComponent(href.slice(6));
        if (!docMap.has(file)) {
          viewerEl.innerHTML = '<p class="hint">索引中未收录：' + escapeHtml(file) + "</p>";
          return;
        }
        markActive(file, { historyMode: "push" });
        loadDocument(file, { markActive: false, ensureViewerStart: true });
      });
    }

    if (backTopBtnEl) {
      window.addEventListener("scroll", updateBackTopVisible, { passive: true });
      backTopBtnEl.addEventListener("click", scrollToTop);
    }

    try {
      const resp = await fetch(indexUrl, { cache: "no-store" });
      if (!resp.ok) {
        throw new Error(options.indexLoadErrorText || ("HTTP " + resp.status));
      }

      const indexMd = await resp.text();
      const groups = parseIndex(indexMd, docMap, options || {});
      renderSidebar(sidebarEl, groups, (file) => {
        markActive(file, { historyMode: "push" });
        loadDocument(file, { markActive: false, ensureViewerStart: true });
      }, options.sidebarTitle || "文档索引");

      if (groups.length === 0) {
        setViewerVisible(!options.hideViewerByDefault);
        viewerEl.innerHTML = '<p class="hint">' + escapeHtml(options.emptyText || "index.md 中没有可展示条目。") + "</p>";
        return;
      }

      const initial = getInitialFile(groups);
      if (!initial) {
        setViewerVisible(!options.hideViewerByDefault);
        viewerEl.innerHTML = '<p class="hint">' + escapeHtml(options.emptyText || "index.md 中没有可展示条目。") + "</p>";
        return;
      }

      if (options.enableHistorySync) {
        window.addEventListener("popstate", () => {
          const params = new URLSearchParams(window.location.search);
          const queryFile = params.get("file");
          const targetFile = (queryFile && docMap.has(queryFile)) ? queryFile : initial;
          if (!targetFile) return;
          markActive(targetFile, { historyMode: "skip" });
          loadDocument(targetFile, { markActive: false, ensureViewerStart: true });
        });
      }

      markActive(initial);
      await loadDocument(initial, { markActive: false, ensureViewerStart: false });
    } catch (err) {
      setViewerVisible(true);
      const msg = escapeHtml(String((err && err.message) || err));
      viewerEl.innerHTML = '<p class="hint">加载索引失败：' + msg + "</p>";
      if (options.showRawLinkOnIndexError) {
        viewerEl.innerHTML += '<p><a href="./index.md" target="_blank">直接打开 index.md</a></p>';
      }
    } finally {
      updateBackTopVisible();
    }
  }

  window.initDocViewer = initDocViewer;
})();
