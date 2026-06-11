// app.js - Hotel Management System Frontend Logic

const API_BASE = '/api';

// State Management
let currentActiveTab = 'dashboard';
let currentEditingRecord = null; // Holds record if editing

// Table schemas for CRUD rendering
const tableSchemas = {
    Guest: [
        { name: 'guest_id', label: 'Guest ID', type: 'number', readOnly: true, placeholder: 'Auto-generated' },
        { name: 'name', label: 'Full Name', type: 'text', required: true },
        { name: 'phone', label: 'Phone Number', type: 'text', required: true },
        { name: 'address', label: 'Address', type: 'text' },
        { name: 'id_proof', label: 'ID Proof Number', type: 'text', required: true }
    ],
    Room: [
        { name: 'room_id', label: 'Room ID', type: 'number', readOnly: true, placeholder: 'Auto-generated' },
        { name: 'room_type', label: 'Room Type', type: 'select', options: ['Standard', 'Deluxe', 'Suite'], required: true },
        { name: 'price_per_day', label: 'Price Per Day ($)', type: 'number', step: '0.01', required: true },
        { name: 'status', label: 'Status', type: 'select', options: ['Available', 'Booked', 'Maintenance'], required: true }
    ],
    Booking: [
        { name: 'booking_id', label: 'Booking ID', type: 'number', readOnly: true, placeholder: 'Auto-generated' },
        { name: 'guest_id', label: 'Guest', type: 'select_api', apiTable: 'Guest', labelCol: 'name', valueCol: 'guest_id', required: true },
        { name: 'room_id', label: 'Room', type: 'select_api', apiTable: 'Room', labelCol: 'room_id', filterCol: 'room_type', required: true },
        { name: 'check_in_date', label: 'Check-In Date', type: 'date', required: true },
        { name: 'check_out_date', label: 'Check-Out Date', type: 'date', required: true }
    ],
    Staff: [
        { name: 'staff_id', label: 'Staff ID', type: 'number', readOnly: true, placeholder: 'Auto-generated' },
        { name: 'name', label: 'Full Name', type: 'text', required: true },
        { name: 'role', label: 'Role', type: 'text', required: true },
        { name: 'phone', label: 'Phone Number', type: 'text', required: true }
    ],
    Payment: [
        { name: 'payment_id', label: 'Payment ID', type: 'number', readOnly: true, placeholder: 'Auto-generated' },
        { name: 'booking_id', label: 'Booking', type: 'select_api', apiTable: 'Booking', labelCol: 'booking_id', valueCol: 'booking_id', required: true },
        { name: 'amount', label: 'Amount Paid ($)', type: 'number', step: '0.01', required: true },
        { name: 'payment_date', label: 'Payment Date', type: 'date', required: true },
        { name: 'payment_method', label: 'Payment Method', type: 'select', options: ['Credit Card', 'Debit Card', 'Cash', 'Bank Transfer'], required: true }
    ],
    Service: [
        { name: 'service_id', label: 'Service ID', type: 'number', readOnly: true, placeholder: 'Auto-generated' },
        { name: 'service_name', label: 'Service Name', type: 'text', required: true },
        { name: 'service_charge', label: 'Service Charge ($)', type: 'number', step: '0.01', required: true }
    ]
};

// Start Up Initializations
document.addEventListener('DOMContentLoaded', () => {
    // Initial fetch of dashboard counts
    refreshDashboardStats();
    
    // Auto-load triggers dropdown lists
    loadDropdownsForProceduresAndTriggers();
});

