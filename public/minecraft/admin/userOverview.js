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

const userOverview = document.querySelector('.user-grid');
function addUIUser({ mcusername, realname }) {
    const card = document.createElement('div'); card.className = 'user-card';
    const face = document.createElement('img'); face.className = 'mc-face'; face.src = `/minecraft/avatar/?u=${mcusername}`
    const name = document.createElement('div'); name.className = 'user-name'; name.textContent = realname;

    card.addEventListener('click', async () => {
        await openUserOverlay(mcusername);
    })

    card.appendChild(face);
    card.appendChild(name);
    userOverview.appendChild(card);
}

document.querySelector('.actions #done').addEventListener('click', () => {
    closeUserOverlay();
})

const userOverlay = document.getElementById('user-overlay');
const accountDetails = { realname: 'Name', phone: 'Phone Number', mcusername: 'Minecraft Username', additionalusers: 'Additional Usernames' };
async function openUserOverlay(mcusername) {
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
            value = document.createElement('div'); value.className = 'info-array'; value.style.borderColor = 'var(--mc-darkpurple)';
            if (Array.isArray(account[id])) {
                account[id].forEach(el => { userOverlayStructure(value, el, null) });
            } else {
                value.style.borderColor = 'var(--mc-lightpurple)';
                for (k in account[id]) {
                    const newCard = document.createElement('div');
                    userOverlayStructure(newCard, account[id][k], k)
                    value.appendChild(newCard);
                }
            }
        }

        card.appendChild(title);
        card.appendChild(value);
        infoCards.appendChild(card);
    };

    userOverlay.style.display = 'flex';
}

function userOverlayStructure(card, v, k) {
    const r = crypto.randomUUID();
    console.log(k, v, r)
    let value;
    if (typeof v !== 'object') {
        card.className = 'info-card';
        value = document.createElement('input'); value.className = 'info-value'; value.placeholder = v;
    }
    else {
        card.className = 'info-card array';
        value = document.createElement('div'); value.className = 'info-array'; value.style.borderColor = 'var(--mc-darkpurple)';
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
            value.style.borderColor = 'var(--mc-lightpurple)';
            for (key in v) {
                const newCard = document.createElement('div');
                userOverlayStructure(newCard, v[key], key)
                value.appendChild(newCard);
            }
        }
    }

    if (k) {
        console.log(k, v, r)
        let title = document.createElement('div'); title.className = 'info-title'; title.textContent = `${k}:`;
        card.appendChild(title)
    };

    card.appendChild(value);

    return card;
}

function closeUserOverlay() {
    userOverlay.querySelector('h1').textContent = 'Account';
    const infoCards = userOverlay.querySelector('.info-cards');
    infoCards.innerHTML = ''
    userOverlay.style.display = 'none';
}