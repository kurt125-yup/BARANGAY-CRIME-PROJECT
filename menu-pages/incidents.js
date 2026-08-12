(function () {
  const PAGE_KEY = "incidents";
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
  const state = { month: "2026-06", users: [], incidents: [], settings: {}, activeUser: null, incidentSearch: "", editingIncidentId: null };

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

  function getAvailableMonths() {
    const months = [...new Set(state.incidents.map(item => item.date.slice(0, 7)))].sort().reverse();
    return months.length ? months : [state.month];
  }

  function formatMonthLabel(value) {
    const [year, month] = value.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
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

  function dangerInfo(level) {
    if (level >= 3) return { label: "Level 3 - High Risk", action: "Priority patrol and close monitoring", className: "level3" };
    if (level === 2) return { label: "Level 2 - Moderate Danger", action: "Scheduled patrol and resident reminder", className: "level2" };
    return { label: "Level 1 - Low Danger", action: "Normal monitoring and awareness round", className: "level1" };
  }

  function nextIncidentId(records) {
    return records.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
  }

  function renderIncidentTable(rows) {
    if (!rows.length) return '<div class="subtle-banner"><strong>No incident records match the current filter.</strong></div>';
    return `
      <div class="table-wrap">
        <table class="menu-table">
          <thead><tr><th>Type</th><th>Date / Time</th><th>Location</th><th>Reporter</th><th>Status</th><th>Risk</th><th>Actions</th></tr></thead>
          <tbody>
            ${rows.map((record) => {
              const info = dangerInfo(Number(record.danger));
              return `
                <tr>
                  <td><strong>${record.type}</strong><div class="mini-note">${record.description}</div></td>
                  <td>${record.date}<br><span class="mini-note">${record.time}</span></td>
                  <td>${record.location}</td>
                  <td>${record.reportedBy}</td>
                  <td>${record.status}</td>
                  <td><span class="pill ${info.className}">${info.label}</span></td>
                  <td><div class="btn-row"><button class="btn btn-light" type="button" data-edit-record="${record.id}">Edit</button><button class="btn btn-danger" type="button" data-delete-record="${record.id}">Delete</button></div></td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderIncidentsPage() {
    const query = state.incidentSearch.trim().toLowerCase();
    const rows = state.incidents.filter((item) => {
      const matchesMonth = item.date.startsWith(state.month);
      const matchesQuery = !query || [item.type, item.location, item.description, item.reportedBy, item.status].some((value) => String(value).toLowerCase().includes(query));
      return matchesMonth && matchesQuery;
    }).sort((a, b) => b.date.localeCompare(a.date));

    const editRecord = state.editingIncidentId ? state.incidents.find((item) => String(item.id) === String(state.editingIncidentId)) : null;

    document.getElementById("content").innerHTML = `
      <div class="card-panel">
        <div class="section-title">
          <div>
            <h3>Incident Search and Month Filter</h3>
            <p class="stat-note">Add, edit, delete, search, and filter incident records without leaving this page.</p>
          </div>
          <div class="btn-row">
            <label class="field" style="margin:0; min-width:240px;">
              <span style="display:block; margin-bottom:8px; font-size:13px; font-weight:800; color:#334155;">Search Records</span>
              <input id="incidentSearch" type="search" placeholder="Type a location, reporter, or incident type" value="${state.incidentSearch}" />
            </label>
            <label class="field" style="margin:0; min-width:220px;">
              <span style="display:block; margin-bottom:8px; font-size:13px; font-weight:800; color:#334155;">Reporting Month</span>
              <select id="incidentsMonth">${getAvailableMonths().map(month => `<option value="${month}" ${month === state.month ? "selected" : ""}>${formatMonthLabel(month)}</option>`).join("")}</select>
            </label>
          </div>
        </div>
      </div>
      <div class="grid-2">
        <article class="card-panel">
          <div class="section-title"><h3>${editRecord ? "Edit Incident" : "Add Incident"}</h3><span>${editRecord ? `Editing #${editRecord.id}` : "New record"}</span></div>
          <form id="incidentForm" class="field-grid">
            <input type="hidden" id="incidentId" value="${editRecord ? editRecord.id : ""}" />
            <div class="form-grid">
              <div class="field"><label>Incident Type</label><input id="incidentType" required value="${editRecord ? editRecord.type : ""}" placeholder="Theft" /></div>
              <div class="field"><label>Incident Date</label><input id="incidentDate" required type="date" value="${editRecord ? editRecord.date : `${state.month}-01`}" /></div>
              <div class="field"><label>Incident Time</label><input id="incidentTime" required type="time" value="${editRecord ? editRecord.time : "21:00"}" /></div>
              <div class="field"><label>Status</label><select id="incidentStatus"><option ${editRecord && editRecord.status === "Pending" ? "selected" : ""}>Pending</option><option ${editRecord && editRecord.status === "Under Review" ? "selected" : ""}>Under Review</option><option ${editRecord && editRecord.status === "Patrolled" ? "selected" : ""}>Patrolled</option><option ${editRecord && editRecord.status === "Resolved" ? "selected" : ""}>Resolved</option></select></div>
              <div class="field"><label>Location</label><input id="incidentLocation" required value="${editRecord ? editRecord.location : ""}" placeholder="Purok 3 - Amparo Main Road" /></div>
              <div class="field"><label>Reporter</label><input id="incidentReportedBy" required value="${editRecord ? editRecord.reportedBy : ""}" placeholder="Tanod Patrol A" /></div>
              <div class="field"><label>Danger Level</label><select id="incidentDanger"><option value="1" ${editRecord && Number(editRecord.danger) === 1 ? "selected" : ""}>1 - Low Danger</option><option value="2" ${editRecord && Number(editRecord.danger) === 2 ? "selected" : ""}>2 - Moderate Danger</option><option value="3" ${editRecord && Number(editRecord.danger) === 3 ? "selected" : ""}>3 - High Risk</option></select></div>
              <div class="field"><label>Latitude</label><input id="incidentLat" type="number" step="0.0001" value="${editRecord ? editRecord.lat : "14.7287"}" /></div>
              <div class="field"><label>Longitude</label><input id="incidentLng" type="number" step="0.0001" value="${editRecord ? editRecord.lng : "120.9834"}" /></div>
              <div class="field field-full"><label>Description</label><textarea id="incidentDescription" rows="4" placeholder="Incident details">${editRecord ? editRecord.description : ""}</textarea></div>
              <div class="field field-full"><label>Recommended Action</label><input id="incidentAction" value="${editRecord ? editRecord.action : ""}" placeholder="Priority patrol and close monitoring" /></div>
            </div>
            <div class="btn-row">
              <button class="btn btn-primary" type="submit">${editRecord ? "Save Incident" : "Add Incident"}</button>
              ${editRecord ? '<button class="btn btn-light" type="button" data-clear-incident-form>Clear Form</button>' : ""}
            </div>
          </form>
        </article>
        <article class="card-panel">
          <div class="section-title"><h3>Incident Summary</h3><span>${rows.length} matching record(s)</span></div>
          <div class="field-grid">
            <p class="stat-note"><strong>Month:</strong> ${formatMonthLabel(state.month)}</p>
            <p class="stat-note"><strong>Reported incidents:</strong> ${rows.length}</p>
            <p class="stat-note"><strong>High risk:</strong> ${rows.filter(item => Number(item.danger) >= 3).length}</p>
            <p class="stat-note"><strong>Moderate risk:</strong> ${rows.filter(item => Number(item.danger) === 2).length}</p>
          </div>
        </article>
      </div>
      <article class="card-panel">
        <div class="section-title"><h3>Current Incident Records</h3><span>${formatMonthLabel(state.month)}</span></div>
        ${renderIncidentTable(rows)}
      </article>
    `;

    document.getElementById("incidentSearch").addEventListener("input", (event) => {
      state.incidentSearch = event.target.value;
      renderIncidentsPage();
    });

    document.getElementById("incidentsMonth").addEventListener("change", (event) => {
      state.month = event.target.value;
      localStorage.setItem(KEYS.month, state.month);
      renderIncidentsPage();
    });

    document.getElementById("incidentForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const incidents = readJson(KEYS.incidents, DEFAULT_INCIDENTS);
      const record = {
        id: Number(document.getElementById("incidentId").value) || nextIncidentId(incidents),
        type: document.getElementById("incidentType").value.trim(),
        date: document.getElementById("incidentDate").value,
        time: document.getElementById("incidentTime").value,
        location: document.getElementById("incidentLocation").value.trim(),
        description: document.getElementById("incidentDescription").value.trim(),
        reportedBy: document.getElementById("incidentReportedBy").value.trim(),
        status: document.getElementById("incidentStatus").value,
        danger: Number(document.getElementById("incidentDanger").value),
        lat: Number(document.getElementById("incidentLat").value),
        lng: Number(document.getElementById("incidentLng").value),
        action: document.getElementById("incidentAction").value.trim() || dangerInfo(Number(document.getElementById("incidentDanger").value)).action
      };

      const existingIndex = incidents.findIndex((item) => String(item.id) === String(record.id));
      if (existingIndex >= 0) incidents[existingIndex] = record;
      else incidents.push(record);

      saveJson(KEYS.incidents, incidents);
      state.incidents = incidents;
      state.month = record.date.slice(0, 7);
      localStorage.setItem(KEYS.month, state.month);
      state.editingIncidentId = null;
      renderIncidentsPage();
    });

    document.querySelectorAll("[data-delete-record]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.deleteRecord;
        const incidents = readJson(KEYS.incidents, DEFAULT_INCIDENTS).filter((item) => String(item.id) !== String(id));
        saveJson(KEYS.incidents, incidents);
        state.incidents = incidents;
        renderIncidentsPage();
      });
    });

    document.querySelectorAll("[data-edit-record]").forEach((button) => {
      button.addEventListener("click", () => {
        state.editingIncidentId = button.dataset.editRecord;
        renderIncidentsPage();
      });
    });

    document.querySelectorAll("[data-clear-incident-form]").forEach((button) => {
      button.addEventListener("click", () => {
        state.editingIncidentId = null;
        renderIncidentsPage();
      });
    });
  }

  function setPageMeta() {
    document.title = "Incident Records";
    const titleNode = document.getElementById("pageTitle");
    const subtitleNode = document.getElementById("pageSubtitle");
    if (titleNode) titleNode.textContent = "Incident Record Management";
    if (subtitleNode) subtitleNode.textContent = "Administrator module for adding, editing, deleting, searching, and filtering incident records.";
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
    renderIncidentsPage();
  });
})();

