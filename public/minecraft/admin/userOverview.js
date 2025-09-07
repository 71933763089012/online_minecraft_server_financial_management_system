async function getAccounts() {
    try {
        const response = await fetch("/minecraft/admin/getAccounts", {
            method: "GET",
            headers: { "content-type": "application/json" },
            credentials: 'include'
        });
        if (!response.ok && (response.status == 401 || response.status == 403)) window.location.reload();
        return await response.json();
    } catch (e) {
        alert("Error: " + e);
    }
}

async function getAccount(mcusername) {
    try {
        const response = await fetch("/minecraft/admin/getAccount", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ mcusername })
        });
        if (!response.ok && (response.status == 401 || response.status == 403)) window.location.reload();
        return await response.json();
    } catch (e) {
        alert("Error: " + e);
    }
}

async function setAccount(mcusername, account) {
    try {
        const response = await fetch("/minecraft/admin/setAccount", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ mcusername, account })
        });
        if (!response.ok && (response.status == 401 || response.status == 403)) window.location.reload();
    } catch (e) {
        alert("Error: " + e);
    }
}

const userOverview = document.querySelector('.user-grid');
let currentUser;
function addUIUser({ mcusername, realname }) {
    const card = document.createElement('div'); card.className = 'user-card';
    const face = document.createElement('img'); face.className = 'mc-face'; face.src = `/minecraft/avatar/?u=${mcusername}`
    const name = document.createElement('div'); name.className = 'user-name'; name.textContent = realname;

    card.addEventListener('click', async () => {
        currentUser = card;
        await openUserOverlay(mcusername);
    })

    card.appendChild(face);
    card.appendChild(name);
    userOverview.appendChild(card);
}

document.querySelector('.actions #cancel').addEventListener('click', () => { closeUserOverlay(); })
document.querySelector('.actions #done').addEventListener('click', async () => {
    const body = document.querySelector('.confirm-body');
    const mcusername = userOverlay.getAttribute('mcusername');
    body.innerHTML = `<div style="margin-bottom:8px">You are about to edit the account of <strong>${escapeHtml(mcusername)}</strong>.</div><div style="margin-top:8px;font-size:13px">Confirm to proceed.</div>`;
    currentConfirm = { mcusername, currentUser }; confirmType = "UpdateUserAccount";
    showConfirmOverlay();
})

const userOverlay = document.getElementById('user-overlay');
const accountDetails = { realname: 'Name', phone: 'Phone Number', mcusername: 'Minecraft Username', additionalusers: 'Additional Usernames' };
async function openUserOverlay(mcusername) {
    userOverlay.setAttribute('mcusername', mcusername);
    const account = await getAccount(mcusername);
    userOverlay.querySelector('h1').textContent = account.realname;
    const infoCards = userOverlay.querySelector('.info-cards');
    infoCards.innerHTML = ''
    for (id in accountDetails) {
        let card;
        let title = document.createElement('div'); title.className = 'info-title'; title.textContent = `${accountDetails[id]}:`;
        let value;
        if (typeof account[id] !== 'object') {
            card = document.createElement('div'); card.className = 'info-card';
            value = document.createElement('input'); value.className = 'info-value'; value.placeholder = account[id];
        }
        else {
            card = document.createElement('div'); card.className = 'info-card array';
            value = document.createElement('div'); value.className = 'info-array';
            value.style.borderColor = 'var(--mc-darkpurple)';
            value.setAttribute('type', 'array');
            if (Array.isArray(account[id])) {
                account[id].forEach(el => { userOverlayStructure(value, el, null) });
            } else {
                value.style.borderColor = 'var(--mc-lightpurple)'; value.setAttribute('type', 'body');
                for (k in account[id]) {
                    const newCard = document.createElement('div');
                    userOverlayStructure(newCard, account[id][k], k)
                    value.appendChild(newCard);
                }
            }
        }

        card.appendChild(title);
        card.appendChild(value);
        if (id) card.setAttribute('key', id);
        infoCards.appendChild(card);
    };

    userOverlay.style.display = 'flex';
}

function userOverlayStructure(card, v, k) {
    let value;
    if (typeof v !== 'object') {
        card.className = 'info-card';
        value = document.createElement('input'); value.className = 'info-value'; value.placeholder = v;
    }
    else {
        card.className = 'info-card array';
        value = document.createElement('div'); value.className = 'info-array';
        value.style.borderColor = 'var(--mc-darkpurple)'; value.setAttribute('type', 'array');
        if (Array.isArray(v)) {
            v.forEach(el => {
                if (typeof el === 'object') userOverlayStructure(value, el, null);
                else {
                    const newCard = document.createElement('div');
                    userOverlayStructure(newCard, el, null);
                    value.appendChild(newCard);
                }
            });
        } else {
            value.style.borderColor = 'var(--mc-lightpurple)'; value.setAttribute('type', 'body');
            for (key in v) {
                const newCard = document.createElement('div');
                userOverlayStructure(newCard, v[key], key)
                value.appendChild(newCard);
            }
        }
    }

    if (k) {
        let title = document.createElement('div'); title.className = 'info-title'; title.textContent = `${k}:`;
        card.appendChild(title)
    };

    card.appendChild(value);
    if (k) card.setAttribute('key', k);

    return card;
}

function closeUserOverlay() {
    userOverlay.querySelector('h1').textContent = 'Account';
    const infoCards = userOverlay.querySelector('.info-cards');
    infoCards.innerHTML = ''
    userOverlay.style.display = 'none';
}

function compileUserChanges(container) {
    const result = {};

    // Get all direct child info-cards
    const cards = container.children;

    for (let card of cards) {
        if (!card.classList.contains('info-card')) continue;

        const key = card.getAttribute('key');
        if (!key) continue;

        const valueElement = card.querySelector('.info-value, .info-array');
        if (!valueElement) continue;

        if (valueElement.classList.contains('info-value')) {
            // Simple input field
            result[key] = valueElement.value || valueElement.placeholder || '';
        } else if (valueElement.classList.contains('info-array')) {
            // Complex structure (array or object)
            const type = valueElement.getAttribute('type');

            if (type === 'array') {
                result[key] = compileArray(valueElement);
            } else if (type === 'body') {
                result[key] = compileObject(valueElement);
            }
        }
    }

    return result;
}

function compileArray(arrayContainer) {
    const result = [];

    for (let child of arrayContainer.children) {
        if (child.classList.contains('info-card')) {
            const valueElement = child.querySelector('.info-value, .info-array');

            if (valueElement.classList.contains('info-value')) {
                result.push(valueElement.value || valueElement.placeholder || '');
            } else if (valueElement.classList.contains('info-array')) {
                const type = valueElement.getAttribute('type');
                if (type === 'array') {
                    result.push(compileArray(valueElement));
                } else if (type === 'body') {
                    result.push(compileObject(valueElement));
                }
            }
        }
    }

    return result;
}

function compileObject(objectContainer) {
    const result = {};

    for (let child of objectContainer.children) {
        if (child.classList.contains('info-card')) {
            const key = child.getAttribute('key');
            if (!key) continue;

            const valueElement = child.querySelector('.info-value, .info-array');

            if (valueElement.classList.contains('info-value')) {
                result[key] = valueElement.value || valueElement.placeholder || '';
            } else if (valueElement.classList.contains('info-array')) {
                const type = valueElement.getAttribute('type');
                if (type === 'array') {
                    result[key] = compileArray(valueElement);
                } else if (type === 'body') {
                    result[key] = compileObject(valueElement);
                }
            }
        }
    }

    return result;
}