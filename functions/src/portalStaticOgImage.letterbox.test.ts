import assert from "node:assert/strict";
import test from "node:test";

import { PORTAL_OG_LETTERBOX_BG_HEX } from "../../packages/shared/src/constants/portal/portalSocialMetaSettings.constants";
import { buildStaticOgLetterboxShareImageUrl } from "./portalStaticOgImage";

const PROJECT = "fresh-prints-dev";
const STATIC_PATH = "portal-social-meta/static-og/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.png";

test("Static Design letterbox URL uses getPortalOgShareImage designId (not raw artwork)", () => {
  const url = buildStaticOgLetterboxShareImageUrl({
    projectId: PROJECT,
    snapshot: {
      kind: "design",
      storagePath: "designs/abc/preview.png",
      downloadUrl: "https://example.com/raw-design-preview.png",
      sourceDesignId: "designPortrait1",
    },
    designBackgroundHex: "#112233",
  });
  assert.ok(url);
  assert.match(url!, /getPortalOgShareImage\?/);
  assert.match(url!, /designId=designPortrait1/);
  assert.match(url!, /fit=contain/);
  assert.match(url!, /bg=112233/);
  assert.doesNotMatch(url!, /raw-design-preview/);
  assert.doesNotMatch(url!, /designs%2Fabc/);
});

test("Static Design fails closed without sourceDesignId", () => {
  assert.equal(
    buildStaticOgLetterboxShareImageUrl({
      projectId: PROJECT,
      snapshot: {
        kind: "design",
        storagePath: "designs/abc/preview.png",
        downloadUrl: "https://example.com/raw.png",
        sourceDesignId: null,
      },
    }),
    null,
  );
});

test("Static Upload letterbox URL uses validated staticPath (not raw downloadUrl)", () => {
  const url = buildStaticOgLetterboxShareImageUrl({
    projectId: PROJECT,
    snapshot: {
      kind: "upload",
      storagePath: STATIC_PATH,
      downloadUrl: "https://firebasestorage.googleapis.com/v0/b/x/o/raw?alt=media&token=abc",
      sourceDesignId: null,
    },
  });
  assert.ok(url);
  assert.match(url!, /getPortalOgShareImage\?/);
  assert.match(url!, /staticPath=portal-social-meta%2Fstatic-og%2Faaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee\.png/);
  assert.match(url!, /fit=contain/);
  assert.match(url!, new RegExp(`bg=${PORTAL_OG_LETTERBOX_BG_HEX}`));
  assert.doesNotMatch(url!, /token=abc/);
  assert.doesNotMatch(url!, /firebasestorage/);
});

test("Static Upload rejects non static-og paths", () => {
  assert.equal(
    buildStaticOgLetterboxShareImageUrl({
      projectId: PROJECT,
      snapshot: {
        kind: "upload",
        storagePath: "designs/evil/preview.png",
        downloadUrl: "https://example.com/evil.png",
        sourceDesignId: null,
      },
    }),
    null,
  );
  assert.equal(
    buildStaticOgLetterboxShareImageUrl({
      projectId: PROJECT,
      snapshot: {
        kind: "upload",
        storagePath: "portal-social-meta/../secrets.png",
        downloadUrl: null,
        sourceDesignId: null,
      },
    }),
    null,
  );
});

test("missing project id fails closed", () => {
  assert.equal(
    buildStaticOgLetterboxShareImageUrl({
      projectId: "  ",
      snapshot: {
        kind: "upload",
        storagePath: STATIC_PATH,
        downloadUrl: null,
        sourceDesignId: null,
      },
    }),
    null,
  );
});
