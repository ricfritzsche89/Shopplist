// PrivateFire JavaScript SDK
// Einfache Integration für Client-Anwendungen.

const WebSocket = typeof window !== 'undefined' ? window.WebSocket : require('ws');

class PrivateFireClient {
  /**
   * @param {Object} config
   * @param {string} config.host - Host-URL (z.B. 'http://192.168.1.100')
   * @param {string} [config.apiKey] - API-Key der App
   */
  constructor(config) {
    this.host = config.host.replace(/\/$/, '');
    this.apiKey = config.apiKey || null;
    this.accessToken = null;
    this.refreshToken = null;

    this.auth = new AuthModule(this);
    this.apps = new AppsModule(this);
    this.storage = new StorageModule(this);
    this.db = new DatabaseModule(this);
    this.realtime = new RealtimeModule(this);
  }

  /**
   * HTTP-Anfrage an die API
   */
  async request(path, options = {}) {
    const url = `${this.host}/api${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const response = await fetch(url, { ...options, headers });
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.error || 'API-Fehler');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }
}

// ── Auth ────────────────────────────────────────────

class AuthModule {
  constructor(client) { this.client = client; }

  async login(email, password) {
    const data = await this.client.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.client.accessToken = data.accessToken;
    this.client.refreshToken = data.refreshToken;
    return data;
  }

  async register(email, password, name, role = 'user') {
    return this.client.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, role }),
    });
  }

  async refresh() {
    if (!this.client.refreshToken) throw new Error('Kein Refresh-Token vorhanden.');
    const data = await this.client.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: this.client.refreshToken }),
    });
    this.client.accessToken = data.accessToken;
    this.client.refreshToken = data.refreshToken;
    return data;
  }

  async me() {
    return this.client.request('/auth/me');
  }

  async logout() {
    await this.client.request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: this.client.refreshToken }),
    });
    this.client.accessToken = null;
    this.client.refreshToken = null;
  }
}

// ── Apps ────────────────────────────────────────────

class AppsModule {
  constructor(client) { this.client = client; }

  async list() { return this.client.request('/apps'); }
  async get(id) { return this.client.request(`/apps/${id}`); }
  async create(data) {
    return this.client.request('/apps', { method: 'POST', body: JSON.stringify(data) });
  }
  async update(id, data) {
    return this.client.request(`/apps/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }
  async delete(id) {
    return this.client.request(`/apps/${id}`, { method: 'DELETE' });
  }
}

// ── Storage ─────────────────────────────────────────

class StorageModule {
  constructor(client) { this.client = client; }

  async list(appName, prefix = '') {
    return this.client.request(`/storage/${appName}/files?prefix=${encodeURIComponent(prefix)}`);
  }

