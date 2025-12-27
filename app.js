/* app.js - MyVMK Monthly Prize Tracker (MVP)
   - Local storage only (no backend, no auth)
   - Event-based history with snapshot prize names
   - Monthly prize rollover via PRIZE_CONFIG
   - Export/Import JSON
*/

const STORAGE_KEY = "myvmk_prize_tracker_v1";

const els = {
  monthTabs: document.getElementById("monthTabs"),
  systemSelect: document.getElementById("systemSelect"),
  keyColorRow: document.getElementById("keyColorRow"),
  dateInput: document.getElementById("dateInput"),

  quickButtons: document.getElementById("quickButtons"),
  quickAddHint: document.getElementById("quickAddHint"),

  quantityRow: document.getElementById("quantityRow"),
  customQty: document.getElementById("customQty"),
  quantityHint: document.getElementById("quantityHint"),

  creditsRow: document.getElementById("creditsRow"),
  creditsAmount: document.getElementById("creditsAmount"),
  addCreditsBtn: document.getElementById("addCreditsBtn"),
  addAshBtn: document.getElementById("addAshBtn"),

  summaryKeys: document.getElementById("summaryKeys"),
  summarySits: document.getElementById("summarySits"),
  eventsTbody: document.getElementById("eventsTbody"),
  quickAddCard: document.getElementById("quickAddCard"),
  eventLogCard: document.getElementById("eventLogCard"),

  exportBtn: document.getElementById("exportBtn"),
  importFile: document.getElementById("importFile"),
  resetBtn: document.getElementById("resetBtn"),
  deleteMonthBtn: document.getElementById("deleteMonthBtn"),

  themeToggle: document.getElementById("themeToggle"),
  themeIcon: document.getElementById("themeIcon"),
  themeLabel: document.getElementById("themeLabel")
};

let selectedMonth = null;

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function monthFromDate(dateISO) {
  if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return null;
  const [year, month] = dateISO.split("-");
  const monthIndex = parseInt(month, 10) - 1;
  return `${MONTH_NAMES[monthIndex]} ${year}`;
}

function parseMonthString(monthStr) {
  // Parse "December 2025" to { year: 2025, monthIndex: 11 }
  const parts = monthStr.split(" ");
  if (parts.length !== 2) return null;
  const monthIndex = MONTH_NAMES.indexOf(parts[0]);
  const year = parseInt(parts[1], 10);
  if (monthIndex === -1 || isNaN(year)) return null;
  return { year, monthIndex };
}

function compareMonths(a, b) {
  const pa = parseMonthString(a);
  const pb = parseMonthString(b);
  if (!pa || !pb) return 0;
  if (pa.year !== pb.year) return pa.year - pb.year;
  return pa.monthIndex - pb.monthIndex;
}

function getConfigMonths() {
  const cfg = window.PRIZE_CONFIG || {};
  return Object.keys(cfg).sort(compareMonths);
}

function ensureDefaultState() {
  const existing = loadState();
  if (existing) return existing;

  const months = getConfigMonths();
  const defaultMonth = months.length ? months[months.length - 1] : monthFromDate(todayISO()) || "2025-01";

  const state = {
    version: 1,
    createdAt: new Date().toISOString(),
    selectedMonth: defaultMonth,
    events: [] // immutable event log
  };
  saveState(state);
  return state;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.events)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getSelectedMonth() {
  return selectedMonth;
}

function getSelectedSystem() {
  return els.systemSelect.value; // keys | sits
}

function getSelectedKeyColor() {
  const activeBtn = document.querySelector(".key-color-btn.active");
  return activeBtn ? activeBtn.dataset.color : "bronze";
}

function getSelectedDate() {
  return els.dateInput.value || todayISO();
}

function getSelectedQuantity() {
  if (!els.customQty) return 1;
  const val = parseInt(els.customQty.value, 10);
  return (Number.isFinite(val) && val >= 1) ? Math.min(val, 100) : 1;
}

function updateQuantityHint() {
  if (!els.quantityHint) return;
  const qty = getSelectedQuantity();
  if (qty === 1) {
    els.quantityHint.textContent = "Clicking a prize button will add 1 entry.";
  } else {
    els.quantityHint.textContent = `Clicking a prize button will add ${qty} entries.`;
  }
}

function getMonthConfig(month) {
  const cfg = window.PRIZE_CONFIG || {};
  return cfg[month] || null;
}

