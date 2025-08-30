async function addTool(tool) {
    try {
        const response = await fetch("/minecraft/admin/addTool", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(tool)
        });
        if (!response.ok && (response.status == 401 || response.status == 403)) window.location.reload();
        return await response.text()
    } catch (e) {
        alert("Error: " + e);
    }
}

async function removeTool(tool) {
    try {
        const response = await fetch("/minecraft/admin/removeTool", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(tool)
        });
        if (!response.ok && (response.status == 401 || response.status == 403)) window.location.reload();
        return await response.text()
    } catch (e) {
        alert("Error: " + e);
    }
}

async function newPassword(input) {
    try {
        const response = await fetch("/minecraft/admin/resetPassword", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(input)
        });
        if (!response.ok && (response.status == 401 || response.status == 403)) window.location.reload();
        return { message: (await response.text()), ok: response.ok };
    } catch (e) {
        alert("Error: " + e);
    }
}