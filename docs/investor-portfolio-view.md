# User Flow: View Portfolio & Investments

**Role:** INVESTOR  
**Endpoints:** `GET /dashboard/investor` · `GET /accounts/me` · `GET /portfolios/me` · `GET /transactions/me` · `GET /withdrawal-requests/my`  
**Feature:** Read-only overview of all accounts, investments, earnings, and pending withdrawal requests

---

## Preconditions

- User is authenticated with `role = INVESTOR`
- Portfolio was auto-created at registration (always exists)

---

## Main Flow

1. **Navigate** to `/portfolio`
2. **System fetches in parallel:**
   - `GET /dashboard/investor` — summary statistics for the authenticated user
   - `GET /accounts/me` — all non-soft-deleted accounts owned by user
   - `GET /portfolios/me` — portfolio with active investments and linked business unit details
   - `GET /withdrawal-requests/my` — full withdrawal request history, newest first
3. **Summary statistics cards** (from `/dashboard/investor`):

   | Stat | Source |
   |------|--------|
   | Total Revenue | `Σ (investment.amount × bu.monthlyROI / 100)` across active investments |
   | Total Saved (invested) | `Σ investment.amount` where `status = ACTIVE` |
   | Taxes Paid | `totalRevenue × 0.10` (10% flat — PoC approximation) |
   | Available Balance | `Σ account.balance` across all accounts |
   | Pending Withdrawals | `COUNT(withdrawalRequest WHERE status = PENDING AND investorId = me)` |

4. **Accounts section** (`/accounts/me`):
   - Horizontal scrollable row of account cards
   - Each card: name, type (`CHECKING` / `SAVINGS`), currency, balance
   - Balances stored as `Decimal(18,8)` — displayed as formatted numbers

5. **Investments table** (`/portfolios/me → investments`):

   | Column | Source |
   |--------|--------|
   | Business Unit | `investment.businessUnit.name` |
   | Amount invested | `investment.amount` in `investment.currency` |
   | Status badge | `ACTIVE` / `WITHDRAWN` |
   | Action | `Withdraw` button — only rendered if `status = ACTIVE` |

   - Search input filters the table client-side by BU name
   - Clicking `Withdraw` opens `WithdrawRequestModal` (see `investor-withdraw-request.md`)

6. **Transaction history** (if navigated to `/transactions`):
   - `GET /transactions/me` — all `JournalEntry` rows for the user's accounts, newest first
   - Columns: date, type badge, description, amount (± signed), BU name if linked

7. **Withdrawal request history:**
   - `GET /withdrawal-requests/my` — own requests, ordered by `requestedAt DESC`
   - Status badge: `PENDING` / `APPROVED` / `REJECTED`
   - Type badge: `BU → Account` / `BU → BU` / `Cash Out`

---

## Postconditions

- No data is mutated by viewing
- All displayed data is real-time (React Query with `staleTime` defaults)

---

## Monthly Earnings Breakdown (separate endpoint)

`GET /dashboard/investor/monthly-earnings` returns an array of `{ month, earnings }` objects, one entry per calendar month where at least one ROI record exists for any BU the investor is invested in.

Calculation per month:
```
for each active investment:
  for each BusinessUnitROI record matching that BU:
    investorShare = (investedAmount / totalPoolValue) × totalDistributed
```

This is a historical, pro-rata calculation — not a projection.

---

## Accounts Page — NBU Currency Summary

When navigated to `/accounts` (the dedicated accounts page), the layout switches to a two-column view:

- **Left:** account cards with balances
- **Right:** `ExchangeSidebarPanel` showing:
  - Live NBU rates for all 6 directional pairs (USD↔UAH, EUR↔UAH, USD↔EUR)
  - Portfolio-in-UAH: converts each account balance to UAH using live rates, with a per-currency progress bar
  - Rates are fetched from `GET /exchange/rates` (5-minute cache, stale fallback)

---

## Edge Cases

| Situation | Display |
|-----------|---------|
| No investments | Empty state in table; `totalSaving = 0`, `totalRevenue = 0` |
| No accounts | Accounts section shows empty state or is hidden |
| `totalPoolValue = 0` for a BU in earnings calc | That BU's ROI month is skipped (no division-by-zero) |
| Pending withdrawals | Count shown in stats card; individual requests in history table |
| Soft-deleted account | Not returned by `/accounts/me` — filtered by `deletedAt IS NULL` at DB level |
| Portfolio not found | Dashboard returns all-zero stats (service has a try/catch fallback) |