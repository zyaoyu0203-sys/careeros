// Runs on Greenhouse, Lever and Ashby job pages. Fills the application form from CareerOS,
// attaches the chosen resume, and — after the user presses Submit — records the application.
// It never submits anything itself.

(() => {
  const APP_KEY = "careeros-app";
  const REPORTED_KEY = "careeros-reported";
  const send = message => chrome.runtime.sendMessage(message);

  // Which CareerOS application this tab belongs to: from the link CareerOS opened, kept for the
  // rest of the tab's session so it survives the employer's own page navigations.
  const fromHash = new URLSearchParams(location.hash.slice(1)).get(APP_KEY);
  if (fromHash) sessionStorage.setItem(APP_KEY, fromHash);
  let appId = sessionStorage.getItem(APP_KEY);

  // ---------- panel ----------
  const panel = document.createElement("div");
  panel.id = "careeros-panel";
  panel.innerHTML = `<div class="cos-head"><span class="cos-mark">C</span><b>CareerOS</b><button class="cos-x" title="Hide">×</button></div><div class="cos-body"></div>`;
  panel.querySelector(".cos-x").onclick = () => panel.remove();
  const body = panel.querySelector(".cos-body");
  const render = html => (body.innerHTML = html);
  const escape = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // ---------- labels ----------
  function labelFor(el) {
    const parts = [];
    if (el.id) document.querySelectorAll(`label[for="${CSS.escape(el.id)}"]`).forEach(l => parts.push(l.textContent));
    const wrapping = el.closest("label");
    if (wrapping) parts.push(wrapping.textContent);
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) labelledBy.split(/\s+/).forEach(id => parts.push(document.getElementById(id)?.textContent ?? ""));
    parts.push(el.getAttribute("aria-label") ?? "", el.getAttribute("placeholder") ?? "");
    // Lever and Ashby put the question text in a sibling element of the field's container.
    const container = el.closest(".application-question, .field, [class*='fieldEntry'], [class*='question'], li, fieldset");
    const caption = container?.querySelector(".application-label, legend, label, [class*='label'], [class*='Label']");
    if (caption) parts.push(caption.textContent);
    if (!parts.join("").trim()) parts.push(el.name ?? "", el.id ?? "");
    return parts.join(" ").replace(/\s+/g, " ").trim();
  }

  // ---------- filling ----------
  function setValue(el, value) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value); // works with React-controlled inputs
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));
    el.classList.add("careeros-filled");
  }

  function fillSelect(el, value) {
    const want = value.toLowerCase();
    const option = [...el.options].find(o => o.text.trim().toLowerCase() === want) ?? [...el.options].find(o => o.text.trim().toLowerCase().startsWith(want.slice(0, 3)));
    if (!option) return false;
    setValue(el, option.value);
    return true;
  }

  const words = s => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length > 3));
  function customAnswer(label, custom) {
    const target = words(label);
    let best = null;
    let bestScore = 0;
    for (const qa of custom) {
      const q = words(qa.question);
      const overlap = [...q].filter(w => target.has(w)).length / Math.max(1, q.size);
      if (overlap > bestScore) [best, bestScore] = [qa, overlap];
    }
    return bestScore >= 0.6 ? best.answer : null;
  }

  function fillFields(pack) {
    const rules = pack.rules.map(r => ({ re: new RegExp(r.pattern, r.flags), key: r.key }));
    const filled = [];
    const fields = document.querySelectorAll("input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=radio]):not([type=submit]), textarea, select");
    for (const el of fields) {
      if (el.disabled || el.readOnly || el.offsetParent === null) continue;
      if (el.tagName !== "SELECT" && el.value.trim()) continue; // never overwrite what's there
      const label = labelFor(el);
      if (!label) continue;
      const rule = rules.find(r => r.re.test(label));
      let value = rule ? pack.answers[rule.key] : null;
      if (!value && el.tagName === "TEXTAREA") {
        value = /cover letter/i.test(label) ? pack.coverLetter : customAnswer(label, pack.custom);
      }
      if (!value) continue;
      const ok = el.tagName === "SELECT" ? fillSelect(el, value) : (setValue(el, value), true);
      if (ok) filled.push(label.slice(0, 60));
    }
    return filled;
  }

  async function attachResume(pack) {
    if (!pack.resume) return "No resume chosen for this application";
    const inputs = [...document.querySelectorAll("input[type=file]")];
    const input = inputs.find(i => /resume|cv/i.test(`${labelFor(i)} ${i.name} ${i.id}`)) ?? inputs[0];
    if (!input) return "No file upload field found";
    const res = await send({ type: "resume", path: pack.resume.downloadPath });
    if (!res?.ok) return res?.error ?? "Could not download the resume";
    const bytes = Uint8Array.from(atob(res.data.base64), c => c.charCodeAt(0));
    const transfer = new DataTransfer();
    transfer.items.add(new File([bytes], pack.resume.fileName, { type: "application/pdf" }));
    input.files = transfer.files;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return null;
  }

  // ---------- confirmation ----------
  const CONFIRMATION = /thank(s| you) for (applying|your (application|interest))|application (has been )?(submitted|received)|we('ve| have) received your application/i;
  function watchForConfirmation() {
    const check = async () => {
      if (!appId || sessionStorage.getItem(REPORTED_KEY) === appId) return;
      const urlSaysDone = /\/(confirmation|thanks|thank-you|application-submitted)\b/i.test(location.pathname);
      const text = document.body.innerText.match(CONFIRMATION)?.[0];
      if (!urlSaysDone && !text) return;
      sessionStorage.setItem(REPORTED_KEY, appId);
      const res = await send({ type: "submitted", appId, confirmationUrl: location.href, confirmationText: text ?? "" });
      document.body.appendChild(panel);
      render(res?.ok ? `<p class="cos-ok">✓ Application recorded in CareerOS.</p>` : `<p class="cos-err">Couldn't record the application: ${escape(res?.error)}</p>`);
    };
    new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
    check();
  }

  // ---------- flow ----------
  async function showApplication() {
    const res = await send({ type: "pack", appId });
    if (!res?.ok) return render(`<p class="cos-err">${escape(res?.error)}</p>`);
    const pack = res.data;
    if (pack.application.status !== "preparing") return render(`<p class="cos-ok">Already recorded as ${escape(pack.application.status)} in CareerOS.</p>`);
    render(`
      <p class="cos-title">${escape(pack.application.title)}<br><span>${escape(pack.application.company)}</span></p>
      <p class="cos-muted">Resume: <b>${escape(pack.resume?.name ?? "none")}</b></p>
      <button class="cos-btn">Fill application</button>`);
    body.querySelector(".cos-btn").onclick = async () => {
      render(`<p class="cos-muted">Filling…</p>`);
      const filled = fillFields(pack);
      const resumeProblem = await attachResume(pack);
      render(`
        <p class="cos-ok">✓ Filled ${filled.length} field${filled.length === 1 ? "" : "s"}${resumeProblem ? "" : " and attached your resume"}.</p>
        ${resumeProblem ? `<p class="cos-err">${escape(resumeProblem)}</p>` : ""}
        <p class="cos-muted">Filled fields are outlined in blue. Check them, answer anything left, then press <b>Submit</b> on the form. CareerOS will record it automatically.</p>`);
    };
  }

  async function chooseApplication() {
    const res = await send({ type: "match", url: location.href });
    if (!res?.ok) return render(`<p class="cos-err">${escape(res?.error)}</p>`);
    if (res.data.match) {
      appId = res.data.match;
      sessionStorage.setItem(APP_KEY, appId);
      return showApplication();
    }
    if (!res.data.applications.length) return render(`<p class="cos-muted">Use “One-click apply” on a role in CareerOS to link this form.</p>`);
    render(`<p class="cos-muted">Which CareerOS application is this?</p>${res.data.applications
      .map(a => `<button class="cos-pick" data-id="${escape(a.id)}">${escape(a.company)} — ${escape(a.title)}</button>`)
      .join("")}`);
    body.querySelectorAll(".cos-pick").forEach(b => (b.onclick = () => ((appId = b.dataset.id), sessionStorage.setItem(APP_KEY, appId), showApplication())));
  }

  const hasForm = () => document.querySelector("input[type=file], input[type=email], form textarea");
  function start() {
    watchForConfirmation();
    if (sessionStorage.getItem(REPORTED_KEY) === appId) return;
    if (!hasForm() && !appId) return; // a listing page, not an application form
    document.body.appendChild(panel);
    render(`<p class="cos-muted">Connecting…</p>`);
    (appId ? showApplication() : chooseApplication()).catch(e => render(`<p class="cos-err">${escape(e.message)}</p>`));
  }

  // Ashby and the newer Greenhouse boards render the form after load.
  if (hasForm() || appId) start();
  else {
    const waiting = new MutationObserver(() => hasForm() && (waiting.disconnect(), start()));
    waiting.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => waiting.disconnect(), 15000);
  }
})();
