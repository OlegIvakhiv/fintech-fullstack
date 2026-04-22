# User Flow: Admin Creates / Edits Business Unit

**Role:** ADMIN  
**Endpoints:** `POST /business-units` · `PATCH /business-units/:id` · `POST /business-units/:id/roi` · `DELETE /business-units/:id/roi/:roiId` · `DELETE /business-units/:id`  
**Feature:** Create new investment vehicle or manage an existing Business Unit and its ROI history

---

## Preconditions

- Admin is authenticated; JWT payload contains `role = ADMIN`
- For edit/delete: target BusinessUnit exists in the database

---

## Main Flow — Create

1. **Navigate** to `/admin/business-units`
2. **Click** `Create Unit` button
3. **Modal opens** (`CreateEditUnitModal`) with fields:
   - **Unit Name** — required, free text
   - **Description** — optional
   - **Currency** — dropdown: `USD` / `EUR` / `UAH`
   - **Base Interest Rate (%)** — annual percentage yield stored as `interestRate`
   - **Initial Monthly ROI (%)** — the first ROI record to seed `roiHistory`
   - **Initial Pool Value** — optional; used to calculate `totalDistributed` in the seed ROI record
   - **Month / Year** — defaults to current month/year; cannot be a future date
4. **Click** `Create`
5. **System validates:**
   - `month` in range 1–12
   - `year/month` is not in the future (throws `BadRequestException`)
6. **System writes:**
   ```
   businessUnit.create {
     name, description, currency,
     interestRate: monthlyROI || 0,
     monthlyROI:   monthlyROI || 0,
     annualROI:    compound(monthlyROI) || 0,   // = ((1 + roi/100)^12 - 1) × 100
     status: 'ACTIVE'
   }

   if (monthlyROI provided):
     businessUnitROI.create {
       businessUnitId, month, year,
       monthlyROI,
       totalPoolValue: initialPoolValue || '0',
       totalDistributed: totalPoolValue × monthlyROI / 100,
       currency
     }
   ```
7. **Modal closes**; new unit appears in the table immediately (React Query invalidation)

---

## Main Flow — Edit

1. **Click** the pencil icon on any unit row → modal pre-fills current values
2. **Modify** any field: name, description, currency, `interestRate`, or `monthlyROI`
3. **Click** `Update` → `PATCH /business-units/:id`
4. **If `monthlyROI` is changed**, the service additionally:
   - Upserts a `BusinessUnitROI` record for the **current** month/year, recalculating `totalPoolValue` (summed from all active `Investment` rows for this BU) and `totalDistributed`
   - Updates `BusinessUnit.monthlyROI`, `annualROI`, and `lastROIUpdate`
5. Table refreshes

---

## Main Flow — Soft Delete

1. **Click** the trash icon on a unit row → confirmation dialog appears
2. **Confirm** → `DELETE /business-units/:id`
3. **System sets** `businessUnit.status = 'INACTIVE'` (soft delete — data preserved)
4. Unit disappears from the investor-facing list (filtered by `status = 'ACTIVE'` in `findAll`)
5. Existing `Investment` records linked to this BU are **not** automatically affected; they remain `ACTIVE` until explicitly divested

---

## Main Flow — ROI History Management (via Detail Modal)

1. From the unit table, click the eye icon → **Detail Modal** opens
2. `GET /business-units/:id` is called, returning the unit with up to the last 20 journal entries, full ROI history, live `totalPoolValue` (sum of active investments), and `investorCount`
3. **Set / update a specific month's ROI** → `POST /business-units/:id/roi`:
   ```
   body: { month, year, monthlyROI, totalPoolValue }
   ```
   - Validates month in 1–12, year/month not in the future
   - Upserts `BusinessUnitROI` record (unique on `businessUnitId + month + year`)
   - `totalDistributed = totalPoolValue × monthlyROI / 100`
   - Updates `BusinessUnit.monthlyROI`, `annualROI`, `lastROIUpdate` to match the new record
4. **Delete a ROI record** → `DELETE /business-units/:id/roi/:roiId`:
   - Deletes the `BusinessUnitROI` row
   - Rolls `BusinessUnit.monthlyROI` back to the most recent remaining ROI record (or `null` if none remain)

---

## Computed / Derived Values

| Field | Formula |
|-------|---------|
| `annualROI` | `((1 + monthlyROI/100)^12 − 1) × 100` using `big.js` half-even rounding |
| `totalDistributed` | `totalPoolValue × monthlyROI / 100` (stored in `BusinessUnitROI`) |
| `totalPoolValue` (live) | Sum of `investment.amount` where `businessUnitId = id` and `status = ACTIVE` |
| `investorCount` (live) | Count of distinct `portfolio.userId` across active investments |
| Investor earnings (historical) | `(investorAmount / totalPoolValue) × totalDistributed` per ROI month |

---

## Postconditions

- `BusinessUnit` exists with `status = 'ACTIVE'`
- Appears on `/business-units` for all investors
- If initial ROI was provided: one `BusinessUnitROI` record exists for the specified month/year
- Fund weighted ROI recalculates automatically the next time `GET /funds` is called (computed on-the-fly from `FundAllocation.weight × BusinessUnit.monthlyROI`)

---

## Edge Cases & Error Handling

| Scenario | System Response |
|----------|----------------|
| Missing name field | Create button disabled client-side; server would return 400 if bypassed |
| Negative interest rate | HTML `min="0"` prevents input; no server-side guard currently |
| Future month/year | `BadRequestException('Cannot create business unit with future date')` |
| Month out of range | `BadRequestException('Month must be between 1 and 12')` |
| Deleting a ROI record that is the current month | `BusinessUnit.monthlyROI` rolls back to previous month's value automatically |
| Editing currency on a BU with active investments | Currency field updated on BU; existing `Investment.currency` values are **not** migrated — potential currency mismatch |
| Soft-deleting a BU with pending withdrawal requests | Requests remain `PENDING`; admin must manually reject them |