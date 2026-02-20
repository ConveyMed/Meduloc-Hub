# Field Intelligence -- Full Walkthrough

Step-by-step guide for onboarding a new medical device client. Covers the full workflow from admin setup through rep daily use.

---

## Part 1: Admin Setup

The admin starts by importing data -- not by building the org chart. The data tells you what regions make sense, which states and cities have volume, and where the market potential is. Build the hierarchy around the data, not the other way around.

### 1A. First Procedure CSV Import

**Where:** Settings > Database Import

The client has a procedure database export (Acuity MD, Definitive Healthcare, etc.). Each CSV represents **one surgery type** -- for example, "Total Knee Arthroplasty".

1. Upload the CSV file (.csv, .xlsx, .xls)
2. The column mapper auto-matches common headers. The file must include a header row. Recognized headers and aliases:

   | Header in File | Maps To | Notes |
   |---|---|---|
   | npi | NPI | Required -- merge key for multi-CSV imports |
   | HCP, Full Name, Physician, Provider, Surgeon | Full Name | Any of these work |
   | First Name / Last Name | First / Last Name | If name is split across two columns |
   | Primary Site of Care, Site of Care, Practice | Site of Care | Hospital or ASC name |
   | Specialty | Specialty | Stored as-is (including nested formats) |
   | CPT Volume, Volume, Annual Volume, Cases | Total Procedures | Procedure count per year |
   | CPT Code, CPT, Procedure Code | CPT Code | e.g. 27447 |
   | CPT Description, Procedure Description | CPT Description | Human-readable name |
   | Address1, Address, Street | Address | |
   | City | City | |
   | State | State | |
   | Zip, Zip Code, Postal Code | ZIP | Stored as text (preserves leading zeros) |
   | Phone number, Phone, Telephone | Phone | Raw digits, formatted in app |
   | Email | Email | |
   | Fax | Fax | |

   Headers are case-insensitive. Columns not recognized default to "Skip" and can be mapped manually or saved as a custom field.
3. **Enter the Procedure Type** -- each file represents one surgery type. Before importing, enter:
   - **CPT Code** (required) -- the procedure code for this file (e.g. 27447)
   - **Description** (optional) -- human-readable name (e.g. "Total Knee Arthroplasty")
   - **Average Price Per Procedure** (optional) -- the dollar value of one procedure to the device company (e.g. $18,500). Enables market potential calculations.
4. Click **Import**

What happens behind the scenes:
- Surgeon demographic data (name, NPI, city, state, specialty, etc.) upserts into the surgeons table
- The CPT code you entered is applied to every row -- each surgeon gets a record in the surgeon CPT data table keyed on surgeon + CPT code, with their procedure volume from the CSV
- If a price was entered, it saves to CPT prices -- one price per CPT code

---

### 1B. Second Procedure CSV Import

Same flow, different surgery type -- for example, "Total Hip Arthroplasty" with CPT code 27130.

1. Upload the second CSV
2. Map columns (same pattern)
3. Enter the Average Price for this procedure (e.g. $16,200)
4. Click **Import**

**The merge:** When the same NPI appears in both CSVs, the app matches on NPI and adds the second CPT code to that surgeon. Dr. Smith now has TWO procedures in the system:
- 27447 (Total Knee) -- 45 cases/yr -- $18,500/case
- 27130 (Total Hip) -- 30 cases/yr -- $16,200/case

You can repeat this for a third, fourth, fifth procedure type. Each import adds to the surgeon's procedure portfolio without overwriting previous imports.

---

### 1C. Third Procedure CSV Import (and beyond)

Repeat Step 1B as many times as needed. Each CSV:
- Adds new CPT codes to existing surgeons (matched by NPI)
- Creates new surgeon records for NPIs not yet in the system
- Sets the price per procedure type independently

---

### 1D. Hierarchy Setup

**Where:** Settings > Manage Hierarchy

Now that the data is imported, the admin can see which states, cities, and sites of care have volume. Use that to decide on regions and team structure.

1. **Create Regions** -- based on what the data shows (e.g. "Texas", "West Coast", "High Volume Ortho")
2. **Assign VPs** -- pick a user, set them as VP, assign to one or more regions
3. **Assign Managers** -- each manager reports to a VP
4. **Assign Reps** -- each rep reports to a manager

This creates the reporting chain: Admin > VP > Manager > Rep. Each level only sees the data below them (except everyone can browse all surgeon dossiers).

Some clients may not have their salesforce built yet -- that's fine. Import the data first, browse it, then come back and build the hierarchy when you're ready.

---

### 1E. Region Account Assignment

