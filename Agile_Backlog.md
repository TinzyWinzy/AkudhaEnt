# Akudha Agri-Logistics Platform
## Production-Ready Agile Product Backlog

This document outlines the formalized Agile Product Backlog for the **Akudha** supply chain and informal distribution network. The backlog captures critical specifications for Sourcing (rural harvesting), Processing (value-chain conversion), and Distribution (vendor consignment hub) operations within the unique Zimbabwean logistical context (offline-first, cash settlements, and fair stipend controls).

---

## Epic 1: Sourcing (Agrarian Sourcing & Settle Sourcing Transactions)
*Sustaining local forest gatherers through verified collections, grade audits, and guaranteed minimum payouts.*

### User Story AKU-101: Offline Logging of Raw Baobab Collections
**As a** Field Sourcing Coordinator  
**I want to** log the raw weight and quality grade of baobab fruit collections at rural collection points with zero network connectivity  
**So that** we can secure an immutable record of harvester deposits without waiting for network recovery.

#### Acceptance Criteria (Gherkin Syntax)
* **Scenario: Successfully logging a collection under offline state**
  * **Given** that the Field Coordinator's device is in an **Offline Queue Mode** (disconnected from mobile GPRS/Edge corridors)
  * **And** the coordinator inputs the Harvester Profile `H-001` (e.g., "Seke Rural Cooperative")
  * **And** selects Region `Chimanimani`
  * **And** inputs Raw Weight of `45.0` kilograms and Quality Grade `A`
  * **When** they click "Commit Sourcing Ledger"
  * **Then** the system must calculate the fair wage payout of `$67.50` USD based on the Grade A price of `$1.50` USD/kg
  * **And** store the transaction in the client-side database with an offline-generated `idempotent_uuid` and `offline_created_at` timestamp
  * **And** surface a warning notification: `"ServiceWorker: Intercepted offline POST. Indexed payload idempotently."`
  * **And** increment the local Pending Sync Queue count by `1`.

* **Scenario: Prevention of under-payout during manual entry**
  * **Given** the coordinator attempts to override the payout calculation to `$50.00` USD for the `45.0` kg of Grade A baobab
  * **When** they attempt to submit the form
  * **Then** the system must trigger an `"ETHICAL AUDIT FAILED"` validation block
  * **And** prompt: `"Payout is below the ethical premium floor in Zimbabwe for Grade A ($67.50 USD). Minimum missing stipend: $17.50 USD."`
  * **And** prohibit the transaction from being committed to local storage until corrected.

#### Offline State Requirements
* **Data Layer Storage:** The record must be parsed to a JSON payload conforming to the `HarvesterRecord` schema and saved to the offline storage registry (`localStorage` or `IndexedDB`).
* **Conflict Prevention (Idempotency):** Each transaction is appended with a client-generated UUID in the format `harv_[random]_[timestamp]` so that if the same payload is transmitted multiple times during a reconnection retry, the backend will treat it as duplicates and avoid duplicate payouts.
* **Warehouse Impact:** The local raw pulp stock meter must immediately increment by `+45.0` kg to allow processing admins to plan downstream batches prior to cloud synchronization.

---

### User Story AKU-102: Sourcing Ledger Queue Synchronization
**As a** Field Sourcing Coordinator  
**I want to** batch-synchronize my queued offline collections once I establish a cellular data connection in regional hubs  
**So that** the central database is updated and the financial treasury can release cash payout stipends.

#### Acceptance Criteria (Gherkin Syntax)
* **Scenario: Automatic detection and manual synchronization triggering**
  * **Given** that the coordinator has `3` pending harvest records logged offline while in the field
  * **And** they migrate to an area with connectivity (e.g., Harare Central Terminal)
  * **And** switch the toggle to **Online Sync Active**
  * **When** they click the "Sync" button
  * **Then** the application must transmit each queued package sequentially via REST API `POST /api/harvests`
  * **And** display a log message for each successful sync showing the matching UUID
  * **And** empty the local pending cue on completion.

