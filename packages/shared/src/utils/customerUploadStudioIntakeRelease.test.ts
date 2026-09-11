import assert from "node:assert/strict";
import test from "node:test";

import { isCustomerUploadReleasedToStudioIntake } from "./customerUploadStudioIntakeRelease";

test("studio intake release hides only explicit hold-until-show rows", () => {
  assert.equal(isCustomerUploadReleasedToStudioIntake({}), true);
  assert.equal(isCustomerUploadReleasedToStudioIntake({ studioIntakeHoldUntilShow: true }), false);
  assert.equal(
    isCustomerUploadReleasedToStudioIntake({
      studioIntakeHoldUntilShow: true,
      studioIntakeReleasedAt: "NOW",
    }),
    false,
  );
  assert.equal(
    isCustomerUploadReleasedToStudioIntake({ studioIntakeReleasedAt: "NOW" }),
    true,
  );
});
