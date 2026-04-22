# User Flow: Create Withdrawal Request

**Role:** INVESTOR  
**Endpoint:** `POST /withdrawal-requests`  
**Feature:** Request withdrawal of funds via three distinct withdrawal types

---

## Preconditions

- User is authenticated with `role = INVESTOR`
- For Type 1 & 2: an `Investment` record exists with `status = ACTIVE` and `amount > 0`
- For Type 3: an `Account` with `balance > 0` exists
- `WithdrawRequestModal` is opened from an investment row (carries `investment` object) or from the accounts section

---

## Opening the Modal

1. Navigate to `/portfolio`
2. In the Investments table, click `Withdraw` on any `ACTIVE` investment row
3. `WithdrawRequestModal` opens, pre-loaded with the `investment` object:
   - `investment.businessUnit.name`
   - `investment.amount` (the current invested amount — used as the max for Types 1 & 2)
   - `investment.currency`
4. The modal also fetches:
   - `GET /accounts/me` — to populate account dropdowns
   - `GET /business-units` — to populate the destination BU dropdown (Type 2)
   - `GET /exchange/rates` — to show live NBU conversion preview if currencies differ

---

## Tab: Type 1 — BU → Personal Account (`BUSINESS_UNIT_TO_ACCOUNT`)

**Tab label:** `To Account`

**Fields:**
- **Destination account** — dropdown from `/accounts/me`; all currencies shown
- **Amount** — positive decimal, `≤ investment.amount`

**Conversion preview** (auto-shown when currencies differ):
- Uses NBU rates from `GET /exchange/rates` (no fee applied — fee is only for cross-currency transfers between accounts)
- Shows: `X {fromCurrency} → Y {toCurrency}` at rate `R`

**Validation (client-side, before submit):**
1. Amount > 0
2. Amount ≤ `investment.amount`
3. Destination account selected

**Payload sent:**
```json
{
  "withdrawalType": "BUSINESS_UNIT_TO_ACCOUNT",
  "accountId": <destinationAccountId>,
  "fromBusinessUnitId": <investment.businessUnit.id>,
  "amount": <amount>,
  "currency": <investment.currency>
}
```

**Server creates:**
```
withdrawalRequest {
  investorId,
  accountId:           destinationAccountId,
  withdrawalType:      BUSINESS_UNIT_TO_ACCOUNT,
  fromBusinessUnitId:  investment.businessUnit.id,
  amount,
  currency:            account.currency,  ← from destination account
  status:              PENDING,
  description:         auto-generated
}
```

---

## Tab: Type 2 — BU → BU Re-investment (`BUSINESS_UNIT_TO_BUSINESS_UNIT`)

**Tab label:** `Re-invest`

**Fields:**
- **Linked account** — dropdown; this account acts as a pass-through for accounting (debit then credit during approval)
- **Amount** — positive decimal, `≤ investment.amount`
- **Destination BU** — dropdown of other `ACTIVE` business units, filtered to exclude the current BU (`bu.id !== investment.businessUnit.id`)

**Destination BU info shown:** name, currency, `monthlyROI%`

**Conversion preview** (auto-shown when currencies differ between source BU and destination BU): same NBU rate preview as Type 1.

**Validation (client-side):**
1. Amount > 0
2. Amount ≤ `investment.amount`
3. Linked account selected
4. Destination BU selected

**Payload sent:**
```json
{
  "withdrawalType": "BUSINESS_UNIT_TO_BUSINESS_UNIT",
  "accountId": <linkedAccountId>,
  "fromBusinessUnitId": <investment.businessUnit.id>,
  "toBusinessUnitId": <selectedBUId>,
  "amount": <amount>,
  "currency": <investment.currency>
}
```

**Server creates:**
```
withdrawalRequest {
  investorId,
  accountId:           linkedAccountId,
  withdrawalType:      BUSINESS_UNIT_TO_BUSINESS_UNIT,
  fromBusinessUnitId:  investment.businessUnit.id,
  toBusinessUnitId:    selectedBUId,
  amount,
  currency:            investment.currency,
  status:              PENDING
}
```

---

## Tab: Type 3 — Account → External (`ACCOUNT_TO_EXTERNAL`)

**Tab label:** `Cash Out`

**Fields:**
- **Source account** — dropdown from `/accounts/me`; any account
- **Amount** — positive decimal, `≤ account.balance`
- **Withdrawal method** — radio/select: `Crypto` / `Bank Transfer` / `Cash`
- **External reference** — text field; label and placeholder change by method:
  - Crypto → "Wallet address"
  - Bank Transfer → "IBAN"
  - Cash → "Reference / note"

**Validation (client-side):**
1. Source account selected
2. Amount > 0
3. Amount ≤ `account.balance`
4. Withdrawal method selected
5. External reference entered

**Server additionally validates (before creating record):**
```
account.balance >= amount   → else BadRequestException('Insufficient funds in account for withdrawal')
```

**Payload sent:**
```json
{
  "withdrawalType": "ACCOUNT_TO_EXTERNAL",
  "accountId": <sourceAccountId>,
  "amount": <amount>,
  "withdrawalMethod": "CRYPTO" | "BANK_TRANSFER" | "CASH",
  "externalWallet": "<address/IBAN/reference>",
  "currency": <account.currency>
}
```

**Server creates:**
```
withdrawalRequest {
  investorId,
  accountId:         sourceAccountId,
  withdrawalType:    ACCOUNT_TO_EXTERNAL,
  externalWallet:    externalWallet,
  withdrawalMethod:  method,
  amount,
  currency:          account.currency,
  status:            PENDING,
  description:       `Withdrawal to external wallet (${method})`
}
```

---

## After Submission (all types)

- Modal transitions to **success state**:
  - Checkmark icon
  - "Request Submitted — pending admin approval"
- Request appears in `GET /withdrawal-requests/my` with `status = PENDING`
- **No funds are moved** until admin approves
- Switching tabs in the modal resets all fields (`switchTab` handler clears `errorMsg`, `toBUId`, `externalWallet`, `withdrawalMethod`)

---

## Postconditions

A `WithdrawalRequest` row is created with:
- `status = PENDING`
- `requestedAt = now()`
- `investorId`, `accountId`, `amount`, `currency`, `withdrawalType`
- Type-specific fields: `fromBusinessUnitId`, `toBusinessUnitId`, `externalWallet`, `withdrawalMethod`

No balances are changed at this stage.

---

## Edge Cases & Error Handling

| Scenario | System Response |
|----------|----------------|
| Amount > investment balance (Types 1 & 2) | Client error: "Amount exceeds your investment of N {currency}" |
| Amount > account balance (Type 3) | Client error: "Insufficient balance"; server also validates with `BadRequestException` |
| No destination account selected | Client error: "Please select a destination account" |
| No destination BU selected (Type 2) | Client error: "Please select a destination business unit" |
| External wallet empty (Type 3) | Client error: "Please enter your external wallet / IBAN / reference" |
| Duplicate rapid submission | Submit button disabled + spinner while request is in-flight |
| Investment amount changed since modal opened | Client uses stale `investment.amount` from props — server does not re-validate at creation time for Types 1 & 2; the admin's approval step handles re-validation for Type 2 |
| Account soft-deleted between page load and submit | Server `findUnique` on account returns row (soft delete not checked here); consider adding `deletedAt: null` guard |