// Toast notification helper
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '🔔';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    
    toast.innerHTML = `<span>${icon}</span> <div>${message}</div>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(30px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Sidebar tab swapper
function showTab(tabId) {
    // Remove active from previous
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    // Add active to selected
    document.getElementById(`tab-${tabId}`).classList.add('active');
    document.getElementById(`nav-btn-${tabId}`).classList.add('active');
    
    currentActiveTab = tabId;
    
    // Action trigger on loading specific tab
    if (tabId === 'tables') {
        loadTableData();
    } else if (tabId === 'dashboard') {
        refreshDashboardStats();
    } else if (tabId === 'queries') {
        runQuery(1); // load query 1 by default
    } else if (tabId === 'procedures' || tabId === 'triggers') {
        loadDropdownsForProceduresAndTriggers();
    }
}

// Fetch stats counts for Dashboard
async function refreshDashboardStats() {
    try {
        const roomsRes = await fetch(`${API_BASE}/table/Room`);
        const bookingsRes = await fetch(`${API_BASE}/table/Booking`);
        const guestsRes = await fetch(`${API_BASE}/table/Guest`);
        
        const rooms = await roomsRes.json();
        const bookings = await bookingsRes.json();
        const guests = await guestsRes.json();
        
        document.getElementById('stat-rooms-count').innerText = rooms.length || 0;
        document.getElementById('stat-bookings-count').innerText = bookings.length || 0;
        document.getElementById('stat-guests-count').innerText = guests.length || 0;
    } catch (err) {
        console.error('Error fetching stats:', err);
    }
}

// Fetch helper to load selections for forms & procedures
async function loadDropdownsForProceduresAndTriggers() {
    try {
        const roomsRes = await fetch(`${API_BASE}/table/Room`);
        const guestsRes = await fetch(`${API_BASE}/table/Guest`);
        const bookingsRes = await fetch(`${API_BASE}/table/Booking`);
        
        const rooms = await roomsRes.json();
        const guests = await guestsRes.json();
        const bookings = await bookingsRes.json();
        
        // Populate Procedure Bill select
        const procBillSel = document.getElementById('proc-booking-id');
        if (procBillSel) {
            procBillSel.innerHTML = bookings.map(b => {
                const guest = guests.find(g => g.guest_id === b.guest_id);
                const guestName = guest ? guest.name : 'Unknown';
                return `<option value="${b.booking_id}">Booking #${b.booking_id} (${guestName} - Room ${b.room_id})</option>`;
            }).join('');
        }
        
        // Populate Trigger Available Room select
        const triggerRoomSel = document.getElementById('trigger-room-select');
        if (triggerRoomSel) {
            const availRooms = rooms.filter(r => r.status === 'Available');
            if (availRooms.length === 0) {
                triggerRoomSel.innerHTML = '<option value="">No Available Rooms</option>';
            } else {
                triggerRoomSel.innerHTML = availRooms.map(r => `<option value="${r.room_id}">Room #${r.room_id} (${r.room_type} - $${r.price_per_day})</option>`).join('');
            }
        }
        
        // Populate Trigger Guest select
        const triggerGuestSel = document.getElementById('trigger-guest-select');
        if (triggerGuestSel) {
            triggerGuestSel.innerHTML = guests.map(g => `<option value="${g.guest_id}">${g.name}</option>`).join('');
        }
        
        // Populate Overlapping Double Booking Guest select
        const doubleGuestSel = document.getElementById('double-booking-guest');
        if (doubleGuestSel) {
            doubleGuestSel.innerHTML = guests.map(g => `<option value="${g.guest_id}">${g.name}</option>`).join('');
        }
    } catch (err) {
        console.error('Error seeding dropdowns:', err);
    }
}

// -------------------------------------------------------------
// TABLES CRUD LOGIC
// -------------------------------------------------------------
let tableDataCache = [];