**Where:** Settings > Assign Accounts to Regions

Now the admin has a full database of surgeons with multi-procedure data. Time to assign them to regions.

1. **Select a Region** (pill selector at top)
2. **Filter** to narrow down accounts:
   - **Specialty** -- e.g. Orthopedic Surgery
   - **State** -- e.g. TX, CA, NY
   - **City** -- e.g. Houston, Dallas
   - **Site of Care** -- e.g. "Memorial Hermann Hospital"
3. **Sort** to prioritize assignment:
   - **Name** -- alphabetical (default)
   - **Volume** -- highest total annual volume across all procedures first
   - **Market Potential** -- highest dollar opportunity first

**Why Market Potential matters:**

Each account row now shows:
- `45 cases/yr` -- total volume across all procedures
- `$1,319,500` -- total market potential (sum of volume x price for each procedure)

This is the core value prop. Consider two surgeons:
- Dr. A: 10 procedures/yr at $20,000 each = **$200,000** market potential
- Dr. B: 100 procedures/yr at $1,000 each = **$100,000** market potential

Volume alone says Dr. B is more important. Market Potential shows Dr. A is actually the bigger opportunity. The admin can sort by Market Potential to assign the highest-value accounts to the strongest reps.

4. **Select accounts** (checkbox per row, or Select All)
5. **Assign** -- assigns selected accounts to the chosen region

---

### 1F. Verify in Surgeon Dossier

**Where:** Surgeon Dossier (any user can browse)

Open any surgeon to see the Procedure Data card:
- Each CPT code gets its own sub-card showing:
  - CPT Code + Description
  - Annual Volume
  - Site of Care
  - Price (if set)
  - Market Opportunity (volume x price)
- **Total Market Opportunity** sums across all procedures at the bottom

---

## Part 2: VP Walkthrough

The VP logs in and sees their dashboard. Their job: delegate accounts from their region(s) down to managers, and keep an eye on team activity.

### 2A. Dashboard Overview

**Where:** Field Intel > Dashboard (auto-routes to VP view)

The VP sees:
- **Metrics bar** -- Managers count, total accounts in region, unassigned accounts, calls this week
- **Manager cards** -- each card shows name, label (if set), account count, last activity date, staleness indicators
- **Unassigned pool** -- accounts in the region not yet delegated to any manager
- **Region activity feed** -- recent calls across the whole team

---

### 2B. Labeling Managers

**Where:** Field Intel > Delegate

The VP can label each manager with a private note that only the VP sees. The manager never sees this label.

1. Tap the **pencil icon** next to any manager's name
2. Enter a label -- e.g. "NorCal", "SoCal", "Orange County", "Top Volume", "Low Volume"
3. Hit **Save**

The label appears as a subtitle under the manager's name in the delegation list. This helps the VP remember their mental model -- which manager covers what territory or segment -- without the manager feeling boxed in.

---

### 2C. Delegating Accounts to Managers

**Where:** Field Intel > Delegate

1. **Select a manager** from the person list
2. Toggle between **Assigned** (accounts already given to this manager) and **Available** (accounts not yet delegated to anyone)
3. **Sort** the available accounts:
   - **Name** -- alphabetical
   - **Volume** -- highest total annual cases first
   - **Market Potential** -- highest dollar opportunity first
4. **Filter** to narrow down:
   - **Specialty** -- e.g. Orthopedic Surgery
   - **State** -- e.g. CA, TX
   - **City** -- e.g. San Diego, Austin

Each account row shows:
- Surgeon name, specialty, location, NPI
- Total volume badge (e.g. "150 cases/yr")
- Market potential badge (e.g. "$2,775,000")

5. **Select accounts** and tap **Assign**

**Strategy example:** The VP might:
- Label Manager A as "High Value" and assign the top 50 accounts sorted by Market Potential
- Label Manager B as "Volume Play" and assign the next 200 accounts sorted by Volume
- Label Manager C as "NorCal" and filter by City to assign all San Francisco + Sacramento accounts

---

### 2D. Reassigning / Unassigning

From the **Assigned** tab on any manager:
1. Select accounts
2. Tap **Unassign** to move them back to the available pool
3. Switch to another manager and assign from there

This lets the VP rebalance territories without going through admin.

---

## Part 3: Manager Walkthrough

The manager logs in and sees their team overview. Their job: delegate accounts down to reps and monitor rep activity.

### 3A. Dashboard Overview

**Where:** Field Intel > Dashboard (auto-routes to Manager view)