#### Offline State Requirements
* **State Preservation:** If connection is lost halfway through transmitting `3` records (e.g., during dial-up GPRS/Sat link dropouts), the system must preserve the remaining un-transmitted records in local storage with `PENDING` status.
* **Deduplication Audit:** Already synced records must update their status tag to `SYNCED` locally and must never be re-sent.

---
---

## Epic 2: Processing & Value-Chain Conversion (Batch Processing)
*Bridging raw natural supplies with standardized beverage packaging for informal market consumption.*

### User Story AKU-201: Conversion Batch Logging
**As a** Processing Plant Admin  
**I want to** transition a specific quantity of raw baobab pulp weight into counted batches of 175ml beverage sachets  
**So that** the depot stock changes can be calculated and we can measure our processing efficiency.

#### Acceptance Criteria (Gherkin Syntax)
* **Scenario: Submitting a valid batch transformation**
  * **Given** that the raw baobab pulp inventory in the vault currently stands at `315.5` kg
  * **And** the admin inputs raw weight `25.0` kg
  * **And** inputs produced sachets `250` units
  * **When** they click "Submit Batch Transformation"
  * **Then** the system must calculate the processing conversion yield ratio as `10.0` sachets/kg
  * **And** calculate the yield deviation as `0.0%` relative to the baseline optimum ratio (10 sachets per 1kg)
  * **And** deduct `25.0` kg from the raw pulp inventory
  * **And** add `+250` units to the 175ml finished sachet stock inventory.

* **Scenario: Insufficient raw pulp inventory block**
  * **Given** the current raw baobab pulp inventory is `100.0` kg
  * **When** the admin inputs raw weight `120.0` kg to process a new batch
  * **Then** the system must block the form submission with a `"VAULT LIMIT VIOLATION"` warning
  * **And** prompt: `"Processing requires 120.0 kg of raw pulp, but current storage vault only contains 100.0 kg. Deficiency: 20.0 kg."`
  * **And** refuse state mutation.

#### Offline State Requirements
* **Synchronous UI updates:** Decreases in raw pulp and increases in sachet inventory must take effect locally immediately (even if offline is active) using transient operational computations, ensuring the local user is prompted with accurate, up-to-the-minute stock limits.

---

### User Story AKU-202: Processing Yield Anomaly Flagging
**As a** Processing Controller  
**I want to** automatically flag batches where the manufacturing yield ratio deviates from the optimum benchmark of 10 sachets/1kg  
**So that** we can debug potential bulk waste, machine leakage, or micro-theft.

#### Acceptance Criteria (Gherkin Syntax)
* **Scenario: High-waste batch flagging**
  * **Given** the admin inputs raw weight `25.0` kg and sachets produced `180`
  * **When** the batch is calculated
  * **Then** the system must calculate the yield ratio as `7.2` sachets/kg (benchmarked at 10)
  * **And** compute a yield deviation of `-28.0%`
  * **And** flag the record as `is_anomalous: true`
  * **And** trigger a warning banner: `"YIELD DEVIATION DETECTED: Batch yield is 7.2 sachets/kg (-28.0% variance). Flagged in Zimbabwean Ledger."`

* **Scenario: Safe optimum batch logging**
  * **Given** an admin inputs raw weight `20.0` kg and sachets produced `200`
  * **When** the batch yields exactly `10.0` sachets/kg
  * **Then** the system must flag `is_anomalous: false`
  * **And** log `"Transformation Bridge: Success. Processed 20 kg pulp into 200 sachets."`

#### Offline State Requirements
* **Immutable Verification:** Once an anomaly is flag-marked offline, the flag is bound inside the payload and transmitted to the ledger securely on reconnect, preventing local modification or purging of flagged anomalies.

---
---

## Epic 3: Distribution (Informal Retail & Consignment Management)
*Managing consignment inventory, tracking micro-vendor livelihood indicators, and auditing cash returns.*

### User Story AKU-301: Outbound Consignment & Spoilage Settlement
**As a** Vendor Hub Manager  
**I want to** log the evening sachet dispatch to micro-vendors and finalize their sales settlements while capturing spoilage losses  
**So that** we can keep real-time track of vendor balances and regional sales velocity.

