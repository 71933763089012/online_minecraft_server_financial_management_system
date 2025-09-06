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

const userOverview = document.querySelector('.user-grid');
function addUIUser({ mcusername, realname }) {
    const card = document.createElement('div'); card.className = 'user-card';
    const face = document.createElement('img'); face.className = 'mc-face'; face.src = `/minecraft/avatar/?u=${mcusername}`
    const name = document.createElement('div'); name.className = 'user-name'; name.textContent = realname;

    card.appendChild(face);
    card.appendChild(name);
    userOverview.appendChild(card);
    console.log(mcusername, realname)
}