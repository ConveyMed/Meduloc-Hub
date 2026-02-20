# Questions for Mike

## Custom Fields at Scale

If there are 10K surgeon records in the database and an admin adds a custom column (e.g. "Market Price"), how does that get populated?

- Are reps expected to fill in all 10K values individually?
- Will different surgeons have different values for the same field?
- Should there be a bulk import/CSV upload option for populating custom field values across many records at once?
- Or is the expectation that these fields only get filled in opportunistically (e.g. rep fills it in during a call log or dossier visit)?

**ANSWERED (Feb 13 call):** They do NOT fill in 10K values individually. Data is pulled from Acuity by specific surgery type (one CPT code per export). All 10K rows in a single export share one average selling price (e.g. $4,000 entered once). The app calculates market opportunity automatically (price x volume). Multiple surgery types = multiple CSV uploads, each with their own single price. Pricing is set by marketing/sales managers, not reps. "Current company" (competitor info) is left unknown initially and reps fill it in from field knowledge.

---

## Surgeon Search Access

Who should have access to searching/browsing the full surgeon database?

- Everyone (reps, managers, VPs, admins)?
- Only admins and VPs?
- Should reps only see surgeons delegated to them, or can they search the full database?
- If reps can search all surgeons, can they view the dossier for ones not assigned to them (read-only)?

**ANSWERED (Feb 13 call):** Everyone can access. Reps, managers, admins, VPs -- anyone can click a doctor and view their full dossier.

---

## AI-Generated Surgeon Profiles

What should the AI prompt produce for each surgeon's profile card?

- What data gets sent to the AI? (call logs, custom field values, notes, specialty, procedures, etc.)
- What should the AI output look like? A summary paragraph? Bullet points? Talking points for the next call?
- Should it generate a "personality/communication style" profile (e.g. "prefers data-driven conversations, responds well to case studies")?
- Should it suggest next steps or recommended actions?
- How often should it refresh? On every dossier visit, or cached until new call logs are added?
- What tone - clinical/professional, or conversational/sales-oriented?

**PARTIALLY ANSWERED (Feb 13 call):** AI researches the individual doctor externally (training, education, publications, etc.). Mike is sending over his GPT prompt history/documents so we can see exactly what he used. Waiting on those docs.
