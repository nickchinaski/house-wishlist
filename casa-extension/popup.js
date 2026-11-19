// House Wishlist — reads the product page you are on and saves it to the shared Google Sheet.
// The list this extension saves to: the link of your own House Wishlist app (ends in /exec).
// Asked on first use and kept in Chrome; config.js can pre-fill it.
let APP = "";
const APP_RE = /^https:\/\/script\.google\.com\/(a\/macros\/[^/]+\/s|macros\/s)\/[\w-]+\/(exec|dev)$/;
async function loadApp() {
  try { const r = await chrome.storage.sync.get("appUrl"); APP = r.appUrl || ""; } catch (e) { APP = ""; }
  if (!APP && typeof DEFAULT_APP === "string") APP = DEFAULT_APP;
  return APP;
}
function showSetup(msg) {
  main.innerHTML = `<div class="setup" style="display:grid;gap:10px">
    <p><b>First time here?</b> Paste the link of your House Wishlist (the address of your list, it ends in <b>/exec</b>).</p>
    ${msg ? `<div class="note err">${esc(msg)}</div>` : ""}
    <input id="appUrl" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(APP)}">
    <div class="acts"><button class="btn primary" id="saveApp">Save and continue</button></div>
    <p style="font-size:12px">You find it in the House Wishlist guide, step "Pubblica l'app", or in the address bar when your list is open.</p>
  </div>`;
  $("#appUrl").focus();
  $("#saveApp").onclick = async () => {
    const v = $("#appUrl").value.trim().replace(/\?.*$/, "");
    if (!APP_RE.test(v)) { showSetup("That doesn't look like a House Wishlist link. It should start with https://script.google.com/macros/s/ and end with /exec."); return; }
    APP = v; ACCT = null;
    try { await chrome.storage.sync.set({ appUrl: v, acct: null }); } catch (e) {}
    start();
  };
}
const ROOMS = ["Living Room", "Kitchen", "Bedroom", "Bathroom", "Studio", "Household"];
const PRIOS = [["Must-have", "Must"], ["Important", "Important"], ["Nice-to-have", "Nice"]];

const $ = s => document.querySelector(s);
const main = $("#main");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
const num = v => {
  if (v === "" || v == null) return null;
  if (typeof v === "number") return isFinite(v) ? Math.round(v) : null;
  const raw = String(v), man = /만/.test(raw);
  let s = raw.replace(/[^\d.\-]/g, "");
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  let n = parseFloat(s); if (isNaN(n)) return null;
  return Math.round(man ? n * 10000 : n);
};

let page = null, items = [], d = null;
// Display currency chosen in the app; prices travel in won.
const SYM = { EUR: "€", KRW: "₩", USD: "$", GBP: "£", JPY: "¥", CNY: "CN¥", CHF: "CHF" };
let CURR = "KRW", RATE = 1;
const decimals = () => !(CURR === "KRW" || CURR === "JPY");
const show = k => (k == null || isNaN(k)) ? "" : (decimals() ? Math.round(k * RATE * 100) / 100 : Math.round(k * RATE));
function readPrice(v) {
  if (!decimals()) { const n = num(v); return n == null ? null : Math.round(n / RATE); }
  let s = String(v ?? "").replace(/[^\d.,\-]/g, "");
  if (!s) return null;
  if (/,\d{1,2}$/.test(s) && s.indexOf(".") < 0) s = s.replace(",", "."); else s = s.replace(/,/g, "");
  const n = parseFloat(s); return isNaN(n) ? null : Math.round(n / RATE);
}

/* Runs inside the product page (your own browser), so shops that block robots still work. */
function extractFromPage() {
  const g = s => { const e = document.querySelector(s); return e ? String(e.getAttribute("content") || e.innerText || "").trim() : ""; };
  const t = g('meta[property="og:title"]') || document.title || "";
  const p = g('meta[property="product:price:amount"]') || g('meta[property="og:price:amount"]') || g('[itemprop="price"]');
  const b = String((document.body && document.body.innerText) || "").replace(/\s+/g, " ");
  let i = t ? b.indexOf(t.slice(0, 15)) : -1;
  if (i < 0) { const m = b.search(/[0-9][0-9,.]{3,}\s*(원|won|₩)/i); i = m > 200 ? m - 200 : 0; }
  // Main product photo: the share image the shop declares, else the biggest picture on screen.
  let img = g('meta[property="og:image"]') || g('meta[name="twitter:image"]') || g('meta[property="og:image:url"]');
  if (!img) {
    let best = 0;
    for (const el of document.images) {
      const area = (el.naturalWidth || 0) * (el.naturalHeight || 0);
      const r = el.getBoundingClientRect();
      if (area > best && el.naturalWidth >= 200 && r.top < innerHeight * 1.5) { best = area; img = el.currentSrc || el.src; }
    }
  }
  try { img = img ? new URL(img, location.href).href : ""; } catch (e) { img = ""; }
  if (!/^https?:/i.test(img)) img = "";
  return { url: location.href, title: t.slice(0, 200), price: p, text: b.slice(i, i + 700), image: img };
}

