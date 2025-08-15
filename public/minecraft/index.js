async function createAccount() {
    try {
        const response = await fetch("http://localhost:3000/minecraft/signup", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                realname: document.getElementById("realname").value,
                mcusername: document.getElementById("mcusername").value,
                password: document.getElementById("password").value,
                phone: document.getElementById("phone").value
            })
        });
        if (!response.ok) {
            if (response.status === 400) {
                const errorMessages = await response.json();
                document.querySelectorAll('#signupForm .error-message').forEach((div, index) => {
                    const key = Object.keys(errorMessages)[index];
                    div.textContent = errorMessages[key];
                    div.classList.add('show');
                });
            } else {
                alert("Error");
            }
            return;
        }
        alert("Success");
    }
    catch (e) {
        alert("Error: " + e);
    }
}

const path = require('path');
const ACCOUNTS_FILE = path.join(__dirname, 'data/accounts.json');

async function readAccounts() {
    try {
        const txt = await fs.readFile(ACCOUNTS_FILE, 'utf8');
        return JSON.parse(txt);
    } catch (err) {
        if (err.code === 'ENOENT') return []; // file not found -> start empty list
        throw err; // other error -> crash so we notice
    }
}