# Gate I Owner Lookup — 25-design sample

| Field | Value |
|-------|--------|
| Date | 2026-08-26 |
| Job | `zFzAwEIwCXFWC8dce0f4` |
| Purpose | Human-readable image lookup for Gate I manual review |
| Source | Gate I checklist + `_gate-i-owner-sample-checklist-data.json` only |

## Needs Review ID search — SUPPORTED

Paste the full Firestore design ID into **AI Review → Needs Review → search**.

Repo evidence:

- UI: `apps/studio/src/renderer/src/features/ai-review/pages/AiReviewPage.tsx` — placeholder `"Search title, tags, id…"`
- Filter path: `filterNeedsReviewDesignsBySearch` → `filterDesignsBySearch` → `designMatchesSearchQuery` includes `id: design.id`
- Match: `packages/shared/src/utils/catalogDesignTextSearch.ts` — `fields.id?.toLowerCase().includes(normalizedQuery)`
- Hydration: `useAiReviewInbox` sets `loadAll: true` with `maxLoadAll: 500` while Needs Review search is active

This is **hydrated client-side ID match**, not Design Library’s direct `getDesignsByIds` path (`designLibraryExactIdSearch.ts`). With the current **204** Needs Review designs (under the 500 cap), pasting a full ID should return that card without hunting the list.

### Owner steps

1. Open **AI Review**
2. Select **Needs Review**
3. Paste the full design ID (example: `0EHBrGD4wXNLnNNKij4N`)
4. Wait briefly if status shows searching/hydration
5. Open the returned card
6. Do **not** approve, reject, or re-run AI

---

## Lookup table (all 25)

Visual descriptions are grounded only in Gate I title/description/visibleText/subjects metadata. No invented imagery.

### Would-auto-approve (12)

#### 1. `0EHBrGD4wXNLnNNKij4N`
- **Title:** 2601895693 Spread The Hope Find The Cure Fight Cancer In All Colors Shirt, Colorful Ribbon Dandelion Cancer Awareness Shirt, Can
- **Stratum:** would-auto-approve
- **Thumbnail:** `/thumbnails/0EHBrGD4wXNLnNNKij4N.webp`
- **Looks like:** Text “Spread the Hope / find the Cure / Fight Cancer In All Colors”; dandelion-like forms made of colorful awareness ribbons with bees and hearts

#### 2. `1Ws0T9fivryest6IUSbt`
- **Title:** just_hit_it
- **Stratum:** would-auto-approve
- **Thumbnail:** `/thumbnails/1Ws0T9fivryest6IUSbt.webp`
- **Looks like:** Nike swoosh filled with green cannabis leaves; bold text “JUST HIT IT”

#### 3. `20fv9qb9gRLSB66nS3xp`
- **Title:** JesusSavesISpendDistressed
- **Stratum:** would-auto-approve
- **Thumbnail:** `/thumbnails/20fv9qb9gRLSB66nS3xp.webp`
- **Looks like:** Distressed blue serif text: “jesus saves.” over “I spend.”

#### 4. `2Nj95YLaLk6763oTrRZw`
- **Title:** dfdsfdsf
- **Stratum:** would-auto-approve
- **Thumbnail:** `/thumbnails/2Nj95YLaLk6763oTrRZw.webp`
- **Looks like:** Decorative “GIGI” letters with floral/stripe fill, pearls, and Disney characters (Mickey, Minnie, Daisy, Donald, Goofy)

#### 5. `2g9IrxIiuOGrUbZio4Qn`
- **Title:** 2 (12)
- **Stratum:** would-auto-approve
- **Thumbnail:** `/thumbnails/2g9IrxIiuOGrUbZio4Qn.webp`
- **Looks like:** Pink flamingo among tropical leaves/flowers (hibiscus, birds of paradise) on blue stripes with bubbles

#### 6. `2iLdJzuKCON3U2VJ6w0o`
- **Title:** friend3
- **Stratum:** would-auto-approve
- **Thumbnail:** `/thumbnails/2iLdJzuKCON3U2VJ6w0o.webp`
- **Looks like:** Cartoon duck with hat, sunglasses, tropical shirt on a yellow inflatable ring holding a green cocktail

#### 7. `3QNubh7l7WahljYYfgYe`
- **Title:** hotter-than-a-hoochie-coochie-png
- **Stratum:** would-auto-approve
- **Thumbnail:** `/thumbnails/3QNubh7l7WahljYYfgYe.webp`
- **Looks like:** Yellow/pink text “HOTTER THAN A HOOCHIE COOCHIE”; green alligator in pink sunglasses on an orange/pink tube in water

