// All API calls go through the Express backend
const BASE = '';

function getAuth() {
  return localStorage.getItem('postiz_auth') || '';
}

async function request(url, options = {}) {
  const res = await fetch(BASE + url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      auth: getAuth(),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error || res.statusText), { status: res.status });
  }
  return res.json();
}

// ── Admin API ──────────────────────────────────────────────

export const health = {
  get: () => request('/api/health'),
};

export const credentials = {
  list:      ()           => request('/api/credentials'),
  providers: ()           => request('/api/credentials/providers'),
  save:      (body)       => request('/api/credentials', { method: 'POST', body: JSON.stringify(body) }),
  remove:    (id)         => request(`/api/credentials/${id}`, { method: 'DELETE' }),
  activate:  (id)         => request(`/api/credentials/${id}/activate`, { method: 'POST' }),
  apply:     ()           => request('/api/credentials/apply', { method: 'POST' }),
};

export const docker = {
  restartPostiz: () => request('/api/docker/restart-postiz', { method: 'POST' }),
  postizLogs:    () => fetch('/api/docker/postiz-logs', { headers: { auth: getAuth() } }).then(r => r.text()),
};

export const aiContent = {
  generate: (body) => request('/api/ai/generate', { method: 'POST', body: JSON.stringify(body) }),
};

// ── Postiz API (proxied) ───────────────────────────────────

async function postiz(path, options = {}) {
  const res = await fetch(`/postiz/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      auth: getAuth(),
      ...(options.headers || {}),
    },
    credentials: 'include',
  });
  if (res.status === 401) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || res.statusText);
  }
  return res.json();
}

export const postizAuth = {
  login: async (email, password) => {
    const res = await fetch('/postiz/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, provider: 'LOCAL' }),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(await res.text());
    // NOT_SECURED exposes JWT in x-postiz-auth (relayed by our proxy) and auth header
    const token = res.headers.get('x-postiz-auth') || res.headers.get('auth');
    return { token };
  },
  canRegister: () => postiz('/auth/can-register'),
};

export const postizPosts = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return postiz(`/public/v1/posts${qs ? '?' + qs : ''}`);
  },
};

export const postizIntegrations = {
  list: () => postiz('/integrations/list'),
  disconnect: (id) => postiz(`/integrations/${id}`, { method: 'DELETE' }),
  oauthLink: (provider) => postiz(`/auth/oauth/${provider}`),
};

export const postizUsers = {
  me: () => postiz('/user/self'),
  team: () => postiz('/settings/team'),
};