function buildMonthTabs(state) {
  const cfgMonths = getConfigMonths();
  const monthsSet = new Set(cfgMonths);

  // Also include months that exist in history but not in config (still selectable)
  // Only include valid "Month Year" format strings
  for (const ev of state.events) {
    if (ev.month && parseMonthString(ev.month)) {
      monthsSet.add(ev.month);
    }
  }

  const allMonths = Array.from(monthsSet).sort(compareMonths);

  els.monthTabs.innerHTML = "";

  // Add "All Months" tab first
  const allTab = document.createElement("button");
  allTab.type = "button";
  allTab.className = "month-tab";
  allTab.dataset.month = "all";
  allTab.textContent = "All Months";
  allTab.addEventListener("click", () => selectMonth("all"));
  els.monthTabs.appendChild(allTab);

  for (const m of allMonths) {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "month-tab";
    tab.dataset.month = m;
    tab.textContent = m;
    tab.addEventListener("click", () => selectMonth(m));
    els.monthTabs.appendChild(tab);
  }

  // Set selected - prefer current month on fresh load
  const preferred = state.selectedMonth;
  const currentMonth = monthFromDate(todayISO());

  if (preferred && (preferred === "all" || allMonths.includes(preferred))) {
    selectedMonth = preferred;
  } else if (currentMonth && allMonths.includes(currentMonth)) {
    // Default to current month if available
    selectedMonth = currentMonth;
  } else if (allMonths.length) {
    // Fall back to most recent month
    selectedMonth = allMonths[allMonths.length - 1];
  }

  updateActiveTab();
}

function selectMonth(month) {
  selectedMonth = month;
  updateActiveTab();
  renderAll();
}

function updateActiveTab() {
  const tabs = els.monthTabs.querySelectorAll(".month-tab");
  tabs.forEach(tab => {
    if (tab.dataset.month === selectedMonth) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });
}

function renderQuickAdd() {
  const state = ensureDefaultState();
  const month = getSelectedMonth();
  const system = getSelectedSystem();
  const cfg = getMonthConfig(month);

  els.quickButtons.innerHTML = "";

  // Toggle key color row visibility based on system
  els.keyColorRow.style.display = (system === "keys") ? "block" : "none";

  // Credits row only for SITS (and only if enabled in config; if config missing, still allow credits)
  const creditsEnabled = cfg?.sits?.creditsEnabled ?? true;
  els.creditsRow.style.display = (system === "sits" && creditsEnabled) ? "block" : "none";

  if (!cfg) {
    els.quickAddHint.textContent =
      `bsims hasn't updated this month's prizes yet for ${month}. You can still log Ash or Credits. Contact bsims to remind him to add ${month} to enable prize buttons.`;
    if (system === "keys") {
      els.quickButtons.innerHTML = `<div class="subtle">bsims hasn't updated this month's prizes yet.</div>`;
    } else {
      els.quickButtons.innerHTML = `<div class="subtle">bsims hasn't updated this month's prizes yet.</div>`;
    }
    return;
  }

  if (system === "keys") {
    const color = getSelectedKeyColor();
    const prizes = cfg.keys?.[color] || [];
    els.quickAddHint.textContent = `Chest Keys: Select the key color and tap the prize to log it.`;

    if (!prizes.length) {
      els.quickButtons.innerHTML = `<div class="subtle">bsims hasn't updated this month's prizes yet.</div>`;
      return;
    }

    for (const p of prizes) {
      els.quickButtons.appendChild(makePrizeButton({
        label: p.name,
        badge: capitalize(color),
        badgeClass: "rare",
        onClick: () => addPrizeEvent({
          system: "keys",
          keyColor: color,
          prizeId: p.id,
          prizeName: p.name
        })
      }));
    }
  } else {
    // SITS
    const theme = cfg.sits?.theme || null;
    const common = cfg.sits?.common || [];
    const rare = cfg.sits?.rare || [];
    const ultra = cfg.sits?.ultra || [];

    els.quickAddHint.textContent = `SITS: tap the prize to log it. Add Credits and Ash below.`;

    const sections = [
      { title: "Common", badgeClass: "ok", items: common },
      { title: "Rare", badgeClass: "rare", items: rare },
      { title: "Ultra", badgeClass: "ultra", items: ultra }
    ];

    const flat = sections.flatMap(s => s.items);
    if (!flat.length) {
      els.quickButtons.innerHTML = `<div class="subtle">bsims hasn't updated this month's prizes yet.</div>`;
      return;
    }

    // Show theme header if configured
    if (theme) {
      const themeHeader = document.createElement("div");
      themeHeader.className = "sits-theme-header";
      themeHeader.textContent = theme;
      els.quickButtons.appendChild(themeHeader);
    }

    for (const sec of sections) {
      for (const p of sec.items) {
        // Combine theme + name for full prize name when saving
        const fullPrizeName = theme ? `${theme} ${p.name}` : p.name;
        els.quickButtons.appendChild(makePrizeButton({
          label: p.name,
          badge: sec.title,
          badgeClass: sec.badgeClass,
          onClick: () => addPrizeEvent({
            system: "sits",
            sitsTier: sec.title.toLowerCase(), // common|rare|ultra
            prizeId: p.id,
            prizeName: fullPrizeName
          })
        }));
      }
    }
  }
}

