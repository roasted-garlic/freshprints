# Recent Completed Work

> Signed-off or largely complete work. External agents should not re-plan or duplicate this.

## 2026-07-12 — Portal customer artwork upload (parent) signed off

- Parent goal `portal-customer-artwork-upload` **approved_with_notes** on `fresh-prints-dev`
- Sub-phases A–G + remediations r2–r7 complete
- Owner **PASS** on r7 manual checkpoint (limits, confirmations, DPI floor, PNG fast-path)
- Signoffs: r7, G, parent — see `docs/workflow/reviews/2026-07-12-portal-customer-artwork-upload-parent-signoff.md`
- ADRs: FP-073 (uploads), FP-074 (library permission), FP-075 (200 DPI save floor)
- Deferred to next goal: persistent Current Request / cart-style Portal UX

## 2026-07-12 — Portal upload remediation r7 (+ mid-checkpoint)

- Limits: 100 files, 100 MB/image, 2 GB batch/ZIP, concurrency 8, daily finalize 200, create-batch 100  
- Confirmations: ownership required; library permission optional default-on (ADR-FP-074)  
- Attach sizing: ~10″ default via shared helper; Portal DPI badges  
- PNG processing fast-path: sample transparency; skip convert/re-encode when already good; GCS production copy  
- Visible stages: converting / trimming / upscaling / DPI / previews  
- Print Request save floor **≥ 200 DPI** (ADR-FP-075)  
- Portal “How print requests work” collapsed hint; Portal dev port **3100**

## 2026-07-12 — r6 UX polish

- Selection mode saves pending designs before upload navigation  
- Upload UI → near-fullscreen modal  
- Studio Customer Uploads Pending/Excluded tabs  

## 2026-07-11–12 — Customer artwork upload A–G

- Contracts, trusted finalize, Portal UI, show/export source awareness, Studio intake, AI promote path, wipe/hardening  
- Parent goal: `portal-customer-artwork-upload` (ADR-FP-073)

## 2026-07-08 — Phase 8 Portal MVP closeout

- Customer auth, catalog, print requests, progress tabs, Add to show (ADR-FP-066)  
- Signoff: `2026-07-08-phase-8-portal-closeout-signoff.md`

## 2026-07-08 — Show Queue timer + calendar picker

- Production timer; Printing tab; `@fresh-prints/show-picker`

## 2026-07-07 — Show Queue export

- Zip @ 300 DPI; multiply-by-qty; auto-nested gang sheet PNG; import upscale/trim  

## 2026-07-06 — Whatnot assisted import + Phase 6 closeout confirmation

## 2026-07-05 — Show Queue foundation

## Earlier (June 2026)

Phases 4–5 catalog cleanup + AI Review; enrichment iterations through v15 then Gemini v21; Phase 6 Print Requests foundation and sizing/naming polish.

---

## Deferred / backlog

- Gang Sheet Builder manual canvas  
- **In progress:** Persistent Current Request Portal redesign (`portal-persistent-current-request`)  
- Phase 9 Custom Requests  
- Production Portal App Hosting deploy  
- Live Whatnot scheduled sync (not planned for Studio)

See `CURRENT-STATE.md` for live blockers.