The manager sees:
- **Metrics bar** -- Reps count, total accounts (delegated to the manager by the VP), unassigned accounts, team calls this week
- **Rep cards** -- each card shows rep name, account count, last activity, staleness warnings
- **Unassigned pool** -- accounts the VP gave to this manager that haven't been delegated to a rep yet
- **Team activity feed** -- recent calls across all reps

The manager does NOT see any private labels the VP set on them.

---

### 3B. Delegating Accounts to Reps

**Where:** Field Intel > Delegate

Same flow as the VP, but one level down:

1. **Select a rep** from the person list
2. Toggle between **Assigned** and **Available**
3. **Sort** by Name, Volume, or Market Potential
4. **Filter** by Specialty, State, or City
5. Each row shows volume badge + market potential badge
6. Select accounts and **Assign**

The manager can also **label reps** with private notes (pencil icon) -- e.g. "New Hire", "Knee Specialist", "Dallas Territory". The rep never sees this label.

**Strategy example:** The manager might:
- Filter by City = "Houston" and assign all Houston-area accounts to the rep who lives there
- Sort by Market Potential and give the highest-value accounts to the most experienced rep
- Label the new hire as "Training" and give them lower-volume accounts first

---

### 3C. Monitoring Rep Activity

From the dashboard, the manager can see:
- Which reps have logged calls recently (last activity date)
- **Staleness indicators** -- yellow (7+ days) or red (14+ days) since last call
- Click any rep card to drill down into their accounts and call history

---

## Part 4: Rep Walkthrough

The rep logs in and sees "My Territory." Their job is simple: browse surgeons, log calls, and submit leads.

### 4A. Dashboard -- My Territory

**Where:** Field Intel > Dashboard (auto-routes to Rep view)

The rep sees:
- **Metrics** -- total accounts assigned to them, calls logged this week, upcoming close dates
- **Quick actions** -- "Log Call" and "Lead" buttons right at the top
- **Upcoming Close Dates** -- surgeons with forecast close dates within 30 days
- **Recent Calls** -- the rep's last 5 call logs
- **Needs Attention** -- accounts with no call logged in 14+ days (staleness warning)

---

### 4B. Browsing Surgeon Dossiers

**Where:** Field Intel > Surgeon Dossier

The rep can browse ALL surgeons in the system (not just their assigned ones). This lets them research accounts even before they're officially assigned.

Each dossier shows:
- **Contact Info** -- phone, email, fax, address
- **Practice Info** -- hospital, site of care, city/state
- **Procedure Data** -- all CPT codes with volumes, prices, market opportunity, and total market opportunity across procedures
- **Market Intel** -- buying stage, contract status, competitor products, forecast close date
- **AI Profile Summary** -- auto-generated physician profile
- **Call History** -- all logged calls for this surgeon (across all reps)
- **Custom Fields** -- any fields the admin defined

---

### 4C. Logging a Call

**Where:** Field Intel > Log Call (or "Log Call" button from any dossier)

1. **Select a surgeon** -- search dropdown pre-filtered to assigned accounts (or pre-selected if coming from a dossier)
2. **Call date** -- defaults to today
3. **Summary** -- free text, what happened on the call (required)
4. **Field Updates (optional):**
   - Buying Stage -- Prospect / Qualified / Evaluation / Negotiation / Closed Won / Closed Lost
   - Contract Status -- Active / Pending / Expired / None
   - Forecast Close Date
   - Competitor Products
5. **Custom Fields** -- any admin-defined fields (dropdowns, dates, currency, text)
6. Hit **Log Call**

The call log saves to `call_logs` and simultaneously updates the surgeon record with any field changes (buying stage, contract status, etc.). This is how pipeline data stays current -- reps update it during natural call logging, not through a separate CRM workflow.

---

### 4D. Submitting a Lead

**Where:** Field Intel > Submit Lead

If a rep discovers a new surgeon who isn't in the database:

1. Enter **First Name** and **Last Name** (required)
2. Optionally add City, State, Specialty, Notes
3. Hit **Submit Lead**

The lead goes into a pending queue. An admin reviews and either approves (adds to surgeon database) or rejects it. The rep gets a success confirmation and can submit another immediately.

---

### 4E. The Rep's Daily Workflow

A typical day for a rep:

1. Open the app, check **My Territory** dashboard
2. See the **Needs Attention** section -- these are accounts going stale
3. Tap a stale account to open the dossier
4. Review the AI profile and call history before making the call
5. Make the call
6. Tap **Log Call** from the dossier -- surgeon is pre-selected
7. Write a summary, update buying stage if it changed
8. Repeat for next account
9. If they meet a new surgeon in the field, tap **Submit Lead**

The whole point: two or three buttons, minimal friction, pipeline data stays current without the rep thinking about CRM.
