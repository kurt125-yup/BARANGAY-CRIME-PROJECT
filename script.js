// Wait for the DOM to be fully loaded
document.addEventListener("DOMContentLoaded", () => {
    const DEFAULT_USERS = [
        { name: "Barangay Captain", username: "admin", password: "admin123", role: "admin" },
        { name: "Crime Analyst", username: "analyst", password: "analyst123", role: "captain" },
        { name: "Tanod Patrol A", username: "tanod1", password: "tanod123", role: "tanod" }
    ];

    const ROLE_LANDING = {
        tanod: "fieldDashboard",
        admin: "dashboard",
        captain: "dashboard"
    };

    function getUsers() {
        try {
            return JSON.parse(localStorage.getItem("b179_users")) || DEFAULT_USERS;
        } catch {
            return DEFAULT_USERS;
        }
    }

    function landingPageForRole(role) {
        return ROLE_LANDING[role] || "dashboard";
    }
    
    // Select the password toggle elements
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');
    const passwordInput = document.getElementById('password');
    const togglePasswordIcon = document.getElementById('togglePasswordIcon');

    // Add click event listener to the eye icon container
    togglePasswordBtn.addEventListener('click', function () {
        
        // Check current type of the input (password or text)
        const isPassword = passwordInput.getAttribute('type') === 'password';
        
        // Toggle the input type
        passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
        
        // Toggle the Bootstrap icon classes
        if (isPassword) {
            togglePasswordIcon.classList.remove('bi-eye');
            togglePasswordIcon.classList.add('bi-eye-slash');
        } else {
            togglePasswordIcon.classList.remove('bi-eye-slash');
            togglePasswordIcon.classList.add('bi-eye');
        }
    });

    // Form Submission Handler (Redirect directly to the standalone module pages)
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const usernameInput = document.getElementById('username');
        const username = usernameInput?.value.trim();
        const password = passwordInput?.value.trim();

        if (!username || !password) {
            return;
        }

        const users = getUsers();
        const user = users.find(item => item.username === username && item.password === password);

        if (!user) {
            const btn = loginForm.querySelector('button[type="submit"]');
            btn.disabled = false;
            window.alert("Invalid username or password.");
            return;
        }

        localStorage.setItem('b179_active_user', JSON.stringify(user));
        localStorage.removeItem('b179_pending_login');

        const btn = loginForm.querySelector('button[type="submit"]');
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Authenticating...';
        btn.disabled = true;

        setTimeout(() => {
            btn.innerHTML = originalContent;
            btn.disabled = false;
            window.location.href = `./menu-pages/${landingPageForRole(user.role)}.html`;
        }, 1000);
    });
});