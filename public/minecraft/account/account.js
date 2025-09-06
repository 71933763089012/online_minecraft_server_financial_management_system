(async function () {
    const account = await me()
    document.getElementById("name").textContent = account.realname || "???"
    document.getElementById("phone").textContent = account.phone || "???"
    document.getElementById("username").textContent = account.mcusername || "???"

    const additionalEl = document.getElementById("additionalusers");
    if (account.additionalusers && account.additionalusers.length > 0) {
        additionalEl.innerHTML = account.additionalusers.map(user => {
            if (user.confirmed) {
                return `<div>${user.mcusername}</div>`;
            } else {
                return `<div style="color: orange;">${user.mcusername}</div>`;
            }
        }).join("");
    } else {
        additionalEl.textContent = "None added";
    }
})();

const overlay = document.getElementById('overlay');
const modalTitle = document.getElementById('modalTitle');
const primaryLabel = document.getElementById('primaryLabel');
const primaryInput = document.getElementById('primaryInput');
const cancelBtn = document.getElementById('cancelBtn');
const doneBtn = document.getElementById('doneBtn');
const changePasswordBtn = document.getElementById('changePasswordBtn');

const primaryErrorEl = document.getElementById('primaryError');
const passwordErrorEl = document.getElementById('passwordError');

let currentField = null; // track what is being edited

function openModal(param) {
    param = String(param).trim();
    currentField = param.toLowerCase(); // store lowercase field name
    modalTitle.textContent = `Change your ${param}`;
    primaryLabel.textContent = param;
    primaryInput.placeholder = param;
    primaryInput.value = '';
    document.getElementById('passwordInput').value = '';
    clearAllErrors();
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    setTimeout(() => primaryInput.focus(), 0);
}

function closeModal() {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    clearAllErrors();
}

document.querySelectorAll('.btn-edit').forEach(btn => {
    const label = btn.textContent.trim().toLowerCase();
    if (label === 'edit') {
        btn.addEventListener('click', () => {
            const card = btn.closest('.info-card');
            const titleEl = card?.querySelector('.info-title');
            const param = titleEl ? titleEl.textContent.trim() : 'Field';
            openModal(param);
        });
    }
});

// Change Password button opens modal for "Password"
changePasswordBtn.addEventListener('click', () => openModal('Password'));

cancelBtn.addEventListener('click', closeModal);

// Helpers for showing/clearing errors
function setError(el, message) {
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
}
function clearError(el) {
    if (!el) return;
    el.textContent = '';
    el.classList.remove('show');
}
function clearAllErrors() {
    clearError(primaryErrorEl);
    clearError(passwordErrorEl);
}

// Clear related errors when user types
primaryInput.addEventListener('input', () => {
    clearError(primaryErrorEl);
});
document.getElementById('passwordInput').addEventListener('input', () => {
    clearError(passwordErrorEl);
});

doneBtn.addEventListener('click', async () => {
    const password = document.getElementById('passwordInput').value.trim();
    const newValue = primaryInput.value.trim();

    clearAllErrors();

    // Password must always be filled out (client-side only)
    if (!password) {
        setError(passwordErrorEl, "This should be filled out");
        document.getElementById('passwordInput').focus();
        return;
    }

    // If editing something other than password, primary input must be filled
    if (currentField !== "password" && !newValue) {
        setError(primaryErrorEl, "This should be filled out");
        primaryInput.focus();
        return;
    }

    let settings = {};
    if (currentField === "name") settings.realname = newValue;
    else if (currentField === "phone number") settings.phone = newValue;
    else if (currentField === "minecraft username") settings.mcusername = newValue;
    else if (currentField === "additional usernames") settings.additionalusers = newValue;
    else if (currentField === "password") settings.password = newValue;

    try {
        const message = await updateAccount(password, settings);
        if (message) {
            setError(primaryErrorEl, message);
            primaryInput.focus();
        } else {
            // success: update values in the UI
            if (settings.realname) document.getElementById("name").textContent = settings.realname;
            if (settings.phone) document.getElementById("phone").textContent = settings.phone;
            if (settings.mcusername) document.getElementById("username").textContent = settings.mcusername;
            if (settings.additionalusers) document.getElementById("additionalusers").textContent = settings.additionalusers;
            closeModal();
        }
    } catch (err) {
        console.error(err);
        // fallback: show under primary input
        setError(primaryErrorEl, "Failed to update account.");
        primaryInput.focus();
    }
});

// ESC to close
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
        closeModal();
    }
});