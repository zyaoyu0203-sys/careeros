const $ = id => document.getElementById(id);
const DEFAULT_BASE_URL = "https://careeros-mocha-kappa.vercel.app";

chrome.storage.local.get(["baseUrl", "token"]).then(({ baseUrl = "", token = "" }) => {
  $("baseUrl").value = baseUrl || DEFAULT_BASE_URL;
  $("token").value = token;
});

$("save").addEventListener("click", async () => {
  const status = $("status");
  await chrome.storage.local.set({ baseUrl: $("baseUrl").value.trim() || DEFAULT_BASE_URL, token: $("token").value.trim() });
  status.textContent = "Testing…";
  status.className = "";
  const res = await chrome.runtime.sendMessage({ type: "ping" });
  if (res?.ok) {
    status.textContent = `Connected · ${res.data.applications.length} application(s) in preparation`;
    status.className = "ok";
  } else {
    status.textContent = res?.error ?? "Could not reach CareerOS";
    status.className = "err";
  }
});
