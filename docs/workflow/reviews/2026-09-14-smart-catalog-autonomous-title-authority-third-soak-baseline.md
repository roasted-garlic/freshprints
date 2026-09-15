# Next DEV Processing soak — read-only baseline

Captured: 2026-09-14T23:07:19.304Z  
Project: fresh-prints-dev  
Query: designs where aiReviewStatus == pending  
Mutation: none

## Cohort

- Pending Processing designs: 110
- Lifecycle status: imported 110/110
- Active AI stages: 0/110; any aiProcessingStage value: 0/110
- Smart Profile present: 110/110
- Description populated: 24/110; missing or blank: 86/110
- catalogTitleSource present: 0/110 (legacy provenance remains absent)
- Smart Profile automationDecision provenance: needs_review 57, auto_approved 20, shadow 33
- The six failed second-soak Ready rows are no longer pending and were not touched.

The full per-row read-only projection captured for this baseline includes design ID, current/root
title, description state, root and Smart Profile category state, aiProcessingStage, lifecycle status,
Smart Profile presence and provenance (including provider/model/prompt/normalizer/automation
decision), catalogTitleSource, importSourceFileName, and the currently stored AI candidate title.
Canonical sorted root/provenance projection SHA-256:
0fee5633f838fa5eefdd244d70fe612dcb6f137513a94e7733f506075090d969.

Representative legacy rows in the cohort:

| Design | Current title | Description | Category | Stage | Smart Profile |
|---|---|---|---|---|---|
| 1scpUhx0KriTBC1IfFIW | PNG 4 | populated | tj0HemRh2RuYLfI7N6nO | none | present; catalog-enrich-v39; auto_approved |
| hUehR7cqoy6ZG60ccyEM | PNG 6 | populated | tj0HemRh2RuYLfI7N6nO | none | present; catalog-enrich-v39; auto_approved |
| VFYeWkq8UxWcND5W1ecz | ProjectWhite | populated | 3KUsuaV9qIh88kIPF38T | none | present; catalog-enrich-v39; auto_approved |
| Dlxn6VyUpv0p6nzVmLLe | M4170303i1mimi | populated | PjYcGaa61ai2EIB2O8LK | none | present; catalog-enrich-v39; auto_approved |

Exact cohort IDs (stable lexicographic order):

