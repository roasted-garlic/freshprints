import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const componentSource = fs.readFileSync(
  path.resolve(here, "../components/CustomerUploadIntakeSection.tsx"),
  "utf8",
);
const pageSource = fs.readFileSync(path.resolve(here, "../pages/DonatedDesignsPage.tsx"), "utf8");
const routesSource = fs.readFileSync(path.resolve(here, "../../../routes/AppRoutes.tsx"), "utf8");
const menuSource = fs.readFileSync(
  path.resolve(here, "../../../shared/components/DangerOverflowMenu.tsx"),
  "utf8",
);
const menuCss = fs.readFileSync(
  path.resolve(here, "../../../styles/components/danger-overflow-menu.css"),
  "utf8",
);
const layoutCss = fs.readFileSync(path.resolve(here, "../../../styles/layout.css"), "utf8");

test("Donated Designs route reuses the catalog-donation intake", () => {
  assert.match(routesSource, /path="\/donated-designs"/);
  assert.match(pageSource, /purposeScope="catalog_donation"/);
});

test("the only established overflow action is the existing owner-gated unused-upload delete", () => {
  assert.match(componentSource, /intake\.canDeleteEligible && !row\.promotedDesignId/);
  assert.match(componentSource, /id: "delete-upload"/);
  assert.match(componentSource, /label: pendingAction === "delete" \? "Deleting…" : "Delete unused upload…"/);
  assert.match(componentSource, /void intake\.deleteEligible\(row\.id\)/);
});

test("opening the menu is state-only and cannot invoke the deletion handler", () => {
  const trigger = menuSource.match(/<button[\s\S]*?aria-haspopup="menu"[\s\S]*?<\/button>/)?.[0] ?? "";
  assert.match(trigger, /transitionDangerOverflowMenu\(current, "trigger", disabled\)/);
  assert.doesNotMatch(trigger, /item\.onSelect|deleteEligible|onSelect\(\)/);
});

test("intake prefers a downward portaled menu without weakening the clipping panel", () => {
  assert.match(componentSource, /placement="bottom"/);
  assert.match(layoutCss, /\.customer-upload-intake-panel\s*\{[\s\S]*?overflow: hidden;/);
  assert.match(menuSource, /createPortal\(/);
  assert.match(menuSource, /document\.body/);
  assert.match(menuCss, /\.danger-overflow-menu-panel\s*\{[\s\S]*?position: fixed;/);
  assert.match(menuSource, /resolveDangerOverflowMenuPosition/);
});

test("selected design and Pending/Excluded filter reset stale local menu state", () => {
  assert.match(componentSource, /key={`\$\{intake\.filter}:\$\{intake\.selected\.id}`}/);
  assert.match(componentSource, /intake\.setFilter\("pending_staff_review"\)/);
  assert.match(componentSource, /intake\.setFilter\("excluded_from_catalog"\)/);
});

test("accessible menu semantics, keyboard focus, and design context are wired", () => {
  assert.match(componentSource, /ariaLabel={`More actions for \$\{row\.originalFilename}`}/);
  assert.match(menuSource, /aria-haspopup="menu"/);
  assert.match(menuSource, /aria-expanded={open}/);
  assert.match(menuSource, /role="menu"/);
  assert.match(menuSource, /role="menuitem"/);
  assert.match(menuSource, /event\.key === "Escape"/);
  assert.match(menuSource, /querySelector<HTMLButtonElement>/);
  assert.match(menuSource, /triggerRef\.current\?\.focus\(\)/);
  assert.match(menuSource, /!menuRef\.current\?\.contains\(target\)/);
});

test("primary intake actions and halftone control remain on their existing handlers", () => {
  assert.match(componentSource, /void intake\.promote\(row\.id\)/);
  assert.match(componentSource, /void intake\.exclude\(row\.id\)/);
  assert.match(componentSource, /void intake\.setHalftoneDecision\(row\.id, checked\)/);
});

test("empty or ineligible action states cannot display a dead trigger", () => {
  assert.match(menuSource, /if \(visibleItems\.length === 0\)\s*\{\s*return null;/);
  assert.match(componentSource, /intake\.canDeleteEligible && !row\.promotedDesignId/);
});

test("Customer Uploads and Donated Designs retain one shared intake implementation", () => {
  assert.match(componentSource, /const isDonation = purposeScope === "catalog_donation"/);
  assert.equal((componentSource.match(/<DangerOverflowMenu/g) ?? []).length, 1);
});
