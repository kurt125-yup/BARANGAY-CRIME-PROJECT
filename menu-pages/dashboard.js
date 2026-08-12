(function () {
  const PAGE_KEY = "dashboard";
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

  const DEFAULT_SETTINGS = {
    centerLat: 14.7287,
    centerLng: 120.9834,
    highRiskThreshold: 3,
    moderateThreshold: 2,
    patrolWindow: "19:00 - 23:00"
  };

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

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function ensureSeedData() {
    if (!localStorage.getItem(KEYS.users)) saveJson(KEYS.users, DEFAULT_USERS);
    if (!localStorage.getItem(KEYS.incidents)) saveJson(KEYS.incidents, DEFAULT_INCIDENTS);
    if (!localStorage.getItem(KEYS.settings)) saveJson(KEYS.settings, DEFAULT_SETTINGS);
  }

  function loadState() {
    ensureSeedData();
    state.users = readJson(KEYS.users, DEFAULT_USERS);
    state.incidents = readJson(KEYS.incidents, DEFAULT_INCIDENTS);
    state.settings = readJson(KEYS.settings, DEFAULT_SETTINGS);
    state.activeUser = readJson(KEYS.activeUser, state.users[0] || DEFAULT_USERS[0]);
    const storedMonth = localStorage.getItem(KEYS.month);
    state.month = storedMonth || getAvailableMonths()[0] || "2026-06";
    if (!getAvailableMonths().includes(state.month)) state.month = getAvailableMonths()[0] || state.month;
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
    if (level >= 3) return { label: "Level 3 - High Risk", action: "Priority patrol and close monitoring", className: "level3" };
    if (level === 2) return { label: "Level 2 - Moderate Danger", action: "Scheduled patrol and resident reminder", className: "level2" };
    return { label: "Level 1 - Low Danger", action: "Normal monitoring and awareness round", className: "level1" };
  }

  function statCard(title, value, note) {
    return `
      <article class="stat-card">
        <span class="label">${title}</span>
        <strong>${value}</strong>
        <p>${note}</p>
      </article>
    `;
  }

  function renderBarChart(items, keyFn) {
    const entries = Object.entries(countBy(items, keyFn)).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return '<div class="subtle-banner"><strong>No data available for this month.</strong></div>';
    const max = Math.max(...entries.map(([, count]) => count), 1);
    return `<div class="chart-list">${entries.map(([label, count]) => `
      <div class="chart-row">
        <div class="chart-row-header"><strong>${label}</strong><span>${count}</span></div>
        <div class="chart-track"><div class="chart-fill" style="width:${(count / max) * 100}%"></div></div>
      </div>
    `).join("")}</div>`;
  }

  function renderDonutChart(items, keyFn) {
    const entries = Object.entries(countBy(items, keyFn)).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return '<div class="subtle-banner"><strong>No distribution data for this month.</strong></div>';
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    const colors = ["#16a34a", "#ca8a04", "#dc2626"];
    let start = 0;
    const segments = entries.map(([label, count], index) => {
      const end = start + (count / total) * 100;
      const value = `${colors[index % colors.length]} ${start}% ${end}%`;
      start = end;
      return value;
    }).join(", ");
    return `
      <div class="donut-wrap">
        <div class="donut" style="background: conic-gradient(${segments});"><div class="donut-value"><div style="font-size:2rem;line-height:1;">${total}</div><div class="muted-text" style="font-size:12px;font-weight:800;">Records</div></div></div>
        <div class="field-grid" style="min-width:220px; flex:1;">${entries.map(([label, count], index) => `
          <div class="legend-item"><span class="dot ${index === 0 ? "green" : index === 1 ? "yellow" : "red"}"></span><span>${label}</span><strong style="margin-left:auto;">${count}</strong></div>
        `).join("")}</div>
      </div>
    `;
  }

  function renderLineChart(items) {
    if (!items.length) return '<div class="subtle-banner"><strong>No trend data for this month.</strong></div>';
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

  function renderIncidentTable(records) {
    if (!records.length) return '<div class="subtle-banner"><strong>No incident records match the current filter.</strong></div>';
    return `
      <div class="table-wrap">
        <table class="menu-table">
          <thead><tr><th>Type</th><th>Date / Time</th><th>Location</th><th>Reporter</th><th>Status</th><th>Risk</th></tr></thead>
          <tbody>
            ${records.map(record => {
              const info = dangerInfo(Number(record.danger));
              return `
                <tr>
                  <td><strong>${record.type}</strong><div class="mini-note">${record.description}</div></td>
                  <td>${record.date}<br><span class="mini-note">${record.time}</span></td>
                  <td>${record.location}</td>
                  <td>${record.reportedBy}</td>
                  <td>${record.status}</td>
                  <td><span class="pill ${info.className}">${info.label}</span></td>
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

    if (!groups.length) return '<div class="subtle-banner"><strong>No hotspot ranking for this month.</strong></div>';

    return `<div class="field-grid">${groups.map((group, index) => {
      const info = dangerInfo(group.maxDanger);
      const sample = group.incidents[0];
      return `
        <article class="card-panel" style="padding:18px;">
          <div class="section-title"><h3>#${index + 1} ${group.location}</h3><span>${group.count} record/s</span></div>
          <p class="stat-note" style="margin-top:0;">${info.label} • ${sample.type} • ${sample.date}</p>
          <div class="btn-row"><span class="pill ${info.className}">${info.action}</span></div>
        </article>
      `;
    }).join("")}</div>`;
  }

  function renderDashboard() {
    const incidents = getMonthlyIncidents();
    const total = incidents.length;
    const latestDate = incidents.slice().sort((a, b) => b.date.localeCompare(a.date))[0]?.date || `${state.month}-01`;
    const latestDay = incidents.filter(item => item.date === latestDate).length;
    const previousMonth = monthShift(state.month, -1);
    const prevCount = state.incidents.filter(item => item.date.startsWith(previousMonth)).length;
    const trendPct = prevCount ? Math.round(((total - prevCount) / prevCount) * 100) : 0;
    const commonType = mostCommon(incidents, item => item.type)[0];
    const peakTime = mostCommon(incidents, item => `${item.time.slice(0, 2)}:00`)[0];
    const hotspotCount = new Set(incidents.map(item => item.location)).size;
    const selectedMonthLabel = formatMonthLabel(state.month);

    document.getElementById("content").innerHTML = `
      <div class="card-panel">
        <div class="section-title">
          <div>
            <h3>Monthly Analytics Control</h3>
            <p class="stat-note">All dashboard cards, charts, hotspot table, patrol priorities, and map data use the same selected month.</p>
          </div>
          <label class="field" style="margin:0; min-width:240px;">
            <span style="display:block; margin-bottom:8px; font-size:13px; font-weight:800; color:#334155;">Reporting Month</span>
            <select id="dashboardMonth">${getAvailableMonths().map(month => `<option value="${month}" ${month === state.month ? "selected" : ""}>${formatMonthLabel(month)}</option>`).join("")}</select>
          </label>
        </div>
      </div>
      <div class="grid-4">
        ${statCard("Monthly Incidents", total, `Total recorded incidents for ${selectedMonthLabel}.`)}
        ${statCard("Latest Active Day", latestDay, "Incidents recorded on the latest date available in this month.")}
        ${statCard("Month Change", `${trendPct >= 0 ? "+" : ""}${trendPct}%`, "Comparison against the previous month with records.")}
        ${statCard("Priority Zones", hotspotCount, "High-risk locations that need stronger patrol visibility.")}
      </div>
      <div class="grid-4">
        ${statCard("Common Incident", commonType, "Most frequently reported incident category for this month.")}
        ${statCard("Peak Time", peakTime, "Most common incident hour in this selected month.")}
        ${statCard("Highest-Risk Area", mostCommon(incidents.filter(item => Number(item.danger) >= 2), item => item.location)[0], "Location with repeated moderate or high-risk reports.")}
        ${statCard("Predicted Risk", total ? `The selected month shows ${total} incidents with ${incidents.filter(item => Number(item.danger) >= 2).length} higher-risk records.` : "No incidents were recorded in the selected month.", "CART-inspired monthly risk summary.")}
      </div>
      <div class="grid-2">
        <article class="card-panel"><div class="section-title"><h3>Incident Types</h3><span>${selectedMonthLabel}</span></div>${renderBarChart(incidents, item => item.type)}</article>
        <article class="card-panel"><div class="section-title"><h3>Danger Level Distribution</h3><span>${selectedMonthLabel}</span></div>${renderDonutChart(incidents, item => dangerInfo(Number(item.danger)).label)}</article>
        <article class="card-panel"><div class="section-title"><h3>Crime Trend Over Time</h3><span>${selectedMonthLabel}</span></div>${renderLineChart(incidents)}</article>
        <article class="card-panel"><div class="section-title"><h3>Peak Incident Hours</h3><span>${selectedMonthLabel}</span></div>${renderBarChart(incidents, item => `${item.time.slice(0, 2)}:00`)}</article>
      </div>
      <div class="grid-2">
        <article class="card-panel"><div class="section-title"><h3>Recent Incident Table</h3><span>${selectedMonthLabel}</span></div>${renderIncidentTable(incidents.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6))}</article>
        <article class="card-panel"><div class="section-title"><h3>Top Hotspot Areas</h3><span>${selectedMonthLabel}</span></div>${renderHotspotRanking(incidents)}</article>
      </div>
    `;

    const dashboardMonth = document.getElementById("dashboardMonth");
    if (dashboardMonth) {
      dashboardMonth.addEventListener("change", (event) => {
        state.month = event.target.value;
        localStorage.setItem(KEYS.month, state.month);
        renderDashboard();
      });
    }
  }

  function monthShift(value, delta) {
    const [year, month] = value.split("-").map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function setPageMeta() {
    document.title = "BI Dashboard";
    const titleNode = document.getElementById("pageTitle");
    const subtitleNode = document.getElementById("pageSubtitle");
    if (titleNode) titleNode.textContent = "Business Intelligence Dashboard";
    if (subtitleNode) subtitleNode.textContent = "Monthly-filtered incident analytics for Barangay 179, Amparo, Caloocan City.";
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
    renderDashboard();
    document.querySelectorAll("[data-go-to]").forEach((button) => {
      button.addEventListener("click", () => {
        const page = button.dataset.goTo;
        if (page) window.location.href = `./${page}.html`;
      });
    });
  });
})();

