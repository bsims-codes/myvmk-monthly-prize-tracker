/* app.js - MyVMK Monthly Prize Tracker (MVP)
   - Local storage only (no backend, no auth)
   - Event-based history with snapshot prize names
   - Monthly prize rollover via PRIZE_CONFIG
   - Export/Import JSON
*/

const STORAGE_KEY = "myvmk_prize_tracker_v1";
const BULK_SESSION_KEY = "myvmk_bulk_session_v1";

const els = {
  monthTabs: document.getElementById("monthTabs"),
  systemToggle: document.getElementById("systemToggle"),
  keyColorRow: document.getElementById("keyColorRow"),

  quickButtons: document.getElementById("quickButtons"),
  quickAddHint: document.getElementById("quickAddHint"),

  quantityRow: document.getElementById("quantityRow"),
  customQty: document.getElementById("customQty"),
  quantityHint: document.getElementById("quantityHint"),

  creditsRow: document.getElementById("creditsRow"),
  creditsAmount: document.getElementById("creditsAmount"),
  addCreditsBtn: document.getElementById("addCreditsBtn"),
  creditsTotalIndicator: document.getElementById("creditsTotalIndicator"),
  creditsTotalValue: document.getElementById("creditsTotalValue"),
  ashRow: document.getElementById("ashRow"),
  addAshBtn: document.getElementById("addAshBtn"),
  ashCountIndicator: document.getElementById("ashCountIndicator"),
  ashCountValue: document.getElementById("ashCountValue"),

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
  themeLabel: document.getElementById("themeLabel"),

  // Prize Gallery elements
  availablePrizesCard: document.getElementById("availablePrizesCard"),
  prizeGalleryHeader: document.getElementById("prizeGalleryHeader"),
  prizeGallery: document.getElementById("prizeGallery"),

  // Bulk Session Mode elements
  bulkSessionToggle: document.getElementById("bulkSessionToggle"),
  bulkSessionUI: document.getElementById("bulkSessionUI"),
  normalQuickAddUI: document.getElementById("normalQuickAddUI"),
  bulkTotalKeys: document.getElementById("bulkTotalKeys"),
  totalKeysDown: document.getElementById("totalKeysDown"),
  totalKeysUp: document.getElementById("totalKeysUp"),
  bulkBatchTotal: document.getElementById("bulkBatchTotal"),
  batchTotalDown: document.getElementById("batchTotalDown"),
  batchTotalUp: document.getElementById("batchTotalUp"),
  bulkRemainingKeys: document.getElementById("bulkRemainingKeys"),
  remainingKeysStat: document.getElementById("remainingKeysStat"),
  bulkWinsLogged: document.getElementById("bulkWinsLogged"),
  bulkInferredAsh: document.getElementById("bulkInferredAsh"),
  bulkWarning: document.getElementById("bulkWarning"),
  bulkPrizeList: document.getElementById("bulkPrizeList"),
  bulkCreditsSection: document.getElementById("bulkCreditsSection"),
  bulkCreditsGrid: document.getElementById("bulkCreditsGrid"),
  bulkCreditsCustomAmount: document.getElementById("bulkCreditsCustomAmount"),
  bulkCreditsCustomQty: document.getElementById("bulkCreditsCustomQty"),
  bulkCreditsCustomBtn: document.getElementById("bulkCreditsCustomBtn"),
  bulkReviewBtn: document.getElementById("bulkReviewBtn"),
  bulkClearBtn: document.getElementById("bulkClearBtn"),
  bulkConfirmModal: document.getElementById("bulkConfirmModal"),
  bulkConfirmSummary: document.getElementById("bulkConfirmSummary"),
  bulkConfirmSubmit: document.getElementById("bulkConfirmSubmit"),
  bulkConfirmCancel: document.getElementById("bulkConfirmCancel")
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
  const activeBtn = document.querySelector(".system-toggle-btn.active");
  return activeBtn ? activeBtn.dataset.system : "keys";
}

function getSelectedKeyColor() {
  const activeBtn = document.querySelector(".key-color-btn.active");
  return activeBtn ? activeBtn.dataset.color : "bronze";
}