1eOWMVHDvRKY0kwYWQet,1scpUhx0KriTBC1IfFIW,2g9IrxIiuOGrUbZio4Qn,2iLdJzuKCON3U2VJ6w0o,4rG1uHbmqBtOevnDFon6,7bVlWMFwxECdfHH8VNPB,8QpQFWwwfM21WEimy6Vm,94kDhvF64o9aONGxdmqk,96v0PKuDVdDqYa8fLxS3,9EGDdQJbi2q15UBqE5Sf,9rvaCJhGOdgB1Vy9udDt,A1PqnDy5dGxVUa7s7Yst,Ai4Wmfp4Vd6Ady2WCsKC,ANCENVqyinnhM5kWBxpC,aq3dqiOYyeMNltrcHCO3,AuFHznaSTUx32SXjccYC,Bnp3NgFYPXxVQmBz392X,bTRIKv6htUWyZmqg0Qph,bw92yPxUdZlLfcqEr8Mg,bwREudV4NVXzOHs570Cu,CHZQtAS2l2VMLdaZg4oY,cJsjK1JDQrkNN3iU9QT4,coiXzQDhJBKBVB1dFVZT,CrbW6Uup4UzMdnqRVGzO,Dlxn6VyUpv0p6nzVmLLe,Dr8lcyPE8imTQlNESP8X,E2fVUzTL8Smx0gXaGqUZ,egGKcxPCtch0Fmc44qa9,EL2iPv6wysvW5CnrLf3b,F3lop71TCy9yEAVktY8s,FCBFeiG0Wv4eE9pU6eEu,Fd1t1m1X68JYkOUAO9dm,fgbQUOULNFETn8TALtCT,fiqqUCE2i7z5bevyQwzX,Fjc9uzHMl1XBuafZdA9m,FlnlemEQOf1kJg3Ajs1d,FU1SzEPmTM66fnkzKQ4y,GEur7i3QEJoeMLSRky81,GIgIAznocv8JJi3gtVCS,gmdhY4PDPtH30gKYdm3l,GqPDk7NkYdq9jXBke3VS,gSOi9SX0F0SQmGeFmaQn,h8oE0wSSMofqEYOcYk4D,HA65KLT37xDoq7CorDp4,HbIk4eFwSvy1oYXKRorm,hrdKD6MJ48fi8UHsWhL4,hTzv9NyK34ySVUmvMgHt,hUehR7cqoy6ZG60ccyEM,I4p1ofbZVGpxobhtLKNj,iHzBp8PvZsidDsSDCLZv,jnw12AWGtI7bCkM7y9KI,jXw9kUVE6hgMGDizr8D4,k08yLY2eqAY2vXzqQ9jc,K3cHwOYNMWJDmCjTfXwh,K599a91kUb2kbfnv9bMI,K77iInwgyYedyQBYi3M7,KUxTQzYAgCbD8MGUrO5L,lbbMZuHQFILqZZmsUWit,lhzY65AzxTiEWppBzTQA,LSYQkCI1bFLODzYArrNR,lvTN328EOc9JWazOAs7I,LYJcsxnfUyacRWtntEkd,m6lO6xxKPdoNDyzrz8qE,mI2AXo8Rb8rRZZNpuszR,mN90KyEM2rEOmOXeIbaL,MOqnUytUSBw5VMTzsH8J,MppRFlTpl66xHHiFrHdv,mw5eiufjMAuOZPnOiMiP,N6neMQX9LukEHYfgALsM,N7jNuFyv5UpK8WDEl69t,NilC9nqaBALTPgDM1j4q,NlpYlSw9nkdWPDcZXzt0,nPcr8RNYS3aKPXP9lqGi,nrpkjSL1CO013HVAA1U2,O81RATFgTItoug69fHA6,ODQcVwjA3Z9C771C1Kiv,ptvtC4DNSoIer5JEcQJx,q6vjrfUkoeQSuBm1Vga1,QdTEYMNj0GmEk80lPmGq,qgtpNUxGp2k1o87JAZaS,QnTG68sf8ttiQYya9SMO,QP29pPjgb9sTOQ098bO0,QZv6trWn1a9tVSKoA5wk,R4r5hWxAndvWdMcAs1GB,RM2efpWulaku0MYyNJPt,RuK2lZl6K5ewV0dTe1xI,S8mOchiVIV8G7KQkiFu7,S9ZeylZt0z0AyA0WFAoX,S9zyuFuWUcDBUvRCQrOv,SIHBRJRZUgtk2R4an8rG,SrDNWipuL0kBj3EuXY2c,SToRmjOZTLwj5upzjijC,TEy2gddZkpKCYbKrLTOe,TSotvFhLSVRx2k2bQ9Ze,VFYeWkq8UxWcND5W1ecz,VizRF487qN7U7jVwIr81,vLdYj2pnZEUdUgH1TKKB,Vlsg0P2CbuhTlhVmgYU8,VwOy984ecYHxDWopfPfk,Wt5eILv4uyCnYNoJI8uZ,WvRODwDMZWjvgJSljojV,X6sWDHZj9I6ovQhGIbM8,XCa4M3wmAS1O2jb57Gdj,xGgooPj8OwbNl8oqLwEU,xiE3wLJxHg4Og96i1p2Z,XuYbrvW1lJjRJQum4dwv,YFcNaJQUXkYy20cTuEif,YvdvHP5RQyYV20zi5NYt,ZTeE1NpLYGghu7brYBpS,ztufMLhDcMGE0w5kFBoi

An independent read-only repeat at 2026-09-14T23:07:55.457Z returned the same 110 IDs and
counts, with settings still shadow/live=false and Pass 2=false.

This immutable cohort boundary is the basis for the owner-started sequential Processing soak.
No row was queued, edited, reprocessed, or otherwise mutated by this baseline capture.
