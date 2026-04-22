# User Flow: Admin Approves or Rejects Withdrawal Request

**Role:** ADMIN  
**Endpoint:** `PATCH /withdrawal-requests/:id/process`  
**Feature:** Process pending withdrawal requests (three types)

---

## Preconditions

- Admin is authenticated; JWT payload contains `role = ADMIN`
- At least one `WithdrawalRequest` row with `status = 'PENDING'` exists
- For Type 1 approval: the linked `Investment` record still exists and is `ACTIVE`
- For Type 2 approval: both the source `Investment` and destination `BusinessUnit` are still `ACTIVE`
- For Type 3 approval: the linked `Account` still has sufficient balance

---

## Main Flow

1. **Navigate** to `/admin/withdrawal-requests`
2. **System fetches** `GET /withdrawal-requests/pending` — returns all `PENDING` requests ordered by `requestedAt ASC` (oldest first), with full joins: `investor`, `account`, `fromBusinessUnit`, `toBusinessUnit`
3. **View** pending request cards, each showing:
   - Investor name & email
   - Color-coded withdrawal type badge (`BU → Account` / `BU → BU` / `Cash Out`)
   - Amount, currency, requested date
   - Type-specific details (source/destination BU names, external wallet & method)
4. **Click** a card to open the **Detail Modal**
5. **Review** full details:
   - Investor identity
   - Withdrawal type with icon
   - Source/destination accounts or business units
   - External wallet address / IBAN / reference and method (Type 3 only)
   - Description (if any)
   - Requested timestamp
6. **Choose action** — `Approve` or `Reject`
7. **System sends** `PATCH /withdrawal-requests/:id/process` with body `{ action: 'APPROVE' | 'REJECT' }` and the admin's JWT

---

## Approval Execution by Type

All three paths run inside a single `prisma.$transaction`. If any step throws, Postgres rolls back the entire operation and the request remains `PENDING`.

### Type 1 — BU → Personal Account (`BUSINESS_UNIT_TO_ACCOUNT`)

```
prisma.$transaction(async tx => {
  _divestTx(tx, { accountId, businessUnitId: fromBU, amount })
    → investment.amount -= amount  (status → WITHDRAWN if reaches 0)
    → account.balance  += amount
    → JournalEntry { type: DIVEST, amount: +amount }

  withdrawalRequest.update { status: APPROVED, processedAt, adminId, transactionId }
})
```

No balance re-validation at approval time — validated at request creation only.  
⚠️ Known gap: investment amount may have changed between request and approval (see Edge Cases).

### Type 2 — BU → BU Re-investment (`BUSINESS_UNIT_TO_BUSINESS_UNIT`)

```
prisma.$transaction(async tx => {
  // Step 1 — re-validate source investment (inside tx, row-level read)
  investment = tx.investment.findFirst({ where: { portfolioId, businessUnitId: fromBU, status: ACTIVE } })
  if (investment.amount < requestedAmount) → throw BadRequestException

  // Step 2 — divest from source BU
  _divestTx(tx, { accountId, businessUnitId: fromBU, amount }, divestTxId)
    → investment.amount -= amount
    → account.balance  += amount
    → JournalEntry { type: DIVEST, transactionId: divestTxId }

  // Step 3 — invest into destination BU
  _investTx(tx, { accountId, businessUnitId: toBU, amount }, investTxId)
    → account.balance  -= amount
    → investment (toBU) created or incremented
    → JournalEntry { type: INVEST, transactionId: investTxId }

  withdrawalRequest.update { status: APPROVED, processedAt, adminId, transactionId: divestTxId }
})
```

Two journal entries are written: one `DIVEST` and one `INVEST`, each with its own UUID `transactionId`.

### Type 3 — Account → External (`ACCOUNT_TO_EXTERNAL`)

```
prisma.$transaction(async tx => {
  // Re-validate balance at approval time
  account = tx.account.findUnique({ where: { id: accountId } })
  if (account.balance < requestedAmount) → throw BadRequestException

  _withdrawTx(tx, { accountId, amount })
    → account.balance -= amount
    → JournalEntry { type: WITHDRAW, amount: -amount }

  withdrawalRequest.update { status: APPROVED, processedAt, adminId, transactionId }
})
```

---

## Rejection Flow

```
PATCH /withdrawal-requests/:id/process  { action: 'REJECT' }
  → withdrawalRequest.update { status: REJECTED, processedAt, adminId }
```

No funds are moved. No journal entry is created.  
The investor sees the rejection in their request history but receives no automated notification (PoC scope).

---

## Postconditions

| Type | Investment | Account balance | BU investment (dest) | Journal entries |
|------|-----------|-----------------|----------------------|-----------------|
| Type 1 | Decreased (or WITHDRAWN) | Increased | — | 1× DIVEST |
| Type 2 | Source decreased | Unchanged (net 0) | Increased or created | 1× DIVEST + 1× INVEST |
| Type 3 | — | Decreased | — | 1× WITHDRAW |
| Rejected | Unchanged | Unchanged | — | None |

All approved requests receive:
- `status = 'APPROVED'`
- `processedAt = now()`
- `adminId` (the approving admin's user ID)
- `transactionId` (linked to the primary journal entry UUID)

---

## Edge Cases & Error Handling

| Scenario | What happens |
|----------|-------------|
| Investment balance changed since request (Type 1) | No re-validation — approval proceeds with original amount; if `_divestTx` sees insufficient investment it throws `BadRequestException` and the tx rolls back |
| Investment balance changed since request (Type 2) | Re-validation inside tx catches it; `BadRequestException`, request stays `PENDING` |
| Account balance insufficient at approval time (Type 3) | Re-validation inside tx catches it; `BadRequestException`, request stays `PENDING` |
| Destination BU no longer ACTIVE (Type 2) | `_investTx` still proceeds (no ACTIVE check in helper); business rule gap — consider adding a BU status check before `_investTx` |
| Request already APPROVED or REJECTED | Service throws `BadRequestException('Request already processed')` → HTTP 400 |
| Network/DB failure mid-transaction | Postgres rolls back; request stays `PENDING` |
| `adminId` in JWT does not exist as a User | `withdrawalRequest.update` throws Prisma FK error → HTTP 500 |