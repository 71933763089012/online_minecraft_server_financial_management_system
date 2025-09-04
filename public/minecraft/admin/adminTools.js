// --- Confirm Overlay Actions ---
const ElConfirmOverlay = document.getElementById('confirm-overlay');
function showConfirmOverlay() { ElConfirmOverlay.style.display = 'flex' }
function hideConfirmOverlay() { ElConfirmOverlay.style.display = 'none' }

//temp add tool button click event
const ElAddTool = document.getElementById('add-tool');
ElAddTool.addEventListener('click', function () {
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
    // addTool();
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

// --- Activate Confirm for Submit ---
let currentConfirm;
let confirmType;
function onSubmit(tool, inputEls, card) {
    const values = {};
    for (const k in inputEls) values[k] = inputEls[k].value;
    // basic required-field check: each field must be non-empty
    for (const k in values) { if (!String(values[k] || '').trim()) { const msg = card.querySelector('.card-message'); msg.textContent = `Missing Field: "${k}"`; msg.classList.add('error'); return; } }
    const body = document.querySelector('.confirm-body');
    // show a short list of inputs (escaped) so user can confirm sensitive actions
    const paramList = Object.entries(values).map(([k, v]) => `<div><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v).slice(0, 200))}</div>`).join('');
    body.innerHTML = `<div style="margin-bottom:8px">You are about to run <strong>${escapeHtml(tool.name)}</strong> with the following inputs:</div>${paramList}<div style="margin-top:8px;color:var(--text-dim);font-size:13px">Confirm to proceed.</div>`;
    currentConfirm = { tool, values, card }; confirmType = "Submit";
    showConfirmOverlay();
}

const ElConfirmOverlayCancel = document.getElementById('confirmNo');
ElConfirmOverlayCancel.addEventListener('click', function () {
    hideConfirmOverlay();
    currentConfirm = null;
});

const ElConfirmOverlayConfirm = document.getElementById('confirmYes');
ElConfirmOverlayConfirm.addEventListener('click', function () {
    switch (confirmType) {
        case "Submit":
            executeAction(currentConfirm)
            break;
        case "RemoveTool":

            break;
        default:
            alert(`ERROR : Invalid confirmType "${confirmType}"`)
    }
    hideConfirmOverlay()
});

// executeAction: attempts to call a global function by tool.action with provided values
async function executeAction({ tool, values, card }) {
    const msgEl = card.querySelector('.card-message');
    msgEl.textContent = 'Running…'; msgEl.classList.remove('error');
    try {
        // Resolve the function from the global window using the action string
        const fn = (typeof window[tool.action] === 'function') ? window[tool.action] : null;
        let result;
        if (typeof fn === 'function') result = await fn(Object.assign({}, values));
        else result = { ok: false, message: 'Missing function "' + tool.action + '"' };
        // interpret standard result shape { ok: boolean, message?: string }
        if (result && !result.ok) { msgEl.classList.add('error'); msgEl.textContent = result.message || 'Failed.'; }
        else { msgEl.textContent = result && result.message ? result.message : 'Success.'; }
    } catch (err) {
        // catch runtime errors from the action function and show to user
        console.error(err); msgEl.textContent = 'Error: ' + (err && err.message ? err.message : String(err)); msgEl.classList.add('error');
    }
}

// --- HTML Formating ---
function escapeHtml(str) { return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s])); }

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