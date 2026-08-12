(function () {
  const PAGE_KEY = "map";
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
    state.month = savedMonth || getAvailableMonths()[0] || "2026-06";
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

  function dangerInfo(level) { if (level >= 3) return { label: "Level 3 - High Risk", className: "level3" }; if (level === 2) return { label: "Level 2 - Moderate Danger", className: "level2" }; return { label: "Level 1 - Low Danger", className: "level1" }; }

  function getMapBounds(records) {
    const lats = records.map(item => Number(item.lat));
    const lngs = records.map(item => Number(item.lng));
    const minLat = Math.min(...lats) - 0.0015;
    const maxLat = Math.max(...lats) + 0.0015;
    const minLng = Math.min(...lngs) - 0.0015;
    const maxLng = Math.max(...lngs) + 0.0015;
    return { minLat, maxLat, minLng, maxLng };
  }

  function projectPoint(lat, lng, bounds) {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
    const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * 100;
    return { left: Math.max(6, Math.min(94, x)), top: Math.max(8, Math.min(92, y)) };
  }

  function renderHotspotRanking(records) {
    const groups = Object.values(records.reduce((acc, incident) => {
      if (!acc[incident.location]) acc[incident.location] = { location: incident.location, count: 0, maxDanger: 1, incidents: [] };
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
          <p class="stat-note">${info.label} • ${sample.type} • ${sample.date}</p>
          <div class="btn-row"><span class="pill ${info.className}">${info.label}</span></div>
        </article>`;
    }).join("")}</div>`;
  }

  function renderMapPage() {
    const incidents = getMonthlyIncidents();
    const bounds = getMapBounds(incidents.length ? incidents : state.incidents);
    document.getElementById("content").innerHTML = `
      <div class="card-panel">
        <div class="section-title">
          <div>
            <h3>Shared Barangay Risk Map Control</h3>
            <p class="stat-note">Admin, Decision-Maker, and Field User all see the same map, same month, same hotspot coordinates, and same barangay boundary.</p>
          </div>
          <label class="field" style="margin:0; min-width:240px;">
            <span style="display:block; margin-bottom:8px; font-size:13px; font-weight:800; color:#334155;">Reporting Month</span>
            <select id="mapMonth">${getAvailableMonths().map(month => `<option value="${month}" ${month === state.month ? "selected" : ""}>${formatMonthLabel(month)}</option>`).join("")}</select>
          </label>
        </div>
      </div>
      <div class="grid-3">
        ${statCard("Map Focus", "Barangay 179", "Default center is set to Barangay 179, Amparo, Caloocan City.")}
        ${statCard("Barrier Mode", "Active", "Full barangay boundary mask and high-risk hotspot overlays.")}
        ${statCard("Visible Hotspots", incidents.length ? new Set(incidents.map(item => item.location)).size : 0, "Hotspot zones are based on the selected month and exact incident coordinates.")}
      </div>
      <article class="card-panel">
        <div class="section-title"><h3>Barangay Amparo / Barangay 179 Risk Map</h3><span>${formatMonthLabel(state.month)}</span></div>
        <div class="map-board">
          <div class="map-grid"></div>
          <div class="map-boundary"></div>
          ${incidents.map((incident, index) => {
            const info = dangerInfo(Number(incident.danger));
            const point = projectPoint(Number(incident.lat), Number(incident.lng), bounds);
            return `
              <div class="map-pin ${info.className}" style="left:${point.left}%; top:${point.top}%;"><span>${index + 1}</span></div>
              <div class="map-marker-label" style="left:${point.left}%; top:${point.top}%;">${incident.location}</div>
            `;
          }).join("")}
        </div>
        <br>
        <div class="legend">
          <span class="legend-item"><span class="dot green"></span> Level 1 - Low Danger</span>
          <span class="legend-item"><span class="dot yellow"></span> Level 2 - Moderate Danger</span>
          <span class="legend-item"><span class="dot red"></span> Level 3 - High Risk / Considerable Danger</span>
        </div>
      </article>
      <article class="card-panel">
        <div class="section-title"><h3>Map Hotspot List</h3><span>${formatMonthLabel(state.month)}</span></div>
        ${renderHotspotRanking(incidents)}
      </article>
    `;

    const mapMonth = document.getElementById("mapMonth");
    if (mapMonth) {
      mapMonth.addEventListener("change", (event) => {
        state.month = event.target.value;
        localStorage.setItem(KEYS.month, state.month);
        renderMapPage();
      });
    }
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

  function setPageMeta() {
    document.title = "Barangay Risk Map";
    const titleNode = document.getElementById("pageTitle");
    const subtitleNode = document.getElementById("pageSubtitle");
    if (titleNode) titleNode.textContent = "Barangay Amparo Risk Map";
    if (subtitleNode) subtitleNode.textContent = "Barangay-focused barrier map with on-point high-risk hotspot overlays.";
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
    renderMapPage();
  });
})();

