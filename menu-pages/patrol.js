(function () {
  const PAGE_KEY = "patrol";
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

  function generatePatrolRecommendations() {
    const incidents = getMonthlyIncidents();
    const grouped = incidents.reduce((acc, incident) => {
      if (!acc[incident.location]) acc[incident.location] = { location: incident.location, incidents: [], maxDanger: 1, score: 0 };
      acc[incident.location].incidents.push(incident);
      acc[incident.location].maxDanger = Math.max(acc[incident.location].maxDanger, Number(incident.danger));
      const hour = Number(incident.time.split(":")[0]);
      acc[incident.location].score += Number(incident.danger) * 3 + (hour >= 19 || hour <= 4 ? 2 : 0);
      return acc;
    }, {});

    return Object.values(grouped).map((group) => {
      const topType = mostCommon(group.incidents, item => item.type)[0];
      const topHour = mostCommon(group.incidents, item => `${item.time.slice(0, 2)}:00`)[0];
      const info = dangerInfo(group.maxDanger);
      return {
        location: group.location,
        riskLevel: group.maxDanger,
        incidentPattern: `${topType} incidents, commonly around ${topHour}`,
        recommendedTime: group.maxDanger === 3 ? "7:00 PM - 11:00 PM" : group.maxDanger === 2 ? "4:00 PM - 8:00 PM" : "Routine schedule",
        reason: `Detected ${group.incidents.length} record/s with ${info.label}.`,
        tanods: group.maxDanger === 3 ? 4 : group.maxDanger === 2 ? 3 : 2,
        priority: group.maxDanger === 3 ? "High Priority" : group.maxDanger === 2 ? "Medium Priority" : "Normal Priority",
        score: group.score
      };
    }).sort((a, b) => b.score - a.score);
  }

  function renderRecommendationCard(rec, index) {
    const info = dangerInfo(rec.riskLevel);
    return `
      <article class="card-panel" style="padding:18px;">
        <div class="section-title"><h3>#${index} ${rec.location}</h3><span class="pill ${info.className}">${rec.priority}</span></div>
        <p><span class="pill ${info.className}">${info.label}</span></p>
        <p class="stat-note"><strong>Recommended Patrol Time:</strong> ${rec.recommendedTime}</p>
        <p class="stat-note"><strong>Reason:</strong> ${rec.reason}</p>
        <p class="stat-note"><strong>Incident Pattern:</strong> ${rec.incidentPattern}</p>
        <p class="stat-note"><strong>Suggested Number of Tanods:</strong> ${rec.tanods}</p>
        <p class="stat-note"><strong>Suggested Action:</strong> ${info.action}</p>
      </article>
    `;
  }

  function renderPatrolPage() {
    const recommendations = generatePatrolRecommendations();
    document.getElementById("content").innerHTML = `
      <div class="card-panel">
        <div class="section-title">
          <div>
            <h3>Monthly Patrol Decision Filter</h3>
            <p class="stat-note">Patrol recommendations use the same selected month as the dashboard and map.</p>
          </div>
          <label class="field" style="margin:0; min-width:240px;">
            <span style="display:block; margin-bottom:8px; font-size:13px; font-weight:800; color:#334155;">Reporting Month</span>
            <select id="patrolMonth">${getAvailableMonths().map(month => `<option value="${month}" ${month === state.month ? "selected" : ""}>${formatMonthLabel(month)}</option>`).join("")}</select>
          </label>
        </div>
      </div>
      <div class="grid-3">
        ${statCard("First Patrol Area", recommendations[0]?.location || "None", "Highest ranked patrol priority zone.")}
        ${statCard("Recommended Time", recommendations[0]?.recommendedTime || "Routine", "Suggested patrol window based on incident timing.")}
        ${statCard("Tanods Needed", recommendations[0]?.tanods || 2, "Suggested manpower for the top priority zone.")}
      </div>
      <article class="card-panel">
        <div class="section-title"><h3>Patrol Recommendations</h3><span>${recommendations.length} zone/s</span></div>
        <div class="field-grid">${recommendations.length ? recommendations.map((item, index) => renderRecommendationCard(item, index + 1)).join("") : '<div class="subtle-banner"><strong>No patrol recommendation for the selected month.</strong></div>'}</div>
      </article>
    `;

    document.getElementById("patrolMonth").addEventListener("change", (event) => {
      state.month = event.target.value;
      localStorage.setItem(KEYS.month, state.month);
      renderPatrolPage();
    });
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
    document.title = "Patrol Decision Support";
    const titleNode = document.getElementById("pageTitle");
    const subtitleNode = document.getElementById("pageSubtitle");
    if (titleNode) titleNode.textContent = "Patrol Decision Support";
    if (subtitleNode) subtitleNode.textContent = "Priority patrol recommendations based on risk level, recurrence, and incident timing.";
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
    renderPatrolPage();
  });
})();

