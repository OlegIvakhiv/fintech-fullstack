# User Flow: Invest in Fund

**Role:** INVESTOR  
**Endpoints:** `GET /funds` · `GET /funds/:id` · `POST /funds/:id/invest`  
**Feature:** Invest a lump sum into a managed Fund that automatically distributes capital across multiple Business Units according to preset weights

---

## What is a Fund?

A Fund is a curated basket of Business Units (`FundAllocation` records), each assigned a `weight` (percentage). When an investor puts money into a fund, the system automatically splits the deposit across all linked BUs proportionally. The investor gets exposure to multiple BUs with a single transaction.

Fund ROI is a weighted average:
```
weightedMonthlyROI = Σ (allocation.weight / 100) × businessUnit.monthlyROI
```

---

## Preconditions

- User is authenticated with `role = INVESTOR`
- At least one Fund exists with `status = 'ACTIVE'`
- Fund has at least one `FundAllocation` with linked BUs
- User has at least one `Account` with sufficient balance

---

## Main Flow

1. **Navigate** to `/funds`
2. **System fetches** `GET /funds` — returns all active funds with:
   - `FundAllocation[]` including each BU's current `monthlyROI` and `annualROI`
   - Active `FundInvestment[]` (for pool value and investor count)
   - `weightedMonthlyROI` and `weightedAnnualROI` (computed on-the-fly)
3. **View** fund cards, each showing:
   - Fund name and description
   - BU allocation breakdown (BU names + weight percentages)
   - Weighted monthly ROI
   - Total pool value and investor count
4. **Click** `Invest in Fund` → `InvestInFundModal` opens
5. **Modal fields:**
   - **From Account** — dropdown from `GET /accounts/me`
   - **Amount** — positive decimal; available balance shown as hint
   - Weighted ROI preview shown
6. **Click** `Invest`
7. **Client validates:** amount > 0, account selected
8. **System sends** `POST /funds/:id/invest` with body `{ fundId, accountId, amount }`
9. **Server executes** inside `prisma.$transaction`:
   ```
   // Validate fund is ACTIVE
   fund = prisma.fund.findUnique({ where: { id: fundId }, include: { allocations: true } })
   if (!fund || fund.status !== 'ACTIVE') → BadRequestException

   // Validate account ownership
   account = prisma.account.findFirst({ where: { id: accountId, portfolio: { userId } } })
   if (!account || account.balance < amount) → BadRequestException

   transactionId = uuid()

   // 1. Debit account once
   account.update { balance: { decrement: amount } }
   if (account.balance < 0) → BadRequestException('Insufficient funds')

   // 2. Record fund-level investment
   fundInvestment.create { fundId, accountId, amount }

   // 3. Distribute to each BU
   for each allocation in fund.allocations:
     slice = floor(amount × allocation.weight / 100, 2 decimals)
     if (slice <= 0) skip
     _investTx(tx, { accountId, businessUnitId: allocation.businessUnitId, amount: slice },
               transactionId + `-bu${allocation.businessUnitId}`)
       → account.balance (already debited above — _investTx decrements again!)
       ⚠️ Known double-debit issue: account is debited once globally and then
          again inside each _investTx call. This is a bug — the fund service
          should use a fund-specific invest helper that does NOT debit the account.

   // 4. Summary journal entry
   journalEntry.create {
     amount: -amount,  // negative — funds leaving account
     accountId,
     transactionId,
     type: 'INVEST',
     description: `Fund investment: ${fund.name} — ${allocations.length} BUs`
   }
   ```
10. **Response:**
    ```json
    {
      "transactionId": "...",
      "fundId": 1,
      "totalInvested": 1000,
      "allocations": [{ "buId": 3, "amount": 600 }, { "buId": 5, "amount": 400 }],
      "status": "SUCCESS"
    }
    ```
11. Modal closes; account balance and fund cards refresh

---

## Postconditions (intended)

- `account.balance` decreased by total invested amount
- `FundInvestment` record created
- One `Investment` record per BU (created or incremented)
- One summary `JournalEntry` with `type = INVEST` at fund level
- Additional `JournalEntry` per BU allocation (from `_investTx`)

---

## Admin — Create / Manage Fund

Funds are created and managed by admins via `ManageFundModal`:

**Create:** `POST /funds`
```json
{
  "name": "Growth Fund",
  "description": "...",
  "currency": "USD",
  "allocations": [
    { "businessUnitId": 3, "weight": 60 },
    { "businessUnitId": 5, "weight": 40 }
  ]
}
```
Weights must sum to 100 (validated server-side).

**Update allocations:** `PATCH /funds/:id`
- Can update name, description, status, or reallocate weights

**Deactivate:** Set `status = 'INACTIVE'` — fund disappears from investor list

---

## Edge Cases & Error Handling

| Scenario | Response |
|----------|----------|
| Fund not ACTIVE | `BadRequestException('Fund is not active')` → HTTP 400 |
| Amount ≤ 0 | `BadRequestException('Amount must be positive')` |
| Account doesn't belong to user | `BadRequestException('Account not found or does not belong to you')` |
| Insufficient balance | `BadRequestException('Insufficient funds')` |
| Allocation slice rounds to 0 | That BU is skipped silently |
| `_investTx` double-debit bug | Account ends up debited `amount × 2` — **requires fix before production** |
| BU in allocation is INACTIVE | `_investTx` does not check BU status — investment still created |