// With several Google accounts signed in, Google answers for the first one by default.
// Try each signed-in account (/macros/u/N/s/...) until one can open the list, and remember it.
let ACCT = null;
function forAccount(url, n) { return n ? url.replace("/macros/s/", "/macros/u/" + n + "/s/") : url; }
async function api(body) {
  if (ACCT == null) { try { const r = await chrome.storage.sync.get("acct"); ACCT = Number.isInteger(r.acct) ? r.acct : null; } catch (e) {} }
  const order = [ACCT, 0, 1, 2, 3, 4].filter((v, i, a) => v != null && a.indexOf(v) === i);
  let net = false;
  for (const n of order) {
    let res;
    try { res = await fetch(forAccount(APP, n), { method: "POST", credentials: "include", body: JSON.stringify(body) }); }
    catch (e) { net = true; continue; }
    const text = await res.text();
    let j;
    try { j = JSON.parse(text); } catch (e) { continue; }
    if (n !== ACCT) { ACCT = n; try { await chrome.storage.sync.set({ acct: n }); } catch (e) {} }
    if (!j.ok) throw { code: j.error || "ERROR" };
    return j.data;
  }
  throw { code: net ? "NETWORK" : "AUTH" };
}
const listUrl = () => forAccount(APP, ACCT || 0);

function errText(code) {
  const c = String(code || "");
  if (c === "AUTH") return "Couldn't open your list with your Google account. Click \"Open list ↗\" above, press Allow (허용), then try again. / 리스트에 연결할 수 없어요. 위의 \"Open list ↗\"를 눌러 리스트를 열고 '허용'을 누른 뒤 다시 시도하세요.";
  if (/permission|access|권한|denied/i.test(c)) return "Your Google account can't open this list yet: ask the owner to share the Google Sheet with you as Editor. / 이 리스트에 접근 권한이 없어요. 구글 시트를 편집자로 공유해 달라고 요청하세요.";
  if (c === "NETWORK") return "No connection to Google. Check your internet and try again.";
  if (c.includes("NO_KEY")) return "The Gemini key isn't set. In the Google Sheet use 🏠 House Wishlist → Set Gemini API key.";
  if (c.includes("GEMINI_LIMIT")) return "Gemini's free limit is reached for now. Try again in a minute.";
  if (c.includes("NOT_SET_UP")) return "The Google Sheet isn't set up yet.";
  return "Something went wrong (" + c.slice(0, 80) + "). You can still add it from the list.";
}

function appLink() {
  if (!page) return listUrl();
  const notes = [page.title, page.price ? "Price: " + page.price : "", page.text].filter(Boolean).join(" ");
  return listUrl() + "?u=" + encodeURIComponent(page.url) + "&t=" + encodeURIComponent(page.title) + "&p=" + encodeURIComponent(page.price || "") + "&x=" + encodeURIComponent(notes.slice(0, 600)) + "&i=" + encodeURIComponent(page.image || "");
}

function status(msg) { main.innerHTML = `<div class="status"><span class="spin"></span>${esc(msg)}</div>`; }

function showError(msg) {
  main.innerHTML = `<div class="note err">${esc(msg)}</div>
    <div class="acts"><button class="btn primary" id="openApp">Add it from the list instead</button><button class="btn" id="retry">Try again</button></div>`;
  $("#openApp").onclick = () => chrome.tabs.create({ url: appLink() });
  $("#retry").onclick = () => start();
}

