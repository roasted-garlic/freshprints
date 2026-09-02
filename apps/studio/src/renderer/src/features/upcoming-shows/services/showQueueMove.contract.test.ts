import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function read(relativeFromFeature: string): string {
  return readFileSync(join(here, relativeFromFeature), "utf8");
}

describe("showQueueMove studio wiring", () => {
  it("Show Queue menu includes Move All Requests", () => {
    const page = read("../pages/UpcomingShowsPage.tsx");
    assert.match(page, /Move All Requests/);
    assert.match(page, /MoveShowQueueAllRequestsModal/);
    assert.match(page, /isShowQueueMoveSourceEligible/);
  });

  it("transfer modal uses move-specific destination filter and preview", () => {
    const modal = read(
      "../../print-requests/components/TransferPrintRequestToShowModal.tsx",
    );
    assert.match(modal, /isShowQueueMoveDestination/);
    assert.match(modal, /showQueueMoveService\.preview/);
    assert.match(modal, /already on destination/);
    assert.match(modal, /Select a destination show/);
    assert.match(modal, /searchable/);
  });

  it("service move path calls trusted callables", () => {
    const service = read("./upcomingShowService.ts");
    assert.match(service, /showQueueMoveService\.preview/);
    assert.match(service, /showQueueMoveService\.apply/);
    assert.match(service, /scope:\s*"print_request"/);
  });
});
