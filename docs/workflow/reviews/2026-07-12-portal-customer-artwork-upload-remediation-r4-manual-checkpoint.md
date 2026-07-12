# Manual Test Checkpoint — Remediation r4 (upload stages)

**Feature / area:** Portal customer artwork upload progress labels  
**Why automated tests are insufficient:** Live Firestore stage timing during Sharp finalize  
**Environment:** local Portal + **fresh-prints-dev** (functions deployed)  
**Prerequisites:** Soft-refresh Portal after pull so client code loads

### Steps

1. Start a print request → **Start & upload designs** (or open Upload artwork on a working request).  
2. Upload a transparent PNG.  
   **Expected:** After upload %, status advances through labels such as **Reading upload…**, **Checking file format…**, **Checking transparency…**, **Preparing artwork…**, **Checking DPI…**, **Creating previews…**, **Saving…**, then **Ready** — not stuck solely on **Processing…**.  
3. (Optional) Upload an opaque image → **Expected:** fails with transparency message; last stage may show Checking transparency… then Failed.

### Pass criteria

- [ ] At least three distinct processing labels appear before Ready (not only Processing…)
- [ ] Transparency and DPI-related labels are visible when those steps run
- [ ] Ready / Failed still end correctly

### Please reply with

- `PASS`
- `FAIL: [description]`
- `PASS WITH NOTES: [notes]`
