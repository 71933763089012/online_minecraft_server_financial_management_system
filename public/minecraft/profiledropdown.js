function setCookie(name, value, days = 365) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + encodeURIComponent(value) + ";" + expires + ";path=/";
}

function getCookie(name) {
    const cname = name + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let c of ca) {
        c = c.trim();
        if (c.indexOf(cname) === 0) return c.substring(cname.length, c.length);
    }
    return null;
}

// --- Data: profiles ---
const profiles = [
    { name: 'Vanilla', enabled: false },
    { name: 'Lighly modded', enabled: false },
    { name: 'Modded', enabled: true }
];

// Currently selected (active) profile name. Must always be one of the enabled profiles.
let selectedProfile = getCookie("selectedProfile") || "Modded";

// DOM references
const input = document.getElementById('profileInput');
const dropdown = document.getElementById('profileDropdown');
const toggleBtn = document.getElementById('profileToggleBtn');
const inputBox = document.getElementById('profileInputBox');
const selectWrap = document.getElementById('profileSelect');

/**
 * Render the profile list into the dropdown.
 * filter: optional string to filter profile names (search behaviour).
 */
function renderProfiles(filter = '') {
    dropdown.innerHTML = ''; // clear
    const q = (filter || '').trim().toLowerCase();

    profiles.forEach((p) => {
        // filtering
        if (q && !p.name.toLowerCase().includes(q)) return;

        // Build item container
        const item = document.createElement('div');
        item.className = 'profile-item';
        if (!p.enabled) item.classList.add('disabled');
        if (selectedProfile === p.name && p.enabled) item.classList.add('active');
        item.dataset.name = p.name;

        // Left: icon placeholder + name
        const left = document.createElement('div');
        left.className = 'left';
        // // profile icon placeholder
        // const icon = document.createElement('span');
        // icon.className = 'profile-icon';
        // left.appendChild(icon);
        // profile name
        const name = document.createElement('div');
        name.className = 'profile-name';
        name.textContent = p.name;
        left.appendChild(name);

        // Right: toggle enable/disable button
        const toggle = document.createElement('div');
        toggle.className = 'toggle-btn';
        toggle.setAttribute('role', 'button');
        toggle.setAttribute('aria-label', p.enabled ? 'Disable profile' : 'Enable profile');
        toggle.dataset.name = p.name;
        // toggle.innerHTML = p.enabled ? '<span class="trash">🗑</span>' : '<span class="plus">+</span>';
        toggle.innerHTML = p.enabled
            ? '<img src="/minecraft/images/Trash button.png" alt="Disable profile" class="toggle-icon">'
            : '<img src="/minecraft/images/Plus button.png" alt="Enable profile" class="toggle-icon">';

        item.appendChild(left);
        item.appendChild(toggle);

        // --- Item click: select profile (only if enabled) ---
        item.addEventListener('click', async (ev) => {
            // If toggle was clicked, ignore here
            if (ev.target.closest('.toggle-btn')) return;
            if (!p.enabled) return; // disabled profiles are not selectable

            selectedProfile = p.name; // switch selection
            input.value = p.name; // reflect immediately
            await updateInputFields(selectedProfile);

            // close dropdown as user chose a profile
            closeDropdown();

            // re-render to update 'active' states
            renderProfiles(input.value);
        });

        // --- Toggle button click: enable/disable profile ---
        toggle.addEventListener('click', async (ev) => {
            ev.stopPropagation(); // don't let parent item click fire

            const name = ev.currentTarget.dataset.name;
            const idx = profiles.findIndex(x => x.name === name);
            if (idx === -1) return;

            const currentlyEnabled = profiles[idx].enabled;

            // If disabling, ensure at least one other enabled profile remains
            if (currentlyEnabled) {
                const othersEnabled = profiles.some((q, i) => i !== idx && q.enabled);
                if (!othersEnabled) {
                    // Visual feedback: briefly shake the toggle (class not defined, but kept for extension)
                    toggle.classList.add('shake');
                    setTimeout(() => toggle.classList.remove('shake'), 300);
                    return; // disallow disabling last enabled
                }
            }

            // Flip enabled state
            profiles[idx].enabled = !profiles[idx].enabled;

            // If we just disabled the profile that was selected, pick the first enabled profile
            if (!profiles[idx].enabled && selectedProfile === name) {
                const firstEnabled = profiles.find(q => q.enabled);
                if (firstEnabled) {
                    selectedProfile = firstEnabled.name;
                    input.value = selectedProfile; // reflect change in input
                } else {
                    // theoretical safety: shouldn't happen because we prevented disabling last
                    selectedProfile = null;
                    input.value = '';
                }
                await updateInputFields(selectedProfile);
            }

            // Re-render to update icons, active/disabled states
            renderProfiles(input.value);
        });

        dropdown.appendChild(item);
    });
}

// --- Open / close helpers ---
function openDropdown() {
    dropdown.classList.add('open');
    inputBox.setAttribute('aria-expanded', 'true');
    renderProfiles(input.value || '');
}

function closeDropdown() {
    dropdown.classList.remove('open');
    inputBox.setAttribute('aria-expanded', 'false');
    // When closing, always restore the input to the selected profile name
    input.value = selectedProfile || '';
    input.blur(); // remove focus from the input field
}

let unsavedChanges = false;
async function updateInputFields(newProfile) {
    if (unsavedChanges) {
        console.log("saved to profile: ", document.cookie)
        await saveSettings({
            max_cost: document.getElementById("maxCost").value,
            min_players: document.getElementById("minPlayers").value
        });
        unsavedChanges = false;
    }
    setCookie("selectedProfile", newProfile);
    console.log("loaded profile: ", document.cookie)
    const profileData = await profile()
    document.getElementById("maxCost").value = profileData.max_cost;
    document.getElementById("minPlayers").value = profileData.min_players;
}

// --- Input & toggle button behavior ---
// Clicking the arrow behaves like focusing into search: clear the visible text and open dropdown
toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    input.value = '';
    openDropdown();
    // Put focus in the input so the user can type right away
    setTimeout(() => input.focus(), 10);
});

// Clicking the input should open and prepare for search; clear what's shown
input.addEventListener('focus', (e) => {
    // Clear the visible text so the user can quickly type (this is temporary)
    input.value = '';
    openDropdown();
});

// Typing filters the list
input.addEventListener('input', (e) => {
    renderProfiles(e.target.value || '');
});

// Close dropdown when clicking outside the selector
document.addEventListener('click', (e) => {
    if (!selectWrap.contains(e.target)) closeDropdown();
});

// Keyboard: escape to close
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDropdown();
});

// initialize selector on page load
(function initProfileSelector() {
    // ensure selectedProfile is visible in the input initially
    input.value = selectedProfile;
    renderProfiles();
})();