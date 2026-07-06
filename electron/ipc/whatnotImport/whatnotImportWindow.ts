import { BrowserWindow, WebContentsView, screen, type Rectangle } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { WHATNOT_IMPORT_SHELL_PAGE_STATUS_EVENT } from "./whatnotImportIpcChannels";
import { parseWhatnotShowBaseUrl } from "../../../shared/utils/whatnotShowBaseUrl";
import { parseWhatnotShowImportCandidates } from "../../../shared/utils/whatnotShowImportCandidate";
import { planWhatnotShowImport } from "../../../shared/utils/whatnotShowImportPlan";
import type { RawWhatnotShowDomCandidate } from "../../../shared/utils/whatnotShowImportCandidate";
import type { WhatnotShowImportPlanEntry } from "../../../shared/utils/whatnotShowImportPlan";
import type {
  WhatnotExistingShowSummary,
  WhatnotImportShellPageStatusEvent,
} from "../../../shared/types/whatnotImport/whatnotImport.types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MIN_SHELL_WINDOW_WIDTH = 960;
const MIN_SHELL_WINDOW_HEIGHT = 600;
const RIGHT_PANEL_WIDTH = 380;

/** Slims and de-emphasizes the Whatnot page's own scrollbar so it doesn't dominate the split view. */
const WHATNOT_SCROLLBAR_CSS = `
  ::-webkit-scrollbar { width: 10px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.25); border-radius: 999px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(0, 0, 0, 0.4); }
`;

let shellWindow: BrowserWindow | null = null;
let whatnotView: WebContentsView | null = null;
/** The right-side import controls/results panel — its own bounded WebContentsView, a sibling of
 * `whatnotView`, never overlapping it. The base window itself renders nothing on its own. */
let panelView: WebContentsView | null = null;
/** Existing local shows, snapshotted when the window opens, used to classify a scan's results. */
let existingShowsForScan: WhatnotExistingShowSummary[] = [];
let currentWhatnotPageStatus: WhatnotImportShellPageStatusEvent = { status: "loading" };
let whatnotPageReadyTimer: ReturnType<typeof setTimeout> | null = null;
let whatnotPageLoadFailed = false;

function clampBoundsToWorkArea(bounds: Rectangle, workArea: Rectangle): Rectangle {
  const width = Math.min(bounds.width, workArea.width);
  const height = Math.min(bounds.height, workArea.height);
  const x = Math.max(workArea.x, Math.min(bounds.x, workArea.x + workArea.width - width));
  const y = Math.max(workArea.y, Math.min(bounds.y, workArea.y + workArea.height - height));

  return { x, y, width, height };
}

function getShellWindowBoundsOnDisplay(workArea: Rectangle): Rectangle {
  const width = Math.max(MIN_SHELL_WINDOW_WIDTH, Math.min(1400, workArea.width - 96));
  const height = Math.max(MIN_SHELL_WINDOW_HEIGHT, Math.min(900, workArea.height - 96));

  return clampBoundsToWorkArea(
    {
      x: Math.round(workArea.x + (workArea.width - width) / 2),
      y: Math.round(workArea.y + (workArea.height - height) / 2),
      width,
      height,
    },
    workArea,
  );
}

/**
 * Lays out both child views so they exactly tile the window with no overlap: the Whatnot view
 * gets everything except a fixed-width right strip, and the panel view gets exactly that strip.
 * Both views must always be (re)bounded together — sizing only one of them risks the other
 * painting over (or leaving a gap next to) it.
 */
function layoutSplitViews(): void {
  if (!shellWindow || shellWindow.isDestroyed() || !whatnotView || !panelView) {
    return;
  }

  const [contentWidth, contentHeight] = shellWindow.getContentSize();
  const panelWidth = Math.min(RIGHT_PANEL_WIDTH, contentWidth);
  const whatnotWidth = Math.max(0, contentWidth - panelWidth);

  whatnotView.setBounds({ x: 0, y: 0, width: whatnotWidth, height: contentHeight });
  panelView.setBounds({ x: whatnotWidth, y: 0, width: panelWidth, height: contentHeight });
}