function makePrizeButton({ label, badge, badgeClass, onClick }) {
  const btn = document.createElement("button");
  btn.className = "prize-btn";
  btn.type = "button";
  btn.innerHTML = `
    <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
      <div style="font-weight:700;">${escapeHtml(label)}</div>
      <span class="badge ${badgeClass}">${escapeHtml(badge)}</span>
    </div>
  `;
  btn.addEventListener("click", onClick);
  return btn;
}

function addPrizeEvent({ system, keyColor = null, sitsTier = null, prizeId, prizeName }) {
  const state = ensureDefaultState();
  const date = getSelectedDate();
  const month = getSelectedMonth();
  const quantity = getSelectedQuantity();

  for (let i = 0; i < quantity; i++) {
    const ev = {
      id: cryptoId(),
      createdAt: new Date().toISOString(),
      date,
      month,
      system, // keys|sits
      keyColor: system === "keys" ? keyColor : null,
      sitsTier: system === "sits" ? sitsTier : null,
      resultType: "prize",
      prize: {
        id: prizeId,
        // SNAPSHOT the name at entry time so history survives renames/removals
        name: prizeName
      },
      creditsAmount: null
    };
    state.events.push(ev);
  }

  state.selectedMonth = month;
  saveState(state);

  renderAll();
}

function addCreditsEvent() {
  const state = ensureDefaultState();
  const date = getSelectedDate();
  const month = getSelectedMonth();
  const amt = Number(els.creditsAmount.value);

  if (!Number.isFinite(amt) || amt <= 0) {
    alert("Enter a valid credits amount greater than 0.");
    return;
  }

  const ev = {
    id: cryptoId(),
    createdAt: new Date().toISOString(),
    date,
    month,
    system: "sits",
    keyColor: null,
    sitsTier: null,
    resultType: "credits",
    prize: null,
    creditsAmount: Math.floor(amt)
  };

  state.events.push(ev);
  state.selectedMonth = month;
  saveState(state);

  els.creditsAmount.value = "";
  renderAll();
}

function addQuickCreditsEvent(amount) {
  const state = ensureDefaultState();
  const date = getSelectedDate();
  const month = getSelectedMonth();

  const ev = {
    id: cryptoId(),
    createdAt: new Date().toISOString(),
    date,
    month,
    system: "sits",
    keyColor: null,
    sitsTier: null,
    resultType: "credits",
    prize: null,
    creditsAmount: amount
  };

  state.events.push(ev);
  state.selectedMonth = month;
  saveState(state);

  renderAll();
}

function addAshEvent() {
  const state = ensureDefaultState();
  const date = getSelectedDate();
  const month = getSelectedMonth();
  const system = getSelectedSystem();
  const quantity = getSelectedQuantity();
  const keyColor = system === "keys" ? getSelectedKeyColor() : null;

  for (let i = 0; i < quantity; i++) {
    const ev = {
      id: cryptoId(),
      createdAt: new Date().toISOString(),
      date,
      month,
      system,
      keyColor,
      sitsTier: null,
      resultType: "ash",
      prize: null,
      creditsAmount: null
    };
    state.events.push(ev);
  }

  state.selectedMonth = month;
  saveState(state);

  renderAll();
}

function cryptoId() {
  // Safe enough for this use case
  if (window.crypto && crypto.getRandomValues) {
    const a = new Uint32Array(4);
    crypto.getRandomValues(a);
    return Array.from(a).map(n => n.toString(16)).join("-");
  }
  return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
}

