# User Flow: Admin Top-Up (Deposit Funds to User Account)

**Role:** ADMIN  
**Endpoint:** `POST /deposits`  
**Feature:** Manually add funds to any user's account (simulating a physical cash deposit or wire)

---

## Preconditions

- Admin is authenticated; JWT payload contains `role = ADMIN`
- Target account exists and is not soft-deleted (`deletedAt IS NULL`)
- Target account can be in any currency: `USD`, `EUR`, or `UAH`

---

## Main Flow

1. **Navigate** to `/admin/accounts` (or the shared Accounts page — admin sees all accounts with owner info)
2. **System fetches** `GET /accounts` — returns every account across all users (admin-only endpoint)
3. **Locate** the target account (search or scroll); each card shows:
   - Account name and type (`CHECKING` / `SAVINGS`)
   - Owner name & email
   - Currency and current balance
4. **Click** `Add Funds` on the account card
5. **Modal opens** (`DepositModal`):
   - Displays account name and currency symbol
   - Enter a positive decimal amount
   - Preview shows the formatted amount with currency
6. **Click** `Deposit` (or press Enter)
7. **System validates (client-side):**
   - Amount is a positive number (`> 0`)
8. **System sends** `POST /deposits` with body `{ accountId, amount, description? }`
9. **Server executes** inside `prisma.$transaction`:
   ```
   account.update { balance: { increment: amount } }
   journalEntry.create {
     amount:        +amount,
     accountId,
     transactionId: uuid(),
     type:          'DEPOSIT',
     description:   dto.description || 'System Deposit'
   }
   returns { transactionId, status: 'SUCCESS', newBalance }
   ```
10. **Modal closes**; account card reflects the updated balance (React Query invalidation)

---

## Postconditions

- `account.balance` increased by the deposited amount (stored as `Decimal(18,8)`)
- One `JournalEntry` row with `type = 'DEPOSIT'`, a positive `amount`, and a UUID `transactionId`
- No other accounts, investments, or business units are affected
- Response contains `{ transactionId, status: 'SUCCESS', newBalance }`

---

## Data Model Impact

```
Account
  balance: Decimal(18,8)  ← incremented

JournalEntry
  type:          DEPOSIT
  amount:        +N        (positive — funds entering the account)
  accountId:     <target>
  transactionId: uuid
  description:   'System Deposit' (or custom)
```

---

## Edge Cases & Error Handling

| Scenario | System Response |
|----------|----------------|
| Amount ≤ 0 | Client disables the Deposit button and shows "Please enter a positive amount"; server has no explicit guard (would still process `amount = 0` — consider adding a server-side check) |
| Non-numeric input | HTML `type="number"` prevents submission |
| Account soft-deleted (`deletedAt` is set) | No server-side check currently — `account.update` succeeds on a soft-deleted row. Recommended: add `where: { id, deletedAt: null }` guard |
| Account does not exist | Prisma throws `RecordNotFound`; maps to HTTP 500 (no explicit `NotFoundException` guard in deposit service) — recommended fix: add `findUnique` check before update |
| Network failure | Prisma `$transaction` rolls back; account balance unchanged |
| Concurrent deposit to same account | Prisma `increment` is atomic; no race condition |

---

## Admin Notes

- This operation is **irreversible through the UI** — there is no refund or undo button
- All deposits are logged in `JournalEntry` for full audit trail
- No fee is applied to deposits
- The `description` field defaults to `'System Deposit'`; admins cannot currently set a custom description through the UI (only via direct API call)
- Deposits do **not** automatically create or update `Investment` records — the investor must separately invest from their account balance