function clearWhatnotPageReadyTimer(): void {
  if (whatnotPageReadyTimer) {
    clearTimeout(whatnotPageReadyTimer);
    whatnotPageReadyTimer = null;
  }
}

function sendWhatnotPageStatus(event: WhatnotImportShellPageStatusEvent): void {
  currentWhatnotPageStatus = event;

  if (panelView && !panelView.webContents.isDestroyed()) {
    panelView.webContents.send(WHATNOT_IMPORT_SHELL_PAGE_STATUS_EVENT, event);
  }
}

/**
 * Opens a single split window: the configured, validated Whatnot show base URL renders on the
 * left via a native `WebContentsView` (no preload, no Node integration, sandboxed — same posture
 * as the app's existing external-link window), while a second, sibling `WebContentsView` loads a
 * small local HTML "shell" for the import controls/results on the right. Both views are explicit,
 * non-overlapping children of the window's `contentView` — the base `BrowserWindow` itself never
 * loads any content of its own, so there is no risk of one view's bounds accidentally covering the
 * other's. This sidesteps the Cloudflare bot-mitigation that blocks a plain server-side fetch (see
 * docs/workflow/plans/2026-07-05-whatnot-show-sync-plan.md, Section 7A/7B/7C) by having a real
 * browser render the real page, while keeping the import UI in the same window instead of a
 * separate app modal.
 */
export function openWhatnotImportWindow(
  rawBaseUrl: string,
  ownerWindow: BrowserWindow | null,
  existingShows: WhatnotExistingShowSummary[],
): boolean {
  const parsed = parseWhatnotShowBaseUrl(rawBaseUrl);

  if (!parsed) {
    return false;
  }

  closeWhatnotImportWindow();

  existingShowsForScan = existingShows;
  currentWhatnotPageStatus = { status: "loading" };
  whatnotPageLoadFailed = false;

  const referenceBounds = ownerWindow && !ownerWindow.isDestroyed() ? ownerWindow.getBounds() : undefined;
  const targetDisplay = referenceBounds
    ? screen.getDisplayMatching(referenceBounds)
    : screen.getPrimaryDisplay();

  shellWindow = new BrowserWindow({
    ...getShellWindowBoundsOnDisplay(targetDisplay.workArea),
    autoHideMenuBar: true,
    title: "Import Whatnot shows",
  });

  whatnotView = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  panelView = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "whatnotImportShellPreload.js"),
    },
  });

  shellWindow.contentView.addChildView(whatnotView);
  shellWindow.contentView.addChildView(panelView);
  layoutSplitViews();

  whatnotView.webContents.on("did-start-loading", () => {
    clearWhatnotPageReadyTimer();
    whatnotPageLoadFailed = false;
    sendWhatnotPageStatus({ status: "loading" });
  });

  whatnotView.webContents.on("did-finish-load", () => {
    void whatnotView?.webContents.insertCSS(WHATNOT_SCROLLBAR_CSS);
  });

  whatnotView.webContents.on("did-stop-loading", () => {
    if (whatnotPageLoadFailed) {
      return;
    }

    clearWhatnotPageReadyTimer();
    whatnotPageReadyTimer = setTimeout(() => {
      sendWhatnotPageStatus({ status: "ready" });
    }, 1500);
  });

  whatnotView.webContents.on("did-fail-load", (_event, errorCode, errorDescription, _validatedUrl, isMainFrame) => {
    if (errorCode === -3 || isMainFrame === false) {
      return;
    }

    whatnotPageLoadFailed = true;
    clearWhatnotPageReadyTimer();
    sendWhatnotPageStatus({
      status: "failed",
      error: errorDescription || "The Whatnot page did not finish loading.",
    });
  });

  panelView.webContents.on("did-finish-load", () => {
    sendWhatnotPageStatus(currentWhatnotPageStatus);
  });

  void whatnotView.webContents.loadURL(parsed.normalizedUrl).catch((error: unknown) => {
    whatnotPageLoadFailed = true;
    clearWhatnotPageReadyTimer();
    sendWhatnotPageStatus({
      status: "failed",
      error: error instanceof Error ? error.message : "The Whatnot page did not finish loading.",
    });
  });
  void panelView.webContents.loadFile(path.join(__dirname, "whatnotImportShell.html"));

  shellWindow.on("resize", layoutSplitViews);
  shellWindow.on("closed", () => {
    clearWhatnotPageReadyTimer();
    shellWindow = null;
    whatnotView = null;
    panelView = null;
  });

  return true;
}