function renderSummary() {
  const state = ensureDefaultState();
  const month = getSelectedMonth();
  const isAllMonths = month === "all";

  // For "All Months", use all events; otherwise filter by selected month
  const monthEvents = isAllMonths
    ? state.events
    : state.events.filter(e => e.month === month);

  const keysEvents = monthEvents.filter(e => e.system === "keys");
  const sitsEvents = monthEvents.filter(e => e.system === "sits");

  // === KEYS SUMMARY ===
  const keysTotal = keysEvents.length;
  const keysAsh = keysEvents.filter(e => e.resultType === "ash").length;
  const keysPrizes = keysEvents.filter(e => e.resultType === "prize").length;
  const keysWinRate = keysTotal ? (keysPrizes / keysTotal) : 0;
  const keysAshRate = keysTotal ? (keysAsh / keysTotal) : 0;

  const keysKpis = [
    { label: "Total Keys Used", value: String(keysTotal) },
    { label: "Win Rate", value: pct(keysWinRate) },
    { label: "Ash Rate", value: pct(keysAshRate) },
    { label: "Prizes Won", value: String(keysPrizes) }
  ];

  els.summaryKeys.innerHTML = "";
  for (const k of keysKpis) {
    const div = document.createElement("div");
    div.className = "kpi";
    div.innerHTML = `<div class="label">${escapeHtml(k.label)}</div><div class="value">${escapeHtml(k.value)}</div>`;
    els.summaryKeys.appendChild(div);
  }

  // Breakdown by key color
  const keyColors = ["bronze", "silver", "gold"];
  for (const color of keyColors) {
    const colorEvents = keysEvents.filter(e => e.keyColor === color);
    const colorTotal = colorEvents.length;
    if (colorTotal === 0) continue;

    const colorAsh = colorEvents.filter(e => e.resultType === "ash").length;
    const colorPrizes = colorEvents.filter(e => e.resultType === "prize").length;
    const colorWinRate = colorTotal ? (colorPrizes / colorTotal) : 0;
    const colorPrizeCounts = countBy(colorEvents.filter(e => e.resultType === "prize"), e => e.prize?.name || "Unknown Prize");

    const div = document.createElement("div");
    div.className = "kpi";
    div.style.gridColumn = "span 2";

    let prizeList = Object.entries(colorPrizeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `<span class="badge">${escapeHtml(name)}: ${count}</span>`)
      .join(" ");
    if (!prizeList) prizeList = `<span class="subtle">No prizes yet</span>`;

    div.innerHTML = `
      <div class="label" style="text-transform: capitalize;">${escapeHtml(color)} Keys</div>
      <div style="margin-top:6px; line-height:1.7;">
        <div style="margin-bottom:8px;">
          <span class="badge">${colorTotal} used</span>
          <span class="badge ok">${colorPrizes} prizes (${pct(colorWinRate)})</span>
          <span class="badge ash">${colorAsh} ash</span>
        </div>
        <div class="subtle">${prizeList}</div>
      </div>
    `;
    els.summaryKeys.appendChild(div);
  }

  // === SITS SUMMARY ===
  const sitsTotal = sitsEvents.length;
  const sitsAsh = sitsEvents.filter(e => e.resultType === "ash").length;
  const sitsPrizes = sitsEvents.filter(e => e.resultType === "prize").length;
  const sitsCreditsWins = sitsEvents.filter(e => e.resultType === "credits").length;
  const sitsCreditsTotal = sitsEvents
    .filter(e => e.resultType === "credits" && Number.isFinite(e.creditsAmount))
    .reduce((sum, e) => sum + e.creditsAmount, 0);
  const sitsWinRate = sitsTotal ? ((sitsPrizes + sitsCreditsWins) / sitsTotal) : 0;
  const sitsAshRate = sitsTotal ? (sitsAsh / sitsTotal) : 0;
  const sitsPrizeCounts = countBy(sitsEvents.filter(e => e.resultType === "prize"), e => e.prize?.name || "Unknown Prize");

  const sitsKpis = [
    { label: "Total SITS", value: String(sitsTotal) },
    { label: "Win Rate", value: pct(sitsWinRate) },
    { label: "Ash Rate", value: pct(sitsAshRate) },
    { label: "Credits Total", value: sitsCreditsTotal.toLocaleString() }
  ];

  els.summarySits.innerHTML = "";
  for (const k of sitsKpis) {
    const div = document.createElement("div");
    div.className = "kpi";
    div.innerHTML = `<div class="label">${escapeHtml(k.label)}</div><div class="value">${escapeHtml(k.value)}</div>`;
    els.summarySits.appendChild(div);
  }

  // Outcomes breakdown
  if (sitsTotal > 0) {
    const outcomesDiv = document.createElement("div");
    outcomesDiv.className = "kpi";
    outcomesDiv.style.gridColumn = "span 2";
    outcomesDiv.innerHTML = `
      <div class="label">Outcomes</div>
      <div style="margin-top:6px; line-height:1.7;">
        <span class="badge ok">${sitsPrizes} prizes (${pct(sitsPrizes / sitsTotal)})</span>
        <span class="badge rare">${sitsCreditsWins} credits (${pct(sitsCreditsWins / sitsTotal)})</span>
        <span class="badge ash">${sitsAsh} ash (${pct(sitsAsh / sitsTotal)})</span>
      </div>
    `;
    els.summarySits.appendChild(outcomesDiv);
  }

  // Prize wins breakdown
  if (sitsPrizes > 0) {
    const prizeList = Object.entries(sitsPrizeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `<span class="badge">${escapeHtml(name)}: ${count}</span>`)
      .join(" ");

    const prizesDiv = document.createElement("div");
    prizesDiv.className = "kpi";
    prizesDiv.style.gridColumn = "span 2";
    prizesDiv.innerHTML = `
      <div class="label">Prize Wins</div>
      <div class="subtle" style="margin-top:6px; line-height:1.7;">
        ${prizeList}
      </div>
    `;
    els.summarySits.appendChild(prizesDiv);
  }

  // Credits breakdown
  if (sitsCreditsWins > 0) {
    const creditsCounts = countBy(
      sitsEvents.filter(e => e.resultType === "credits"),
      e => `${e.creditsAmount} credits`
    );
    const creditsList = Object.entries(creditsCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `<span class="badge">${escapeHtml(name)}: ${count}x</span>`)
      .join(" ");

    const creditsDiv = document.createElement("div");
    creditsDiv.className = "kpi";
    creditsDiv.style.gridColumn = "span 2";
    creditsDiv.innerHTML = `
      <div class="label">Credits Breakdown</div>
      <div class="subtle" style="margin-top:6px; line-height:1.7;">
        ${creditsList}
      </div>
    `;
    els.summarySits.appendChild(creditsDiv);
  }
}