function getSelectedDate() {
  return todayISO();
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

function updateAshCountIndicator() {
  if (!els.ashCountValue) return;
  const state = ensureDefaultState();
  const month = getSelectedMonth();
  const system = getSelectedSystem();

  // Count ash for current month and system
  const ashCount = state.events.filter(e =>
    e.month === month &&
    e.system === system &&
    e.resultType === "ash"
  ).length;

  els.ashCountValue.textContent = ashCount;
}

function updateCreditsTotalIndicator() {
  if (!els.creditsTotalValue) return;
  const state = ensureDefaultState();
  const month = getSelectedMonth();

  // Sum credits for current month (SITS only)
  const creditsTotal = state.events
    .filter(e => e.month === month && e.system === "sits" && e.resultType === "credits")
    .reduce((sum, e) => sum + (e.creditsAmount || 0), 0);

  els.creditsTotalValue.textContent = creditsTotal.toLocaleString();
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
    updateAshCountIndicator();
    updateCreditsTotalIndicator();
    return;
  }

  // Get prize counts for current month
  const monthEvents = state.events.filter(e => e.month === month);
  const prizeCounts = {};
  for (const e of monthEvents) {
    if (e.resultType === "prize" && e.prize?.id) {
      prizeCounts[e.prize.id] = (prizeCounts[e.prize.id] || 0) + 1;
    }
  }

  if (system === "keys") {
    const color = getSelectedKeyColor();
    const prizes = cfg.keys?.[color] || [];
    els.quickAddHint.textContent = `Chest Keys: Select the key color and tap the prize to log it.`;

    if (!prizes.length) {
      els.quickButtons.innerHTML = `<div class="subtle">bsims hasn't updated this month's prizes yet.</div>`;
      updateAshCountIndicator();
      updateCreditsTotalIndicator();
      return;
    }

    for (const p of prizes) {
      els.quickButtons.appendChild(makePrizeButton({
        label: p.name,
        badge: capitalize(color),
        badgeClass: "rare",
        count: prizeCounts[p.id] || 0,
        onClick: () => addPrizeEvent({
          system: "keys",
          keyColor: color,
          prizeId: p.id,
          prizeName: p.name
        }),
        onSubtract: () => removePrizeEvent(p.id)
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
      updateAshCountIndicator();
      updateCreditsTotalIndicator();
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
          count: prizeCounts[p.id] || 0,
          onClick: () => addPrizeEvent({
            system: "sits",
            sitsTier: sec.title.toLowerCase(), // common|rare|ultra
            prizeId: p.id,
            prizeName: fullPrizeName
          }),
          onSubtract: () => removePrizeEvent(p.id)
        }));
      }
    }
  }

  updateAshCountIndicator();
  updateCreditsTotalIndicator();
}

