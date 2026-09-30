# Workshopy

Offline auto-workshop office for small garages — customers & vehicles, job cards with parts + labor, stock ledger, mechanic-wise work, collection register, day book, gate pass, bilingual receipts. No account, no subscription, no internet.

## Features

- **Job cards** — vehicle in/out, gap-free job numbers, complaint + work requested, mechanic assignment, status flow (open → in progress → ready → delivered), cancel with reason (parts return to stock automatically)
- **Estimate & invoice** — parts pulled from stock + labor lines, optional sales tax, discount, paid/balance; printable job card, A4 invoice and A5 gate pass
- **Parts & stock** — append-only stock ledger (in/out/job/adjust), low-stock alerts, stock value, printable stock report, CSV export
- **Customers & vehicles** — plate-wise service history, multiple vehicles per customer
- **Collection & day book** — payment receipts by mode, reversal-never-delete, expenses, daily net cash, printable day register
- **Reports** — gross profit (billed vs parts cost), mechanic-wise labor, parts consumed with margins, unpaid balances
- **Roles & PINs** — owner/manager/mechanic/clerk, optional PIN lock, idle auto-lock
- **Offline & private** — encrypted SQLCipher database, PIN hashing, first-run consent, LAN host mode (opt-in, access-code protected), auto-backup to a folder you choose, snapshot history

## Dev

```bash
npm install
npm run dev        # vite + electron
npm run build      # renderer bundle
npm run dist:win   # Windows NSIS + appx (Windows only)
```

First launch loads a fictional sample workshop (Al-Falah Auto Workshop) so every screen is demonstrable; "start blank" is one click away.

## Data & privacy

- `workshopy.db` — SQLCipher-encrypted SQLite (WAL, foreign keys); key wrapped by the OS credential store (DPAPI/Keychain)
- Records live **only on the workshop's computer** — the workshop is the data controller
- No network calls, no analytics, no accounts. Optional LAN host mode shares the app to a second PC on the same WiFi only when turned on.