function renderEventsTable() {
  const state = ensureDefaultState();
  const month = getSelectedMonth();
  const monthEvents = state.events
    .filter(e => e.month === month)
    .slice()
    .sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.createdAt || "").localeCompare(b.createdAt || ""));

  els.eventsTbody.innerHTML = "";

  if (!monthEvents.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="6" class="subtle">No events logged for ${escapeHtml(month)}.</td>`;
    els.eventsTbody.appendChild(tr);
    return;
  }

  for (const e of monthEvents) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(e.date || "")}</td>
      <td>${escapeHtml(e.system || "")}</td>
      <td>${escapeHtml(e.system === "keys" ? (e.keyColor || "") : "-")}</td>
      <td>${escapeHtml(e.resultType || "")}</td>
      <td>${escapeHtml(formatPrizeOrCredits(e))}</td>
      <td><button class="btn btn-danger btn-small" data-del="${escapeHtml(e.id)}">Delete</button></td>
    `;
    els.eventsTbody.appendChild(tr);
  }

  // Bind delete buttons
  els.eventsTbody.querySelectorAll("button[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del");
      deleteEvent(id);
    });
  });
}

function deleteEvent(id) {
  const state = ensureDefaultState();
  const idx = state.events.findIndex(e => e.id === id);
  if (idx === -1) return;
  state.events.splice(idx, 1);
  saveState(state);
  renderAll();
}

function deleteSelectedMonth() {
  const state = ensureDefaultState();
  const month = getSelectedMonth();
  const before = state.events.length;
  state.events = state.events.filter(e => e.month !== month);
  const removed = before - state.events.length;
  saveState(state);
  renderAll();
  alert(`Deleted ${removed} event(s) for ${month}.`);
}

