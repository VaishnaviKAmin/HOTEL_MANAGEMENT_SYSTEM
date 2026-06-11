# Hotel Management System (DBMS Project)

Welcome to the **Grand Horizon Hotel Management System** database and web application demonstration! This project implements a fully normalized relational schema, triggers, stored procedures, custom queries, and a premium interactive user interface.

Since Node.js/NPM is not globally installed on this PC and Git is currently missing, we utilize a custom Node.js runner located in the local Playwright directories to run the backend, making the system self-contained without requiring package installation!

---

## 🛠️ Step-by-Step Setup & Running Instructions

### 1. Launch the Application Local Web Server
You can launch the database seeding and Node.js web server directly using PowerShell:

1. Open **PowerShell** (or the IDE terminal).
2. Run the launcher script:
   ```powershell
   & "C:\Users\Admin\.gemini\antigravity-ide\scratch\hotel-management-system\run.ps1"
   ```
3. Once running, open your web browser and navigate to:
   👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🚀 How to Push this Project to GitHub (From Scratch)

Since Git is not currently installed or in your path, follow these exact steps to push this code to your GitHub repository `DBMS-ad044-project`:

### Step A: Download & Install Git
1. Go to the official Git website: **[https://git-scm.com/download/win](https://git-scm.com/download/win)**
2. Download the 64-bit installer for Windows and run it.
3. Keep the default settings during installation and complete it.
4. Restart your Command Prompt or PowerShell so that Git is recognized.

### Step B: Configure Git & Push
Open **Command Prompt (CMD)** or **PowerShell** and execute the following commands step-by-step:

1. **Navigate to your project directory**:
   ```cmd
   cd "C:\Users\Admin\.gemini\antigravity-ide\scratch\hotel-management-system"
   ```

2. **Initialize Git in this directory**:
   ```cmd
   git init
   ```
   *(This tells Git to start tracking changes in this folder)*

3. **Verify Git added files**:
   ```cmd
   git status
   ```
   *(You will see all the project files highlighted in red as untracked)*

4. **Add all files to staging**:
   ```cmd
   git add .
   ```

5. **Commit the files to history**:
   ```cmd
   git commit -m "Initial commit of Hotel Management System DBMS project"
   ```

6. **Rename the default branch to main**:
   ```cmd
   git branch -M main
   ```

7. **Link to your remote GitHub repository**:
   *(Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username!)*
   ```cmd
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/DBMS-ad044-project.git
   ```

8. **Push your code to GitHub**:
   ```cmd
   git push -u origin main
   ```
   *(GitHub may pop up a window asking you to log in to authorize the push)*

---

## 📊 Database Schema Details

The database is structured around **6 primary tables** and **1 junction mapping table**:
- **Guest**: Holds customer names, phone, address, and ID verification proof.
- **Room**: Track room categories (Standard, Deluxe, Suite), daily rates, and status.
- **Booking**: Links guests to rooms for a check-in/out date range.
- **Staff**: Manages hotel staff member names, roles, and contacts.
- **Payment**: Registers payments against specific booking invoices.
- **Service**: Catalog of charges for services like Room Service, Spa, and Shuttle.
- **BookingService**: Junction table that records which booking consumed which services.

---

## 🧪 Database Assets Implemented

### Stored Procedures
1. **`CheckRoomAvailability(check_in, check_out)`**: Filters all rooms to return only those that do not overlap with any reservation bookings during that interval.
2. **`GenerateFinalBill(booking_id)`**: Dynamically sums room rates times days of stay, adds all service charges, subtracts payments made, and outputs the balance.

### Triggers
1. **`after_booking_insert` / `after_booking_delete`**: Dynamically toggles room status between `'Booked'` and `'Available'` upon bookings.
2. **`prevent_double_booking`**: Performs overlap collision check `BEFORE INSERT` and throws error code `45000` to prevent reservations on booked rooms.
