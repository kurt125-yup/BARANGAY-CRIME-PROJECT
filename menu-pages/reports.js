(function () {
  const PAGE_KEY = "reports";
  const KEYS = {
    users: "b179_users",
    incidents: "b179_incidents",
    settings: "b179_settings",
    month: "b179_selected_month",
    activeUser: "b179_active_user"
  };

  const DEFAULT_USERS = [
    { name: "Barangay Captain", username: "admin", password: "admin123", role: "admin" },
    { name: "Crime Analyst", username: "analyst", password: "analyst123", role: "captain" },
    { name: "Tanod Patrol A", username: "tanod1", password: "tanod123", role: "tanod" }
  ];

  const DEFAULT_INCIDENTS = [
    { id: 1, type: "Theft", date: "2026-06-03", time: "21:40", location: "Purok 3 - Amparo Main Road", description: "Motorcycle parts reported missing after a night shift.", reportedBy: "Tanod Patrol A", status: "Under Review", danger: 3, lat: 14.7298, lng: 120.9836, action: "Priority patrol and close monitoring" },
    { id: 2, type: "Suspicious Activity", date: "2026-06-05", time: "19:10", location: "Amparo Market Perimeter", description: "Loitering and repeated lookout behavior near the market gate.", reportedBy: "Tanod Patrol B", status: "Patrolled", danger: 2, lat: 14.7279, lng: 120.9818, action: "Scheduled patrol and resident reminder" },
    { id: 3, type: "Noise Complaint", date: "2026-06-07", time: "23:05", location: "Purok 5 - Lopez Compound", description: "Loud gathering reported late at night.", reportedBy: "Resident Call-In", status: "Resolved", danger: 1, lat: 14.7266, lng: 120.9847, action: "Afternoon patrol monitoring" },
    { id: 4, type: "Physical Injury", date: "2026-06-11", time: "20:25", location: "Barangay Hall Access Road", description: "Altercation outside the barangay hall.", reportedBy: "Tanod Patrol C", status: "Under Review", danger: 3, lat: 14.7285, lng: 120.9824, action: "Priority patrol and incident validation" },
    { id: 5, type: "Traffic Obstruction", date: "2026-06-14", time: "17:55", location: "Amparo Main Gate", description: "Unauthorized parking blocked the lane for 30 minutes.", reportedBy: "Tanod Patrol A", status: "Resolved", danger: 2, lat: 14.7301, lng: 120.9827, action: "Scheduled patrol and warning notice" },
    { id: 6, type: "Domestic Disturbance", date: "2026-06-19", time: "22:15", location: "Purok 2 - Riverside Walk", description: "Neighbor dispute escalated into a domestic disturbance call.", reportedBy: "Tanod Patrol B", status: "Under Review", danger: 3, lat: 14.7258, lng: 120.9851, action: "Priority patrol and close monitoring" },
    { id: 7, type: "Vandalism", date: "2026-07-02", time: "18:20", location: "Purok 4 - Basketball Court", description: "Paint damage and broken community signage reported after dusk.", reportedBy: "Resident Call-In", status: "Under Review", danger: 2, lat: 14.7272, lng: 120.9832, action: "Increased awareness and scheduled patrol" },
    { id: 8, type: "Suspicious Activity", date: "2026-07-09", time: "20:55", location: "Amparo Elementary Back Gate", description: "Unknown individuals observed watching school perimeter.", reportedBy: "Tanod Patrol C", status: "Patrolled", danger: 3, lat: 14.7289, lng: 120.9843, action: "Priority patrol and incident validation" }
  ];

  const DEFAULT_SETTINGS = { centerLat: 14.7287, centerLng: 120.9834, highRiskThreshold: 3, moderateThreshold: 2, patrolWindow: "19:00 - 23:00" };
  const ROLE_LABELS = { admin: "Administrator", captain: "Decision-Maker", tanod: "Field User" };
  const state = { month: "2026-06", users: [], incidents: [], settings: {}, activeUser: null };

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function ensureSeedData() {
    if (!localStorage.getItem(KEYS.users)) localStorage.setItem(KEYS.users, JSON.stringify(DEFAULT_USERS));
    if (!localStorage.getItem(KEYS.incidents)) localStorage.setItem(KEYS.incidents, JSON.stringify(DEFAULT_INCIDENTS));
    if (!localStorage.getItem(KEYS.settings)) localStorage.setItem(KEYS.settings, JSON.stringify(DEFAULT_SETTINGS));
  }

  function loadState() {
    ensureSeedData();
    state.users = readJson(KEYS.users, DEFAULT_USERS);
    state.incidents = readJson(KEYS.incidents, DEFAULT_INCIDENTS);
    state.settings = readJson(KEYS.settings, DEFAULT_SETTINGS);
    state.activeUser = readJson(KEYS.activeUser, state.users[0] || DEFAULT_USERS[0]);
    const savedMonth = localStorage.getItem(KEYS.month);
    state.month = savedMonth || "2026-06";
  }

  function getMonthlyIncidents() { return state.incidents.filter(item => item.date.startsWith(state.month)); }
  function formatMonthLabel(value) { const [year, month] = value.split("-").map(Number); const date = new Date(year, month - 1, 1); return date.toLocaleDateString("en-US", { month: "long", year: "numeric" }); }
  function dangerInfo(level) { if (level >= 3) return { label: "Level 3 - High Risk", className: "level3" }; if (level === 2) return { label: "Level 2 - Moderate Danger", className: "level2" }; return { label: "Level 1 - Low Danger", className: "level1" }; }

  function statCard(title, value, note) {
    return `
      <article class="stat-card">
        <span class="label">${title}</span>
        <strong>${value}</strong>
        <p>${note}</p>
      </article>
    `;
  }

  function renderIncidentTable(rows) {
    if (!rows.length) return '<div class="subtle-banner"><strong>No incident records for selected month.</strong></div>';
    return `
      <div class="table-wrap">
        <table class="menu-table">
          <thead><tr><th>Type</th><th>Date / Time</th><th>Location</th><th>Reporter</th><th>Status</th><th>Risk</th></tr></thead>
          <tbody>
            ${rows.map((record) => {
              const info = dangerInfo(Number(record.danger));
              return `<tr><td><strong>${record.type}</strong><div class="mini-note">${record.description}</div></td><td>${record.date}<br><span class="mini-note">${record.time}</span></td><td>${record.location}</td><td>${record.reportedBy}</td><td>${record.status}</td><td><span class="pill ${info.className}">${info.label}</span></td></tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function exportCSV() {
    const incidents = getMonthlyIncidents();
    const headers = ["Incident ID", "Type", "Date", "Time", "Location", "Description", "Reported By", "Status", "Danger Level", "Latitude", "Longitude", "Recommended Action"];
    const rows = incidents.map(item => [item.id, item.type, item.date, item.time, item.location, item.description, item.reportedBy, item.status, dangerInfo(Number(item.danger)).label, item.lat, item.lng, item.action]);
    const csv = [headers, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `barangay-179-incident-report-${state.month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function renderReportsPage() {
    const incidents = getMonthlyIncidents();
    const level3 = incidents.filter(item => Number(item.danger) === 3).length;
    const level2 = incidents.filter(item => Number(item.danger) === 2).length;
    const total = incidents.length;
    const hotspotCount = new Set(incidents.map(item => item.location)).size;
    const trendLabel = level3 >= 2 ? "High Risk Focus" : level2 >= 2 ? "Moderate Risk Focus" : "Stable Overview";

    document.getElementById("content").innerHTML = `
      <div class="card-panel report-hero-panel">
        <div class="section-title">
          <div><h3>Reports Control Center</h3><p class="stat-note">Polished monthly summaries, exports, and decision-ready reporting for Barangay 179.</p></div>
          <label class="field" style="margin:0; min-width:240px;">
            <span style="display:block; margin-bottom:8px; font-size:13px; font-weight:800; color:#334155;">Reporting Month</span>
            <select id="reportsMonth">${getAvailableMonths().map(month => `<option value="${month}" ${month === state.month ? "selected" : ""}>${formatMonthLabel(month)}</option>`).join("")}</select>
          </label>
        </div>
      </div>
      <div class="grid-3 report-action-grid">
        <article class="card-panel report-action-card"><div class="section-title"><h3>Printable Incident Summary</h3><span>Ready for print</span></div><p class="stat-note">Formal report with totals, hotspot summaries, risk classification highlights, and patrol guidance.</p><div class="btn-row"><button class="btn btn-primary" type="button" data-print-report>Print / Export PDF</button></div></article>
        <article class="card-panel report-action-card"><div class="section-title"><h3>Export CSV</h3><span>Spreadsheet ready</span></div><p class="stat-note">Download selected-month incident records in CSV format for documentation and data analysis.</p><div class="btn-row"><button class="btn btn-success" type="button" data-export-csv>Export CSV</button></div></article>
        <article class="card-panel report-action-card"><div class="section-title"><h3>Patrol Recommendation Export</h3><span>Decision support</span></div><p class="stat-note">Open patrol recommendations derived from CART analytics and risk scoring.</p><div class="btn-row"><button class="btn btn-warning" type="button" data-go-to="patrol">View Patrol Report</button></div></article>
      </div>
      <div class="grid-4 report-summary-grid">
        ${statCard("Total Incidents", total, "Recorded in the selected month.")}
        ${statCard("High-Risk Records", level3, "Level 3 incidents requiring immediate attention.")}
        ${statCard("Moderate-Risk Records", level2, "Level 2 incidents requiring monitoring.")}
        ${statCard("Hotspot Areas", hotspotCount, "Distinct barangay locations with reported incidents.")}
      </div>
      <div class="grid-2 report-data-grid">
        <article class="card-panel"><div class="section-title"><h3>Incident Records</h3><span>${total} record${total === 1 ? "" : "s"}</span></div>${renderIncidentTable(incidents.sort((a, b) => b.date.localeCompare(a.date)))}</article>
        <article class="card-panel report-panel-highlight"><div class="section-title"><h3>Monthly Executive Summary</h3><span>${trendLabel}</span></div><div class="field-grid"><p class="stat-note"><strong>Coverage:</strong> Barangay 179, Amparo, Caloocan City.</p><p class="stat-note"><strong>Risk Overview:</strong> ${trendLabel} based on incident count, danger level, and hotspot spread.</p><p class="stat-note"><strong>Recommendation:</strong> Prioritize Level 3 hotspots for immediate patrol and monitor Level 2 locations for early response.</p></div><div class="report-metrics"><div><strong>${level3 + level2}</strong><span>Higher-risk records</span></div><div><strong>${hotspotCount}</strong><span>Hotspot zones</span></div></div></article>
      </div>
    `;

    document.getElementById("reportsMonth").addEventListener("change", (event) => {
      state.month = event.target.value;
      localStorage.setItem(KEYS.month, state.month);
      renderReportsPage();
    });

    document.querySelectorAll("[data-go-to]").forEach((button) => {
      button.addEventListener("click", () => {
        const page = button.dataset.goTo;
        if (page) window.location.href = `./${page}.html`;
      });
    });

    document.querySelectorAll("[data-print-report]").forEach((button) => button.addEventListener("click", () => window.print()));
    document.querySelectorAll("[data-export-csv]").forEach((button) => button.addEventListener("click", exportCSV));
  }

  function getAvailableMonths() {
    const months = [...new Set(state.incidents.map(item => item.date.slice(0, 7)))].sort().reverse();
    return months.length ? months : [state.month];
  }

  function setPageMeta() {
    document.title = "Reports";
    const titleNode = document.getElementById("pageTitle");
    const subtitleNode = document.getElementById("pageSubtitle");
    if (titleNode) titleNode.textContent = "Reports Module";
    if (subtitleNode) subtitleNode.textContent = "Printable summaries and export-ready reports for barangay officials.";
    const activeUserChip = document.getElementById("activeUserChip");
    if (activeUserChip) {
      const user = state.activeUser || state.users[0] || DEFAULT_USERS[0];
      activeUserChip.textContent = `${user.name} • ${ROLE_LABELS[user.role] || user.role}`;
    }
    document.querySelectorAll("[data-nav]").forEach((link) => {
      link.classList.toggle("active", link.dataset.nav === PAGE_KEY);
      link.setAttribute("aria-current", link.dataset.nav === PAGE_KEY ? "page" : "false");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadState();
    setPageMeta();
    renderReportsPage();
  });
})();