  async upload(appName, filename, buffer, mimeType = 'application/octet-stream') {
    // Für Node.js
    const FormData = typeof window !== 'undefined' ? window.FormData : (await import('form-data')).default;
    const formData = new FormData();

    if (typeof window !== 'undefined') {
      // Browser
      const blob = new Blob([buffer], { type: mimeType });
      formData.append('file', blob, filename);
    } else {
      // Node.js
      formData.append('file', buffer, { filename, contentType: mimeType });
    }

    const headers = {};
    if (this.client.accessToken) headers['Authorization'] = `Bearer ${this.client.accessToken}`;
    if (this.client.apiKey) headers['X-API-Key'] = this.client.apiKey;

    const response = await fetch(`${this.client.host}/api/storage/${appName}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Upload fehlgeschlagen');
    return data;
  }

  async delete(appName, key) {
    return this.client.request(`/storage/${appName}/${key}`, { method: 'DELETE' });
  }

  async getUrl(appName, key, expiry = 3600) {
    return this.client.request(`/storage/${appName}/url/${key}?expiry=${expiry}`);
  }

  async stats(appName) {
    return this.client.request(`/storage/${appName}/stats`);
  }
}

// ── Database ────────────────────────────────────────

class DatabaseModule {
  constructor(client) { this.client = client; }

  // Abfrage (GET)
  async select(appName, collection, filter = {}) {
    let url = `/data/${appName}/${collection}`;
    const params = new URLSearchParams();
    if (filter.eq) filter.eq.forEach(val => params.append('eq', val));
    if (filter.ilike) filter.ilike.forEach(val => params.append('ilike', val));
    if (filter.neq) filter.neq.forEach(val => params.append('neq', val));
    if (filter.order) params.append('order', filter.order);
    if (filter.limit) params.append('limit', filter.limit);

    const qs = params.toString();
    if (qs) url += `?${qs}`;
    return this.client.request(url);
  }

  // Einfügen (POST)
  async insert(appName, collection, data) {
    return this.client.request(`/data/${appName}/${collection}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Update per ID (PUT)
  async updateById(appName, collection, id, data) {
    return this.client.request(`/data/${appName}/${collection}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Bulk Update (PUT)
  async update(appName, collection, filter, data) {
    let url = `/data/${appName}/${collection}`;
    const params = new URLSearchParams();
    if (filter.eq) filter.eq.forEach(val => params.append('eq', val));
    if (filter.ilike) filter.ilike.forEach(val => params.append('ilike', val));
    const qs = params.toString();
    if (qs) url += `?${qs}`;

    return this.client.request(url, { method: 'PUT', body: JSON.stringify(data) });
  }

  // Delete per ID (DELETE)
  async deleteById(appName, collection, id) {
    return this.client.request(`/data/${appName}/${collection}/${id}`, {
      method: 'DELETE'
    });
  }

  // Bulk Delete (DELETE)
  async delete(appName, collection, filter) {
    let url = `/data/${appName}/${collection}`;
    const params = new URLSearchParams();
    if (filter.eq) filter.eq.forEach(val => params.append('eq', val));
    if (filter.ilike) filter.ilike.forEach(val => params.append('ilike', val));
    if (filter.neq) filter.neq.forEach(val => params.append('neq', val));
    const qs = params.toString();
    if (qs) url += `?${qs}`;

    return this.client.request(url, { method: 'DELETE' });
  }

  async getSystemStatus() {
    return this.client.request('/system/status');
  }

  async getHealth() {
    return this.client.request('/system/health');
  }
}

// ── Realtime (WebSocket) ────────────────────────────

class RealtimeModule {
  constructor(client) {
    this.client = client;
    this.ws = null;
    this.listeners = new Map();
    this.globalListeners = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this.autoReconnect = true;
  }

  /**
   * WebSocket-Verbindung herstellen
   */
  connect() {
    return new Promise((resolve, reject) => {
      const protocol = this.client.host.startsWith('https') ? 'wss' : 'ws';
      const hostWithoutProtocol = this.client.host.replace(/^https?:\/\//, '');
      const token = this.client.accessToken || '';
      const url = `${protocol}://${hostWithoutProtocol}/ws?token=${token}`;

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this._dispatch(message);
        } catch (err) {
          console.error('[PrivateFire WS] Parse-Fehler:', err);
        }
      };

      this.ws.onclose = () => {
        if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
          setTimeout(() => this.connect(), delay);
        }
      };

      this.ws.onerror = (err) => {
        reject(err);
      };
    });
  }

  /**
   * Channel abonnieren
   */
  subscribe(channel, callback) {
    // Zum Channel beim Server anmelden
    this._send({ type: 'subscribe', channel });

    // Lokalen Listener registrieren
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, []);
    }
    this.listeners.get(channel).push(callback);

    // Unsubscribe-Funktion zurückgeben
    return () => {
      const cbs = this.listeners.get(channel);
      if (cbs) {
        const idx = cbs.indexOf(callback);
        if (idx > -1) cbs.splice(idx, 1);
        if (cbs.length === 0) {
          this.listeners.delete(channel);
          this._send({ type: 'unsubscribe', channel });
        }
      }
    };
  }

  /**
   * Nachricht an einen Channel senden
   */
  send(channel, data) {
    this._send({ type: 'publish', channel, data });
  }

  /**
   * Globalen Listener registrieren (empfängt alle Nachrichten)
   */
  onMessage(callback) {
    this.globalListeners.push(callback);
    return () => {
      const idx = this.globalListeners.indexOf(callback);
      if (idx > -1) this.globalListeners.splice(idx, 1);
    };
  }

  /**
   * Verbindung trennen
   */
  disconnect() {
    this.autoReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  _send(data) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(data));
    }
  }

  _dispatch(message) {
    // Globale Listener
    this.globalListeners.forEach((cb) => cb(message));

    // Channel-spezifische Listener
    if (message.channel && this.listeners.has(message.channel)) {
      this.listeners.get(message.channel).forEach((cb) => cb(message.data, message));
    }
  }
}

// ── Export ───────────────────────────────────────────

module.exports = { PrivateFireClient };

// Auch als ES-Module-Export (für Browser)
if (typeof window !== 'undefined') {
  window.PrivateFireClient = PrivateFireClient;
}
