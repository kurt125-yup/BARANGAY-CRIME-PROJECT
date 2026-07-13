(function () {
  const KEYS = {
    users: "b179_users",
    incidents: "b179_incidents",
    settings: "b179_settings",
    month: "b179_selected_month",
    activeUser: "b179_active_user",
    pendingLogin: "b179_pending_login"
  };

  const ROLE_LABELS = {
    admin: "Administrator",
    captain: "Decision-Maker",
    tanod: "Field User"
  };

  const PAGE_CONFIGS = {
    dashboard: {
      title: "Business Intelligence Dashboard",
      subtitle: "Monthly-filtered incident analytics for Barangay 179, Amparo, Caloocan City."
    },
    fieldDashboard: {
      title: "Field User Dashboard",
      subtitle: "Same barangay risk map and patrol recommendations seen by other authorized users."
    },
    incidents: {
      title: "Incident Record Management",
      subtitle: "Administrator module for adding, editing, deleting, searching, and filtering incident records."
    },
    map: {
      title: "Barangay Amparo Risk Map",
      subtitle: "Barangay-focused barrier map with on-point high-risk hotspot overlays."
    },
    cart: {
      title: "CART Decision Tree Analytics",
      subtitle: "Simulated CART-based risk classification using incident patterns and location history."
    },
    patrol: {
      title: "Patrol Decision Support",
      subtitle: "Priority patrol recommendations based on risk level, recurrence, and incident timing."
    },
    reports: {
      title: "Reports Module",
      subtitle: "Printable summaries and export-ready reports for barangay officials."
    },
    users: {
      title: "User Management",
      subtitle: "Administrator-only module for managing role-based system users."
    },
    settings: {
      title: "System Settings",
      subtitle: "Prototype configuration for barangay boundary, thresholds, and dashboard behavior."
    }
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

  const DEFAULT_SETTINGS = {
    centerLat: 14.7287,
    centerLng: 120.9834,
    highRiskThreshold: 3,
    moderateThreshold: 2,
    patrolWindow: "19:00 - 23:00"
  };

  const state = {
    page: document.body.dataset.page,
    month: "2026-06",
    editingIncidentId: null,
    incidentSearch: "",
    activeUser: null,
    users: [],
    incidents: [],
    settings: {}
  };

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function ensureSeedData() {
    if (!localStorage.getItem(KEYS.users)) saveJson(KEYS.users, DEFAULT_USERS);
    if (!localStorage.getItem(KEYS.incidents)) saveJson(KEYS.incidents, DEFAULT_INCIDENTS);
    if (!localStorage.getItem(KEYS.settings)) saveJson(KEYS.settings, DEFAULT_SETTINGS);
  }

  function syncPendingLogin() {
    const pendingRaw = localStorage.getItem(KEYS.pendingLogin);
    if (!pendingRaw) return;

    try {
      const pending = JSON.parse(pendingRaw);
      const users = readJson(KEYS.users, DEFAULT_USERS);
      const activeUser = users.find(item => item.username === pending.username) || users[0] || DEFAULT_USERS[0];
      if (activeUser) {
        localStorage.setItem(KEYS.activeUser, JSON.stringify(activeUser));
      }
      localStorage.removeItem(KEYS.pendingLogin);
    } catch {
      localStorage.removeItem(KEYS.pendingLogin);
    }
  }

  function loadState() {
    ensureSeedData();
    syncPendingLogin();

    state.users = readJson(KEYS.users, DEFAULT_USERS);
    state.incidents = readJson(KEYS.incidents, DEFAULT_INCIDENTS);
    state.settings = readJson(KEYS.settings, DEFAULT_SETTINGS);
    state.activeUser = readJson(KEYS.activeUser, state.users[0] || DEFAULT_USERS[0]);

    const storedMonth = localStorage.getItem(KEYS.month);
    state.month = storedMonth || getAvailableMonths()[0] || "2026-06";

    if (!getAvailableMonths().includes(state.month)) {
      state.month = getAvailableMonths()[0] || state.month;
    }
  }

  function getAvailableMonths() {
    const months = [...new Set(state.incidents.map(item => item.date.slice(0, 7)))].sort().reverse();
    return months.length ? months : [state.month];
  }

  function formatMonthLabel(value) {
    const [year, month] = value.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  function getMonthlyIncidents(monthValue = state.month) {
    return state.incidents.filter(item => item.date.startsWith(monthValue));
  }

  function countBy(items, keyFn) {
    return items.reduce((acc, item) => {
      const key = keyFn(item);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  function mostCommon(items, keyFn) {
    const counts = countBy(items, keyFn);
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return entries[0] || ["None", 0];
  }

  function dangerInfo(level) {
    if (level >= 3) {
      return { label: "Level 3 - High Risk", action: "Priority patrol and close monitoring", className: "level3" };
    }
    if (level === 2) {
      return { label: "Level 2 - Moderate Danger", action: "Scheduled patrol and resident reminder", className: "level2" };
    }
    return { label: "Level 1 - Low Danger", action: "Normal monitoring and awareness round", className: "level1" };
  }

  function monthOptions(selected) {
    return getAvailableMonths().map(month => `<option value="${month}" ${month === selected ? "selected" : ""}>${formatMonthLabel(month)}</option>`).join("");
  }

  function renderMonthSelect(id, label = "Reporting Month") {
    return `
      <label class="field" style="margin:0; min-width:220px;">
        <span style="display:block; margin-bottom:8px; font-size:13px; font-weight:800; color:#334155;">${escapeHtml(label)}</span>
        <select data-month-select id="${id}">${monthOptions(state.month)}</select>
      </label>
    `;
  }

  function statCard(title, value, note) {
    return `
      <article class="stat-card">
        <span class="label">${escapeHtml(title)}</span>
        <strong>${escapeHtml(value)}</strong>
        <p>${escapeHtml(note)}</p>
      </article>
    `;
  }

  function renderEmptyState(message) {
    return `<div class="subtle-banner"><strong>${escapeHtml(message)}</strong></div>`;
  }

  function renderBarChart(items, keyFn) {
    const counts = countBy(items, keyFn);
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return renderEmptyState("No data available for this month.");

    const max = Math.max(...entries.map(([, count]) => count), 1);
    return `<div class="chart-list">${entries.map(([label, count]) => `
      <div class="chart-row">
        <div class="chart-row-header"><strong>${escapeHtml(label)}</strong><span>${count}</span></div>
        <div class="chart-track"><div class="chart-fill" style="width:${(count / max) * 100}%"></div></div>
      </div>
    `).join("")}</div>`;
  }

  function renderDonutChart(items, keyFn) {
    const counts = countBy(items, keyFn);
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return renderEmptyState("No distribution data for this month.");

    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    const colors = ["#16a34a", "#ca8a04", "#dc2626"];
    let start = 0;
    const segments = entries.map(([label, count], index) => {
      const pct = (count / total) * 100;
      const end = start + pct;
      const segment = `${colors[index % colors.length]} ${start}% ${end}%`;
      start = end;
      return segment;
    }).join(", ");

    return `
      <div class="donut-wrap">
        <div class="donut" style="background: conic-gradient(${segments});"><div class="donut-value"><div style="font-size: 2rem; line-height: 1;">${total}</div><div class="muted-text" style="font-size: 12px; font-weight: 800;">Records</div></div></div>
        <div class="field-grid" style="min-width: 220px; flex: 1;">${entries.map(([label, count], index) => `
          <div class="legend-item"><span class="dot ${index === 0 ? "green" : index === 1 ? "yellow" : "red"}"></span><span>${escapeHtml(label)}</span><strong style="margin-left:auto;">${count}</strong></div>
        `).join("")}</div>
      </div>
    `;
  }

  function renderLineChart(items) {
    if (!items.length) return renderEmptyState("No trend data for this month.");

    const byDay = countBy(items, item => item.date.slice(8));
    const entries = Object.entries(byDay).sort((a, b) => Number(a[0]) - Number(b[0]));
    const max = Math.max(...entries.map(([, count]) => count), 1);
    const width = 600;
    const height = 220;
    const step = entries.length > 1 ? width / (entries.length - 1) : width;
    const points = entries.map(([day, count], index) => {
      const x = index * step;
      const y = height - 30 - ((count / max) * 150);
      return { day, count, x, y };
    });
    const polyline = points.map(point => `${point.x},${point.y}`).join(" ");

    return `
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="220" preserveAspectRatio="none" role="img" aria-label="Incident trend line chart">
        <defs><linearGradient id="trendGradient" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stop-color="#2563eb" /><stop offset="100%" stop-color="#06b6d4" /></linearGradient></defs>
        <polyline fill="none" stroke="url(#trendGradient)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" points="${polyline}" />
        ${points.map(point => `<circle cx="${point.x}" cy="${point.y}" r="5" fill="#0f172a" /><text x="${point.x}" y="${height - 6}" text-anchor="middle" font-size="12" fill="#64748b">${point.day}</text>`).join("")}
      </svg>
    `;
  }

  function renderIncidentTable(records, { interactive = false, idPrefix = "row" } = {}) {
    if (!records.length) return renderEmptyState("No incident records match the current filter.");

    return `
      <div class="table-wrap">
        <table class="menu-table">
          <thead><tr><th>Type</th><th>Date / Time</th><th>Location</th><th>Reporter</th><th>Status</th><th>Risk</th>${interactive ? "<th>Actions</th>" : ""}</tr></thead>
          <tbody>
            ${records.map(record => {
              const info = dangerInfo(Number(record.danger));
              return `
                <tr>
                  <td><strong>${escapeHtml(record.type)}</strong><div class="mini-note">${escapeHtml(record.description)}</div></td>
                  <td>${escapeHtml(record.date)}<br><span class="mini-note">${escapeHtml(record.time)}</span></td>
                  <td>${escapeHtml(record.location)}</td>
                  <td>${escapeHtml(record.reportedBy)}</td>
                  <td>${escapeHtml(record.status)}</td>
                  <td><span class="pill ${info.className}">${escapeHtml(info.label)}</span></td>
                  ${interactive ? `<td><div class="btn-row"><button class="btn btn-light" type="button" data-edit-record="${idPrefix}-${record.id}">Edit</button><button class="btn btn-danger" type="button" data-delete-record="${idPrefix}-${record.id}">Delete</button></div></td>` : ""}
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderHotspotRanking(records) {
    const groups = Object.values(records.reduce((acc, incident) => {
      if (!acc[incident.location]) {
        acc[incident.location] = { location: incident.location, count: 0, maxDanger: 1, incidents: [] };
      }
      acc[incident.location].count += 1;
      acc[incident.location].maxDanger = Math.max(acc[incident.location].maxDanger, Number(incident.danger));
      acc[incident.location].incidents.push(incident);
      return acc;
    }, {})).sort((a, b) => b.count - a.count);

    if (!groups.length) return renderEmptyState("No hotspot ranking for this month.");

    return `<div class="field-grid">${groups.map((group, index) => {
      const info = dangerInfo(group.maxDanger);
      const sample = group.incidents[0];
      return `
        <article class="card-panel" style="padding: 18px;">
          <div class="section-title" style="margin-bottom: 10px;"><h3>#${index + 1} ${escapeHtml(group.location)}</h3><span>${group.count} record/s</span></div>
          <p class="stat-note" style="margin-top:0;">${escapeHtml(info.label)} • ${escapeHtml(sample.type)} • ${escapeHtml(sample.date)}</p>
          <div class="btn-row"><span class="pill ${info.className}">${escapeHtml(info.action)}</span></div>
        </article>
      `;
    }).join("")}</div>`;
  }

  function monthShift(value, delta) {
    const [year, month] = value.split("-").map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function getAnalytics(monthValue = state.month) {
    const incidents = getMonthlyIncidents(monthValue);
    const allIncidents = state.incidents;
    const latestDate = incidents.slice().sort((a, b) => b.date.localeCompare(a.date))[0]?.date || `${monthValue}-01`;
    const topType = mostCommon(incidents, item => item.type)[0];
    const topLocation = mostCommon(incidents.filter(item => Number(item.danger) >= 2), item => item.location)[0];
    const peakTime = mostCommon(incidents, item => `${item.time.slice(0, 2)}:00`)[0];
    const highRiskCount = incidents.filter(item => Number(item.danger) >= 2).length;
    const previousMonth = monthShift(monthValue, -1);
    const previousCount = allIncidents.filter(item => item.date.startsWith(previousMonth)).length;
    const monthlyChange = previousCount ? Math.round(((incidents.length - previousCount) / previousCount) * 100) : 0;

    return {
      total: incidents.length,
      latestDay: incidents.filter(item => item.date === latestDate).length,
      monthlyChange: previousCount ? `${monthlyChange >= 0 ? "+" : ""}${monthlyChange}%` : "New month",
      priorityZones: new Set(incidents.filter(item => Number(item.danger) >= 2).map(item => item.location)).size,
      commonType: topType,
      highRiskLocation: topLocation,
      peakTime,
      selectedMonthLabel: formatMonthLabel(monthValue),
      trend: incidents.length ? `The selected month shows ${incidents.length} incidents with ${highRiskCount} higher-risk records.` : "No incidents were recorded in the selected month.",
      predictedSummary: incidents.length ? `CART-inspired output suggests ${highRiskCount >= 3 ? "elevated" : highRiskCount >= 1 ? "moderate" : "low"} patrol attention.` : "No classification available.",
      incidents
    };
  }

  function renderDashboardPage() {
    const analytics = getAnalytics();
    const incidents = analytics.incidents;

    return `
      <div class="card-panel"><div class="section-title"><div><h3>Monthly Analytics Control</h3><p class="stat-note">All dashboard cards, charts, hotspot table, patrol priorities, and map data use the same selected month.</p></div>${renderMonthSelect("dashboardMonth")}</div></div>
      <div class="grid-4">${statCard("Monthly Incidents", analytics.total, `Total recorded incidents for ${analytics.selectedMonthLabel}.`)}${statCard("Latest Active Day", analytics.latestDay, "Incidents recorded on the latest date available in this month.")}${statCard("Month Change", analytics.monthlyChange, "Comparison against the previous month with records.")}${statCard("Priority Zones", analytics.priorityZones, "High-risk locations that need stronger patrol visibility.")}</div>
      <div class="grid-4">${statCard("Common Incident", analytics.commonType, "Most frequently reported incident category for this month.")}${statCard("Highest-Risk Area", analytics.highRiskLocation, "Location with repeated moderate or high-risk reports.")}${statCard("Peak Time", analytics.peakTime, "Most common incident hour in this selected month.")}${statCard("Predicted Risk", analytics.predictedSummary, "CART-inspired monthly risk summary.")}</div>
      <div class="grid-2"><article class="card-panel"><div class="section-title"><h3>Incident Types</h3><span>${analytics.selectedMonthLabel}</span></div>${renderBarChart(incidents, item => item.type)}</article><article class="card-panel"><div class="section-title"><h3>Danger Level Distribution</h3><span>${analytics.selectedMonthLabel}</span></div>${renderDonutChart(incidents, item => dangerInfo(Number(item.danger)).label)}</article><article class="card-panel"><div class="section-title"><h3>Crime Trend Over Time</h3><span>${analytics.selectedMonthLabel}</span></div>${renderLineChart(incidents)}</article><article class="card-panel"><div class="section-title"><h3>Peak Incident Hours</h3><span>${analytics.selectedMonthLabel}</span></div>${renderBarChart(incidents, item => `${item.time.slice(0, 2)}:00`)}</article></div>
      <div class="grid-2"><article class="card-panel"><div class="section-title"><h3>Recent Incident Table</h3><span>${analytics.selectedMonthLabel}</span></div>${renderIncidentTable(incidents.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6))}</article><article class="card-panel"><div class="section-title"><h3>Top Hotspot Areas</h3><span>${analytics.selectedMonthLabel}</span></div>${renderHotspotRanking(incidents)}</article></div>
      <article class="card-panel"><div class="section-title"><h3>Risk Trend Summary</h3><span>BI Interpretation</span></div><p class="stat-note">${escapeHtml(analytics.trend)} ${escapeHtml(analytics.predictedSummary)} The module analyzes incident patterns by location, date, time, incident type, recurrence, and risk level only.</p></article>
    `;
  }

  function renderFieldDashboardPage() {
    const recommendations = generatePatrolRecommendations().slice(0, 3);
    return `
      <div class="card-panel"><div class="section-title"><div><h3>Shared Field View</h3><p class="stat-note">The Field User sees the same month-based hotspot data and barangay map view used by Admin and Decision-Makers.</p></div>${renderMonthSelect("fieldDashboardMonth")}</div></div>
      <div class="grid-3">${statCard("Assigned Focus", "Hotspots", "View-only patrol guidance for field monitoring.")}${statCard("Warning Zones", recommendations.length, "Priority zones requiring tanod attention.")}${statCard("Main Patrol Time", state.settings.patrolWindow, "Based on repeated evening incident patterns.")}</div>
      <div class="grid-2"><article class="card-panel"><div class="section-title"><h3>Immediate Patrol Priorities</h3><span>Field View</span></div><div class="field-grid">${recommendations.map((item, index) => renderRecommendationCard(item, index + 1)).join("")}</div></article><article class="card-panel"><div class="section-title"><h3>Field User Access</h3><span>Limited View</span></div><p class="stat-note">Barangay tanods can view hotspot maps, assigned patrol areas, warning zones, and patrol recommendations. This account cannot add, edit, delete, export, or manage records.</p><div class="btn-row"><button class="btn btn-primary" type="button" data-go-to="map">Open Barangay Risk Map</button><button class="btn btn-warning" type="button" data-go-to="patrol">View Patrol Support</button></div></article></div>
    `;
  }

  function getMapBounds(records) {
    const latitudes = records.map(item => Number(item.lat));
    const longitudes = records.map(item => Number(item.lng));
    const minLat = Math.min(...latitudes) - 0.0015;
    const maxLat = Math.max(...latitudes) + 0.0015;
    const minLng = Math.min(...longitudes) - 0.0015;
    const maxLng = Math.max(...longitudes) + 0.0015;
    return { minLat, maxLat, minLng, maxLng };
  }

  function projectPoint(lat, lng, bounds) {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
    const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * 100;
    return { left: Math.max(6, Math.min(94, x)), top: Math.max(8, Math.min(92, y)) };
  }

  function renderMapPage() {
    const incidents = getMonthlyIncidents();
    const bounds = getMapBounds(incidents.length ? incidents : state.incidents);
    return `
      <div class="card-panel"><div class="section-title"><div><h3>Shared Barangay Risk Map Control</h3><p class="stat-note">Admin, Decision-Maker, and Field User all see the same map, same month, same hotspot coordinates, and same barangay boundary.</p></div>${renderMonthSelect("mapMonth")}</div></div>
      <div class="grid-3">${statCard("Map Focus", "Barangay 179", "Default center is set to Barangay 179, Amparo, Caloocan City.")}${statCard("Barrier Mode", "Active", "Full barangay boundary mask and high-risk hotspot overlays.")}${statCard("Visible Hotspots", incidents.length ? new Set(incidents.map(item => item.location)).size : 0, "Hotspot zones are based on the selected month and exact incident coordinates.")}</div>
      <article class="card-panel"><div class="section-title"><h3>Barangay Amparo / Barangay 179 Risk Map</h3><span>${formatMonthLabel(state.month)}</span></div><div class="map-board"><div class="map-grid"></div><div class="map-boundary"></div>${incidents.map((incident, index) => { const info = dangerInfo(Number(incident.danger)); const point = projectPoint(Number(incident.lat), Number(incident.lng), bounds); return `<div class="map-pin ${info.className}" style="left:${point.left}%; top:${point.top}%;"><span>${index + 1}</span></div><div class="map-marker-label" style="left:${point.left}%; top:${point.top}%;">${escapeHtml(incident.location)}</div>`; }).join("")}</div><br><div class="legend"><span class="legend-item"><span class="dot green"></span> Level 1 - Low Danger</span><span class="legend-item"><span class="dot yellow"></span> Level 2 - Moderate Danger</span><span class="legend-item"><span class="dot red"></span> Level 3 - High Risk / Considerable Danger</span></div></article>
      <article class="card-panel"><div class="section-title"><h3>Map Hotspot List</h3><span>${formatMonthLabel(state.month)}</span></div>${renderHotspotRanking(incidents)}</article>
    `;
  }

  function cartPredict(input) {
    const highRiskTypes = ["Theft", "Physical Injury", "Suspicious Activity", "Domestic Disturbance"];
    const hour = Number(input.time.split(":")[0]);
    let score = 0;
    if (highRiskTypes.includes(input.type)) score += 2;
    if (input.repeats >= 3) score += 2;
    if (hour >= 19 || hour <= 4) score += 1;
    if (["Friday", "Saturday", "Sunday"].includes(input.day)) score += 1;
    if (input.previousRisk === "High") score += 2;
    if (input.frequency === "High") score += 2;
    if (input.location.toLowerCase().includes("purok 3") || input.location.toLowerCase().includes("market")) score += 1;

    let level = 1;
    if (score >= 6) level = 3;
    else if (score >= 3) level = 2;

    const confidence = Math.min(96, 58 + score * 6 + input.repeats * 2);
    let explanation = "The area has low or manageable risk indicators based on the given inputs.";
    let action = "Normal monitoring.";
    if (level === 2) {
      explanation = "The system detected moderate risk due to repeated incidents, timing, or prior risk history.";
      action = "Increase awareness and schedule patrol visibility.";
    }
    if (level === 3) {
      explanation = "The system detected repeated high-risk patterns based on incident type, recurrence, location history, and evening or late-night timing.";
      action = "Priority patrol, close monitoring, and additional tanod visibility.";
    }
    return { level, confidence, explanation, action };
  }

  function renderCartResult(result) {
    const info = dangerInfo(result.level);
    return `<div class="section-title"><h3>Prediction Result</h3><span>${result.confidence}% Confidence</span></div><p><span class="pill ${info.className}">${escapeHtml(info.label)}</span></p><p class="stat-note"><strong>Risk Explanation:</strong> ${escapeHtml(result.explanation)}</p><p class="stat-note"><strong>Suggested Patrol Action:</strong> ${escapeHtml(result.action)}</p><div class="subtle-banner"><strong>Decision Path:</strong> The classifier checks type, recurrence, time, day, location history, and incident frequency before assigning a level.</div>`;
  }

  function renderCartPage() {
    const sample = cartPredict({ type: "Theft", repeats: 4, time: "21:30", day: "Saturday", location: "Purok 3 - Amparo Main Road", previousRisk: "High", frequency: "High" });
    return `<div class="grid-2"><article class="card-panel"><div class="section-title"><h3>Simulated CART Risk Classifier</h3><span>Prototype Model</span></div><form id="cartForm"><div class="form-grid"><div class="field"><label>Incident Type</label><select id="cartType"><option>Theft</option><option>Physical Injury</option><option>Noise Complaint</option><option>Vandalism</option><option>Suspicious Activity</option><option>Traffic Obstruction</option><option>Curfew Violation</option><option>Domestic Disturbance</option></select></div><div class="field"><label>Repeated Incidents</label><input id="cartRepeats" type="number" min="0" value="4" /></div><div class="field"><label>Time of Occurrence</label><input id="cartTime" type="time" value="21:30" /></div><div class="field"><label>Day of Week</label><select id="cartDay"><option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option><option selected>Saturday</option><option>Sunday</option></select></div><div class="field"><label>Location / Purok / Street</label><input id="cartLocation" type="text" value="Purok 3 - Amparo Main Road" /></div><div class="field"><label>Previous Risk History</label><select id="cartHistory"><option>Low</option><option>Moderate</option><option selected>High</option></select></div><div class="field"><label>Incident Frequency</label><select id="cartFrequency"><option>Low</option><option>Moderate</option><option selected>High</option></select></div></div><br><div class="btn-row"><button class="btn btn-primary" type="submit">Run CART Analysis</button><button class="btn btn-light" type="button" data-go-to="patrol">Open Patrol Support</button></div></form></article><article class="card-panel" id="cartResult">${renderCartResult(sample)}</article></div><article class="card-panel"><div class="section-title"><h3>Decision Tree Rule Explanation</h3><span>Simulated CART Path</span></div><div class="field-grid"><div class="subtle-banner"><strong>Root Node:</strong> Incident Pattern - The system evaluates incident type, repeated incidents, time, day, location, history, and frequency.</div><div class="subtle-banner"><strong>Low Pattern Branch:</strong> Low frequency, daytime occurrence, and no repeated hotspot history usually produce Level 1.</div><div class="subtle-banner"><strong>Risk Pattern Branch:</strong> Repeated incidents, night timing, risky incident types, and prior hotspot history increase classification.</div><div class="subtle-banner"><strong>Example Rule:</strong> If theft incidents repeatedly occur at night in the same area, the system classifies the location as Level 3 - High Crime / Considerable Danger and recommends increased patrol visibility.</div></div></article>`;
  }

  function generatePatrolRecommendations() {
    const incidents = getMonthlyIncidents();
    const grouped = incidents.reduce((acc, incident) => {
      if (!acc[incident.location]) {
        acc[incident.location] = { location: incident.location, incidents: [], maxDanger: 1, score: 0 };
      }
      acc[incident.location].incidents.push(incident);
      acc[incident.location].maxDanger = Math.max(acc[incident.location].maxDanger, Number(incident.danger));
      const hour = Number(incident.time.split(":")[0]);
      acc[incident.location].score += Number(incident.danger) * 3 + (hour >= 19 || hour <= 4 ? 2 : 0);
      return acc;
    }, {});

    return Object.values(grouped).map(group => {
      const topType = mostCommon(group.incidents, item => item.type)[0];
      const topHour = mostCommon(group.incidents, item => `${item.time.slice(0, 2)}:00`)[0];
      const info = dangerInfo(group.maxDanger);
      return { location: group.location, riskLevel: group.maxDanger, incidentPattern: `${topType} incidents, commonly around ${topHour}`, recommendedTime: group.maxDanger === 3 ? "7:00 PM - 11:00 PM" : group.maxDanger === 2 ? "4:00 PM - 8:00 PM" : "Routine schedule", reason: `Detected ${group.incidents.length} record/s with ${info.label}.`, tanods: group.maxDanger === 3 ? 4 : group.maxDanger === 2 ? 3 : 2, priority: group.maxDanger === 3 ? "High Priority" : group.maxDanger === 2 ? "Medium Priority" : "Normal Priority", score: group.score };
    }).sort((a, b) => b.score - a.score);
  }

  function renderRecommendationCard(rec, index) {
    const info = dangerInfo(rec.riskLevel);
    return `<article class="card-panel" style="padding: 18px;"><div class="section-title"><h3>#${index} ${escapeHtml(rec.location)}</h3><span class="pill ${info.className}">${escapeHtml(rec.priority)}</span></div><p><span class="pill ${info.className}">${escapeHtml(info.label)}</span></p><p class="stat-note"><strong>Recommended Patrol Time:</strong> ${escapeHtml(rec.recommendedTime)}</p><p class="stat-note"><strong>Reason:</strong> ${escapeHtml(rec.reason)}</p><p class="stat-note"><strong>Incident Pattern:</strong> ${escapeHtml(rec.incidentPattern)}</p><p class="stat-note"><strong>Suggested Number of Tanods:</strong> ${rec.tanods}</p><p class="stat-note"><strong>Suggested Action:</strong> ${escapeHtml(info.action)}</p></article>`;
  }

  function renderPatrolPage() {
    const recommendations = generatePatrolRecommendations();
    return `<div class="card-panel"><div class="section-title"><div><h3>Monthly Patrol Decision Filter</h3><p class="stat-note">Patrol recommendations use the same selected month as the dashboard and map.</p></div>${renderMonthSelect("patrolMonth")}</div></div><div class="grid-3">${statCard("First Patrol Area", recommendations[0]?.location || "None", "Highest ranked patrol priority zone.")}${statCard("Recommended Time", recommendations[0]?.recommendedTime || "Routine", "Suggested patrol window based on incident timing.")}${statCard("Tanods Needed", recommendations[0]?.tanods || 2, "Suggested manpower for the top priority zone.")}</div><article class="card-panel"><div class="section-title"><h3>Patrol Recommendations</h3><span>${recommendations.length} zone/s</span></div><div class="field-grid">${recommendations.length ? recommendations.map((item, index) => renderRecommendationCard(item, index + 1)).join("") : renderEmptyState("No patrol recommendation for the selected month.")}</div></article>`;
  }

  function renderReportsPage() {
    const incidents = getMonthlyIncidents();
    const level3 = incidents.filter(item => Number(item.danger) === 3).length;
    const level2 = incidents.filter(item => Number(item.danger) === 2).length;
    const level1 = incidents.filter(item => Number(item.danger) === 1).length;
    return `<div class="card-panel"><div class="section-title"><div><h3>Report Month Filter</h3><p class="stat-note">Reports follow the same shared monthly filter.</p></div>${renderMonthSelect("reportsMonth")}</div></div><div class="grid-3"><article class="card-panel"><div class="section-title"><h3>Printable Incident Summary</h3><span>Ready for print</span></div><p class="stat-note">Formal report containing incident totals, hotspot summaries, risk classifications, and recommended patrol actions.</p><div class="btn-row"><button class="btn btn-primary" type="button" data-print-report>Print / Export PDF</button></div></article><article class="card-panel"><div class="section-title"><h3>Export CSV</h3><span>Spreadsheet export</span></div><p class="stat-note">Download selected-month incident records in spreadsheet-ready CSV format for documentation and testing.</p><div class="btn-row"><button class="btn btn-success" type="button" data-export-csv>Export CSV</button></div></article><article class="card-panel"><div class="section-title"><h3>Patrol Recommendation Report</h3><span>Decision support</span></div><p class="stat-note">Generate priority patrol guidance based on simulated CART and BI risk indicators.</p><div class="btn-row"><button class="btn btn-warning" type="button" data-go-to="patrol">View Patrol Report</button></div></article></div><article class="card-panel"><div class="section-title"><h3>Barangay 179 Monthly Crime Trend Report</h3><span>${formatMonthLabel(state.month)}</span></div><p class="stat-note">System Name: Barangay 179 Crime Intelligence and Patrol Decision Support System<br>Coverage Area: Barangay 179, Amparo, Caloocan City<br>Report Type: Incident Summary, Hotspot Summary, Patrol Recommendation, and Risk Classification Report</p><br><div class="grid-4">${statCard("Total Incidents", incidents.length, "Recorded in selected month.")}${statCard("Level 3 Records", level3, "High-risk danger indicators.")}${statCard("Level 2 Records", level2, "Moderate danger indicators.")}${statCard("Level 1 Records", level1, "Low danger indicators.")}</div><br><div class="section-title"><h3>Risk Classification Report</h3><span>CART Simulation Output</span></div>${renderIncidentTable(incidents.sort((a, b) => b.date.localeCompare(a.date)))}</article><article class="card-panel"><div class="section-title"><h3>Hotspot Summary</h3><span>Barangay-Level Pattern Analysis</span></div>${renderHotspotRanking(incidents)}</article>`;
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
    toast("CSV report exported.");
  }

  function renderUsersPage() {
    const users = state.users;
    return `<div class="grid-2"><article class="card-panel"><div class="section-title"><h3>Add System User</h3><span>Administrator Only</span></div><form id="userForm" class="field-grid"><div class="field"><label>Name</label><input id="newName" required placeholder="Full name or position" /></div><div class="field"><label>Username</label><input id="newUsername" required placeholder="username" /></div><div class="field"><label>Password</label><input id="newPassword" required placeholder="password" /></div><div class="field"><label>Role</label><select id="newRole"><option value="admin">Administrator</option><option value="captain">Decision-Maker</option><option value="tanod">Field User</option></select></div><div class="btn-row"><button class="btn btn-primary" type="submit">Add User</button></div></form></article><article class="card-panel"><div class="section-title"><h3>Role Access Rules</h3><span>System Security</span></div><p class="stat-note"><strong>Administrator:</strong> Full access to records, users, reports, maps, analytics, and settings.<br><br><strong>Decision-Maker:</strong> View-only access to reports, heatmaps, CART analytics, and patrol recommendations.<br><br><strong>Field User:</strong> Limited view access to patrol recommendations, hotspot maps, assigned areas, and warning zones.</p></article></div><article class="card-panel"><div class="section-title"><h3>System Users</h3><span>${users.length} account/s</span></div>${renderUserTable(users)}</article>`;
  }

  function renderUserTable(users) {
    return `<div class="table-wrap"><table class="menu-table"><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Password</th><th>Actions</th></tr></thead><tbody>${users.map(user => `<tr><td><strong>${escapeHtml(user.name)}</strong></td><td>${escapeHtml(user.username)}</td><td>${escapeHtml(ROLE_LABELS[user.role] || user.role)}</td><td>${escapeHtml(user.password)}</td><td><button class="btn btn-danger" type="button" data-delete-user="${escapeHtml(user.username)}">Delete</button></td></tr>`).join("")}</tbody></table></div>`;
  }

  function renderSettingsPage() {
    return `<div class="grid-2"><article class="card-panel"><div class="section-title"><h3>Barangay Map Settings</h3><span>Configuration</span></div><form id="settingsForm" class="field-grid"><div class="field"><label>Default Map Center Latitude</label><input id="centerLat" type="number" step="0.0001" value="${state.settings.centerLat}" /></div><div class="field"><label>Default Map Center Longitude</label><input id="centerLng" type="number" step="0.0001" value="${state.settings.centerLng}" /></div><div class="field"><label>High Risk Threshold</label><input id="highRiskThreshold" type="number" min="1" max="3" value="${state.settings.highRiskThreshold}" /></div><div class="field"><label>Moderate Risk Threshold</label><input id="moderateThreshold" type="number" min="1" max="3" value="${state.settings.moderateThreshold}" /></div><div class="field"><label>Patrol Window</label><input id="patrolWindow" type="text" value="${escapeHtml(state.settings.patrolWindow)}" /></div><div class="btn-row"><button class="btn btn-primary" type="submit">Save Settings</button></div></form></article><article class="card-panel"><div class="section-title"><h3>Risk Classification Settings</h3><span>CART Simulation</span></div><div class="field-grid"><div class="subtle-banner"><strong>Level 1 Rule:</strong> Low frequency, daytime, no repeated hotspot history.</div><div class="subtle-banner"><strong>Level 2 Rule:</strong> Moderate recurrence, scheduled patrol recommended.</div><div class="subtle-banner"><strong>Level 3 Rule:</strong> Repeated incidents, high-risk type, night time, prior hotspot history.</div></div></article></div><article class="card-panel"><div class="section-title"><h3>System Reset</h3><span>Prototype Testing</span></div><p class="stat-note">Resetting will restore the original sample users and dummy incident records.</p><div class="btn-row"><button class="btn btn-warning" type="button" data-reset-sample-data>Reset Sample Data</button><button class="btn btn-danger" type="button" data-clear-all-data>Clear All Data</button></div></article>`;
  }

  function renderIncidentsPage() {
    const filterRecords = getMonthlyIncidents();
    const query = state.incidentSearch.trim().toLowerCase();
    const filtered = state.incidents.filter(item => {
      const matchesMonth = item.date.startsWith(state.month);
      const matchesQuery = !query || [item.type, item.location, item.description, item.reportedBy, item.status].some(value => String(value).toLowerCase().includes(query));
      return matchesMonth && matchesQuery;
    }).sort((a, b) => b.date.localeCompare(a.date));
    const editing = state.editingIncidentId ? state.incidents.find(item => String(item.id) === String(state.editingIncidentId)) : null;

    return `<div class="card-panel"><div class="section-title"><div><h3>Incident Search and Month Filter</h3><p class="stat-note">Add, edit, delete, search, and filter incident records without leaving this page.</p></div><div class="btn-row"><label class="field" style="margin:0; min-width:240px;"><span style="display:block; margin-bottom:8px; font-size:13px; font-weight:800; color:#334155;">Search Records</span><input id="incidentSearch" type="search" placeholder="Type a location, reporter, or incident type" value="${escapeHtml(state.incidentSearch)}" /></label>${renderMonthSelect("incidentsMonth")}</div></div></div><div class="grid-2"><article class="card-panel"><div class="section-title"><h3>${editing ? "Edit Incident" : "Add Incident"}</h3><span>${editing ? `Editing #${editing.id}` : "New record"}</span></div><form id="incidentForm" class="field-grid"><input type="hidden" id="incidentId" value="${editing ? escapeHtml(editing.id) : ""}" /><div class="form-grid"><div class="field"><label>Incident Type</label><input id="incidentType" required value="${escapeHtml(editing?.type || "")}" placeholder="Theft" /></div><div class="field"><label>Incident Date</label><input id="incidentDate" required type="date" value="${escapeHtml(editing?.date || `${state.month}-01`)}" /></div><div class="field"><label>Incident Time</label><input id="incidentTime" required type="time" value="${escapeHtml(editing?.time || "21:00")}" /></div><div class="field"><label>Status</label><select id="incidentStatus"><option ${editing?.status === "Pending" ? "selected" : ""}>Pending</option><option ${editing?.status === "Under Review" ? "selected" : ""}>Under Review</option><option ${editing?.status === "Patrolled" ? "selected" : ""}>Patrolled</option><option ${editing?.status === "Resolved" ? "selected" : ""}>Resolved</option></select></div><div class="field"><label>Location</label><input id="incidentLocation" required value="${escapeHtml(editing?.location || "")}" placeholder="Purok 3 - Amparo Main Road" /></div><div class="field"><label>Reported By</label><input id="incidentReportedBy" required value="${escapeHtml(editing?.reportedBy || "")}" placeholder="Tanod Patrol A" /></div><div class="field"><label>Danger Level</label><select id="incidentDanger"><option value="1" ${Number(editing?.danger) === 1 ? "selected" : ""}>1 - Low</option><option value="2" ${Number(editing?.danger) === 2 ? "selected" : ""}>2 - Moderate</option><option value="3" ${Number(editing?.danger) === 3 ? "selected" : ""}>3 - High</option></select></div><div class="field"><label>Recommended Action</label><input id="incidentAction" value="${escapeHtml(editing?.action || "")}" placeholder="Priority patrol and close monitoring" /></div><div class="field"><label>Latitude</label><input id="incidentLat" type="number" step="0.0001" required value="${escapeHtml(editing?.lat || state.settings.centerLat)}" /></div><div class="field"><label>Longitude</label><input id="incidentLng" type="number" step="0.0001" required value="${escapeHtml(editing?.lng || state.settings.centerLng)}" /></div></div><div class="field"><label>Description</label><textarea id="incidentDescription" required placeholder="Short narrative of the incident">${escapeHtml(editing?.description || "")}</textarea></div><div class="btn-row"><button class="btn btn-primary" type="submit">${editing ? "Update Incident" : "Save Incident"}</button><button class="btn btn-light" type="button" data-clear-incident-form>Clear Form</button></div></form></article><article class="card-panel"><div class="section-title"><h3>Monthly Snapshot</h3><span>${filterRecords.length} record/s</span></div><div class="field-grid">${statCard("Level 3", filterRecords.filter(item => Number(item.danger) === 3).length, "High-risk entries in the selected month.")}${statCard("Level 2", filterRecords.filter(item => Number(item.danger) === 2).length, "Moderate-risk entries in the selected month.")}${statCard("Level 1", filterRecords.filter(item => Number(item.danger) === 1).length, "Low-risk entries in the selected month.")}</div></article></div><article class="card-panel"><div class="section-title"><h3>Incident Records</h3><span>${filtered.length} matching record/s</span></div>${renderIncidentTable(filtered, { interactive: true, idPrefix: "incident" })}</article>`;
  }

  function bindPage(page) {
    document.querySelectorAll("[data-month-select]").forEach(select => {
      select.addEventListener("change", event => {
        state.month = event.target.value;
        localStorage.setItem(KEYS.month, state.month);
        renderPage(page);
      });
    });

    document.querySelectorAll("[data-go-to]").forEach(button => button.addEventListener("click", () => showPage(button.dataset.goTo)));
    document.querySelectorAll("[data-print-report]").forEach(button => button.addEventListener("click", () => window.print()));
    document.querySelectorAll("[data-export-csv]").forEach(button => button.addEventListener("click", exportCSV));

    document.querySelectorAll("[data-reset-sample-data]").forEach(button => button.addEventListener("click", () => {
      saveJson(KEYS.users, DEFAULT_USERS);
      saveJson(KEYS.incidents, DEFAULT_INCIDENTS);
      saveJson(KEYS.settings, DEFAULT_SETTINGS);
      localStorage.setItem(KEYS.month, "2026-06");
      state.editingIncidentId = null;
      state.incidentSearch = "";
      toast("Sample data restored.");
      loadState();
      renderPage(page);
    }));

    document.querySelectorAll("[data-clear-all-data]").forEach(button => button.addEventListener("click", () => {
      localStorage.removeItem(KEYS.users);
      localStorage.removeItem(KEYS.incidents);
      localStorage.removeItem(KEYS.settings);
      localStorage.removeItem(KEYS.month);
      localStorage.removeItem(KEYS.activeUser);
      state.editingIncidentId = null;
      state.incidentSearch = "";
      toast("All local data cleared.");
      loadState();
      renderPage(page);
    }));

    const settingsForm = $("#settingsForm");
    if (settingsForm) {
      settingsForm.addEventListener("submit", event => {
        event.preventDefault();
        const updated = { centerLat: Number($("#centerLat").value), centerLng: Number($("#centerLng").value), highRiskThreshold: Number($("#highRiskThreshold").value), moderateThreshold: Number($("#moderateThreshold").value), patrolWindow: $("#patrolWindow").value.trim() || DEFAULT_SETTINGS.patrolWindow };
        saveJson(KEYS.settings, updated);
        state.settings = updated;
        toast("Settings saved.");
        renderPage(page);
      });
    }

    const userForm = $("#userForm");
    if (userForm) {
      userForm.addEventListener("submit", event => {
        event.preventDefault();
        const username = $("#newUsername").value.trim();
        const users = readJson(KEYS.users, DEFAULT_USERS);
        if (users.some(item => item.username === username)) {
          toast("Username already exists.");
          return;
        }
        users.push({ name: $("#newName").value.trim(), username, password: $("#newPassword").value.trim(), role: $("#newRole").value });
        saveJson(KEYS.users, users);
        state.users = users;
        toast("User added.");
        renderPage(page);
      });
    }

    const searchInput = $("#incidentSearch");
    if (searchInput) {
      searchInput.addEventListener("input", event => {
        state.incidentSearch = event.target.value;
        renderPage(page);
      });
    }

    const incidentForm = $("#incidentForm");
    if (incidentForm) {
      incidentForm.addEventListener("submit", event => {
        event.preventDefault();
        const incidents = readJson(KEYS.incidents, DEFAULT_INCIDENTS);
        const isEditing = Boolean(state.editingIncidentId);
        const record = { id: isEditing ? Number(state.editingIncidentId) : nextIncidentId(incidents), type: $("#incidentType").value.trim(), date: $("#incidentDate").value, time: $("#incidentTime").value, location: $("#incidentLocation").value.trim(), description: $("#incidentDescription").value.trim(), reportedBy: $("#incidentReportedBy").value.trim(), status: $("#incidentStatus").value, danger: Number($("#incidentDanger").value), lat: Number($("#incidentLat").value), lng: Number($("#incidentLng").value), action: $("#incidentAction").value.trim() || dangerInfo(Number($("#incidentDanger").value)).action };
        if (isEditing) {
          const index = incidents.findIndex(item => String(item.id) === String(state.editingIncidentId));
          if (index >= 0) incidents[index] = record;
        } else {
          incidents.push(record);
        }
        saveJson(KEYS.incidents, incidents);
        state.incidents = incidents;
        state.month = record.date.slice(0, 7);
        localStorage.setItem(KEYS.month, state.month);
        state.editingIncidentId = null;
        toast(isEditing ? "Incident updated." : "Incident saved.");
        renderPage(page);
      });
    }

    document.querySelectorAll("[data-clear-incident-form]").forEach(button => button.addEventListener("click", () => { state.editingIncidentId = null; renderPage(page); }));
    document.querySelectorAll("[data-edit-record]").forEach(button => button.addEventListener("click", () => { const [, id] = button.dataset.editRecord.split("-"); state.editingIncidentId = Number(id); renderPage(page); }));
    document.querySelectorAll("[data-delete-record]").forEach(button => button.addEventListener("click", () => { const [, id] = button.dataset.deleteRecord.split("-"); const incidents = readJson(KEYS.incidents, DEFAULT_INCIDENTS).filter(item => String(item.id) !== String(id)); saveJson(KEYS.incidents, incidents); state.incidents = incidents; toast("Incident deleted."); renderPage(page); }));
    document.querySelectorAll("[data-delete-user]").forEach(button => button.addEventListener("click", () => { const username = button.dataset.deleteUser; const activeUser = state.activeUser || readJson(KEYS.activeUser, state.users[0] || DEFAULT_USERS[0]); if (activeUser && activeUser.username === username) { toast("You cannot delete the currently logged-in user."); return; } const users = readJson(KEYS.users, DEFAULT_USERS).filter(item => item.username !== username); saveJson(KEYS.users, users); state.users = users; toast("User deleted."); renderPage(page); }));

    const cartForm = $("#cartForm");
    if (cartForm) {
      cartForm.addEventListener("submit", event => {
        event.preventDefault();
        const result = cartPredict({ type: $("#cartType").value, repeats: Number($("#cartRepeats").value), time: $("#cartTime").value, day: $("#cartDay").value, location: $("#cartLocation").value, previousRisk: $("#cartHistory").value, frequency: $("#cartFrequency").value });
        const target = $("#cartResult");
        if (target) target.innerHTML = renderCartResult(result);
        toast("CART analysis generated.");
      });
    }
  }

  function nextIncidentId(records) {
    return records.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
  }

  function showPage(pageId) {
    if (!PAGE_CONFIGS[pageId]) return;
    window.location.href = `./${pageId}.html`;
  }

  function toast(message) {
    let node = $("#toast");
    if (!node) {
      node = document.createElement("div");
      node.id = "toast";
      node.className = "toast";
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(node._toastTimer);
    node._toastTimer = setTimeout(() => node.classList.remove("show"), 1800);
  }

  function renderPage(page) {
    const config = PAGE_CONFIGS[page];
    if (!config) return;

    document.title = config.title;
    const pageTitle = $("#pageTitle");
    const pageSubtitle = $("#pageSubtitle");
    const activeUserChip = $("#activeUserChip");
    const content = $("#content");
    if (pageTitle) pageTitle.textContent = config.title;
    if (pageSubtitle) pageSubtitle.textContent = config.subtitle;
    if (activeUserChip) {
      const user = state.activeUser || state.users[0] || DEFAULT_USERS[0];
      activeUserChip.textContent = `${user.name} • ${ROLE_LABELS[user.role] || user.role}`;
    }

    document.querySelectorAll("[data-nav]").forEach(link => {
      link.classList.toggle("active", link.dataset.nav === page);
      link.setAttribute("aria-current", link.dataset.nav === page ? "page" : "false");
    });

    if (!content) return;

    switch (page) {
      case "dashboard": content.innerHTML = renderDashboardPage(); break;
      case "fieldDashboard": content.innerHTML = renderFieldDashboardPage(); break;
      case "incidents": content.innerHTML = renderIncidentsPage(); break;
      case "map": content.innerHTML = renderMapPage(); break;
      case "cart": content.innerHTML = renderCartPage(); break;
      case "patrol": content.innerHTML = renderPatrolPage(); break;
      case "reports": content.innerHTML = renderReportsPage(); break;
      case "users": content.innerHTML = renderUsersPage(); break;
      case "settings": content.innerHTML = renderSettingsPage(); break;
      default: content.innerHTML = renderEmptyState("Page not found.");
    }

    bindPage(page);
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadState();
    renderPage(state.page);
  });

  window.showPage = showPage;
})();
