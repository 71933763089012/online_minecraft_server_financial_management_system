// --- TOOLS ---
async function addTool(tool) {
    try {
        const response = await fetch("/minecraft/admin/addTool", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(tool)
        });
        if (!response.ok && (response.status == 401 || response.status == 403)) window.location.reload();
        return await response.text();
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
        return await response.text();
    } catch (e) {
        alert("Error: " + e);
    }
}

async function changeTool(old, fresh) {
    try {
        const response = await fetch("/minecraft/admin/changeTool", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ old, fresh })
        });
        if (!response.ok && (response.status == 401 || response.status == 403)) window.location.reload();
        return await response.text();
    } catch (e) {
        alert("Error: " + e);
    }
}

async function importTools(json) {
    try {
        const response = await fetch("/minecraft/admin/importTools", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: json
        });
        if (!response.ok && (response.status == 401 || response.status == 403)) window.location.reload();
        return await response.json();
    } catch (e) {
        alert("Error: " + e);
    }
}

async function reorderTools(index) {
    console.log(index)
    try {
        const response = await fetch("/minecraft/admin/reorderTools", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(index)
        });
        if (!response.ok && (response.status == 401 || response.status == 403)) window.location.reload();
        return await response.text();
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

async function regenerateHashkey(input) {
    try {
        const response = await fetch("/minecraft/admin/regenerateHashkey", {
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

// --- Handle Tools ---
const ToolBox = document.getElementById('tool-box')

ToolBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
});

ToolBox.addEventListener('drop', (e) => {
    e.preventDefault();
    const draggedElement = document.querySelector('.dragging');
    if (draggedElement) {
        draggedElement.classList.remove('dragging');
    }
});

function addUITool(tool) {
    const card = document.createElement('div'); card.className = 'tool-card';
    const title = document.createElement('div'); title.className = 'tool-title'; title.textContent = tool.name;
    const body = document.createElement('div'); body.className = 'tool-body';
    const inputEls = {}; // map of key->element for reading values later

    // Make the card draggable
    card.draggable = true;
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('drop', handleDrop);

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
    editBtn.addEventListener('click', () => openEditor(tool, card));
    removeBtn.addEventListener('click', () => onRemove(tool, card));

    actions.appendChild(editBtn); actions.appendChild(removeBtn);
    card.appendChild(actions);

    const msg = document.createElement('div'); msg.className = 'card-message'; card.appendChild(msg);

    ToolBox.appendChild(card);
}

function changeUITool(card, tool) {
    const title = card.querySelector('.tool-title'); title.textContent = tool.name;
    const body = card.querySelector('.tool-body');
    body.innerHTML = '';
    const inputEls = {};

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

    const submit = resetNode(card.querySelector('.submit-btn'));
    const actions = card.querySelector('.card-actions');
    const editBtn = resetNode(actions.querySelector('.edit'));
    const removeBtn = resetNode(actions.querySelector('.remove'));

    submit.addEventListener('click', () => onSubmit(tool, inputEls, card));
    editBtn.addEventListener('click', () => openEditor(tool, card));
    removeBtn.addEventListener('click', () => onRemove(tool, card));
}

function resetNode(oldNode) {
    const n = oldNode.cloneNode(true);
    oldNode.parentNode.replaceChild(n, oldNode);
    return n
}

// --- Drag and Drop Event Handlers ---
let startX;
function handleDragStart(e) {
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.outerHTML);
    startX = e.clientX;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    // Remove all drop indicators
    document.querySelectorAll('.tool-card').forEach(card => {
        card.classList.remove('drop-on');
    });
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }

    e.dataTransfer.dropEffect = 'move';

    // Don't show drop indicator on the dragged element itself
    if (this.classList.contains('dragging')) {
        return false;
    }

    // Remove existing drop indicators
    document.querySelectorAll('.tool-card').forEach(card => {
        card.classList.remove('drop-on');
    });

    this.classList.add('drop-on');

    return false;
}

async function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation(); // Stops some browsers from redirecting
    }

    const draggedElement = document.querySelector('.dragging');
    if (!draggedElement || draggedElement === this) {
        return false;
    }

    // Remove the dragged element from its current position
    const oldIndex = Array.from(draggedElement.parentElement.children).findIndex(child => child === draggedElement);
    draggedElement.remove();

    // Insert at new position
    if (startX > e.clientX) {
        this.parentNode.insertBefore(draggedElement, this);
    } else {
        this.parentNode.insertBefore(draggedElement, this.nextSibling);
    }

    // Clean up
    draggedElement.classList.remove('dragging');
    this.classList.remove('drop-on');

    const newIndex = Array.from(draggedElement.parentElement.children).findIndex(child => child === draggedElement);

    await reorderTools({ oldIndex, newIndex });

    return false;
}

