const ElConfirmOverlay = document.getElementById('confirm-overlay');
function showConfirmOverlay() {
    ElConfirmOverlay.style.display = 'flex';
}

function hideConfirmOverlay() {
    ElConfirmOverlay.style.display = 'none';
}

//temp cancel button click event
const ElConfirmOverlayCancel = document.getElementById('confirmNo');
ElConfirmOverlayCancel.addEventListener('click', function (event) {
    event.preventDefault();
    hideConfirmOverlay();
});

//temp cancel button click event
const ElAddTool = document.getElementById('add-tool');
ElAddTool.addEventListener('click', function (event) {
    addUITool({
        name: "Reset Password",
        inputs: [
            {
                key: "mcusername",
                label: "MC Username",
                type: "text"
            },
            {
                key: "password",
                label: "New Password",
                type: "pasword"
            }
        ],
        action: "newPassword"
    });
});

const ToolBox = document.getElementById('tool-box')
function addUITool(tool) {
    const card = document.createElement('div'); card.className = 'tool-card';
    const title = document.createElement('div'); title.className = 'tool-title'; title.textContent = tool.name;
    const body = document.createElement('div'); body.className = 'tool-body';
    const inputEls = {}; // map of key->element for reading values later

    // Build the input fields for the tool based on its inputs definition
    (tool.inputs || []).forEach(inp => {
        const fieldWrap = document.createElement('div');
        const label = document.createElement('label'); label.textContent = inp.label || inp.key;
        fieldWrap.appendChild(label);
        let el;
        // support textarea, select and default to <input>
        if (inp.type === 'textarea') {
            el = document.createElement('textarea')
        } else if (inp.type === 'select') {
            el = document.createElement('select');
            (inp.options || []).forEach(o => { const opt = document.createElement('option'); opt.value = o.value; opt.textContent = o.label; el.appendChild(opt); });
        } else { el = document.createElement('input'); el.type = inp.type || 'text' }
        el.placeholder = inp.placeholder || '';
        el.dataset.key = inp.key;
        // Clear any card message when user edits fields (simple UX nicety)
        el.addEventListener('input', () => { const msg = card.querySelector('.card-message'); if (msg) msg.textContent = ''; });
        fieldWrap.appendChild(el);

        body.appendChild(fieldWrap);
        inputEls[inp.key] = el;
    });

    card.appendChild(title);
    card.appendChild(body);

    // Submit button triggers onSubmit which shows confirm overlay
    const submit = document.createElement('button'); submit.className = 'submit-btn'; submit.textContent = 'Submit';
    submit.addEventListener('click', () => onSubmit(tool, inputEls, card));
    card.appendChild(submit);

    // New: action buttons (Edit / Remove)
    const actions = document.createElement('div'); actions.className = 'card-actions';
    const editBtn = document.createElement('button'); editBtn.className = 'edit'; editBtn.textContent = 'Edit';
    const removeBtn = document.createElement('button'); removeBtn.className = 'remove'; removeBtn.textContent = 'Remove';

    // Wire the buttons to call globally-exposed handlers if present, otherwise default local handlers.
    // Temporary
    editBtn.addEventListener('click', () => {

    });

    // Temporary
    removeBtn.addEventListener('click', () => {
        showConfirmOverlay();
    });

    actions.appendChild(editBtn); actions.appendChild(removeBtn);
    card.appendChild(actions);

    const msg = document.createElement('div'); msg.className = 'card-message'; card.appendChild(msg);

    ToolBox.appendChild(card);
}

// Temporary
function onSubmit() {
    showConfirmOverlay();
}

// --- TOOLS ---
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