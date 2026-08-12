(function () {
  const PAGE_KEY = "settings";
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

  function readJson(key, fallback) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
  function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

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
    const savedMonth = localStorage.getItem(KEYS.month);
    state.month = savedMonth || "2026-06";
  }

  function renderSettingsPage() {
    document.getElementById("content").innerHTML = `
      <div class="grid-2">
        <article class="card-panel">
          <div class="section-title"><h3>Barangay Map Settings</h3><span>Configuration</span></div>
          <form id="settingsForm" class="field-grid">
            <div class="field"><label>Default Map Center Latitude</label><input id="centerLat" type="number" step="0.0001" value="${state.settings.centerLat}" /></div>
            <div class="field"><label>Default Map Center Longitude</label><input id="centerLng" type="number" step="0.0001" value="${state.settings.centerLng}" /></div>
            <div class="field"><label>High Risk Threshold</label><input id="highRiskThreshold" type="number" min="1" max="3" value="${state.settings.highRiskThreshold}" /></div>
            <div class="field"><label>Moderate Risk Threshold</label><input id="moderateThreshold" type="number" min="1" max="3" value="${state.settings.moderateThreshold}" /></div>
            <div class="field"><label>Patrol Window</label><input id="patrolWindow" type="text" value="${state.settings.patrolWindow}" /></div>
            <div class="btn-row"><button class="btn btn-primary" type="submit">Save Settings</button></div>
          </form>
        </article>
        <article class="card-panel">
          <div class="section-title"><h3>Risk Classification Settings</h3><span>CART Simulation</span></div>
          <div class="field-grid">
            <div class="subtle-banner"><strong>Level 1 Rule:</strong> Low frequency, daytime, no repeated hotspot history.</div>
            <div class="subtle-banner"><strong>Level 2 Rule:</strong> Moderate recurrence, scheduled patrol recommended.</div>
            <div class="subtle-banner"><strong>Level 3 Rule:</strong> Repeated incidents, high-risk type, night time, prior hotspot history.</div>
          </div>
        </article>
      </div>
      <article class="card-panel">
        <div class="section-title"><h3>System Reset</h3><span>Prototype Testing</span></div>
        <p class="stat-note">Resetting will restore the original sample users and dummy incident records.</p>
        <div class="btn-row"><button class="btn btn-warning" type="button" data-reset-sample-data>Reset Sample Data</button><button class="btn btn-danger" type="button" data-clear-all-data>Clear All Data</button></div>
      </article>
    `;

    document.getElementById("settingsForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const updated = {
        centerLat: Number(document.getElementById("centerLat").value),
        centerLng: Number(document.getElementById("centerLng").value),
        highRiskThreshold: Number(document.getElementById("highRiskThreshold").value),
        moderateThreshold: Number(document.getElementById("moderateThreshold").value),
        patrolWindow: document.getElementById("patrolWindow").value.trim() || DEFAULT_SETTINGS.patrolWindow
      };
      saveJson(KEYS.settings, updated);
      state.settings = updated;
      renderSettingsPage();
    });

    document.querySelectorAll("[data-reset-sample-data]").forEach((button) => button.addEventListener("click", () => {
      saveJson(KEYS.users, DEFAULT_USERS);
      saveJson(KEYS.incidents, DEFAULT_INCIDENTS);
      saveJson(KEYS.settings, DEFAULT_SETTINGS);
      localStorage.setItem(KEYS.month, "2026-06");
      state.incidents = DEFAULT_INCIDENTS;
      state.settings = DEFAULT_SETTINGS;
      state.users = DEFAULT_USERS;
      renderSettingsPage();
    }));

    document.querySelectorAll("[data-clear-all-data]").forEach((button) => button.addEventListener("click", () => {
      localStorage.removeItem(KEYS.users);
      localStorage.removeItem(KEYS.incidents);
      localStorage.removeItem(KEYS.settings);
      localStorage.removeItem(KEYS.month);
      localStorage.removeItem(KEYS.activeUser);
      loadState();
      renderSettingsPage();
    }));
  }

  function setPageMeta() {
    document.title = "System Settings";
    const titleNode = document.getElementById("pageTitle");
    const subtitleNode = document.getElementById("pageSubtitle");
    if (titleNode) titleNode.textContent = "System Settings";
    if (subtitleNode) subtitleNode.textContent = "Prototype configuration for barangay boundary, thresholds, and dashboard behavior.";
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
    renderSettingsPage();
  });
})();