// --- Remove Tool ---
let currentConfirm;
let confirmType;
function onRemove(tool, card) {
    const body = document.querySelector('.confirm-body');
    body.innerHTML = `<div style="margin-bottom:8px">You are about to delete "<strong>${escapeHtml(tool.name)}</strong>"</div><div style="margin-top:8px;font-size:13px">Confirm to proceed.</div>`;
    currentConfirm = { tool, card }; confirmType = "RemoveTool";
    showConfirmOverlay();
}

// --- Activate Confirm for Submit ---
function onSubmit(tool, inputEls, card) {
    const values = {};
    for (const k in inputEls) values[k] = inputEls[k].value;
    // basic required-field check: each field must be non-empty
    for (const k in values) { if (!String(values[k] || '').trim()) { const msg = card.querySelector('.card-message'); msg.textContent = `Missing Field: "${k}"`; msg.classList.add('error'); return; } }
    const body = document.querySelector('.confirm-body');
    // show a short list of inputs (escaped) so user can confirm sensitive actions
    const paramList = Object.entries(values).map(([k, v]) => `<div><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v).slice(0, 200))}</div>`).join('');
    body.innerHTML = `<div style="margin-bottom:8px">You are about to run <strong>${escapeHtml(tool.name)}</strong> with the following inputs:</div>${paramList}<div style="margin-top:8px;font-size:13px">Confirm to proceed.</div>`;
    currentConfirm = { tool, values, card }; confirmType = "Submit";
    showConfirmOverlay();
}

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

// --- Confirm Overlay ---
const ElConfirmOverlay = document.getElementById('confirm-overlay');
function showConfirmOverlay() { ElConfirmOverlay.style.display = 'flex' }
function hideConfirmOverlay() { ElConfirmOverlay.style.display = 'none'; currentConfirm = null; }

const ElConfirmOverlayCancel = document.getElementById('confirmNo');
ElConfirmOverlayCancel.addEventListener('click', hideConfirmOverlay);

const ElConfirmOverlayConfirm = document.getElementById('confirmYes');
ElConfirmOverlayConfirm.addEventListener('click', async function () {
    switch (confirmType) {
        case "Submit":
            await executeAction(currentConfirm)
            break;
        case "RemoveTool":
            await removeTool(currentConfirm.tool);
            currentConfirm.card.remove();
            break;
        case "AddTool":
            await addTool(currentConfirm);
            addUITool(currentConfirm);
            closeEditor();
            break;
        case "ChangeTool":
            await changeTool(currentConfirm.old, currentConfirm.new);
            changeUITool(currentConfirm.card, currentConfirm.new);
            closeEditor();
            break;
        case "ImportTools":
            const newTools = await importTools(currentConfirm);
            ToolBox.innerHTML = '';
            newTools.forEach(tool => { addUITool(tool); });
            break;
        default:
            alert(`ERROR : Invalid confirmType "${confirmType}"`)
    }
    hideConfirmOverlay()
});

// --- Editor logic ---
document.getElementById('add-tool').addEventListener('click', () => openEditor());

// Grabbing DOM references used by the editor
const editorOverlay = document.getElementById('editorOverlay');
const editorAddInput = document.getElementById('editorAddInput');
const editorInputs = document.getElementById('editorInputs');
const editorName = document.getElementById('toolName');
const editorAction = document.getElementById('toolAction');
const editorCancel = document.getElementById('editorCancel');
const editorSave = document.getElementById('editorSave');

let hasPrefill;
function openEditor(prefill, card) {
    editorName.value = (prefill && prefill.name) || '';
    editorAction.value = (prefill && prefill.action) || '';
    editorInputs.innerHTML = '';
    // if prefill has inputs, append them; otherwise add one blank input card
    if (prefill && Array.isArray(prefill.inputs)) {
        prefill.inputs.forEach(i => appendInputCard(i.key, i.label, i.type));
    } else {
        appendInputCard('', '', 'text');
    }
    editorOverlay.style.display = 'flex';
    // focus the name input if there is no prefill
    hasPrefill = prefill || false;
    if (hasPrefill === false) setTimeout(() => editorName.focus(), 50);
    else hasPrefill = { tool: hasPrefill, card };
}

function closeEditor() { editorOverlay.style.display = 'none'; }

// Hook up editor buttons
editorAddInput.addEventListener('click', () => appendInputCard('', '', 'text'));
editorCancel.addEventListener('click', closeEditor);