function makePrizeButton({ label, badge, badgeClass, onClick, count = 0, onSubtract }) {
  const btn = document.createElement("button");
  btn.className = "prize-btn";
  btn.type = "button";
  btn.innerHTML = `
    <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="prize-count${count > 0 ? ' has-count clickable' : ''}" title="${count > 0 ? 'Click to remove one' : ''}">${count}</span>
        <span style="font-weight:700;">${escapeHtml(label)}</span>
      </div>
      <span class="badge ${badgeClass}">${escapeHtml(badge)}</span>
    </div>
  `;

  // Main button click adds
  btn.addEventListener("click", (e) => {
    // Don't trigger if clicking the count badge
    if (e.target.classList.contains("prize-count")) return;
    onClick();
  });

  // Count badge click subtracts
  const countBadge = btn.querySelector(".prize-count");
  if (countBadge && count > 0 && onSubtract) {
    countBadge.addEventListener("click", (e) => {
      e.stopPropagation();
      onSubtract();
    });
  }

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

function removePrizeEvent(prizeId) {
  const state = ensureDefaultState();
  const month = getSelectedMonth();

  // Find the most recent event for this prize in the current month
  const idx = state.events.findLastIndex(e =>
    e.month === month &&
    e.resultType === "prize" &&
    e.prize?.id === prizeId
  );

  if (idx === -1) return;

  state.events.splice(idx, 1);
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

  // Hide quick add, event log, and prize gallery for "All Months" view
  els.quickAddCard.style.display = isAllMonths ? "none" : "block";
  els.eventLogCard.style.display = isAllMonths ? "none" : "block";
  els.availablePrizesCard.style.display = isAllMonths ? "none" : "block";

  if (!isAllMonths) {
    updateBulkSessionUI();
    renderQuickAdd();
    renderEventsTable();
    renderPrizeGallery();
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

/* ---------- Prize Gallery ---------- */

let selectedGallerySystem = "keys";

function renderPrizeGallery() {
  const month = getSelectedMonth();
  const cfg = getMonthConfig(month);

  els.prizeGallery.innerHTML = "";

  if (!cfg) {
    els.prizeGallery.innerHTML = `<div class="prize-gallery-empty">No prizes configured for ${escapeHtml(month)}.</div>`;
    return;
  }

  if (selectedGallerySystem === "sits") {
    renderSitsPrizeGallery(cfg);
  } else {
    renderKeysPrizeGallery(cfg);
  }
}

function renderSitsPrizeGallery(cfg) {
  if (!cfg.sits) {
    els.prizeGallery.innerHTML = `<div class="prize-gallery-empty">No SITS prizes configured.</div>`;
    return;
  }

  const month = getSelectedMonth();
  // Convert "December 2025" to "December-2025" for filename
  const monthFileName = month.replace(" ", "-");
  const imgPath = `./images/prizes/${monthFileName}-SITS.png`;

  els.prizeGallery.innerHTML = `
    <div class="prize-gallery-official">
      <img src="${imgPath}" alt="${escapeHtml(month)} SITS Prizes" onerror="this.parentElement.innerHTML='<div class=\\'prize-gallery-empty\\'>No official image available for ${escapeHtml(month)}.</div>'" />
    </div>
  `;

  /* --- INDIVIDUAL PRIZE IMAGES (commented out for future use) ---
  const theme = cfg.sits.theme || "";
  const tiers = [
    { name: "Ultra", items: cfg.sits.ultra || [], badgeClass: "ultra" },
    { name: "Rare", items: cfg.sits.rare || [], badgeClass: "rare" },
    { name: "Common", items: cfg.sits.common || [], badgeClass: "ok" }
  ];

  let hasAny = false;

  for (const tier of tiers) {
    for (const prize of tier.items) {
      hasAny = true;
      const item = document.createElement("div");
      item.className = "prize-gallery-item";

      const imgPath = `./images/prizes/${prize.id}.png`;
      const fullName = theme ? `${theme} ${prize.name}` : prize.name;

      item.innerHTML = `
        <img src="${imgPath}" alt="${escapeHtml(fullName)}" onerror="this.outerHTML='<div class=\\'no-image\\'>No image</div>'" />
        <div class="prize-label">${escapeHtml(prize.name)}</div>
        <span class="badge ${tier.badgeClass} prize-tier">${tier.name}</span>
      `;
      els.prizeGallery.appendChild(item);
    }
  }

  if (!hasAny) {
    els.prizeGallery.innerHTML = `<div class="prize-gallery-empty">No SITS prizes configured.</div>`;
  }
  --- END INDIVIDUAL PRIZE IMAGES --- */
}

function renderKeysPrizeGallery(cfg) {
  if (!cfg.keys) {
    els.prizeGallery.innerHTML = `<div class="prize-gallery-empty">No chest prizes configured.</div>`;
    return;
  }

  const month = getSelectedMonth();
  // Convert "December 2025" to "December-2025" for filename
  const monthFileName = month.replace(" ", "-");
  const imgPath = `./images/prizes/${monthFileName}-Chests.png`;

  els.prizeGallery.innerHTML = `
    <div class="prize-gallery-official">
      <img src="${imgPath}" alt="${escapeHtml(month)} Chest Prizes" onerror="this.parentElement.innerHTML='<div class=\\'prize-gallery-empty\\'>No official image available for ${escapeHtml(month)}.</div>'" />
    </div>
  `;

  /* --- INDIVIDUAL PRIZE IMAGES (commented out for future use) ---
  const colors = [
    { name: "Gold", key: "gold", badgeClass: "ultra" },
    { name: "Silver", key: "silver", badgeClass: "rare" },
    { name: "Bronze", key: "bronze", badgeClass: "ok" }
  ];

  let hasAny = false;

  for (const color of colors) {
    const prizes = cfg.keys[color.key] || [];
    for (const prize of prizes) {
      hasAny = true;
      const item = document.createElement("div");
      item.className = "prize-gallery-item";

      const imgPath = `./images/prizes/${prize.id}.png`;

      item.innerHTML = `
        <img src="${imgPath}" alt="${escapeHtml(prize.name)}" onerror="this.outerHTML='<div class=\\'no-image\\'>No image</div>'" />
        <div class="prize-label">${escapeHtml(prize.name)}</div>
        <span class="badge ${color.badgeClass} prize-tier">${color.name}</span>
      `;
      els.prizeGallery.appendChild(item);
    }
  }

  if (!hasAny) {
    els.prizeGallery.innerHTML = `<div class="prize-gallery-empty">No chest prizes configured.</div>`;
  }
  --- END INDIVIDUAL PRIZE IMAGES --- */
}

function setGallerySystem(system) {
  selectedGallerySystem = system;

  // Update toggle buttons
  document.querySelectorAll(".gallery-toggle-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.system === system);
  });

  renderPrizeGallery();
}

const GALLERY_COLLAPSED_KEY = "myvmk_gallery_collapsed";

function isGalleryCollapsed() {
  return localStorage.getItem(GALLERY_COLLAPSED_KEY) === "true";
}

function toggleGalleryCollapse() {
  const card = els.availablePrizesCard;
  const isCollapsed = card.classList.toggle("collapsed");
  localStorage.setItem(GALLERY_COLLAPSED_KEY, isCollapsed);
}

function initGalleryCollapse() {
  if (isGalleryCollapsed()) {
    els.availablePrizesCard.classList.add("collapsed");
  }
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

/* ---------- Bulk Session Mode ---------- */

// Bulk session state structure:
// {
//   enabled: boolean,
//   batchTotal: number | null,
//   prizes: { [prizeId]: { name, tier, qty } },
//   credits: { [amount]: qty }
// }

function loadBulkSession() {
  try {
    const raw = localStorage.getItem(BULK_SESSION_KEY);
    if (!raw) return getDefaultBulkSession();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return getDefaultBulkSession();
    return parsed;
  } catch {
    return getDefaultBulkSession();
  }
}

function getDefaultBulkSession() {
  return {
    enabled: false,
    batchTotal: null,
    prizes: {},
    credits: {}
  };
}

function saveBulkSession(session) {
  localStorage.setItem(BULK_SESSION_KEY, JSON.stringify(session));
}

function isBulkSessionEnabled() {
  const session = loadBulkSession();
  return session.enabled;
}

function toggleBulkSessionMode() {
  const session = loadBulkSession();
  session.enabled = !session.enabled;
  saveBulkSession(session);
  updateBulkSessionUI();
}

function updateBulkSessionUI() {
  const session = loadBulkSession();
  const enabled = session.enabled;
  const system = getSelectedSystem();

  // Only show bulk session toggle for SITS
  const isSits = system === "sits";
  els.bulkSessionToggle.closest(".bulk-session-toggle-row").style.display = isSits ? "flex" : "none";

  // If not SITS, force normal UI
  if (!isSits) {
    els.bulkSessionUI.style.display = "none";
    els.normalQuickAddUI.style.display = "block";
    return;
  }

  els.bulkSessionToggle.checked = enabled;
  els.bulkSessionUI.style.display = enabled ? "block" : "none";
  els.normalQuickAddUI.style.display = enabled ? "none" : "block";

  if (enabled) {
    // Restore values from session
    if (session.totalKeys) {
      els.bulkTotalKeys.value = session.totalKeys;
    }
    if (session.batchTotal) {
      els.bulkBatchTotal.value = session.batchTotal;
    }
    renderBulkPrizeList();
    updateBulkStats();
  }
}

function renderBulkPrizeList() {
  const month = getSelectedMonth();
  const cfg = getMonthConfig(month);
  const session = loadBulkSession();

  els.bulkPrizeList.innerHTML = "";
  els.bulkCreditsGrid.innerHTML = "";

  if (!cfg || !cfg.sits) {
    els.bulkPrizeList.innerHTML = `<div class="subtle">No SITS prizes configured for ${escapeHtml(month)}.</div>`;
    els.bulkCreditsSection.style.display = "none";
    return;
  }

  const theme = cfg.sits.theme || "";
  const tiers = [
    { name: "common", label: "Common", items: cfg.sits.common || [] },
    { name: "rare", label: "Rare", items: cfg.sits.rare || [] },
    { name: "ultra", label: "Ultra", items: cfg.sits.ultra || [] }
  ];

  // Show theme header if configured
  if (theme) {
    const themeHeader = document.createElement("div");
    themeHeader.className = "sits-theme-header";
    themeHeader.style.gridColumn = "1 / -1";
    themeHeader.textContent = theme;
    els.bulkPrizeList.appendChild(themeHeader);
  }

  for (const tier of tiers) {
    for (const prize of tier.items) {
      const fullName = theme ? `${theme} ${prize.name}` : prize.name;
      const currentQty = session.prizes[prize.id]?.qty || 0;

      const item = document.createElement("div");
      item.className = "bulk-prize-item";
      item.innerHTML = `
        <span class="badge ${tier.name === 'common' ? 'ok' : tier.name === 'rare' ? 'rare' : 'ultra'}">${tier.label}</span>
        <span class="prize-name">${escapeHtml(prize.name)}</span>
        <div class="qty-stepper">
          <button type="button" class="qty-arrow qty-down" data-prize-id="${escapeHtml(prize.id)}" aria-label="Decrease">−</button>
          <input type="number" class="prize-qty-input" min="0" value="${currentQty}"
                 data-prize-id="${escapeHtml(prize.id)}"
                 data-prize-name="${escapeHtml(fullName)}"
                 data-tier="${tier.name}" />
          <button type="button" class="qty-arrow qty-up" data-prize-id="${escapeHtml(prize.id)}" aria-label="Increase">+</button>
        </div>
      `;
      els.bulkPrizeList.appendChild(item);
    }
  }

  // Bind prize quantity inputs
  els.bulkPrizeList.querySelectorAll(".prize-qty-input").forEach(input => {
    input.addEventListener("input", () => {
      const prizeId = input.dataset.prizeId;
      const prizeName = input.dataset.prizeName;
      const tier = input.dataset.tier;
      const qty = parseInt(input.value, 10) || 0;

      const session = loadBulkSession();
      if (qty > 0) {
        session.prizes[prizeId] = { name: prizeName, tier, qty };
      } else {
        delete session.prizes[prizeId];
      }
      saveBulkSession(session);
      updateBulkStats();
    });
  });

  // Bind arrow buttons for prize quantities
  els.bulkPrizeList.querySelectorAll(".qty-arrow").forEach(btn => {
    btn.addEventListener("click", () => {
      const prizeId = btn.dataset.prizeId;
      const input = els.bulkPrizeList.querySelector(`.prize-qty-input[data-prize-id="${prizeId}"]`);
      if (!input) return;

      let currentVal = parseInt(input.value, 10) || 0;
      if (btn.classList.contains("qty-up")) {
        currentVal++;
      } else if (btn.classList.contains("qty-down") && currentVal > 0) {
        currentVal--;
      }
      input.value = currentVal;
      input.dispatchEvent(new Event("input"));
    });
  });

  // Credits section
  const creditsEnabled = cfg.sits.creditsEnabled ?? true;
  els.bulkCreditsSection.style.display = creditsEnabled ? "block" : "none";

  if (creditsEnabled) {
    const creditAmounts = [250, 300, 500, 750];
    for (const amount of creditAmounts) {
      const currentQty = session.credits[amount] || 0;

      const item = document.createElement("div");
      item.className = "bulk-credit-item";
      item.innerHTML = `
        <span class="credit-label">${amount} credits</span>
        <div class="qty-stepper">
          <button type="button" class="qty-arrow qty-down" data-amount="${amount}" aria-label="Decrease">−</button>
          <input type="number" class="credit-qty-input" min="0" value="${currentQty}" data-amount="${amount}" />
          <button type="button" class="qty-arrow qty-up" data-amount="${amount}" aria-label="Increase">+</button>
        </div>
      `;
      els.bulkCreditsGrid.appendChild(item);
    }

    // Bind credit quantity inputs
    els.bulkCreditsGrid.querySelectorAll(".credit-qty-input").forEach(input => {
      input.addEventListener("input", () => {
        const amount = input.dataset.amount;
        const qty = parseInt(input.value, 10) || 0;

        const session = loadBulkSession();
        if (qty > 0) {
          session.credits[amount] = qty;
        } else {
          delete session.credits[amount];
        }
        saveBulkSession(session);
        updateBulkStats();
      });
    });

    // Bind arrow buttons for credit quantities
    els.bulkCreditsGrid.querySelectorAll(".qty-arrow").forEach(btn => {
      btn.addEventListener("click", () => {
        const amount = btn.dataset.amount;
        const input = els.bulkCreditsGrid.querySelector(`.credit-qty-input[data-amount="${amount}"]`);
        if (!input) return;

        let currentVal = parseInt(input.value, 10) || 0;
        if (btn.classList.contains("qty-up")) {
          currentVal++;
        } else if (btn.classList.contains("qty-down") && currentVal > 0) {
          currentVal--;
        }
        input.value = currentVal;
        input.dispatchEvent(new Event("input"));
      });
    });
  }
}

function updateBulkStats() {
  const session = loadBulkSession();
  const totalKeys = parseInt(els.bulkTotalKeys.value, 10) || 0;
  const batchTotal = parseInt(els.bulkBatchTotal.value, 10) || 0;

  // Save to session
  session.totalKeys = totalKeys || null;
  session.batchTotal = batchTotal || null;
  saveBulkSession(session);

  // Calculate total wins
  let totalWins = 0;

  // Count prize wins
  for (const prizeId in session.prizes) {
    totalWins += session.prizes[prizeId].qty || 0;
  }

  // Count credit wins
  for (const amount in session.credits) {
    totalWins += session.credits[amount] || 0;
  }

  // Calculate inferred ash
  let inferredAsh = batchTotal > 0 ? Math.max(0, batchTotal - totalWins) : 0;
  const winsExceedTotal = batchTotal > 0 && totalWins > batchTotal;

  // Calculate remaining keys
  const remainingKeys = totalKeys > 0 ? Math.max(0, totalKeys - batchTotal) : 0;

  // Update UI
  els.bulkWinsLogged.textContent = totalWins;
  els.bulkInferredAsh.textContent = inferredAsh;
  els.bulkWarning.style.display = winsExceedTotal ? "block" : "none";

  // Show/hide remaining keys stat
  if (totalKeys > 0) {
    els.remainingKeysStat.style.display = "block";
    els.bulkRemainingKeys.textContent = remainingKeys;
  } else {
    els.remainingKeysStat.style.display = "none";
  }
}

function addBulkCustomCredits() {
  const amount = parseInt(els.bulkCreditsCustomAmount.value, 10);
  const qty = parseInt(els.bulkCreditsCustomQty.value, 10) || 1;

  if (!amount || amount <= 0) {
    alert("Enter a valid credits amount.");
    return;
  }

  const session = loadBulkSession();
  session.credits[amount] = (session.credits[amount] || 0) + qty;
  saveBulkSession(session);

  // Clear inputs
  els.bulkCreditsCustomAmount.value = "";
  els.bulkCreditsCustomQty.value = "1";

  // Re-render to show in the grid if it's a standard amount, or just update stats
  renderBulkPrizeList();
  updateBulkStats();
}

function clearBulkSession() {
  if (!confirm("Clear all wins logged in this batch session?")) return;

  const session = loadBulkSession();
  session.prizes = {};
  session.credits = {};
  session.totalKeys = null;
  session.batchTotal = null;
  saveBulkSession(session);

  els.bulkTotalKeys.value = "";
  els.bulkBatchTotal.value = "";
  renderBulkPrizeList();
  updateBulkStats();
}

function showBulkReviewModal() {
  const session = loadBulkSession();
  const batchTotal = parseInt(els.bulkBatchTotal.value, 10) || 0;

  // Calculate totals
  let totalPrizes = 0;
  let totalCredits = 0;
  let totalCreditsAmount = 0;

  for (const prizeId in session.prizes) {
    totalPrizes += session.prizes[prizeId].qty || 0;
  }

  for (const amount in session.credits) {
    const qty = session.credits[amount] || 0;
    totalCredits += qty;
    totalCreditsAmount += parseInt(amount, 10) * qty;
  }

  const totalWins = totalPrizes + totalCredits;
  const inferredAsh = batchTotal > 0 ? Math.max(0, batchTotal - totalWins) : 0;
  const winsExceedTotal = batchTotal > 0 && totalWins > batchTotal;

  // Build summary HTML
  let html = `
    <div class="confirm-row">
      <span class="confirm-label">Batch Total</span>
      <span class="confirm-value">${batchTotal || "Not set"}</span>
    </div>
    <div class="confirm-row">
      <span class="confirm-label">Total Wins</span>
      <span class="confirm-value">${totalWins}</span>
    </div>
    <div class="confirm-row">
      <span class="confirm-label">Inferred Ash</span>
      <span class="confirm-value">${inferredAsh}${winsExceedTotal ? " (wins exceed total!)" : ""}</span>
    </div>
  `;

  // Prize breakdown
  if (totalPrizes > 0) {
    html += `<div class="confirm-section"><div class="confirm-section-title">Prizes (${totalPrizes})</div>`;
    for (const prizeId in session.prizes) {
      const prize = session.prizes[prizeId];
      html += `<div class="confirm-item"><span>${escapeHtml(prize.name)}</span><span>${prize.qty}x</span></div>`;
    }
    html += `</div>`;
  }

  // Credits breakdown
  if (totalCredits > 0) {
    html += `<div class="confirm-section"><div class="confirm-section-title">Credits (${totalCredits} wins = ${totalCreditsAmount.toLocaleString()} total)</div>`;
    for (const amount in session.credits) {
      const qty = session.credits[amount];
      html += `<div class="confirm-item"><span>${amount} credits</span><span>${qty}x</span></div>`;
    }
    html += `</div>`;
  }

  // Ash
  if (inferredAsh > 0) {
    html += `<div class="confirm-section"><div class="confirm-section-title">Ash</div>`;
    html += `<div class="confirm-item"><span>Auto-calculated ash</span><span>${inferredAsh}x</span></div>`;
    html += `</div>`;
  }

  els.bulkConfirmSummary.innerHTML = html;
  els.bulkConfirmModal.style.display = "flex";
}

function hideBulkConfirmModal() {
  els.bulkConfirmModal.style.display = "none";
}

function submitBulkSession() {
  const state = ensureDefaultState();
  const session = loadBulkSession();
  const date = getSelectedDate();
  const month = getSelectedMonth();
  const batchTotal = parseInt(els.bulkBatchTotal.value, 10) || 0;

  // Calculate totals for ash
  let totalWins = 0;
  for (const prizeId in session.prizes) {
    totalWins += session.prizes[prizeId].qty || 0;
  }
  for (const amount in session.credits) {
    totalWins += session.credits[amount] || 0;
  }

  const inferredAsh = batchTotal > 0 ? Math.max(0, batchTotal - totalWins) : 0;

  // Add prize events
  for (const prizeId in session.prizes) {
    const prize = session.prizes[prizeId];
    for (let i = 0; i < prize.qty; i++) {
      state.events.push({
        id: cryptoId(),
        createdAt: new Date().toISOString(),
        date,
        month,
        system: "sits",
        keyColor: null,
        sitsTier: prize.tier,
        resultType: "prize",
        prize: { id: prizeId, name: prize.name },
        creditsAmount: null
      });
    }
  }

  // Add credit events
  for (const amount in session.credits) {
    const qty = session.credits[amount];
    for (let i = 0; i < qty; i++) {
      state.events.push({
        id: cryptoId(),
        createdAt: new Date().toISOString(),
        date,
        month,
        system: "sits",
        keyColor: null,
        sitsTier: null,
        resultType: "credits",
        prize: null,
        creditsAmount: parseInt(amount, 10)
      });
    }
  }

  // Add ash events
  for (let i = 0; i < inferredAsh; i++) {
    state.events.push({
      id: cryptoId(),
      createdAt: new Date().toISOString(),
      date,
      month,
      system: "sits",
      keyColor: null,
      sitsTier: null,
      resultType: "ash",
      prize: null,
      creditsAmount: null
    });
  }

  state.selectedMonth = month;
  saveState(state);

  // Clear bulk session (but keep enabled)
  const newSession = loadBulkSession();
  newSession.prizes = {};
  newSession.credits = {};
  newSession.totalKeys = null;
  newSession.batchTotal = null;
  saveBulkSession(newSession);

  // Hide modal and refresh
  hideBulkConfirmModal();
  els.bulkTotalKeys.value = "";
  els.bulkBatchTotal.value = "";
  renderBulkPrizeList();
  updateBulkStats();
  renderAll();

  alert(`Batch submitted: ${Object.keys(session.prizes).length > 0 ? Object.values(session.prizes).reduce((s, p) => s + p.qty, 0) + " prizes, " : ""}${Object.keys(session.credits).length > 0 ? Object.values(session.credits).reduce((s, q) => s + q, 0) + " credit wins, " : ""}${inferredAsh} ash added.`);
}

/* ---------- init ---------- */

(function init() {
  const state = ensureDefaultState();

  // Initialize theme
  setTheme(getStoredTheme());
  els.themeToggle.addEventListener("click", toggleTheme);

  // Populate month tabs from config + history
  buildMonthTabs(state);

  // System toggle (Chests/SITS) button selection
  document.querySelectorAll(".system-toggle-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".system-toggle-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      updateBulkSessionUI();
      renderQuickAdd();
      renderSummary();
      // Sync with gallery toggle
      setGallerySystem(btn.dataset.system);
    });
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

  // Bulk Session Mode event listeners
  els.bulkSessionToggle.addEventListener("change", toggleBulkSessionMode);
  els.bulkTotalKeys.addEventListener("input", updateBulkStats);
  els.bulkBatchTotal.addEventListener("input", updateBulkStats);

  // Stepper buttons for Total Keys
  els.totalKeysDown.addEventListener("click", () => {
    let val = parseInt(els.bulkTotalKeys.value, 10) || 0;
    if (val > 0) {
      els.bulkTotalKeys.value = val - 1;
      updateBulkStats();
    }
  });
  els.totalKeysUp.addEventListener("click", () => {
    let val = parseInt(els.bulkTotalKeys.value, 10) || 0;
    els.bulkTotalKeys.value = val + 1;
    updateBulkStats();
  });

  // Stepper buttons for Batch Total
  els.batchTotalDown.addEventListener("click", () => {
    let val = parseInt(els.bulkBatchTotal.value, 10) || 0;
    if (val > 0) {
      els.bulkBatchTotal.value = val - 1;
      updateBulkStats();
    }
  });
  els.batchTotalUp.addEventListener("click", () => {
    let val = parseInt(els.bulkBatchTotal.value, 10) || 0;
    els.bulkBatchTotal.value = val + 1;
    updateBulkStats();
  });

  els.bulkCreditsCustomBtn.addEventListener("click", addBulkCustomCredits);
  els.bulkReviewBtn.addEventListener("click", showBulkReviewModal);
  els.bulkClearBtn.addEventListener("click", clearBulkSession);
  els.bulkConfirmSubmit.addEventListener("click", submitBulkSession);
  els.bulkConfirmCancel.addEventListener("click", hideBulkConfirmModal);

  // Initialize bulk session UI state
  updateBulkSessionUI();

  // Prize gallery toggle buttons
  document.querySelectorAll(".gallery-toggle-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Don't trigger collapse when clicking toggle
      setGallerySystem(btn.dataset.system);
    });
  });

  // Prize gallery collapse
  els.prizeGalleryHeader.addEventListener("click", toggleGalleryCollapse);
  initGalleryCollapse();

  renderAll();
})();