export function closeWhatnotImportWindow(): void {
  if (shellWindow && !shellWindow.isDestroyed()) {
    shellWindow.close();
  }
  shellWindow = null;
  whatnotView = null;
  panelView = null;
  clearWhatnotPageReadyTimer();
}

export function getWhatnotImportPanelWebContents(): Electron.WebContents | null {
  return panelView && !panelView.webContents.isDestroyed() ? panelView.webContents : null;
}

function isRawWhatnotShowDomCandidateArray(value: unknown): value is RawWhatnotShowDomCandidate[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        typeof (entry as Record<string, unknown>).href === "string" &&
        typeof (entry as Record<string, unknown>).title === "string" &&
        typeof (entry as Record<string, unknown>).dateText === "string",
    )
  );
}

/**
 * Extracts visible show cards from the Whatnot `WebContentsView`'s own already-loaded DOM via
 * `executeJavaScript()`. Runs a self-contained script string inside that view's own (Whatnot)
 * page context — not a preload-injected API, so nothing privileged is ever exposed to the Whatnot
 * page itself. Returns a plain, structured-clonable array of `{href, title, dateText}` triples
 * only; never raw HTML, cookies, or session tokens.
 *
 * This inlined script must stay in sync with the per-card logic unit-tested in
 * `shared/utils/whatnotShowCardExtraction.ts` — it cannot import that module directly since it
 * runs in a separate (Whatnot's own) page context via `executeJavaScript`, not this process.
 */
async function extractRawWhatnotShowCandidates(): Promise<RawWhatnotShowDomCandidate[] | undefined> {
  if (!whatnotView || whatnotView.webContents.isDestroyed()) {
    return undefined;
  }

  const extractionScript = `
    (function () {
      var cards = Array.prototype.slice.call(
        document.querySelectorAll('section[data-testid="livestream-card"]')
      );

      return cards.map(function (card) {
        // Each card has two separate /live/ anchors: one wrapping only the thumbnail image,
        // and a second, later one wrapping the title <strong>. Only the second has the title,
        // so it must be located directly rather than assumed to be the first /live/ anchor found.
        var liveLinks = Array.prototype.slice.call(card.querySelectorAll('a[href^="/live/"]'));

        var titleLink = null;
        var titleEl = null;
        for (var i = 0; i < liveLinks.length; i++) {
          var candidateTitleEl = liveLinks[i].querySelector('strong');
          if (candidateTitleEl) {
            titleLink = liveLinks[i];
            titleEl = candidateTitleEl;
            break;
          }
        }

        var link = titleLink || liveLinks[0] || null;
        var href = link ? link.href || '' : '';

        var title = titleEl
          ? (titleEl.getAttribute('title') || titleEl.textContent || '').trim()
          : '';

        var dateEl = card.querySelector('.absolute.left-3.top-3');
        var dateText = (dateEl ? dateEl.textContent : '') || '';

        return { href: href, title: title, dateText: dateText.trim() };
      }).filter(function (candidate) {
        return candidate.href;
      });
    })();
  `;

  try {
    const rawResult: unknown = await whatnotView.webContents.executeJavaScript(extractionScript, true);

    if (!isRawWhatnotShowDomCandidateArray(rawResult)) {
      return [];
    }

    return rawResult;
  } catch {
    return undefined;
  }
}

/**
 * Scans the Whatnot view's current DOM and returns a fully classified import plan (create /
 * update / unchanged / needs_review), using the same pure `shared/utils` logic the app's tests
 * cover — the main process runs parsing/classification itself since the shell window has no
 * bundled React/app code of its own.
 */
export async function scanWhatnotShowCandidates(): Promise<WhatnotShowImportPlanEntry[] | undefined> {
  const rawCandidates = await extractRawWhatnotShowCandidates();

  if (!rawCandidates) {
    return undefined;
  }

  const candidates = parseWhatnotShowImportCandidates(rawCandidates, new Date());
  return planWhatnotShowImport(candidates, existingShowsForScan);
}
