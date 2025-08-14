async function createAccount(realname, mcusername, password, phone) {
    try {
        const response = await fetch("http://localhost:3000/minecraft/signup", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ realname: document.getElementById("realname").value, mcusername: document.getElementById("mcusername").value, password: document.getElementById("password").value, phone: document.getElementById("phone").value })
        })
        if (!response.ok) {
            alert("Error")
            return
        }
        alert("Success")
    }
    catch (e) {
        alert("Error: " + e)
    }
}