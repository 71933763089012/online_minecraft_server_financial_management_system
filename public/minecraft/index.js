async function createAccount() {
    let hasError = false;

    document.querySelectorAll('#signupForm input').forEach(input => {
        const errorDiv = input.parentElement.querySelector('.error-message');
        const value = input.value.trim();
        let message = '';

        if (value === '') {
            message = 'This should be filled out';
        } else if (input.id === 'password') {
            if (value.length < 8) {
                message = 'Must be at least 8 charectors'
            } else if (value === value.toLowerCase()) {
                message = 'Must contain at least 1 uppercase letter'
            } else if (value === value.toUpperCase()) {
                message = 'Must contain at least 1 lowercase letter'
            } else if (!/\d/.test(value)) {
                message = 'Must contain at least 1 number'
            }
        } else if (input.id === 'phone') {
            if (!/^\d{8}$/.test(value)) {
                message = "This doesn't look like a phone number";
            }
        }

        if (message) {
            errorDiv.textContent = message;
            errorDiv.classList.add('show');
            hasError = true;
        } else {
            errorDiv.classList.remove('show');
            setTimeout(() => { errorDiv.textContent = ''; }, 250);
        }
    });

    if (hasError) return;

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
            alert("Error");
            return;
        }
        alert("Success");
    }
    catch (e) {
        alert("Error: " + e);
    }
}
