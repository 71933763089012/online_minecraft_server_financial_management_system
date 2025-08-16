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
        window.location.href = '/minecraft'
    }
    catch (e) {
        alert("Error: " + e);
    }
}

async function login() {
    try {
        const response = await fetch("http://localhost:3000/minecraft/login", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                mcusername: document.getElementById("username").value,
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