async function loadTableData() {
    const tableSelect = document.getElementById('table-select');
    const tableName = tableSelect.value;
    
    const headersTr = document.getElementById('db-table-headers');
    const rowsTbody = document.getElementById('db-table-rows');
    
    headersTr.innerHTML = '<th>Loading...</th>';
    rowsTbody.innerHTML = '';
    
    try {
        const response = await fetch(`${API_BASE}/table/${tableName}`);
        const data = await response.json();
        tableDataCache = data;
        
        const schemas = tableSchemas[tableName];
        
        if (!data || data.length === 0) {
            headersTr.innerHTML = schemas.map(s => `<th>${s.label}</th>`).join('') + '<th>Actions</th>';
            rowsTbody.innerHTML = `<tr><td colspan="${schemas.length + 1}" style="text-align:center;">No records found in table ${tableName}.</td></tr>`;
            return;
        }
        
        // Set headers
        const cols = Object.keys(data[0]);
        headersTr.innerHTML = cols.map(col => {
            const field = schemas.find(s => s.name === col);
            return `<th>${field ? field.label : col}</th>`;
        }).join('') + '<th>Actions</th>';
        
        // Set rows
        rowsTbody.innerHTML = data.map(row => {
            const primaryKeyCol = schemas[0].name;
            const primaryKeyValue = row[primaryKeyCol];
            
            let cells = cols.map(col => {
                let cellVal = row[col];
                if (cellVal === null || cellVal === undefined) return '<span class="text-muted">null</span>';
                if (col.includes('date')) {
                    // format date cleanly
                    cellVal = cellVal.substring(0, 10);
                }
                return cellVal;
            }).map(val => `<td>${val}</td>`).join('');
            
            // Edit / Delete actions
            const actions = `
                <td>
                    <button class="btn-icon-only edit" onclick="openEditModal('${tableName}', ${primaryKeyValue})" title="Edit">✏️</button>
                    <button class="btn-icon-only delete" onclick="deleteRecord('${tableName}', ${primaryKeyValue})" title="Delete">🗑️</button>
                </td>
            `;
            return `<tr>${cells}${actions}</tr>`;
        }).join('');
    } catch (err) {
        headersTr.innerHTML = '<th>Error</th>';
        rowsTbody.innerHTML = `<tr><td style="color:var(--danger);">${err.toString()}</td></tr>`;
    }
}

// Open modal for inserting new record
async function openInsertModal() {
    const tableName = document.getElementById('table-select').value;
    currentEditingRecord = null;
    
    document.getElementById('modal-title').innerText = `Add New ${tableName}`;
    document.getElementById('modal-submit-btn').innerText = `Insert Record`;
    
    await renderModalForm(tableName);
    document.getElementById('crud-modal').classList.remove('hidden');
}

// Open modal for editing record
async function openEditModal(tableName, id) {
    const record = tableDataCache.find(r => {
        const pk = tableSchemas[tableName][0].name;
        return r[pk] === id;
    });
    
    if (!record) return showToast('Record details not found.', 'error');
    
    currentEditingRecord = { tableName, record, id };
    
    document.getElementById('modal-title').innerText = `Edit ${tableName} #${id}`;
    document.getElementById('modal-submit-btn').innerText = `Update Record`;
    
    await renderModalForm(tableName, record);
    document.getElementById('crud-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('crud-modal').classList.add('hidden');
}

// Render dynamic forms in the modal
async function renderModalForm(tableName, values = null) {
    const container = document.getElementById('modal-form-fields');
    container.innerHTML = '';
    
    const fields = tableSchemas[tableName];
    
    for (const f of fields) {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        
        const label = document.createElement('label');
        label.innerText = f.label;
        formGroup.appendChild(label);
        
        const val = values ? values[f.name] : '';
        
        if (f.readOnly) {
            const input = document.createElement('input');
            input.type = 'text';
            input.name = f.name;
            input.value = val || '';
            input.placeholder = f.placeholder || '';
            input.readOnly = true;
            input.style.opacity = '0.5';
            formGroup.appendChild(input);
        } else if (f.type === 'select') {
            const select = document.createElement('select');
            select.name = f.name;
            select.required = f.required || false;
            select.innerHTML = f.options.map(opt => `<option value="${opt}" ${val === opt ? 'selected' : ''}>${opt}</option>`).join('');
            formGroup.appendChild(select);
        } else if (f.type === 'select_api') {
            const select = document.createElement('select');
            select.name = f.name;
            select.required = f.required || false;
            
            try {
                const res = await fetch(`${API_BASE}/table/${f.apiTable}`);
                const items = await res.json();
                
                const valStr = val !== null && val !== undefined ? val.toString() : '';
                
                select.innerHTML = items.map(item => {
                    const idVal = item[f.valueCol || f.name];
                    const labelText = f.labelCol ? `${item[f.labelCol]} (ID: ${idVal})` : `Room #${item.room_id} (${item[f.filterCol]})`;
                    return `<option value="${idVal}" ${valStr === idVal.toString() ? 'selected' : ''}>${labelText}</option>`;
                }).join('');
            } catch (err) {
                select.innerHTML = `<option value="">Error loading list</option>`;
            }
            formGroup.appendChild(select);
        } else {
            const input = document.createElement('input');
            input.name = f.name;
            input.type = f.type || 'text';
            input.required = f.required || false;
            if (f.step) input.step = f.step;
            
            if (f.type === 'date' && val) {
                input.value = val.substring(0, 10);
            } else {
                input.value = val || '';
            }
            formGroup.appendChild(input);
        }
        
        container.appendChild(formGroup);
    }
}

// Handle submit CRUD inserts/updates
async function handleFormSubmit(event) {
    event.preventDefault();
    const tableName = document.getElementById('table-select').value;
    const form = document.getElementById('crud-form');
    const formData = new FormData(form);
    
    const payload = {};
    const schema = tableSchemas[tableName];
    
    // Populate keys
    schema.forEach(field => {
        const val = form.elements[field.name].value;
        if (field.readOnly && !currentEditingRecord) return; // skip for new record auto-increment
        
        if (val === '') {
            payload[field.name] = null;
        } else if (field.type === 'number' || field.step) {
            payload[field.name] = Number(val);
        } else if (field.name.endsWith('_id')) {
            payload[field.name] = Number(val); // integer keys
        } else {
            payload[field.name] = val;
        }
    });
    
    const isEdit = !!currentEditingRecord;
    const endpoint = isEdit ? `${API_BASE}/update/${tableName}` : `${API_BASE}/insert/${tableName}`;
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (result.error) {
            showToast(result.message, 'error');
        } else {
            showToast(isEdit ? 'Record updated successfully!' : 'Record inserted successfully!', 'success');
            closeModal();
            loadTableData();
            refreshDashboardStats();
        }
    } catch (err) {
        showToast(err.toString(), 'error');
    }
}

