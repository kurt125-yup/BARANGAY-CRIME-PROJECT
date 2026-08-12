(function () {
  const PAGE_KEY = "users";
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

  function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

  function ensureSeedData() {
    if (!localStorage.getItem(KEYS.users)) saveJson(KEYS.users, DEFAULT_USERS);
    if (!localStorage.getItem(KEYS.settings)) saveJson(KEYS.settings, DEFAULT_SETTINGS);
  }

  function loadState() {
    ensureSeedData();
    state.users = readJson(KEYS.users, DEFAULT_USERS);
    state.settings = readJson(KEYS.settings, DEFAULT_SETTINGS);
    state.activeUser = readJson(KEYS.activeUser, state.users[0] || DEFAULT_USERS[0]);
  }

  function renderUserTable(users) {
    return `
      <div class="table-wrap"><table class="menu-table"><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Password</th><th>Actions</th></tr></thead>
      <tbody>${users.map((user) => `<tr><td><strong>${user.name}</strong></td><td>${user.username}</td><td>${ROLE_LABELS[user.role] || user.role}</td><td>${user.password}</td><td><button class="btn btn-danger" type="button" data-delete-user="${user.username}">Delete</button></td></tr>`).join("")}</tbody></table></div>
    `;
  }

  function renderUsersPage() {
    document.getElementById("content").innerHTML = `
      <div class="grid-2">
        <article class="card-panel">
          <div class="section-title"><h3>Add System User</h3><span>Administrator Only</span></div>
          <form id="userForm" class="field-grid">
            <div class="field"><label>Name</label><input id="newName" required placeholder="Full name or position" /></div>
            <div class="field"><label>Username</label><input id="newUsername" required placeholder="username" /></div>
            <div class="field"><label>Password</label><input id="newPassword" required placeholder="password" /></div>
            <div class="field"><label>Role</label><select id="newRole"><option value="admin">Administrator</option><option value="captain">Decision-Maker</option><option value="tanod">Field User</option></select></div>
            <div class="btn-row"><button class="btn btn-primary" type="submit">Add User</button></div>
          </form>
        </article>
        <article class="card-panel">
          <div class="section-title"><h3>Role Access Rules</h3><span>System Security</span></div>
          <p class="stat-note"><strong>Administrator:</strong> Full access to records, users, reports, maps, analytics, and settings.<br><br><strong>Decision-Maker:</strong> View-only access to reports, heatmaps, CART analytics, and patrol recommendations.<br><br><strong>Field User:</strong> Limited view access to patrol recommendations, hotspot maps, assigned areas, and warning zones.</p>
        </article>
      </div>
      <article class="card-panel"><div class="section-title"><h3>System Users</h3><span>${state.users.length} account/s</span></div>${renderUserTable(state.users)}</article>
    `;

    document.getElementById("userForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const username = document.getElementById("newUsername").value.trim();
      if (!username) return;
      const users = readJson(KEYS.users, DEFAULT_USERS);
      if (users.some(item => item.username === username)) {
        alert("Username already exists.");
        return;
      }
      users.push({
        name: document.getElementById("newName").value.trim(),
        username,
        password: document.getElementById("newPassword").value.trim(),
        role: document.getElementById("newRole").value
      });
      saveJson(KEYS.users, users);
      state.users = users;
      renderUsersPage();
    });

    document.querySelectorAll("[data-delete-user]").forEach((button) => {
      button.addEventListener("click", () => {
        const username = button.dataset.deleteUser;
        const activeUser = state.activeUser || readJson(KEYS.activeUser, state.users[0] || DEFAULT_USERS[0]);
        if (activeUser && activeUser.username === username) {
          alert("You cannot delete the currently logged-in user.");
          return;
        }
        const users = readJson(KEYS.users, DEFAULT_USERS).filter(item => item.username !== username);
        saveJson(KEYS.users, users);
        state.users = users;
        renderUsersPage();
      });
    });
  }

  function setPageMeta() {
    document.title = "User Management";
    const titleNode = document.getElementById("pageTitle");
    const subtitleNode = document.getElementById("pageSubtitle");
    if (titleNode) titleNode.textContent = "User Management";
    if (subtitleNode) subtitleNode.textContent = "Administrator-only module for managing role-based system users.";
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
    renderUsersPage();
  });
})();

