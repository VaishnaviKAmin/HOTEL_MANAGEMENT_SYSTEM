-- setup.sql - Hotel Management System Database Script
-- Drop database if it exists to start fresh
DROP DATABASE IF EXISTS hotel_management;
CREATE DATABASE hotel_management;
USE hotel_management;

-- 1. Create Guest Table
CREATE TABLE Guest (
    guest_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    address TEXT,
    id_proof VARCHAR(50) NOT NULL
);

-- 2. Create Room Table
CREATE TABLE Room (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    room_type VARCHAR(50) NOT NULL,
    price_per_day DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'Available'
);

-- 3. Create Booking Table
CREATE TABLE Booking (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    guest_id INT NOT NULL,
    room_id INT NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    FOREIGN KEY (guest_id) REFERENCES Guest(guest_id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES Room(room_id) ON DELETE CASCADE
);

-- 4. Create Staff Table
CREATE TABLE Staff (
    staff_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    phone VARCHAR(15) NOT NULL
);

-- 5. Create Payment Table
CREATE TABLE Payment (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    FOREIGN KEY (booking_id) REFERENCES Booking(booking_id) ON DELETE CASCADE
);

-- 6. Create Service Table
CREATE TABLE Service (
    service_id INT AUTO_INCREMENT PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    service_charge DECIMAL(10,2) NOT NULL
);

-- 7. Create BookingService Junction Table
CREATE TABLE BookingService (
    booking_id INT NOT NULL,
    service_id INT NOT NULL,
    PRIMARY KEY (booking_id, service_id),
    FOREIGN KEY (booking_id) REFERENCES Booking(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES Service(service_id) ON DELETE CASCADE
);


-- ==========================================
-- SEED DATA SETUP
-- ==========================================

-- Insert Guests
INSERT INTO Guest (name, phone, address, id_proof) VALUES
('John Doe', '9876543210', '123 Maple Street, NY', 'PASSPORT123'),
('Jane Smith', '8765432109', '456 Oak Ave, LA', 'DL45678'),
('Bob Johnson', '7654321098', '789 Pine Road, CH', 'AADHAR9876'),
('Alice Brown', '6543210987', '321 Elm Lane, SF', 'PASSPORT456'),
('Charlie Green', '5432109876', '654 Birch Court, SE', 'DL98765');

-- Insert Rooms
-- Insert 22 standard rooms to satisfy the query displaying room types having more than 20 rooms (HAVING count > 20)
INSERT INTO Room (room_type, price_per_day, status) VALUES
('Standard', 80.00, 'Available'), ('Standard', 80.00, 'Available'), ('Standard', 80.00, 'Available'),
('Standard', 80.00, 'Available'), ('Standard', 80.00, 'Available'), ('Standard', 80.00, 'Available'),
('Standard', 80.00, 'Available'), ('Standard', 80.00, 'Available'), ('Standard', 80.00, 'Available'),
('Standard', 80.00, 'Available'), ('Standard', 80.00, 'Available'), ('Standard', 80.00, 'Available'),
('Standard', 80.00, 'Available'), ('Standard', 80.00, 'Available'), ('Standard', 80.00, 'Available'),
('Standard', 80.00, 'Available'), ('Standard', 80.00, 'Available'), ('Standard', 80.00, 'Available'),
('Standard', 80.00, 'Available'), ('Standard', 80.00, 'Available'), ('Standard', 80.00, 'Available'),
('Standard', 80.00, 'Available'); -- 22 Standard Rooms

-- Insert Deluxe & Suite Rooms
INSERT INTO Room (room_type, price_per_day, status) VALUES
('Deluxe', 150.00, 'Available'), ('Deluxe', 150.00, 'Available'), ('Deluxe', 150.00, 'Available'),
('Suite', 300.00, 'Available'), ('Suite', 300.00, 'Available');

-- Insert Staff
INSERT INTO Staff (name, role, phone) VALUES
('Michael Scott', 'Manager', '9000100010'),
('Dwight Schrute', 'Receptionist', '9000100020'),
('Jim Halpert', 'Sales Rep', '9000100030'),
('Pam Beesly', 'Receptionist', '9000100040');

-- Insert Services
INSERT INTO Service (service_name, service_charge) VALUES
('Room Service (Food/Drink)', 25.00),
('Airport Shuttle', 40.00),
('Spa & Wellness Treatment', 60.00),
('Laundry Service', 15.00),     -- We won't map this to any booking to demonstrate NOT EXISTS
('Valet Parking', 20.00);        -- We won't map this either

-- Insert Bookings (and triggers will update Room Statuses)
INSERT INTO Booking (guest_id, room_id, check_in_date, check_out_date) VALUES
(1, 1, '2026-06-10', '2026-06-15'),
(2, 2, '2026-06-12', '2026-06-14'),
(3, 23, '2026-06-08', '2026-06-18'),
(1, 24, '2026-06-20', '2026-06-25'),
(4, 25, '2026-06-11', '2026-06-15');

-- Map Booking Services
INSERT INTO BookingService (booking_id, service_id) VALUES
(1, 1), -- Booking 1 used Room Service
(1, 2), -- Booking 1 used Airport Shuttle
(2, 1), -- Booking 2 used Room Service
(3, 3), -- Booking 3 used Spa Treatment
(5, 1); -- Booking 5 used Room Service

-- Insert Payments
INSERT INTO Payment (booking_id, amount, payment_date, payment_method) VALUES
(1, 150.00, '2026-06-10', 'Credit Card'),
(1, 250.00, '2026-06-15', 'Cash'),
(2, 160.00, '2026-06-12', 'Debit Card'),
(3, 1000.00, '2026-06-08', 'Bank Transfer'),
(4, 300.00, '2026-06-20', 'Credit Card');


-- ==========================================
-- TRIGGERS SETUP
-- ==========================================

DELIMITER $$

-- Trigger 1: Update room status to 'Booked' after booking is inserted
CREATE TRIGGER after_booking_insert
AFTER INSERT ON Booking
FOR EACH ROW
BEGIN
    UPDATE Room SET status = 'Booked' WHERE room_id = NEW.room_id;
END$$

-- Helper Trigger: Reset room status to 'Available' if a booking is deleted
CREATE TRIGGER after_booking_delete
AFTER DELETE ON Booking
FOR EACH ROW
BEGIN
    UPDATE Room SET status = 'Available' WHERE room_id = OLD.room_id;
END$$

-- Trigger 2: Prevent double booking of the same room (overlapping dates)
CREATE TRIGGER prevent_double_booking
BEFORE INSERT ON Booking
FOR EACH ROW
BEGIN
    DECLARE overlap_count INT;
    
    SELECT COUNT(*) INTO overlap_count FROM Booking
    WHERE room_id = NEW.room_id
      AND NEW.check_in_date < check_out_date
      AND NEW.check_out_date > check_in_date;
      
    IF overlap_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'SQL Trigger Blocked: Room is already booked for the specified dates.';
    END IF;
END$$

DELIMITER ;


-- ==========================================
-- STORED PROCEDURES SETUP
-- ==========================================

DELIMITER $$

-- Stored Procedure 1: Check room availability for given dates
CREATE PROCEDURE CheckRoomAvailability(IN check_in DATE, IN check_out DATE)
BEGIN
    SELECT room_id, room_type, price_per_day, status
    FROM Room
    WHERE room_id NOT IN (
        SELECT room_id FROM Booking
        WHERE check_in < check_out_date AND check_out > check_in_date
    );
END$$

-- Stored Procedure 2: Generate final bill for a booking
CREATE PROCEDURE GenerateFinalBill(IN p_booking_id INT)
BEGIN
    DECLARE v_guest_name VARCHAR(100);
    DECLARE v_room_type VARCHAR(50);
    DECLARE v_price_per_day DECIMAL(10,2);
    DECLARE v_check_in DATE;
    DECLARE v_check_out DATE;
    DECLARE v_room_days INT;
    DECLARE v_room_cost DECIMAL(10,2);
    DECLARE v_service_cost DECIMAL(10,2);
    DECLARE v_paid_amount DECIMAL(10,2);
    DECLARE v_total_bill DECIMAL(10,2);
    DECLARE v_pending_balance DECIMAL(10,2);

    -- Retrieve booking and guest details
    SELECT g.name, r.room_type, r.price_per_day, b.check_in_date, b.check_out_date
    INTO v_guest_name, v_room_type, v_price_per_day, v_check_in, v_check_out
    FROM Booking b
    JOIN Guest g ON b.guest_id = g.guest_id
    JOIN Room r ON b.room_id = r.room_id
    WHERE b.booking_id = p_booking_id;

    -- Calculate duration of stay
    SET v_room_days = DATEDIFF(v_check_out, v_check_in);
    IF v_room_days <= 0 THEN SET v_room_days = 1; END IF;
    SET v_room_cost = v_room_days * v_price_per_day;

    -- Calculate service cost
    SELECT COALESCE(SUM(s.service_charge), 0)
    INTO v_service_cost
    FROM BookingService bs
    JOIN Service s ON bs.service_id = s.service_id
    WHERE bs.booking_id = p_booking_id;

    -- Calculate total bill
    SET v_total_bill = v_room_cost + v_service_cost;

    -- Calculate paid amount
    SELECT COALESCE(SUM(p.amount), 0)
    INTO v_paid_amount
    FROM Payment p
    WHERE p.booking_id = p_booking_id;

    -- Calculate balance
    SET v_pending_balance = v_total_bill - v_paid_amount;

    -- Output the details
    SELECT 
        p_booking_id AS booking_id,
        v_guest_name AS guest_name,
        v_room_type AS room_type,
        v_price_per_day AS price_per_day,
        v_check_in AS check_in_date,
        v_check_out AS check_out_date,
        v_room_days AS days_of_stay,
        v_room_cost AS room_charge,
        v_service_cost AS service_charge,
        v_total_bill AS total_bill,
        v_paid_amount AS total_paid,
        v_pending_balance AS pending_balance;
END$$

DELIMITER ;


-- Update room statuses to Booked for the seeded bookings
UPDATE Room SET status = 'Booked' WHERE room_id IN (1, 2, 23, 24, 25);