// CRUD delete handler
async function deleteRecord(tableName, id) {
    if (!confirm(`Are you sure you want to delete this record from ${tableName}?`)) return;
    
    try {
        const response = await fetch(`${API_BASE}/delete/${tableName}/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        
        if (result.error) {
            showToast(result.message, 'error');
        } else {
            showToast('Record deleted successfully.', 'success');
            loadTableData();
            refreshDashboardStats();
        }
    } catch (err) {
        showToast(err.toString(), 'error');
    }
}

// -------------------------------------------------------------
// CUSTOM QUERIES EXECUTION
// -------------------------------------------------------------
const querySqlTexts = {
    1: 'SELECT guest_id, name, phone, address, id_proof FROM Guest;',
    2: 'SELECT room_id, room_type, price_per_day, status FROM Room WHERE room_type = \'{ROOM_TYPE}\';',
    3: 'SELECT b.booking_id, g.guest_id, g.name AS guest_name, g.phone, b.room_id, b.check_in_date, b.check_out_date FROM Booking b INNER JOIN Guest g ON b.guest_id = g.guest_id;',
    4: 'SELECT b.booking_id, g.name AS guest_name, r.room_id, r.room_type, r.price_per_day, b.check_in_date, b.check_out_date FROM Booking b JOIN Guest g ON b.guest_id = g.guest_id JOIN Room r ON b.room_id = r.room_id;',
    5: 'SELECT room_type, COUNT(*) AS room_count FROM Room GROUP BY room_type;',
    6: 'SELECT room_type, COUNT(*) AS room_count FROM Room GROUP BY room_type HAVING COUNT(*) > 20;',
    7: `SELECT g.guest_id, g.name, g.phone, SUM(p.amount) AS total_payment 
FROM Guest g 
JOIN Booking b ON g.guest_id = b.guest_id 
JOIN Payment p ON b.booking_id = p.booking_id 
GROUP BY g.guest_id, g.name, g.phone 
HAVING total_payment > (SELECT AVG(amount) FROM Payment);`,
    8: `SELECT g.guest_id, g.name, 
       (SELECT COUNT(*) FROM Booking b WHERE b.guest_id = g.guest_id) AS booking_count 
FROM Guest g 
WHERE (SELECT COUNT(*) FROM Booking b WHERE b.guest_id = g.guest_id) > 
      (SELECT COUNT(*) FROM Booking b2 WHERE b2.guest_id = {GUEST_ID});`,
    9: 'SELECT r.room_id, r.room_type, r.price_per_day, r.status AS current_status, b.booking_id, b.check_in_date, b.check_out_date FROM Room r LEFT JOIN Booking b ON r.room_id = b.room_id;',
    10: 'SELECT s.service_id, s.service_name, s.service_charge FROM Service s WHERE NOT EXISTS (SELECT 1 FROM BookingService bs WHERE bs.service_id = s.service_id);'
};

async function runQuery(queryId) {
    // UI selection active card
    document.querySelectorAll('.query-card').forEach(c => c.classList.remove('active'));
    document.getElementById(`qc-${queryId}`).classList.add('active');
    
    // Set headers titles
    const title = document.querySelector(`#qc-${queryId} h4`).innerText;
    document.getElementById('current-query-title').innerText = `Query ${queryId}: ${title}`;
    
    let sqlText = querySqlTexts[queryId];
    
    // Setup filter parameters if needed
    const filterBar = document.getElementById('query-filter-bar');
    filterBar.innerHTML = '';
    filterBar.classList.add('hidden');
    
    let fetchUrl = `${API_BASE}/query/${queryId}`;
    
    if (queryId === 2) {
        filterBar.classList.remove('hidden');
        filterBar.innerHTML = `
            <label for="q2-type">Filter Room Type: </label>
            <select id="q2-type" onchange="runQuery(2)">
                <option value="Standard">Standard</option>
                <option value="Deluxe" selected>Deluxe</option>
                <option value="Suite">Suite</option>
            </select>
        `;
        const selectedType = document.getElementById('q2-type') ? document.getElementById('q2-type').value : 'Deluxe';
        sqlText = sqlText.replace('{ROOM_TYPE}', selectedType);
        fetchUrl += `?type=${selectedType}`;
    } else if (queryId === 8) {
        filterBar.classList.remove('hidden');
        // Retrieve guests list to select dynamically
        try {
            const res = await fetch(`${API_BASE}/table/Guest`);
            const guests = await res.json();
            
            filterBar.innerHTML = `
                <label for="q8-guest">Compare Guest Bookings with: </label>
                <select id="q8-guest" onchange="runQuery(8)">
                    ${guests.map(g => `<option value="${g.guest_id}">${g.name} (ID: ${g.guest_id})</option>`).join('')}
                </select>
            `;
        } catch (err) {
            filterBar.innerHTML = `<label>Error loading guests</label>`;
        }
        const selectedGuestId = document.getElementById('q8-guest') ? document.getElementById('q8-guest').value : 1;
        sqlText = sqlText.replace('{GUEST_ID}', selectedGuestId);
        fetchUrl += `?guestId=${selectedGuestId}`;
    }
    
    document.getElementById('current-query-sql').innerText = sqlText;
    
    const headersTr = document.getElementById('query-table-headers');
    const rowsTbody = document.getElementById('query-table-rows');
    
    headersTr.innerHTML = '<th>Executing...</th>';
    rowsTbody.innerHTML = '';
    
    try {
        const response = await fetch(fetchUrl);
        const data = await response.json();
        
        if (data.error) {
            headersTr.innerHTML = '<th>Error</th>';
            rowsTbody.innerHTML = `<tr><td style="color:var(--danger);">${data.message}</td></tr>`;
            return;
        }
        
        if (!data || data.length === 0) {
            headersTr.innerHTML = '<th>No Results</th>';
            rowsTbody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Query executed successfully, but returned 0 rows.</td></tr>';
            return;
        }
        
        const cols = Object.keys(data[0]);
        headersTr.innerHTML = cols.map(c => `<th>${c}</th>`).join('');
        
        rowsTbody.innerHTML = data.map(row => {
            const cells = cols.map(c => {
                let cellVal = row[c];
                if (cellVal === null || cellVal === undefined) return '<span class="text-muted">null</span>';
                if (c.includes('date')) cellVal = cellVal.substring(0, 10);
                return cellVal;
            }).map(val => `<td>${val}</td>`).join('');
            return `<tr>${cells}</tr>`;
        }).join('');
    } catch (err) {
        headersTr.innerHTML = '<th>Fetch Error</th>';
        rowsTbody.innerHTML = `<tr><td style="color:var(--danger);">${err.toString()}</td></tr>`;
    }
}

// -------------------------------------------------------------
// STORED PROCEDURES
// -------------------------------------------------------------
async function executeProcAvailability(event) {
    event.preventDefault();
    const checkIn = document.getElementById('proc-checkin').value;
    const checkOut = document.getElementById('proc-checkout').value;
    
    const container = document.getElementById('procedure-output-card');
    const headersTr = document.getElementById('proc-table-headers');
    const rowsTbody = document.getElementById('proc-table-rows');
    
    document.getElementById('procedure-output-title').innerText = `Procedure output: Available Rooms between ${checkIn} and ${checkOut}`;
    container.classList.remove('hidden');
    headersTr.innerHTML = '<th>Loading...</th>';
    rowsTbody.innerHTML = '';
    
    try {
        const response = await fetch(`${API_BASE}/procedure/availability`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ check_in: checkIn, check_out: checkOut })
        });
        const data = await response.json();
        
        if (data.error) {
            headersTr.innerHTML = '<th>Error</th>';
            rowsTbody.innerHTML = `<tr><td style="color:var(--danger);">${data.message}</td></tr>`;
            showToast(data.message, 'error');
            return;
        }
        
        if (!data || data.length === 0) {
            headersTr.innerHTML = '<th>No Rooms</th>';
            rowsTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No rooms are available for these dates.</td></tr>';
            return;
        }
        
        const cols = Object.keys(data[0]);
        headersTr.innerHTML = cols.map(c => `<th>${c}</th>`).join('');
        rowsTbody.innerHTML = data.map(row => {
            const cells = cols.map(c => row[c] === null ? 'null' : row[c]).map(v => `<td>${v}</td>`).join('');
            return `<tr>${cells}</tr>`;
        }).join('');
        showToast('Procedure CheckRoomAvailability completed successfully.', 'success');
    } catch (err) {
        showToast(err.toString(), 'error');
    }
}

