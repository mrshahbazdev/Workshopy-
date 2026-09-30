# Workshopy — Store listing copy

**Short description (200 chars max)**
Offline auto-workshop office: job cards, parts & labor, stock, gate pass, receipts — no account, no internet.

**Description**
Workshopy is a complete, offline-first office for auto workshops and garages — from vehicle intake to job card, estimate, invoice and gate pass, everything runs on one Windows PC, encrypted, with no subscription and no internet connection.

Features:
- Job cards — vehicle in/out, complaint & diagnosis, mechanic assignment, status flow open → in progress → ready → delivered
- Estimate & invoice — parts from stock + labor lines, optional sales tax and discount, printable job card, A4 invoice, A5 gate pass
- Parts & stock — append-only stock ledger, low-stock alerts, stock value report, CSV export
- Customers & vehicles — plate-wise service history, multiple vehicles per customer
- Collection & day book — payment receipts by mode, expense entry, reversal-never-delete, printable daily register
- Reports — gross profit, mechanic-wise labor, parts consumed, unpaid balances
- Roles & PINs — owner / manager / mechanic / clerk, PIN lock with idle auto-lock
- Privacy first — encrypted local database (SQLCipher), first-run consent, optional LAN second-PC mode (off by default, access-code protected), daily auto-backup

**Search terms**: job card, garage invoice, workshop management, parts stock, gate pass, offline workshop software, mechanic

**Category**: Business > Inventory & commerce  (fallback: Business > Customer management)

**Age**: Everyone

**Testing notes**
Workshopy is a fully offline desktop app — no account or sign-in. On first launch a consent screen explains records stay on this computer; accept it to continue. A fictional sample workshop "Al-Falah Auto Workshop" is loaded: 4 customers, 5 vehicles, 7 stocked parts, 4 job cards at different stages.
Suggested evaluation: 1. Job cards — open job #1, add a part and a labor line, watch totals update; use Start work / Mark ready / Deliver vehicle; print the job card, invoice and gate pass. 2. Parts — stock in/out, low-stock flag. 3. Collection — receive a payment against a job, print the receipt, reverse it with a reason (receipts are never deleted). 4. Reports — gross profit, mechanic-wise labor, unpaid balances. 5. Settings — users/roles with PINs; optional LAN host mode (off by default).
Capabilities: privateNetworkClientServer powers the OPTIONAL, user-initiated LAN mode only (off by default, never connects to the internet). runFullTrust is required for the encrypted local SQLCipher database file and printing invoices/receipts/gate passes. The app makes no internet requests, shows no ads, collects no telemetry.

**Privacy policy text**
Workshopy stores all data locally on the workshop's own computer, encrypted (SQLCipher plus OS credential store). The app makes no internet requests and collects no analytics or telemetry. The workshop is the sole data controller for customer and vehicle records. An optional, user-initiated LAN mode can share data with a second office PC on the same local network, protected by an access code; it is off by default and never connects to the internet. Nothing is transmitted to us or to any third party. Contact: mrshahbaznns@gmail.com
