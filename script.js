// Wait for the DOM to be fully loaded
document.addEventListener("DOMContentLoaded", () => {
    
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

    // Form Submission Handler (Redirect to prototype login using actual credentials)
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const usernameInput = document.getElementById('username');
        const username = usernameInput?.value.trim();
        const password = passwordInput?.value.trim();

        if (!username || !password) {
            return;
        }

        localStorage.setItem('b179_pending_login', JSON.stringify({ username, password }));

        const btn = loginForm.querySelector('button[type="submit"]');
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Authenticating...';
        btn.disabled = true;

        setTimeout(() => {
            btn.innerHTML = originalContent;
            btn.disabled = false;
            window.location.href = './prototype';
        }, 1000);
    });
});