async function executeProcBill(event) {
    event.preventDefault();
    const bookingId = document.getElementById('proc-booking-id').value;
    
    const container = document.getElementById('procedure-output-card');
    const headersTr = document.getElementById('proc-table-headers');
    const rowsTbody = document.getElementById('proc-table-rows');
    
    document.getElementById('procedure-output-title').innerText = `Procedure output: Final Invoice Billing for Booking #${bookingId}`;
    container.classList.remove('hidden');
    headersTr.innerHTML = '<th>Loading...</th>';
    rowsTbody.innerHTML = '';
    
    try {
        const response = await fetch(`${API_BASE}/procedure/bill`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking_id: bookingId })
        });
        const data = await response.json();
        
        if (data.error) {
            headersTr.innerHTML = '<th>Error</th>';
            rowsTbody.innerHTML = `<tr><td style="color:var(--danger);">${data.message}</td></tr>`;
            showToast(data.message, 'error');
            return;
        }
        
        if (!data || data.booking_id === undefined) {
            headersTr.innerHTML = '<th>Empty Output</th>';
            rowsTbody.innerHTML = '<tr><td style="text-align:center;">Invoice details could not be generated.</td></tr>';
            return;
        }
        
        const cols = Object.keys(data);
        headersTr.innerHTML = cols.map(c => `<th>${c}</th>`).join('');
        
        const cells = cols.map(c => {
            let val = data[c];
            if (val === null || val === undefined) return '<span class="text-muted">null</span>';
            if (c.includes('date')) val = val.substring(0, 10);
            return val;
        }).map(v => `<td>${v}</td>`).join('');
        
        rowsTbody.innerHTML = `<tr>${cells}</tr>`;
        showToast('Procedure GenerateFinalBill completed successfully.', 'success');
    } catch (err) {
        showToast(err.toString(), 'error');
    }
}