// appendInputCard creates a UI card for an input definition (label/key/type + remove)
function appendInputCard(key = '', label = '', type = 'text') {
    const card = document.createElement('div'); card.className = 'input-card';
    // Label field
    const labelField = document.createElement('div');
    labelField.innerHTML = `<label>Label</label><input placeholder="Label" class="input-label" value="${escapeHtml(label)}" />`;
    // Key field (used as the param name)
    const keyField = document.createElement('div');
    keyField.innerHTML = `<label>Key</label><input placeholder="Key" class="input-key" value="${escapeHtml(key)}" />`;
    // Type selector and remove button
    const typeRow = document.createElement('div'); typeRow.className = 'mini-row';
    const typeSelect = document.createElement('select');
    ['text', 'password', 'number', 'textarea'].forEach(t => { const o = document.createElement('option'); o.value = t; o.textContent = t; if (t === type) o.selected = true; typeSelect.appendChild(o); });
    const removeBtn = document.createElement('button'); removeBtn.className = 'remove-input'; removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => { card.remove(); });
    typeRow.appendChild(typeSelect); typeRow.appendChild(removeBtn);
    card.appendChild(labelField); card.appendChild(keyField); card.appendChild(typeRow);
    editorInputs.appendChild(card);
    // scroll to end so newly added card is visible
    setTimeout(() => { editorInputs.scrollLeft = editorInputs.scrollWidth; }, 50);
}

// Save logic for the editor: validate and then show a confirm overlay before adding the tool
editorSave.addEventListener('click', () => {
    const name = (editorName.value || '').trim();
    const action = (editorAction.value || '').trim();
    // if (!name) return alert('Tool must have a name');
    // if (!action) return alert('Tool must have an action function name');

    const inputs = [];
    const cards = Array.from(editorInputs.querySelectorAll('.input-card'));
    for (const c of cards) {
        const key = (c.querySelector('.input-key')?.value || '').trim();
        const label = (c.querySelector('.input-label')?.value || '').trim();
        const type = (c.querySelector('select')?.value || 'text');
        // if (!k || !l) return alert('Each input must have both a key and a label.');
        inputs.push({ key, label, type });
    }

    // Show confirm overlay
    const body = document.querySelector('.confirm-body');
    const paramList = inputs.map(i => escapeHtml(i.key)).join(', ');
    body.innerHTML = `<div style="margin-bottom:8px">You're about to add "<strong>${escapeHtml(name)}</strong>" to the toolbox.</div><code>${escapeHtml(action)}(${paramList})</code><div style="margin-top:8px">Confirm to add.</div>`;
    showConfirmOverlay();
    if (hasPrefill) {
        confirmType = "ChangeTool";
        currentConfirm = { new: { name, inputs, action }, old: hasPrefill.tool, card: hasPrefill.card };
        return;
    }
    confirmType = "AddTool";
    currentConfirm = { name, inputs, action };
});

// allow Esc to close editor — simple global key handler
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && editorOverlay.style.display === "flex") {
        closeEditor();
        hideConfirmOverlay();
    }
});

// --- Import System ---
document.getElementById('fileInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file) {
        handleFile(file);
    }
});

const shell = document.querySelector('.admin-shell');
shell.addEventListener('dragover', function (event) {
    event.preventDefault();
    shell.style.filter = 'brightness(120%)';
});

shell.addEventListener('dragleave', function (event) {
    event.preventDefault();
    shell.style.filter = 'brightness(100%)';
});

shell.addEventListener('drop', function (event) {
    event.preventDefault();
    shell.style.filter = 'brightness(100%)';

    const files = event.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        handleFile(file);
    }
});

function handleFile(file) {
    // Check if file is JSON before processing
    if (!file.name.toLowerCase().endsWith('.json')) {
        alert('Please select a JSON file (.json)');
        return;
    }

    // Read the file
    const reader = new FileReader();
    reader.onload = async function (event) {
        try {
            const fileContent = event.target.result;

            document.querySelector('.confirm-body').innerHTML = `<div style="margin-bottom:8px">You're about to import "<strong>${escapeHtml(file.name)}</strong>".</div><div style="margin-top:8px">Confirm to import.</div>`;
            confirmType = "ImportTools";
            currentConfirm = fileContent
            showConfirmOverlay();
        } catch (error) {
            console.error('Error parsing JSON:', error);
            alert('Error:', error);
        }
    };
    reader.readAsText(file);
}

// --- HTML Formating ---
function escapeHtml(str) { return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s])); }