function exportData() {
  const state = ensureDefaultState();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `myvmk-prize-tracker-export-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(String(reader.result || ""));
      if (!imported || typeof imported !== "object" || !Array.isArray(imported.events)) {
        alert("Invalid import file. Expected JSON export from this app.");
        return;
      }

      // Basic migration guard
      imported.version = imported.version || 1;
      imported.selectedMonth = imported.selectedMonth || (getConfigMonths().slice(-1)[0] || "2025-01");

      // Optional: merge vs replace. MVP: ask, then do it.
      const doMerge = confirm("Import mode:\nOK = Merge with existing data\nCancel = Replace existing data");
      const current = ensureDefaultState();

      let next;
      if (doMerge) {
        const seen = new Set(current.events.map(e => e.id));
        const merged = current.events.slice();
        for (const ev of imported.events) {
          if (ev && ev.id && !seen.has(ev.id)) merged.push(ev);
        }
        next = { ...current, events: merged };
      } else {
        next = imported;
      }

      saveState(next);
      buildMonthTabs(next);
      renderAll();
      alert("Import complete.");
    } catch (e) {
      alert("Failed to import JSON. File may be corrupted.");
    }
  };
  reader.readAsText(file);
}

function resetAll() {
  const ok = confirm("This will delete ALL local tracker data in this browser. Continue?");
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEY);
  ensureDefaultState();
  renderAll();
}

function renderAll() {
  const state = ensureDefaultState();
  // Keep state.selectedMonth aligned with UI selection
  if (selectedMonth) {
    state.selectedMonth = selectedMonth;
    saveState(state);
  }

  const isAllMonths = selectedMonth === "all";

  // Hide quick add and event log for "All Months" view
  els.quickAddCard.style.display = isAllMonths ? "none" : "block";
  els.eventLogCard.style.display = isAllMonths ? "none" : "block";

  if (!isAllMonths) {
    renderQuickAdd();
    renderEventsTable();
  }
  renderSummary();
}

function pct(x) {
  return `${(x * 100).toFixed(1)}%`;
}

function countBy(arr, keyFn) {
  const out = {};
  for (const item of arr) {
    const k = keyFn(item);
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

function renderKeyValueList(obj) {
  const entries = Object.entries(obj || {}).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return "<span class='subtle'>—</span>";
  return entries.map(([k, v]) => `<span class="badge">${escapeHtml(k)}: ${escapeHtml(String(v))}</span>`).join(" ");
}

function formatPrizeOrCredits(e) {
  if (e.resultType === "credits") return `${e.creditsAmount || 0} credits`;
  if (e.resultType === "prize") return e.prize?.name || "Unknown prize";
  if (e.resultType === "ash") return "Ash";
  return "";
}

function capitalize(s) {
  return String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ---------- theme toggle ---------- */

const THEME_KEY = "myvmk_theme";

function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) || "dark";
}

function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  if (theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
    els.themeIcon.textContent = "🌙";
    els.themeLabel.textContent = "Dark";
  } else {
    document.documentElement.removeAttribute("data-theme");
    els.themeIcon.textContent = "☀️";
    els.themeLabel.textContent = "Light";
  }
}

function toggleTheme() {
  const current = getStoredTheme();
  setTheme(current === "dark" ? "light" : "dark");
}

/* ---------- init ---------- */

(function init() {
  const state = ensureDefaultState();

  // Initialize theme
  setTheme(getStoredTheme());
  els.themeToggle.addEventListener("click", toggleTheme);

  // Defaults
  els.dateInput.value = todayISO();

  // Populate month tabs from config + history
  buildMonthTabs(state);

  els.systemSelect.addEventListener("change", () => {
    renderQuickAdd();
    renderSummary();
  });

  // Key color button selection
  document.querySelectorAll(".key-color-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".key-color-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderQuickAdd();
    });
  });

  // Quantity quick button selection
  document.querySelectorAll(".qty-quick-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".qty-quick-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      els.customQty.value = btn.dataset.qty;
      updateQuantityHint();
    });
  });

  // Custom quantity input
  if (els.customQty) {
    els.customQty.addEventListener("input", () => {
      // Deselect quick buttons when user types custom value
      document.querySelectorAll(".qty-quick-btn").forEach(b => b.classList.remove("active"));
      updateQuantityHint();
    });
  }

  els.addCreditsBtn.addEventListener("click", addCreditsEvent);
  els.addAshBtn.addEventListener("click", addAshEvent);

  // Quick credit buttons
  document.querySelectorAll(".credit-quick-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const amount = Number(btn.dataset.credits);
      if (amount > 0) addQuickCreditsEvent(amount);
    });
  });

  els.exportBtn.addEventListener("click", exportData);
  els.importFile.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (f) importData(f);
    e.target.value = "";
  });

  els.resetBtn.addEventListener("click", resetAll);
  els.deleteMonthBtn.addEventListener("click", deleteSelectedMonth);

  renderAll();
})();
