// Service worker: the only part of the extension that talks to CareerOS. Content scripts send it
// messages, so the token never touches the employer's page.

const DEFAULT_BASE_URL = "https://careeros-mocha-kappa.vercel.app";

async function settings() {
  const { baseUrl = "", token = "" } = await chrome.storage.local.get(["baseUrl", "token"]);
  return { baseUrl: (baseUrl || DEFAULT_BASE_URL).replace(/\/$/, ""), token };
}

async function api(path, { method = "GET", body } = {}) {
  const { baseUrl, token } = await settings();
  if (!token) throw new Error("Paste your extension token (CareerOS → Job sources → Browser extension).");
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.error || `CareerOS returned ${res.status}`);
  }
  return res;
}

function toBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

const handlers = {
  async match({ url }) {
    return (await api(`/api/extension/applications?url=${encodeURIComponent(url)}`)).json();
  },
  async pack({ appId }) {
    return (await api(`/api/extension/applications/${encodeURIComponent(appId)}`)).json();
  },
  async resume({ path }) {
    return { base64: toBase64(await (await api(path)).arrayBuffer()) };
  },
  async answers({ appId, fields }) {
    return (await api(`/api/extension/applications/${encodeURIComponent(appId)}/answers`, { method: "POST", body: { fields } })).json();
  },
  async submitted({ appId, confirmationUrl, confirmationText }) {
    return (await api(`/api/extension/applications/${encodeURIComponent(appId)}/submitted`, { method: "POST", body: { confirmationUrl, confirmationText } })).json();
  },
  async ping() {
    return (await api("/api/extension/applications")).json();
  },
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handler = handlers[message?.type];
  if (!handler) return false;
  handler(message)
    .then(data => sendResponse({ ok: true, data }))
    .catch(error => sendResponse({ ok: false, error: error.message }));
  return true; // async response
});