/* ---------- Cloud Sync (GitHub Gist) ---------- */

const GITHUB_TOKEN_KEY = "myvmk_github_token";
const GIST_ID_KEY = "myvmk_gist_id";
const GIST_FILENAME = "myvmk-prize-tracker-data.json";

const cloudEls = {
  cloudSyncBtn: document.getElementById("cloudSyncBtn"),
  cloudSyncModal: document.getElementById("cloudSyncModal"),
  closeCloudSyncModal: document.getElementById("closeCloudSyncModal"),
  githubToken: document.getElementById("githubToken"),
  gistId: document.getElementById("gistId"),
  saveCloudSyncSettings: document.getElementById("saveCloudSyncSettings"),
  syncNow: document.getElementById("syncNow"),
  clearCloudSyncSettings: document.getElementById("clearCloudSyncSettings"),
  cloudSyncStatus: document.getElementById("cloudSyncStatus")
};

function loadGitHubSettings() {
  return {
    token: localStorage.getItem(GITHUB_TOKEN_KEY) || "",
    gistId: localStorage.getItem(GIST_ID_KEY) || ""
  };
}

function saveGitHubSettings(token, gistId) {
  if (token) {
    localStorage.setItem(GITHUB_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(GITHUB_TOKEN_KEY);
  }

  if (gistId) {
    localStorage.setItem(GIST_ID_KEY, gistId);
  } else {
    localStorage.removeItem(GIST_ID_KEY);
  }
}

function clearGitHubSettings() {
  localStorage.removeItem(GITHUB_TOKEN_KEY);
  localStorage.removeItem(GIST_ID_KEY);
}

function showCloudSyncModal() {
  const settings = loadGitHubSettings();
  cloudEls.githubToken.value = settings.token;
  cloudEls.gistId.value = settings.gistId;

  updateCloudSyncStatus();
  cloudEls.cloudSyncModal.style.display = "flex";
}

function hideCloudSyncModal() {
  cloudEls.cloudSyncModal.style.display = "none";
}

function updateCloudSyncStatus() {
  const settings = loadGitHubSettings();
  const hasToken = !!settings.token;
  const hasGist = !!settings.gistId;

  cloudEls.syncNow.disabled = !hasToken;

  if (hasToken && hasGist) {
    cloudEls.cloudSyncStatus.className = "cloud-sync-status success";
    cloudEls.cloudSyncStatus.innerHTML = `<strong>Connected</strong><br><span class="subtle small">Gist ID: ${escapeHtml(settings.gistId)}</span>`;
  } else if (hasToken) {
    cloudEls.cloudSyncStatus.className = "cloud-sync-status";
    cloudEls.cloudSyncStatus.innerHTML = `<strong>Token Saved</strong><br><span class="subtle small">Ready to sync. A new private Gist will be created on first sync.</span>`;
  } else {
    cloudEls.cloudSyncStatus.className = "cloud-sync-status";
    cloudEls.cloudSyncStatus.innerHTML = `<span class="subtle">Not configured. Follow the setup instructions below.</span>`;
  }
}

async function createNewGist(token, data) {
  const response = await fetch("https://api.github.com/gists", {
    method: "POST",
    headers: {
      "Authorization": `token ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/vnd.github.v3+json"
    },
    body: JSON.stringify({
      description: "MyVMK Prize Tracker - Synced Data",
      public: false,
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(data, null, 2)
        }
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `GitHub API error: ${response.status}`);
  }

  const gist = await response.json();
  return gist.id;
}

async function updateGist(token, gistId, data) {
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: "PATCH",
    headers: {
      "Authorization": `token ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/vnd.github.v3+json"
    },
    body: JSON.stringify({
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(data, null, 2)
        }
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `GitHub API error: ${response.status}`);
  }

  return await response.json();
}

async function fetchGist(token, gistId) {
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      "Authorization": `token ${token}`,
      "Accept": "application/vnd.github.v3+json"
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `GitHub API error: ${response.status}`);
  }

  const gist = await response.json();
  const fileContent = gist.files[GIST_FILENAME]?.content;

  if (!fileContent) {
    throw new Error("Data file not found in Gist");
  }

  return JSON.parse(fileContent);
}

