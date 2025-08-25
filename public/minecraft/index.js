async function createAccount() {
    try {
        const response = await fetch("/minecraft/signup", {
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
        window.location.href = '/minecraft'
    }
    catch (e) {
        alert("Error: " + e);
    }
}

async function login() {
    try {
        const response = await fetch("/minecraft/login", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                mcusername: document.getElementById("mcusername").value,
                password: document.getElementById("password").value,
            })
        });
        if (!response.ok) {
            if (response.status === 400) {
                const errorMessages = await response.json();
                document.querySelectorAll('#loginForm .error-message').forEach((div, index) => {
                    const key = Object.keys(errorMessages)[index];
                    div.textContent = errorMessages[key];
                    if (errorMessages[key]) {
                        div.classList.add('show');
                    } else {
                        div.classList.remove('show');
                    }
                });
            } else {
                alert("Error");
            }
            return;
        }
        window.location.href = '/minecraft'
    }
    catch (e) {
        alert("Error: " + e);
    }
}

async function me() {
    try {
        const response = await fetch("/minecraft/me", {
            method: "GET",
            headers: { "content-type": "application/json" },
            credentials: 'include'
        });
        if (!response.ok) {
            if (response.status === 403) {
                window.location.href = '/minecraft/login';
            } else if (response.status === 401 || response.status === 404) {
                window.location.href = '/minecraft/signup';
            } else {
                alert("Error");
            }
            return;
        }
        return await response.json();

    } catch (e) {
        alert("Error: " + e);
    }
}

async function saveSettings(settings) {
    try {
        const response = await fetch("/minecraft/saveSettings", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(settings)
        });
        if (!response.ok) {
            if (response.status === 400) {

            } else {
                alert("Error");
            }
            return;
        }
    }
    catch (e) {
        alert("Error: " + e);
    }
}

async function updateAccount(password, settings) {
    try {
        const response = await fetch("/minecraft/account", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                password, settings
            })
        });
        if (!response.ok) {
            if (response.status === 400) {

            } else {
                alert("Error");
            }
            return false;
        }
        return true;
    } catch (e) {
        alert("Error: " + e);
    }
}

function logout() {
    // Remove all cookies visible to JS
    document.cookie.split(";").forEach(c => {
        document.cookie = c.trim().split("=")[0] +
            "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
    })

    window.location.href = "/minecraft/login";
}

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("keydown", function (e) {
            if (e.key === "Enter") login();
        });
    }

    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
        signupForm.addEventListener("keydown", function (e) {
            if (e.key === "Enter") createAccount();
        });
    }
});

async function USDtoDKK(USD) {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=DKK");
    const data = await res.json();
    return USD * data.rates.DKK;
}