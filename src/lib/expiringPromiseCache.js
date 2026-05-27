export function createExpiringPromiseCache({ ttlMs, keyFn = (key) => key }) {
  const entries = new Map();

  function resolveKey(key) {
    return keyFn(key);
  }

  function read(key) {
    const entry = entries.get(resolveKey(key));
    if (!entry) return null;

    return {
      ...entry,
      isFresh: Date.now() - entry.updatedAt < ttlMs,
    };
  }

  function write(key, data) {
    entries.set(resolveKey(key), {
      data,
      updatedAt: Date.now(),
      promise: null,
    });
  }

  function remove(key) {
    entries.delete(resolveKey(key));
  }

  function setPromise(key, promise) {
    const existing = read(key);

    entries.set(resolveKey(key), {
      data: existing?.data ?? null,
      updatedAt: existing?.updatedAt ?? 0,
      promise,
    });
  }

  function clearPromise(key) {
    const existing = read(key);
    if (!existing) return;

    entries.set(resolveKey(key), {
      data: existing.data ?? null,
      updatedAt: existing.updatedAt ?? 0,
      promise: null,
    });
  }

  async function get(key, loader, { fallback, forceRefresh = false } = {}) {
    const cached = read(key);

    if (!forceRefresh && cached?.data && cached.isFresh) {
      return cached.data;
    }

    if (cached?.promise) {
      return cached.promise;
    }

    const request = Promise.resolve()
      .then(loader)
      .then((data) => {
        write(key, data);
        return data;
      })
      .catch((error) => {
        if (cached?.data) {
          return cached.data;
        }

        if (fallback !== undefined) {
          return fallback;
        }

        throw error;
      })
      .finally(() => {
        clearPromise(key);
      });

    setPromise(key, request);
    return request;
  }

  return {
    clear: remove,
    get,
    read,
    write,
  };
}