#### Acceptance Criteria (Gherkin Syntax)
* **Scenario: Committing a secure distribution consignment and balancing accounts**
  * **Given** the retail sachet warehouse vault has `420` units in stock
  * **And** the manager inputs dispatch of `80` sachets to vendor `V-101` ("Amai Mercy Mukucha")
  * **And** inputs `2` returned/spoiled units and `75` confirmed sold units
  * **When** they commit the consignment ledger
  * **Then** the system must deduct `80` sachets from the finished sachet stock inventory
  * **And** calculate the gross consumer turnover as `$37.50` USD (75 sold * $0.50 sachet retail price)
  * **And** calculate the net family margin keeping in hand as `$18.25` USD (75 sold * ($0.50 retail - $0.25 wholesale) - (2 spoiled * $0.25 wholesale fee))
  * **And** confirm that this profit meets the daily sustainable standard.

* **Scenario: Prohibiting consignment dispatch exceeding stock limits**
  * **Given** the processed sachet stock vault stands at `50` units
  * **When** the manager inputs a dispatch of `60` units to vendor `V-102`
  * **Then** the system must reject checkout with a `"VAULT LIMIT VIOLATION"` warning
  * **And** prompt: `"Dispatch request requires 60 sachets, but processed vault stock has only 50 sachets."`

* **Scenario: Double ledger math validation**
  * **Given** a dispatch of `100` units
  * **When** the manager enters sold units as `90` and spoiled units as `15` (totaling `105` units)
  * **Then** the system must throw a mismatch block: `"CONSIGNMENT DISCREPANCY: Dispatched sachets counted is 100, but Sold (90) + Returned (15) equals 105. Cumulative sum cannot exceed dispatches."`

#### Offline State Requirements
* **Audit trail:** Consignment logs mapped offline must record the dispatcher code (`DIS-09`) and Hub ID (`HUB-HARARE`) to segment performance metrics by regional distribution offices.

---

### User Story AKU-302: Vendor Profit Sustainment Auditing
**As a** Brand Impact Auditor  
**I want to** monitor the daily sustaining net margins of informal vendors during settlement, ensuring they hit their $6 - $18 USD profit threshold  
**So that** we can proactively identify struggling routes and ensure our network operates above the ethical poverty line.

#### Acceptance Criteria (Gherkin Syntax)
* **Scenario: Profit falls below daily baseline threshold**
  * **Given** a consignment dispatch of `20` sachets, with `15` sold and `4` spoiled/returned
  * **When** the ledger calculates the margins for the vendor
  * **Then** the net vendor profit is computed as `$2.75` USD (15 * $0.25 margin - 4 * $0.25 spoilage penalty = $3.75 - $1.00 = $2.75 USD)
  * **And** the system logs status: `bg-amber-50 text-amber-700` and displays: `"⚠️ Below Daily Threshold (Goal: $6.00 - $18.00 USD)"`
  * **And** lists the account state inside the list table as `"Below Baseline"`.

* **Scenario: Profit meets the target range**
  * **Given** a consignment dispatch of `80` sachets, with `75` sold and `2` spoiled
  * **When** the ledger calculates the margins for the vendor
  * **Then** the net vendor profit is computed as `$18.25` USD
  * **And** the system logs status: `bg-emerald-50 text-emerald-700` and displays: `"🏆 Sustainable Daily Threshold Met ($6.00 - $18.00 range secured)"`
  * **And** lists the account state inside the list table as `"Target Secure"`.

* **Scenario: Profit exceeds the target range**
  * **Given** a consignment dispatch of `120` sachets, with `100` sold and `0` spoiled
  * **When** the ledger calculates the margins for the vendor
  * **Then** the net vendor profit is computed as `$25.00` USD
  * **And** the system logs status: `bg-purple-50 text-purple-700` and displays: `"🔥 Exceptional Daily Return (Target premium exceeded!)"`
  * **And** lists the account state inside the list table as `"Target Secure"`.

#### Offline State Requirements
* **Analytical persistence:** Aggregated metrics of vendor earnings (e.g., `"Sachets sold: 75 / 80 dispatched"`) must be dynamically calculated offline in real-time and mapped on client dashboard monitors. This helps on-site logistics hubs monitor the immediate livelihood impact values of local vendors.