function mergeStates(local, remote) {
  // Merge events by ID (deduplication)
  const seen = new Set();
  const merged = [];

  // Add all local events first
  for (const ev of local.events) {
    if (ev && ev.id) {
      seen.add(ev.id);
      merged.push(ev);
    }
  }

  // Add remote events that aren't already in local
  for (const ev of remote.events) {
    if (ev && ev.id && !seen.has(ev.id)) {
      seen.add(ev.id);
      merged.push(ev);
    }
  }

  // Sort by createdAt timestamp
  merged.sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return aTime - bTime;
  });

  // Return merged state, keeping local's selectedMonth
  return {
    ...local,
    events: merged,
    version: Math.max(local.version || 1, remote.version || 1)
  };
}

async function syncWithGitHub() {
  const settings = loadGitHubSettings();

  if (!settings.token) {
    alert("Please configure your GitHub token first.");
    showCloudSyncModal();
    return;
  }

  try {
    cloudEls.syncNow.disabled = true;
    cloudEls.syncNow.textContent = "Syncing...";

    const localState = ensureDefaultState();
    let mergedState = localState;

    if (settings.gistId) {
      // Fetch from existing Gist and merge
      try {
        const remoteState = await fetchGist(settings.token, settings.gistId);
        mergedState = mergeStates(localState, remoteState);

        // Save merged state locally
        saveState(mergedState);

        // Update Gist with merged state
        await updateGist(settings.token, settings.gistId, mergedState);

        cloudEls.cloudSyncStatus.className = "cloud-sync-status success";
        cloudEls.cloudSyncStatus.innerHTML = `<strong>Sync Complete!</strong><br><span class="subtle small">Last synced: ${new Date().toLocaleString()}</span>`;
      } catch (error) {
        throw new Error(`Failed to sync with existing Gist: ${error.message}`);
      }
    } else {
      // Create new Gist
      const newGistId = await createNewGist(settings.token, localState);
      saveGitHubSettings(settings.token, newGistId);

      cloudEls.gistId.value = newGistId;
      cloudEls.cloudSyncStatus.className = "cloud-sync-status success";
      cloudEls.cloudSyncStatus.innerHTML = `<strong>Sync Complete!</strong><br><span class="subtle small">New Gist created: ${escapeHtml(newGistId)}<br>Last synced: ${new Date().toLocaleString()}</span>`;
    }

    // Refresh UI
    renderAll();

    alert("Sync successful! Your data has been backed up to GitHub.");
  } catch (error) {
    cloudEls.cloudSyncStatus.className = "cloud-sync-status error";
    cloudEls.cloudSyncStatus.innerHTML = `<strong>Sync Failed</strong><br><span class="subtle small">${escapeHtml(error.message)}</span>`;
    alert(`Sync failed: ${error.message}`);
  } finally {
    cloudEls.syncNow.disabled = false;
    cloudEls.syncNow.textContent = "Sync Now";
  }
}

