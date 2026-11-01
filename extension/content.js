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
  panel.querySelector(".cos-x").onclick = () => ((panelWanted = false), panel.remove());
  const body = panel.querySelector(".cos-body");
  // React-rendered boards (the newer Greenhouse) can re-render the whole document after load and
  // drop nodes they didn't create; put the panel back whenever that happens, unless the user closed it.
  let panelWanted = false;
  const showPanel = () => {
    panelWanted = true;
    if (!panel.isConnected) document.body.appendChild(panel);
  };
  setInterval(() => panelWanted && !panel.isConnected && document.body.appendChild(panel), 800);
  const render = html => (body.innerHTML = html);
  const escape = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // ---------- reading the form ----------
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clean = t => (t ?? "").replace(/\*/g, " ").replace(/\s+/g, " ").trim();
  const CONTROL = "input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=button]), textarea, select";

  /**
   * The question a control asks. Explicit associations first (label[for], aria-labelledby,
   * a wrapping label, aria-label); only then the nearest container that holds this one control.
   * Never a wide container — that is how every field ends up labelled "First Name".
   */
  function labelFor(el) {
    const byFor = el.id ? [...document.querySelectorAll(`label[for="${CSS.escape(el.id)}"]`)].map(l => l.textContent).join(" ") : "";
    if (clean(byFor)) return clean(byFor);
    const ids = el.getAttribute("aria-labelledby");
    if (ids) {
      const text = ids.split(/\s+/).map(id => document.getElementById(id)?.textContent ?? "").join(" ");
      if (clean(text)) return clean(text);
    }
    const wrapping = el.closest("label");
    if (wrapping && clean(wrapping.textContent)) return clean(wrapping.textContent);
    if (clean(el.getAttribute("aria-label"))) return clean(el.getAttribute("aria-label"));
    let node = el.parentElement;
    for (let depth = 0; node && depth < 5; depth++, node = node.parentElement) {
      const controls = [...node.querySelectorAll(CONTROL)].filter(c => c.offsetParent !== null);
      if (controls.length > 1) break; // reached a container shared with other questions
      const caption = node.querySelector("label, legend, .application-label, [class*='label' i]");
      if (caption && clean(caption.textContent)) return clean(caption.textContent);
    }
    return clean(el.getAttribute("placeholder") || el.name || "");
  }

  const isCombobox = el => el.getAttribute("role") === "combobox" || el.getAttribute("aria-autocomplete") === "list";
  const isRequired = (el, label) => el.required || el.getAttribute("aria-required") === "true" || /\*/.test(label);

  // The options of *this* dropdown: its listbox (aria-controls) or the menu inside its own select.
  const selectRoot = el => el.closest("[class*='__control' i], [class*='-control' i]")?.parentElement ?? el.parentElement?.parentElement ?? el;
  function optionNodes(el) {
    const listbox = document.getElementById(el.getAttribute("aria-controls") || el.getAttribute("aria-owns") || "");
    return [...(listbox ?? selectRoot(el)).querySelectorAll("[role=option]")];
  }
  // Script-dispatched events first; widgets that ignore them get real input via the worker.
  async function trustedClick(node) {
    node.scrollIntoView({ block: "center" });
    await sleep(80);
    const r = node.getBoundingClientRect();
    const res = await send({ type: "trustedClick", x: r.left + r.width / 2, y: r.top + r.height / 2 });
    await sleep(250);
    return Boolean(res?.ok);
  }
  const trustedKey = (key, code, keyCode) => send({ type: "trustedKey", key, code, keyCode });

  async function openMenu(el) {
    el.focus();
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", code: "ArrowDown", keyCode: 40, bubbles: true }));
    await sleep(250);
    if (el.getAttribute("aria-expanded") === "true" || optionNodes(el).length) return true;
    await trustedClick(el.closest("[class*='__control' i], [class*='-control' i]") ?? el);
    return el.getAttribute("aria-expanded") === "true" || optionNodes(el).length > 0;
  }

  async function closeMenu(el) {
    if (el.getAttribute("aria-expanded") === "true") await trustedKey("Escape", "Escape", 27);
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
    el.blur();
    await sleep(120);
  }

  async function comboboxOptions(el) {
    if (!(await openMenu(el))) return [];
    const options = optionNodes(el).map(o => clean(o.textContent)).filter(Boolean).slice(0, 400);
    await closeMenu(el);
    return options;
  }

  async function readFields() {
    const fields = [];
    for (const el of document.querySelectorAll(CONTROL)) {
      if (el.disabled || el.readOnly || el.offsetParent === null || el.closest("#careeros-panel")) continue;
      const label = labelFor(el);
      if (!label) continue;
      const kind = el.tagName === "SELECT" ? "select" : isCombobox(el) ? "choice" : el.tagName === "TEXTAREA" ? "long" : "text";
      const filled = kind === "select" ? Boolean(el.value) : kind === "choice" ? hasChoice(el) : Boolean(el.value.trim());
      if (filled) continue; // never overwrite what's there
      const options = kind === "select" ? [...el.options].map(o => clean(o.text)).filter(t => t && !/^select/i.test(t)) : kind === "choice" ? await comboboxOptions(el) : [];
      // Very long lists (countries) may render only part of their options: treat them as searchable,
      // so the answer is free text that gets typed into the dropdown's search.
      fields.push({ el, label, kind, options: options.length >= 150 ? [] : options, required: isRequired(el, label) });
    }
    return fields;
  }

  // React-select shows the chosen value in a sibling element, not in the input itself.
  const hasChoice = el => Boolean(selectRoot(el).querySelector("[class*='singleValue' i], [class*='single-value' i], [class*='multiValue' i], [class*='multi-value' i]"));

  // ---------- writing ----------
  function setValue(el, value) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value); // works with React-controlled inputs
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  const bestOption = (options, answer) => {
    const want = clean(answer).toLowerCase();
    return options.find(o => o.toLowerCase() === want) ?? options.find(o => o.toLowerCase().startsWith(want)) ?? options.find(o => want && o.toLowerCase().includes(want)) ?? null;
  };

  async function fillOne(field, answer) {
    const { el, kind } = field;
    if (!answer) return false;
    if (kind === "select") {
      const option = [...el.options].find(o => clean(o.text) === bestOption(field.options, answer));
      if (!option) return false;
      setValue(el, option.value);
    } else if (kind === "choice") {
      if (!(await openMenu(el))) return false;
      let options = optionNodes(el);
      let target = bestOption(options.map(o => clean(o.textContent)), answer);
      if (!target) {
        // Searchable lists may load results from the server: type, then wait for a match (≤3 s).
        await send({ type: "trustedType", text: answer });
        for (let waited = 0; waited < 3000 && !target; waited += 250) {
          await sleep(250);
          options = optionNodes(el);
          target = bestOption(options.map(o => clean(o.textContent)), answer);
        }
      }
      const node = options.find(o => clean(o.textContent) === target);
      if (!node) {
        await closeMenu(el);
        return false;
      }
      node.click();
      await sleep(150);
      if (!hasChoice(el)) await trustedClick(node);
      if (!hasChoice(el)) {
        await closeMenu(el);
        return false; // the dropdown didn't accept it — leave it for the user
      }
      selectRoot(el).classList.add("careeros-filled");
      return true;
    } else {
      setValue(el, answer);
    }
    (el.closest("[class*='container' i]") ?? el).classList.add("careeros-filled");
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

  /**
   * Two passes: fixed rules and saved answers for the predictable fields, then the model for
   * whatever is left — it sees the question and, for dropdowns, the allowed options.
   */
  async function fillForm(pack, progress) {
    const rules = pack.rules.map(r => ({ re: new RegExp(r.pattern, r.flags), key: r.key }));
    const fields = await readFields();
    let byRule = 0;
    const open = [];
    for (const field of fields) {
      const rule = rules.find(r => r.re.test(field.label));
      const answer = (rule && pack.answers[rule.key]) || customAnswer(field.label, pack.custom) || (/cover letter/i.test(field.label) ? pack.coverLetter : null);
      if (await fillOne(field, answer)) byRule++;
      else open.push(field);
    }

    let byAi = 0;
    if (open.length) {
      progress(`Asking AI about ${open.length} remaining question${open.length === 1 ? "" : "s"}…`);
      const res = await send({
        type: "answers",
        appId,
        fields: open.map((f, i) => ({ id: i, label: f.label.slice(0, 300), kind: f.kind, options: f.options, required: f.required })),
      });
      if (res?.ok) {
        for (const { id, answer } of res.data.answers) if (open[id] && (await fillOne(open[id], answer))) (byAi++, (open[id].done = true));
      }
    }
    const left = open.filter(f => !f.done && f.required).map(f => f.label);
    return { byRule, byAi, left };
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
      showPanel();
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
      render(`<p class="cos-muted">Reading the form…</p>`);
      const progress = text => render(`<p class="cos-muted">${escape(text)}</p>`);
      const { byRule, byAi, left } = await fillForm(pack, progress);
      const resumeProblem = await attachResume(pack);
      await send({ type: "release" }); // detach the debugger: the "debugging" bar goes away
      render(`
        <p class="cos-ok">✓ Filled ${byRule + byAi} field${byRule + byAi === 1 ? "" : "s"}${byAi ? ` (${byAi} answered by AI from your profile)` : ""}${resumeProblem ? "" : " and attached your resume"}.</p>
        ${resumeProblem ? `<p class="cos-err">${escape(resumeProblem)}</p>` : ""}
        ${left.length ? `<p class="cos-err">Needs your answer:</p><ul class="cos-list">${left.map(l => `<li>${escape(l.slice(0, 80))}</li>`).join("")}</ul>` : ""}
        <p class="cos-muted">Filled fields are outlined in blue. Check them, then press <b>Submit</b> on the form. CareerOS will record it automatically.</p>`);
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
    showPanel();
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
