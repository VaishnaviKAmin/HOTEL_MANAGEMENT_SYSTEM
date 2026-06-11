// server.js - Hotel Management System Backend
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3000;

// Helper to execute raw SQL via mysql.exe using spawn
function runSQL(query, callback) {
    const mysqlPath = 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe';
    const args = ['-u', 'root', '-pKBvp9035?', '-D', 'hotel_management'];
    
    const child = spawn(mysqlPath, args);
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', data => { stdout += data.toString(); });
    child.stderr.on('data', data => { stderr += data.toString(); });
    
    child.on('close', code => {
        if (code !== 0) {
            console.error('MySQL Execution Error:', stderr);
            return callback(stderr || `Process exited with code ${code}`, null);
        }
        callback(null, stdout);
    });
    
    child.stdin.write(query);
    child.stdin.end();
}


// Helper to parse MySQL's tab-separated (TSV) stdout to JSON Array
function parseTSV(tsvString) {
    if (!tsvString || tsvString.trim() === '') return [];
    
    // Split by newlines and filter out warning/empty lines
    const lines = tsvString.trim().split(/\r?\n/).filter(line => {
        const clean = line.trim();
        return clean.length > 0 && !clean.startsWith('mysql: [Warning]');
    });
    
    if (lines.length === 0) return [];
    
    // Header row
    const headers = lines[0].split('\t');
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split('\t');
        const row = {};
        headers.forEach((header, index) => {
            let val = cols[index];
            if (val === undefined || val === 'NULL') {
                val = null;
            } else if (!isNaN(val) && val !== '') {
                // Parse number if it's numeric and not phone number (length < 8 to avoid parsing phone numbers as numbers)
                val = (val.length < 8) ? Number(val) : val;
            }
            row[header] = val;
        });
        rows.push(row);
    }
    
    return rows;
}