// -------------------------------------------------------------
// TRIGGERS DEMO SCENARIOS
// -------------------------------------------------------------
function appendConsoleLog(message, type = 'info') {
    const consoleBox = document.getElementById('trigger-console-log');
    
    // Clear placeholder
    const placeholder = consoleBox.querySelector('.console-placeholder');
    if (placeholder) placeholder.remove();
    
    const timestamp = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.innerHTML = `<code>[${timestamp}]</code> [${type.toUpperCase()}] ${message}`;
    
    consoleBox.appendChild(line);
    consoleBox.scrollTop = consoleBox.scrollHeight; // Scroll to bottom
}

// Scenario 1 Simulation: Create a booking and observe room status change to 'Booked'
async function simulateBookingTrigger() {
    const roomId = document.getElementById('trigger-room-select').value;
    const guestId = document.getElementById('trigger-guest-select').value;
    
    if (!roomId || !guestId) {
        showToast('Please select a valid Room and Guest.', 'error');
        return;
    }
    
    appendConsoleLog(`Initiating Reservation Request: Room ID: ${roomId}, Guest ID: ${guestId}...`, 'info');
    
    // Standard booking dates
    const checkIn = '2026-07-01';
    const checkOut = '2026-07-05';
    
    const payload = {
        guest_id: Number(guestId),
        room_id: Number(roomId),
        check_in_date: checkIn,
        check_out_date: checkOut
    };
    
    try {
        appendConsoleLog(`Sending INSERT INTO Booking command...`, 'info');
        const response = await fetch(`${API_BASE}/insert/Booking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        
        if (result.error) {
            appendConsoleLog(`Transaction rolled back: ${result.message}`, 'error');
            showToast('Trigger scenario booking failed.', 'error');
        } else {
            appendConsoleLog(`Booking insertion success! Trigger "after_booking_insert" activated!`, 'success');
            
            // Double-check Room Status change
            appendConsoleLog(`Verifying current status of Room ID: ${roomId} in database...`, 'info');
            const roomsRes = await fetch(`${API_BASE}/table/Room`);
            const rooms = await roomsRes.json();
            const updatedRoom = rooms.find(r => r.room_id === Number(roomId));
            
            appendConsoleLog(`Verification result: Room ID: ${roomId} status is now: [${updatedRoom.status.toUpperCase()}]!`, 'success');
            showToast(`Success! Room #${roomId} is now marked as Booked via DB trigger.`, 'success');
            
            // Refresh lists
            loadDropdownsForProceduresAndTriggers();
        }
    } catch (err) {
        appendConsoleLog(`Network Connection Failure: ${err.toString()}`, 'error');
    }
}