function saveCloudSyncSettingsHandler() {
  const token = cloudEls.githubToken.value.trim();
  const gistId = cloudEls.gistId.value.trim();

  if (!token) {
    alert("Please enter a GitHub Personal Access Token.");
    return;
  }

  saveGitHubSettings(token, gistId);
  updateCloudSyncStatus();
  alert("Settings saved! You can now use 'Sync Now' to back up your data.");
}

function clearCloudSyncSettingsHandler() {
  if (!confirm("This will remove your GitHub token and Gist ID from this browser. Your data in GitHub will NOT be deleted. Continue?")) {
    return;
  }

  clearGitHubSettings();
  cloudEls.githubToken.value = "";
  cloudEls.gistId.value = "";
  updateCloudSyncStatus();
  alert("Settings cleared.");
}

// Initialize Cloud Sync event listeners
if (cloudEls.cloudSyncBtn) {
  cloudEls.cloudSyncBtn.addEventListener("click", showCloudSyncModal);
}

if (cloudEls.closeCloudSyncModal) {
  cloudEls.closeCloudSyncModal.addEventListener("click", hideCloudSyncModal);
}

if (cloudEls.saveCloudSyncSettings) {
  cloudEls.saveCloudSyncSettings.addEventListener("click", saveCloudSyncSettingsHandler);
}

