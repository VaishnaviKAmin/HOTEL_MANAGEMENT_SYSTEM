// verify.js - DB sanity check and test execution
const { spawn } = require('child_process');

function testSQL(queryName, sql) {
    console.log(`\n==========================================`);
    console.log(`Running Test: ${queryName}`);
    console.log(`SQL: ${sql.trim()}`);
    console.log(`==========================================`);
    
    const mysqlPath = 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe';
    const args = ['-u', 'root', '-pKBvp9035?', '-D', 'hotel_management'];
    
    const child = spawn(mysqlPath, args);
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', data => { stdout += data.toString(); });
    child.stderr.on('data', data => { stderr += data.toString(); });
    
    child.on('close', code => {
        if (code !== 0) {
            console.error(`ERROR running test ${queryName}:`);
            console.error(stderr || `Process exited with code ${code}`);
        } else {
            console.log(stdout || '(Success, no output returned)');
        }
    });
    
    child.stdin.write(sql);
    child.stdin.end();
}

// 1. Check database connection & tables
testSQL('Show Tables', 'SHOW TABLES;');

// 2. Query 3: 2-Table INNER JOIN (booking and guest details)
setTimeout(() => {
    testSQL('Query 3 (INNER JOIN)', 
        'SELECT b.booking_id, g.name, b.room_id FROM Booking b INNER JOIN Guest g ON b.guest_id = g.guest_id;'
    );
}, 500);

// 3. Query 6: HAVING count > 20
setTimeout(() => {
    testSQL('Query 6 (HAVING count > 20)', 
        'SELECT room_type, COUNT(*) AS room_count FROM Room GROUP BY room_type HAVING COUNT(*) > 20;'
    );
}, 1000);

// 4. Stored Procedure 1: Room availability
setTimeout(() => {
    testSQL('Proc CheckRoomAvailability', 
        'CALL CheckRoomAvailability(\'2026-06-11\', \'2026-06-15\');'
    );
}, 1500);

// 5. Stored Procedure 2: Generate final bill for booking 1
setTimeout(() => {
    testSQL('Proc GenerateFinalBill', 
        'CALL GenerateFinalBill(1);'
    );
}, 2000);

// 6. Test overlapping double booking trigger (Expected to fail/block)
setTimeout(() => {
    testSQL('Insert Duplicate Booking (Trigger Check - Expected to fail)', 
        'INSERT INTO Booking (guest_id, room_id, check_in_date, check_out_date) VALUES (2, 1, \'2026-06-12\', \'2026-06-14\');'
    );
}, 2500);

