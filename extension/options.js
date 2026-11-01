const $ = id => document.getElementById(id);

chrome.storage.local.get(["baseUrl", "token"]).then(({ baseUrl = "", token = "" }) => {
  $("baseUrl").value = baseUrl;
  $("token").value = token;
});

$("save").addEventListener("click", async () => {
  const status = $("status");
  await chrome.storage.local.set({ baseUrl: $("baseUrl").value.trim(), token: $("token").value.trim() });
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