#### 8. `4rG1uHbmqBtOevnDFon6`
- **Title:** OR 05052025 VTN Basic Human Rights Are Not Radical Anti Trump
- **Stratum:** would-auto-approve
- **Thumbnail:** `/thumbnails/4rG1uHbmqBtOevnDFon6.webp`
- **Looks like:** Circular text “BASIC HUMAN RIGHTS ARE NOT 'RADICAL'” around stylized pink/orange flowers and coral foliage

#### 9. `51Oz02NfLY8vTruauW56`
- **Title:** K8qTSKz59kk14WmuNs3F
- **Stratum:** would-auto-approve
- **Thumbnail:** `/thumbnails/51Oz02NfLY8vTruauW56.webp`
- **Looks like:** Black-and-white sketch of Frankenstein’s monster blowing on a dandelion, seeds scattering

#### 10. `5Jype5Zc1b13XXSci5Kn`
- **Title:** 327 Miniature Schnauzer
- **Stratum:** would-auto-approve
- **Thumbnail:** `/thumbnails/5Jype5Zc1b13XXSci5Kn.webp`
- **Looks like:** Schnauzer dog in a pink/yellow/orange flower bouquet with a small pink flower on its head

#### 11. `5NVU91SMRiecLkZqdrN8`
- **Title:** (8)
- **Stratum:** would-auto-approve
- **Thumbnail:** `/thumbnails/5NVU91SMRiecLkZqdrN8.webp`
- **Looks like:** Open book unfolding into a fantasy landscape with mushrooms, flowers, and a castle in ethereal light

#### 12. `6zKWIvQyvwH5M19bCeYW`
- **Title:** That sounds (2)
- **Stratum:** would-auto-approve
- **Thumbnail:** `/thumbnails/6zKWIvQyvwH5M19bCeYW.webp`
- **Looks like:** Skeleton with sunglasses/bandana holding a drink; text “THAT SOUNDS LIKE MY HUSBAND'S PROBLEM”; roses, lightning, stars, checkered pattern

### Verifier-unresolved / hard-block (10)

#### 13. `03cbj1cIFH7Bavt38XBX`
- **Title:** (4)
- **Stratum:** verifier-unresolved / hard-block
- **Thumbnail:** `/thumbnails/03cbj1cIFH7Bavt38XBX.webp`
- **Looks like:** Watercolor figure of a man in black hat and suit mid-dance pose with red/blue paint splashes (Michael Jackson–inspired per description)

#### 14. `1eOWMVHDvRKY0kwYWQet`
- **Title:** FD_M_CT58_PNG
- **Stratum:** verifier-unresolved / hard-block
- **Thumbnail:** `/thumbnails/1eOWMVHDvRKY0kwYWQet.webp`
- **Looks like:** Vertical “FATHER” filled with Star Wars characters/scenes; “HERO” and trait words (HARDWORKING, FUNNY, WISE, etc.) beside it

#### 15. `1scpUhx0KriTBC1IfFIW`
- **Title:** PNG 4
- **Stratum:** verifier-unresolved / hard-block
- **Thumbnail:** `/thumbnails/1scpUhx0KriTBC1IfFIW.webp`
- **Looks like:** Skeleton bathing with a toaster in the tub; text “LIVE, LAUGH” and “TOASTER BATH” with colorful stars

#### 16. `2sgtK8BS0Cj8vlyPBmhm`
- **Title:** Healthcare Hero Peace Love Scrubs Healthcare Worker Groovy T-Shirt
- **Stratum:** verifier-unresolved / hard-block
- **Thumbnail:** `/thumbnails/2sgtK8BS0Cj8vlyPBmhm.webp`
- **Looks like:** Groovy orange/cream “PEACE LOVE SCRUBS” lettering with “HEALTHCARE HERO”; peace sign, daisies, hearts, stethoscope accents

#### 17. `6fBRl87jaXyYYGlhapS9`
- **Title:** 1 (52)
- **Stratum:** verifier-unresolved / hard-block
- **Thumbnail:** `/thumbnails/6fBRl87jaXyYYGlhapS9.webp`
- **Looks like:** Yellow “LOONEY TUNES” over a collage of Bugs Bunny, Sylvester, Taz, Pepé Le Pew, Tweety, and Daffy Duck

