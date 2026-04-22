# User Flow: Currency Exchange & Cross-Currency Transfer

**Roles:** INVESTOR · ADMIN  
**Endpoints:** `GET /exchange/rates` · `GET /exchange/info` · `POST /exchange/convert` · `POST /exchange/refresh` · `POST /transactions/cross-currency-transfer`  
**Feature:** View live NBU exchange rates and transfer funds between accounts in different currencies

---

## Exchange Rate System

### How Rates Are Fetched

```
ExchangeService.getRates()
  ├─ if cache valid (< 5 min old) → return cachedRates
  └─ else → fetch NBU API (8s timeout)
       ├─ success → build snapshot, set cache (TTL = 5 min), return
       └─ failure → if stale cache exists → return stale (warn in logs)
                    else → ServiceUnavailableException (HTTP 503)
```

**NBU API URL:** `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json`

**Rate snapshot shape:**
```json
{
  "USD": 41.23,     // UAH per 1 USD
  "EUR": 44.87,     // UAH per 1 EUR
  "UAH": 1,
  "fetchedAt": "2025-04-22T10:00:00.000Z",
  "exchangeDate": "22.04.2025"
}
```

All rates are expressed in **UAH per 1 unit of the foreign currency**. Cross-rates are calculated as: `rate(A→B) = UAH_per_A / UAH_per_B`.

### Available Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /exchange/rates` | Returns the raw rate snapshot |
| `GET /exchange/info` | Returns rates plus fee percentage and all 6 directional pairs |
| `POST /exchange/convert` | Calculates conversion for a given `{ amount, from, to }` — does NOT move any funds |
| `POST /exchange/refresh` | Force-refreshes the cache (bypasses TTL) |

---

## Conversion Formula

```
officialRate   = rates[from] / rates[to]
grossAmount    = amount × officialRate
feeAmount      = grossAmount × 0.005        // 0.5% fee
netAmount      = grossAmount − feeAmount    // credited to destination
effectiveRate  = netAmount / amount
```

**Fee is 0.5%** and is deducted from the converted amount (destination receives `netAmount`, not `grossAmount`).

The fee is applied only to **cross-currency transfers between accounts** (`POST /transactions/cross-currency-transfer`). Withdrawal request conversion previews shown in the modal use rates only — no fee is applied at the request creation stage.

---

## Flow: Cross-Currency Transfer Between Own Accounts

**Entry point:** `CrossCurrencyTransferModal` on the Accounts page

1. **User selects:**
   - Source account (e.g. USD balance)
   - Destination account (e.g. UAH balance)
   - Amount to transfer
2. **Modal shows conversion preview** in real-time:
   - Official rate, fee (0.5%), net credited amount
3. **User confirms**
4. **System sends** `POST /transactions/cross-currency-transfer`:
   ```json
   { "fromAccountId": 1, "toAccountId": 2, "amount": 100 }
   ```
5. **Server validates:**
   - Both accounts exist and belong to `req.user.userId`
   - Same account → `BadRequestException`
   - Amount ≤ 0 → `BadRequestException`
   - If same currency → falls back to `createTransfer` (no fee, no rate lookup)
6. **Server fetches conversion** via `ExchangeService.convert(amount, fromCurrency, toCurrency)`
7. **Server executes** inside `prisma.$transaction`:
   ```
   // Debit source
   fromAccount.update { balance: { decrement: amount } }
   if (fromAccount.balance < 0) → BadRequestException('Insufficient funds')

   // Credit destination
   toAccount.update { balance: { increment: netAmount } }   // netAmount after fee

   // Two journal entries (same transactionId)
   journalEntry.create {
     amount: -amount,
     accountId: fromAccountId,
     type: 'TRANSFER',
     description: `Cross-currency transfer to ${toAccount.name} ... rate: ... fee: ...`
   }
   journalEntry.create {
     amount: +netAmount,
     accountId: toAccountId,
     type: 'TRANSFER',
     description: `Cross-currency transfer from ${fromAccount.name} ... amount after conversion: ...`
   }
   ```
8. **Response:**
   ```json
   {
     "transactionId": "...",
     "fromAmount": 100, "fromCurrency": "USD",
     "toAmount": 4082.5, "toCurrency": "UAH",
     "fee": 20.5,
     "effectiveRate": 40.825
   }
   ```
9. Account balances refresh

---

## ExchangeFloatingWidget (UI)

A draggable floating widget available on all pages except `/login` and `/register`.

- Collapsed state: shows one current rate pair
- Expanded state: shows all 6 directional pairs (USD→UAH, UAH→USD, EUR→UAH, UAH→EUR, USD→EUR, EUR→USD)
- Position persists across page navigations via `localStorage`
- Fetches from `GET /exchange/rates` on mount; respects the 5-minute server-side cache

---

## ExchangeSidebarPanel (on Accounts page)

Shown in the right column of the `/accounts` page layout (`xl:flex-row`).

- Live rate table for all 6 pairs
- Portfolio-in-UAH conversion:
  - For each account: `balance × (rates[currency] / rates['UAH'])`
  - Progress bars show each currency's share of total UAH value

---

## Postconditions (cross-currency transfer)

- `fromAccount.balance` decreased by `amount` (in `fromCurrency`)
- `toAccount.balance` increased by `netAmount` (in `toCurrency`, after fee)
- Two `JournalEntry` rows with `type = TRANSFER` and the same `transactionId`
- Fee is not separately recorded — it is implicit in the difference between debited and credited amounts

---

## Edge Cases & Error Handling

| Scenario | Response |
|----------|----------|
| Same currency accounts | Falls back to regular transfer (no rate lookup, no fee) |
| Source and destination are the same account | `BadRequestException` |
| Amount ≤ 0 | `BadRequestException` |
| Account doesn't belong to user | `BadRequestException('Account not found or does not belong to you')` |
| Insufficient source balance | Post-update balance check: `BadRequestException('Insufficient funds in source account')` |
| NBU API down, no stale cache | `ServiceUnavailableException` → HTTP 503 |
| NBU API down, stale cache available | Returns stale rates with warning logged; transfer proceeds with stale rates |
| NBU rate missing for currency | `Error('NBU feed missing valid rate for X')` → HTTP 500 |