if (cloudEls.syncNow) {
  cloudEls.syncNow.addEventListener("click", syncWithGitHub);
}

if (cloudEls.clearCloudSyncSettings) {
  cloudEls.clearCloudSyncSettings.addEventListener("click", clearCloudSyncSettingsHandler);
}

/* ---------- Hamburger Menu Toggle ---------- */

const menuToggle = document.getElementById("menuToggle");
const dropdownMenu = document.getElementById("dropdownMenu");

function toggleDropdownMenu() {
  const isVisible = dropdownMenu.style.display === "block";
  dropdownMenu.style.display = isVisible ? "none" : "block";
}

function closeDropdownMenu() {
  dropdownMenu.style.display = "none";
}

if (menuToggle) {
  menuToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleDropdownMenu();
  });
}

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (dropdownMenu && !dropdownMenu.contains(e.target) && e.target !== menuToggle) {
    closeDropdownMenu();
  }
});

// Close dropdown when clicking a menu item
if (dropdownMenu) {
  dropdownMenu.addEventListener("click", (e) => {
    // Don't close if clicking on the file input label itself (let it open the file picker)
    if (e.target.tagName === "LABEL" || e.target.closest("label")) {
      // Keep menu open briefly for file picker
      setTimeout(closeDropdownMenu, 100);
    } else {
      closeDropdownMenu();
    }
  });
}