#### 18. `7BjqFQIhkavo80sv5kCp`
- **Title:** 4-01
- **Stratum:** verifier-unresolved / hard-block
- **Thumbnail:** `/thumbnails/7BjqFQIhkavo80sv5kCp.webp`
- **Looks like:** Decorative “Aries” lettering with trait words (Lively, Versatile, Passionate, etc.) and a ram silhouette

#### 19. `7bVlWMFwxECdfHH8VNPB`
- **Title:** F Caw F-03
- **Stratum:** verifier-unresolved / hard-block
- **Thumbnail:** `/thumbnails/7bVlWMFwxECdfHH8VNPB.webp`
- **Looks like:** Text “F-CAW-F” above a black raven with wings spread, mouth open, distressed graphic style

#### 20. `8m0KgJEel8kLpYlmZpFb`
- **Title:** KJ3IAtTpYNodxY3MGu6f
- **Stratum:** verifier-unresolved / hard-block
- **Thumbnail:** `/thumbnails/8m0KgJEel8kLpYlmZpFb.webp`
- **Looks like:** Black-and-white illustration of a smiling girl with braids and two cartoonish animal companions

#### 21. `96v0PKuDVdDqYa8fLxS3`
- **Title:** MuAFmSRyQOyX76gH1tdn
- **Stratum:** verifier-unresolved / hard-block
- **Thumbnail:** `/thumbnails/96v0PKuDVdDqYa8fLxS3.webp`
- **Looks like:** Black goose in grass inside a laurel wreath; text “PORCH GOOSE EST. 1983 SOCIAL CLUB GOTTA GO DRESS MY GOOSE”

#### 22. `9bR7JWSWwv94Ofb7byC3`
- **Title:** (33)
- **Stratum:** verifier-unresolved / hard-block
- **Thumbnail:** `/thumbnails/9bR7JWSWwv94Ofb7byC3.webp`
- **Looks like:** Sequined/rhinestone glove holding a crystal microphone; script signature “Michael Jackson”

### Category-gap (1)

#### 23. `mw5eiufjMAuOZPnOiMiP`
- **Title:** dRTOFbh1IE7TrNvL7wSN
- **Stratum:** category-gap
- **Thumbnail:** `/thumbnails/mw5eiufjMAuOZPnOiMiP.webp`
- **Looks like:** Distressed script “Jimothy”; raccoon walking in a forest with cityscape including Space Needle; visible text “SEATTLE, WASHINGTON”

### Diversity (2)

#### 24. `RM2efpWulaku0MYyNJPt`
- **Title:** freddy
- **Stratum:** diversity
- **Thumbnail:** `/thumbnails/RM2efpWulaku0MYyNJPt.webp`
- **Looks like:** Illustrated man in hat, sunglasses, Hawaiian shirt on a yellow duck pool float holding a martini

#### 25. `LSYQkCI1bFLODzYArrNR`
- **Title:** monkeypeace
- **Stratum:** diversity
- **Thumbnail:** `/thumbnails/LSYQkCI1bFLODzYArrNR.webp`
- **Looks like:** Chimpanzee with flower crown, sunglasses, and bandana smoking a joint on a colorful tie-dye peace sign with vines/flowers

---

## Quick paste list

```
0EHBrGD4wXNLnNNKij4N
1Ws0T9fivryest6IUSbt
20fv9qb9gRLSB66nS3xp
2Nj95YLaLk6763oTrRZw
2g9IrxIiuOGrUbZio4Qn
2iLdJzuKCON3U2VJ6w0o
3QNubh7l7WahljYYfgYe
4rG1uHbmqBtOevnDFon6
51Oz02NfLY8vTruauW56
5Jype5Zc1b13XXSci5Kn
5NVU91SMRiecLkZqdrN8
6zKWIvQyvwH5M19bCeYW
03cbj1cIFH7Bavt38XBX
1eOWMVHDvRKY0kwYWQet
1scpUhx0KriTBC1IfFIW
2sgtK8BS0Cj8vlyPBmhm
6fBRl87jaXyYYGlhapS9
7BjqFQIhkavo80sv5kCp
7bVlWMFwxECdfHH8VNPB
8m0KgJEel8kLpYlmZpFb
96v0PKuDVdDqYa8fLxS3
9bR7JWSWwv94Ofb7byC3
mw5eiufjMAuOZPnOiMiP
RM2efpWulaku0MYyNJPt
LSYQkCI1bFLODzYArrNR
```

Full review questions remain in:
`docs/workflow/reviews/2026-08-25-smart-catalog-intelligence-slice-5-gate-i-owner-checklist.md`