// Scenario 2 Simulation: Try to book a room that's already booked to verify Double Booking trigger blocks it
async function simulateDoubleBookingTrigger() {
    const guestId = document.getElementById('double-booking-guest').value;
    const checkIn = document.getElementById('double-booking-in').value;
    const checkOut = document.getElementById('double-booking-out').value;
    
    if (!guestId || !checkIn || !checkOut) {
        showToast('Please specify all fields.', 'error');
        return;
    }
    
    appendConsoleLog(`Simulating Double Booking Collision:`, 'info');
    appendConsoleLog(`Targeting Room ID: 1 (Currently booked by John Doe for 2026-06-10 to 2026-06-15)`, 'info');
    appendConsoleLog(`Attempting insertion for Guest ID: ${guestId} from ${checkIn} to ${checkOut}...`, 'info');
    
    const payload = {
        guest_id: Number(guestId),
        room_id: 1, // Room ID 1 has seed booking for 2026-06-10 to 2026-06-15
        check_in_date: checkIn,
        check_out_date: checkOut
    };
    
    try {
        const response = await fetch(`${API_BASE}/insert/Booking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        
        if (result.error) {
            appendConsoleLog(`Trigger "prevent_double_booking" Intercepted Insertion!`, 'error');
            appendConsoleLog(`MySQL Error Message: "${result.message}"`, 'error');
            appendConsoleLog(`Database State Secured. Overlapping transaction rolled back!`, 'success');
            showToast('SQL State Trigger Blocked: Double Reservation Protected!', 'info');
        } else {
            appendConsoleLog(`Warning: Transaction permitted! Ensure dates overlapped the range 2026-06-10 to 2026-06-15.`, 'error');
            showToast('Booking succeeded. (Check if dates overlapped).', 'success');
            loadDropdownsForProceduresAndTriggers();
        }
    } catch (err) {
        appendConsoleLog(`Failure: ${err.toString()}`, 'error');
    }
}