function render() {
  const roomItems = items.filter(it => it.room === d.room);
  main.innerHTML = `
    <div class="head">${d.image ? `<img class="pth" src="${esc(d.image)}" alt="" referrerpolicy="no-referrer">` : ""}<div class="src">${esc(host(page.url))}${d.summary ? " · " + esc(d.summary) : ""}</div></div>
    ${d.warn ? `<div class="note">${esc(d.warn)}</div>` : ""}
    <div><label for="name">Item</label><input id="name" value="${esc(d.name)}" placeholder="What is it?"></div>
    <div class="row">
      <div><label for="price">Price each (${esc(SYM[CURR] || CURR)})</label><input id="price" inputmode="decimal" value="${esc(show(d.price))}" placeholder="—"></div>
      <div><label for="qty">Qty</label><input id="qty" inputmode="numeric" value="${esc(d.qty)}"></div>
    </div>
    <div><label>Room</label><div class="seg" id="rooms">${ROOMS.map(r => `<button data-room="${esc(r)}" aria-pressed="${d.room === r}">${esc(r)}</button>`).join("")}</div></div>
    <div class="row2">
      <div><label>Priority</label><div class="seg prio" id="prios">${PRIOS.map(([v, l]) => `<button data-prio="${v}" data-v="${v}" aria-pressed="${d.priority === v}">${l}</button>`).join("")}</div></div>
      <div><label for="store">Store</label><input id="store" value="${esc(d.store)}"></div>
    </div>
    <div><label for="match">Add as</label><select id="match">
      <option value="">A new item in ${esc(d.room)}</option>
      ${roomItems.map(it => `<option value="${esc(it.id)}" ${d.matchId === it.id ? "selected" : ""}>A link for "${esc(it.name)}"${it.links ? ` (has ${it.links})` : ""}</option>`).join("")}
    </select></div>
    <div class="acts"><button class="btn primary" id="save">${d.matchId ? "Attach link" : "Add to list"}</button></div>`;
  const keep = () => {
    d.name = $("#name").value; d.price = readPrice($("#price").value); d.qty = parseInt($("#qty").value) || 1; d.store = $("#store").value;
  };
  ["#name", "#price", "#qty", "#store"].forEach(s => $(s).addEventListener("input", keep));
  $("#rooms").onclick = e => { const b = e.target.closest("[data-room]"); if (!b) return; keep(); d.room = b.dataset.room; if (d.matchId && !items.some(it => it.id === d.matchId && it.room === d.room)) d.matchId = ""; render(); };
  $("#prios").onclick = e => { const b = e.target.closest("[data-prio]"); if (!b) return; keep(); d.priority = b.dataset.prio; render(); };
  $("#match").onchange = e => { keep(); d.matchId = e.target.value; render(); };
  $("#save").onclick = save;
}

async function save() {
  const btn = $("#save"); btn.disabled = true; btn.textContent = "Saving…";
  d.name = $("#name").value.trim(); d.price = readPrice($("#price").value); d.qty = parseInt($("#qty").value) || 1; d.store = $("#store").value.trim();
  try {
    const r = await api({ action: "save", url: page.url, name: d.name, room: d.room, priority: d.priority, qty: d.qty, price: d.price, store: d.store, summary: d.summary, matchId: d.matchId, image: d.image || "" });
    main.innerHTML = `<div class="note ok">${r.attached ? `Link added to "${esc(r.name)}"` : `Added "${esc(r.name)}" to ${esc(r.room)}`} ✓</div>
      <div class="acts"><button class="btn primary" id="openList2">Open the list</button><button class="btn" id="close">Close</button></div>`;
    $("#openList2").onclick = () => chrome.tabs.create({ url: listUrl() });
    $("#close").onclick = () => window.close();
  } catch (e) {
    btn.disabled = false; btn.textContent = "Try again";
    const n = document.createElement("div"); n.className = "note err"; n.textContent = errText(e && e.code);
    main.prepend(n);
  }
}

async function start() {
  if (!APP && !(await loadApp())) { showSetup(""); return; }
  status("Reading the page…");
  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractFromPage });
    page = res && res.result;
  } catch (e) { page = null; }
  if (!page || !/^https?:/i.test(page.url || "")) {
    main.innerHTML = `<div class="note">Open a product page (IKEA, ohou.se, Coupang…) and click the House Wishlist icon again.</div>`;
    return;
  }
  status("Asking Gemini what it is…");
  const notes = [page.title, page.price ? "Price: " + page.price : "", page.text].filter(Boolean).join("\n");
  try {
    const r = await api({ action: "prepare", url: page.url, notes });
    const a = r.analysis || {};
    items = r.items || [];
    if (r.settings && SYM[r.settings.currency] && r.settings.rate) { CURR = r.settings.currency; RATE = Number(r.settings.rate) || 1; }
    d = {
      name: String(a.name || page.title || "").slice(0, 80),
      room: ROOMS.includes(a.room) ? a.room : "Living Room",
      priority: PRIOS.some(p => p[0] === a.priority) ? a.priority : "Important",
      price: num(a.price) ?? num(page.price),
      qty: parseInt(a.qty) > 0 ? parseInt(a.qty) : 1,
      store: String(a.store || host(page.url)).slice(0, 40),
      summary: String(a.summary || "").slice(0, 140),
      image: page.image || String(a.image || ""),
      matchId: a.match_id && items.some(it => it.id === String(a.match_id)) ? String(a.match_id) : "",
      warn: ""
    };
    if (d.matchId) d.room = items.find(it => it.id === d.matchId).room;
    if (d.price == null) d.warn = "No price found on this page. Add it if you know it.";
    render();
  } catch (e) {
    showError(errText(e && e.code));
  }
}

$("#openList").onclick = async e => { e.preventDefault(); await loadApp(); if (APP) chrome.tabs.create({ url: listUrl() }); else showSetup(""); };
$("#changeList").onclick = async e => { e.preventDefault(); await loadApp(); showSetup(""); };
start();