// Setup CORS and JSON helpers
const setJSONHeaders = (res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

const handleAPIError = (res, errMessage, statusCode = 400) => {
    setJSONHeaders(res);
    res.writeHead(statusCode);
    res.end(JSON.stringify({ error: true, message: errMessage.toString() }));
};

const handleAPISuccess = (res, data) => {
    setJSONHeaders(res);
    res.writeHead(200);
    res.end(JSON.stringify(data));
};

// Static File Server helper
function serveStaticFile(filePath, contentType, res) {
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${error.code} ..\n`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}

// Dynamic server creation
const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // Handle OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }

    // API: GET Table Records
    if (pathname.startsWith('/api/table/') && req.method === 'GET') {
        const tableName = pathname.substring(11);
        const allowedTables = ['Guest', 'Room', 'Booking', 'Staff', 'Payment', 'Service', 'BookingService'];
        
        if (!allowedTables.includes(tableName)) {
            return handleAPIError(res, 'Invalid table name requested.');
        }

        const query = `SELECT * FROM ${tableName};`;
        runSQL(query, (err, stdout) => {
            if (err) return handleAPIError(res, err);
            const data = parseTSV(stdout);
            handleAPISuccess(res, data);
        });
        return;
    }

    // API: Run Custom SQL Query (1-10)
    if (pathname.startsWith('/api/query/') && req.method === 'GET') {
        const queryId = parseInt(pathname.substring(11), 10);
        let sql = '';
        
        switch (queryId) {
            case 1: // Retrieve all guests
                sql = 'SELECT guest_id, name, phone, address, id_proof FROM Guest;';
                break;
            case 2: // Display rooms of a specific room type
                const roomType = url.searchParams.get('type') || 'Deluxe';
                sql = `SELECT room_id, room_type, price_per_day, status FROM Room WHERE room_type = '${roomType.replace(/'/g, "''")}';`;
                break;
            case 3: // Display booking and guest details (2-table INNER JOIN)
                sql = 'SELECT b.booking_id, g.guest_id, g.name AS guest_name, g.phone, b.room_id, b.check_in_date, b.check_out_date FROM Booking b INNER JOIN Guest g ON b.guest_id = g.guest_id;';
                break;
            case 4: // Display booking, guest, and room details (3-table JOIN)
                sql = 'SELECT b.booking_id, g.name AS guest_name, r.room_id, r.room_type, r.price_per_day, b.check_in_date, b.check_out_date FROM Booking b JOIN Guest g ON b.guest_id = g.guest_id JOIN Room r ON b.room_id = r.room_id;';
                break;
            case 5: // Count number of rooms per room type (GROUP BY)
                sql = 'SELECT room_type, COUNT(*) AS room_count FROM Room GROUP BY room_type;';
                break;
            case 6: // Display room types having more than 20 rooms (HAVING)
                sql = 'SELECT room_type, COUNT(*) AS room_count FROM Room GROUP BY room_type HAVING COUNT(*) > 20;';
                break;
            case 7: // Retrieve guests whose total payment amount is greater than the average payment amount (Subquery)
                sql = `SELECT g.guest_id, g.name, g.phone, SUM(p.amount) AS total_payment 
                       FROM Guest g 
                       JOIN Booking b ON g.guest_id = b.guest_id 
                       JOIN Payment p ON b.booking_id = p.booking_id 
                       GROUP BY g.guest_id, g.name, g.phone 
                       HAVING total_payment > (SELECT AVG(amount) FROM Payment);`;
                break;
            case 8: // Retrieve guests who made more bookings than a specific guest (Correlated Subquery)
                const specificGuestId = parseInt(url.searchParams.get('guestId'), 10) || 1;
                sql = `SELECT g.guest_id, g.name, 
                       (SELECT COUNT(*) FROM Booking b WHERE b.guest_id = g.guest_id) AS booking_count 
                       FROM Guest g 
                       WHERE (SELECT COUNT(*) FROM Booking b WHERE b.guest_id = g.guest_id) > 
                             (SELECT COUNT(*) FROM Booking b2 WHERE b2.guest_id = ${specificGuestId});`;
                break;
            case 9: // Display all rooms including those not booked (LEFT JOIN)
                sql = 'SELECT r.room_id, r.room_type, r.price_per_day, r.status AS current_status, b.booking_id, b.check_in_date, b.check_out_date FROM Room r LEFT JOIN Booking b ON r.room_id = b.room_id;';
                break;
            case 10: // Retrieve services that were never used in any booking (NOT EXISTS)
                sql = 'SELECT s.service_id, s.service_name, s.service_charge FROM Service s WHERE NOT EXISTS (SELECT 1 FROM BookingService bs WHERE bs.service_id = s.service_id);';
                break;
            default:
                return handleAPIError(res, 'Query ID out of range (1-10)');
        }

        runSQL(sql, (err, stdout) => {
            if (err) return handleAPIError(res, err);
            const data = parseTSV(stdout);
            handleAPISuccess(res, data);
        });
        return;
    }

    // API: Execute Stored Procedure 1: Room Availability Check
    if (pathname === '/api/procedure/availability' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const params = JSON.parse(body);
                const checkIn = params.check_in;
                const checkOut = params.check_out;
                if (!checkIn || !checkOut) {
                    return handleAPIError(res, 'check_in and check_out dates are required.');
                }
                const sql = `CALL CheckRoomAvailability('${checkIn}', '${checkOut}');`;
                runSQL(sql, (err, stdout) => {
                    if (err) return handleAPIError(res, err);
                    const data = parseTSV(stdout);
                    handleAPISuccess(res, data);
                });
            } catch (err) {
                handleAPIError(res, 'Invalid JSON body.');
            }
        });
        return;
    }

    // API: Execute Stored Procedure 2: Generate Final Bill
    if (pathname === '/api/procedure/bill' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const params = JSON.parse(body);
                const bookingId = parseInt(params.booking_id, 10);
                if (!bookingId) {
                    return handleAPIError(res, 'booking_id is required.');
                }
                const sql = `CALL GenerateFinalBill(${bookingId});`;
                runSQL(sql, (err, stdout) => {
                    if (err) return handleAPIError(res, err);
                    const data = parseTSV(stdout);
                    // Output should be a single object
                    handleAPISuccess(res, data[0] || { message: 'Booking details not found.' });
                });
            } catch (err) {
                handleAPIError(res, 'Invalid JSON body.');
            }
        });
        return;
    }

    // API: Insert Record (CRUD)
    if (pathname.startsWith('/api/insert/') && req.method === 'POST') {
        const tableName = pathname.substring(12);
        const allowedTables = ['Guest', 'Room', 'Booking', 'Staff', 'Payment', 'Service', 'BookingService'];
        
        if (!allowedTables.includes(tableName)) {
            return handleAPIError(res, 'Invalid table name.');
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const record = JSON.parse(body);
                const columns = Object.keys(record);
                const values = Object.values(record).map(val => {
                    if (val === null || val === undefined) return 'NULL';
                    if (typeof val === 'number') return val;
                    return `'${val.toString().replace(/'/g, "''")}'`;
                });

                const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});`;
                runSQL(sql, (err, stdout) => {
                    if (err) return handleAPIError(res, err);
                    handleAPISuccess(res, { success: true, message: 'Record inserted successfully.' });
                });
            } catch (err) {
                handleAPIError(res, 'Invalid JSON payload.');
            }
        });
        return;
    }

    // API: Update Record (CRUD)
    if (pathname.startsWith('/api/update/') && req.method === 'POST') {
        const tableName = pathname.substring(12);
        const keys = {
            Guest: 'guest_id',
            Room: 'room_id',
            Booking: 'booking_id',
            Staff: 'staff_id',
            Payment: 'payment_id',
            Service: 'service_id'
        };
        const idCol = keys[tableName];
        
        if (!idCol) {
            return handleAPIError(res, 'Invalid table for update.');
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const record = JSON.parse(body);
                const idVal = record[idCol];
                if (!idVal) {
                    return handleAPIError(res, `Primary key column "${idCol}" is missing.`);
                }

                const updates = [];
                Object.keys(record).forEach(col => {
                    if (col !== idCol) {
                        const val = record[col];
                        if (val === null || val === undefined) {
                            updates.push(`${col} = NULL`);
                        } else if (typeof val === 'number') {
                            updates.push(`${col} = ${val}`);
                        } else {
                            updates.push(`${col} = '${val.toString().replace(/'/g, "''")}'`);
                        }
                    }
                });

                const sql = `UPDATE ${tableName} SET ${updates.join(', ')} WHERE ${idCol} = ${idVal};`;
                runSQL(sql, (err, stdout) => {
                    if (err) return handleAPIError(res, err);
                    handleAPISuccess(res, { success: true, message: 'Record updated successfully.' });
                });
            } catch (err) {
                handleAPIError(res, 'Invalid JSON payload.');
            }
        });
        return;
    }

    // API: Delete Record (CRUD)
    if (pathname.startsWith('/api/delete/') && req.method === 'DELETE') {
        const parts = pathname.split('/');
        const tableName = parts[3];
        const recordId = parseInt(parts[4], 10);
        
        const keys = {
            Guest: 'guest_id',
            Room: 'room_id',
            Booking: 'booking_id',
            Staff: 'staff_id',
            Payment: 'payment_id',
            Service: 'service_id'
        };
        const idCol = keys[tableName];

        if (!idCol || isNaN(recordId)) {
            return handleAPIError(res, 'Invalid delete request.');
        }

        const sql = `DELETE FROM ${tableName} WHERE ${idCol} = ${recordId};`;
        runSQL(sql, (err, stdout) => {
            if (err) return handleAPIError(res, err);
            handleAPISuccess(res, { success: true, message: 'Record deleted successfully.' });
        });
        return;
    }

    // Serve Frontend Static Files
    let staticPath = path.join(__dirname, 'public');
    let fileUrl = pathname;
    if (fileUrl === '/') fileUrl = '/index.html';
    
    const filePath = path.join(staticPath, fileUrl);
    const extname = String(path.extname(filePath)).toLowerCase();
    
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';
    serveStaticFile(filePath, contentType, res);
});

server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
