(function () {
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function ensureMsgpackDecoder() {
    if (!window.MessagePack || typeof window.MessagePack.decode !== 'function') {
      throw new Error('msgpack 解码器不可用');
    }
  }

  async function fetchAsset(logicalPath, options) {
    const opts = options && typeof options === 'object' ? options : {};
    const timeoutMs = Number(opts.timeoutMs) || 0;
    const controller = timeoutMs > 0 ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    const response = await fetch(
      `/data/${logicalPath}`,
      controller ? { signal: controller.signal } : undefined
    ).finally(() => {
      if (timer) clearTimeout(timer);
    });

    if (!response.ok) {
      throw new Error(`${logicalPath} 加载失败`);
    }

    if (logicalPath.endsWith('.msgpack')) {
      ensureMsgpackDecoder();
      const raw = await response.arrayBuffer();
      return window.MessagePack.decode(new Uint8Array(raw));
    }

    return response.json();
  }

  async function fetchWithRetry(logicalPath, options) {
    const opts = options && typeof options === 'object' ? options : {};
    const retries = Number.isFinite(Number(opts.retries)) ? Math.max(0, Number(opts.retries)) : 2;
    const timeoutMs = Number(opts.timeoutMs) || 0;
    const backoffMs = Number(opts.backoffMs) || 500;
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await fetchAsset(logicalPath, { timeoutMs });
      } catch (err) {
        lastError = err;
        if (attempt >= retries) break;
        await sleep(backoffMs * (attempt + 1));
      }
    }

    throw lastError || new Error(`${logicalPath} 加载失败`);
  }

  async function loadShardedMap(config) {
    const cfg = config && typeof config === 'object' ? config : {};
    const dir = String(cfg.dir || '').replace(/^\/+|\/+$/g, '');
    const baseName = String(cfg.baseName || '').trim();
    const shardCount = Math.max(1, Number(cfg.shardCount) || 1);
    const concurrency = Math.max(1, Number(cfg.concurrency) || 1);
    const timeoutMs = Number(cfg.timeoutMs) || 0;
    const retries = Number.isFinite(Number(cfg.retries)) ? Math.max(0, Number(cfg.retries)) : 2;
    const restore = typeof cfg.restore === 'function' ? cfg.restore : (payload) => payload;
    const onProgress = typeof cfg.onProgress === 'function' ? cfg.onProgress : null;
    const backoffMs = Number(cfg.backoffMs) || 500;

    if (!dir) throw new Error('loadShardedMap 缺少 dir');
    if (!baseName) throw new Error('loadShardedMap 缺少 baseName');

    const shardPayloads = new Array(shardCount);
    let nextShardId = 0;
    let loadedCount = 0;
    const workerCount = Math.min(concurrency, shardCount);

    const shardPath = (shardId) =>
      `${dir}/${baseName}.shard-${String(shardId).padStart(2, '0')}.msgpack`;

    const worker = async () => {
      while (nextShardId < shardCount) {
        const shardId = nextShardId;
        nextShardId += 1;
        const logicalPath = shardPath(shardId);
        const payload = await fetchWithRetry(logicalPath, { timeoutMs, retries, backoffMs });
        shardPayloads[shardId] = payload;
        loadedCount += 1;
        if (onProgress) {
          onProgress({
            loadedCount,
            shardCount,
            shardId,
            logicalPath
          });
        }
      }
    };

    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    const merged = {};
    for (const payload of shardPayloads) {
      Object.assign(merged, restore(payload));
    }
    return merged;
  }

  async function loadMany(tasks, options) {
    const list = Array.isArray(tasks) ? tasks : [];
    const mode = options && options.mode === 'allSettled' ? 'allSettled' : 'all';
    const wrapped = list.map((task) => {
      if (typeof task === 'function') return task();
      if (task && typeof task.run === 'function') return task.run();
      throw new Error('loadMany 任务必须是函数或含 run() 的对象');
    });
    return mode === 'allSettled' ? Promise.allSettled(wrapped) : Promise.all(wrapped);
  }

  window.HanziDataLoader = {
    fetchAsset,
    fetchWithRetry,
    loadShardedMap,
    loadMany
  };
})();
