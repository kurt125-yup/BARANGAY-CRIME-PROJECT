(function () {
  const PAGE_KEY = "cart";
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
    if (!localStorage.getItem(KEYS.incidents)) localStorage.setItem(KEYS.incidents, JSON.stringify([]));
    if (!localStorage.getItem(KEYS.settings)) localStorage.setItem(KEYS.settings, JSON.stringify(DEFAULT_SETTINGS));
  }

  function loadState() {
    ensureSeedData();
    state.users = readJson(KEYS.users, DEFAULT_USERS);
    state.settings = readJson(KEYS.settings, DEFAULT_SETTINGS);
    state.activeUser = readJson(KEYS.activeUser, state.users[0] || DEFAULT_USERS[0]);
    state.incidents = readJson(KEYS.incidents, []);
  }

  function dangerInfo(level) {
    if (level >= 3) return { label: "Level 3 - High Risk", action: "Priority patrol and close monitoring", className: "level3" };
    if (level === 2) return { label: "Level 2 - Moderate Danger", action: "Scheduled patrol and resident reminder", className: "level2" };
    return { label: "Level 1 - Low Danger", action: "Normal monitoring and awareness round", className: "level1" };
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
    return `
      <div class="section-title"><h3>Prediction Result</h3><span>${result.confidence}% Confidence</span></div>
      <p><span class="pill ${info.className}">${info.label}</span></p>
      <p class="stat-note"><strong>Risk Explanation:</strong> ${result.explanation}</p>
      <p class="stat-note"><strong>Suggested Patrol Action:</strong> ${result.action}</p>
      <div class="subtle-banner"><strong>Decision Path:</strong> The classifier checks type, recurrence, time, day, location history, and incident frequency before assigning a level.</div>
    `;
  }

  function renderCartPage() {
    const sample = cartPredict({ type: "Theft", repeats: 4, time: "21:30", day: "Saturday", location: "Purok 3 - Amparo Main Road", previousRisk: "High", frequency: "High" });
    document.getElementById("content").innerHTML = `
      <div class="grid-2">
        <article class="card-panel">
          <div class="section-title"><h3>Simulated CART Risk Classifier</h3><span>Prototype Model</span></div>
          <form id="cartForm">
            <div class="form-grid">
              <div class="field"><label>Incident Type</label><select id="cartType"><option>Theft</option><option>Physical Injury</option><option>Noise Complaint</option><option>Vandalism</option><option>Suspicious Activity</option><option>Traffic Obstruction</option><option>Curfew Violation</option><option>Domestic Disturbance</option></select></div>
              <div class="field"><label>Repeated Incidents</label><input id="cartRepeats" type="number" min="0" value="4" /></div>
              <div class="field"><label>Time of Occurrence</label><input id="cartTime" type="time" value="21:30" /></div>
              <div class="field"><label>Day of Week</label><select id="cartDay"><option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option><option selected>Saturday</option><option>Sunday</option></select></div>
              <div class="field"><label>Location / Purok / Street</label><input id="cartLocation" type="text" value="Purok 3 - Amparo Main Road" /></div>
              <div class="field"><label>Previous Risk History</label><select id="cartHistory"><option>Low</option><option>Moderate</option><option selected>High</option></select></div>
              <div class="field"><label>Incident Frequency</label><select id="cartFrequency"><option>Low</option><option>Moderate</option><option selected>High</option></select></div>
            </div>
            <br>
            <div class="btn-row"><button class="btn btn-primary" type="submit">Run CART Analysis</button><button class="btn btn-light" type="button" data-go-to="patrol">Open Patrol Support</button></div>
          </form>
        </article>
        <article class="card-panel" id="cartResult">${renderCartResult(sample)}</article>
      </div>
      <article class="card-panel">
        <div class="section-title"><h3>Decision Tree Rule Explanation</h3><span>Simulated CART Path</span></div>
        <div class="field-grid">
          <div class="subtle-banner"><strong>Rule path:</strong> The model rewards repeated incidents, nighttime patterns, high-risk behavior types, and repeat hotspot locations.</div>
          <div class="subtle-banner"><strong>Typical response:</strong> High scores trigger immediate patrols and close monitoring, while moderate scores schedule surveillance and awareness checks.</div>
          <div class="subtle-banner"><strong>Decision support:</strong> Use this output to prioritize patrol coverage and allocate manpower based on risk patterns and recurrence.</div>
        </div>
      </article>
    `;

    document.getElementById("cartForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const result = cartPredict({
        type: document.getElementById("cartType").value,
        repeats: Number(document.getElementById("cartRepeats").value),
        time: document.getElementById("cartTime").value,
        day: document.getElementById("cartDay").value,
        location: document.getElementById("cartLocation").value,
        previousRisk: document.getElementById("cartHistory").value,
        frequency: document.getElementById("cartFrequency").value
      });
      document.getElementById("cartResult").innerHTML = renderCartResult(result);
    });

    document.querySelectorAll("[data-go-to]").forEach((button) => {
      button.addEventListener("click", () => {
        const page = button.dataset.goTo;
        if (page) window.location.href = `./${page}.html`;
      });
    });
  }

  function setPageMeta() {
    document.title = "CART Analytics";
    const titleNode = document.getElementById("pageTitle");
    const subtitleNode = document.getElementById("pageSubtitle");
    if (titleNode) titleNode.textContent = "CART Decision Tree Analytics";
    if (subtitleNode) subtitleNode.textContent = "Simulated CART-based risk classification using incident patterns and location history.";
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
    renderCartPage();
  });
})();

