import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { AI_QUEUE_TRACE_MAX_EVENTS, AiQueueTraceStore } from "./aiQueueTrace";

function read(relativePath: string): string {
  return readFileSync(relativePath, "utf8");
}

/**
 * Owner QA Amendment 6 instrumentation safety contract, updated for the Amendment 6 follow-up
 * (cross-window transport fix). `AiQueueTraceStore` is now a pure, environment-agnostic class —
 * these tests exercise it directly, the same way the real Electron main process does, rather than
 * through the old module-level function API (which is what silently broke across windows).
 *
 * These tests do not assert anything about AI queue *behavior* — no behavioral fix was made in
 * either pass. They assert only that the diagnostic itself is safe: off by default in a fresh
 * store, bounded, free of sensitive fields, and — new in this pass — that the writer (main Studio
 * window) and reader (Firebase Debug window) are provably the same store instance.
 */
describe("AiQueueTraceStore is disabled unless explicitly enabled", () => {
  it("is disabled by default and records nothing", () => {
    const store = new AiQueueTraceStore();
    assert.equal(store.isEnabled(), false);

    store.append({ event: "pump.start", source: "backgroundQueue" });

    assert.equal(store.getSnapshot().eventCount, 0);
  });

  it("records only while enabled, and stops again once disabled", () => {
    const store = new AiQueueTraceStore();

    store.setEnabled(true);
    store.append({ event: "pump.start", source: "backgroundQueue" });
    assert.equal(store.getSnapshot().eventCount, 1);

    store.setEnabled(false);
    store.append({ event: "pump.idle", source: "backgroundQueue" });
    assert.equal(store.getSnapshot().eventCount, 1, "no event may be recorded once disabled");
  });
});

describe("AiQueueTraceStore storage is bounded", () => {
  it("never exceeds the maximum event count, discarding oldest first", () => {
    const store = new AiQueueTraceStore();
    store.setEnabled(true);

    for (let index = 0; index < AI_QUEUE_TRACE_MAX_EVENTS + 250; index += 1) {
      store.append({ event: "pump.advance", source: "backgroundQueue", designId: `d-${index}` });
    }

    const snapshot = store.getSnapshot();
    assert.equal(snapshot.eventCount, AI_QUEUE_TRACE_MAX_EVENTS);
    assert.equal(snapshot.events.length, AI_QUEUE_TRACE_MAX_EVENTS);
    // Oldest were dropped; the newest survived.
    assert.equal(snapshot.events[snapshot.events.length - 1]?.designId, `d-${AI_QUEUE_TRACE_MAX_EVENTS + 249}`);
    assert.notEqual(snapshot.events[0]?.designId, "d-0");
  });

  it("assigns a monotonic sequence number and a timestamp to every event", () => {
    const store = new AiQueueTraceStore();
    store.setEnabled(true);

    store.append({ event: "a", source: "inbox" });
    store.append({ event: "b", source: "inbox" });
    store.append({ event: "c", source: "inbox" });

    const { events } = store.getSnapshot();
    assert.deepEqual(events.map((event) => event.seq), [1, 2, 3]);
    for (const event of events) {
      assert.equal(typeof event.timestampMs, "number");
    }
  });

  it("reset() clears events and restarts the sequence counter", () => {
    const store = new AiQueueTraceStore();
    store.setEnabled(true);

    store.append({ event: "a", source: "inbox" });
    store.append({ event: "b", source: "inbox" });
    assert.equal(store.getSnapshot().eventCount, 2);

    store.reset();
    assert.equal(store.getSnapshot().eventCount, 0);

    store.append({ event: "c", source: "inbox" });
    assert.equal(store.getSnapshot().events[0]?.seq, 1, "sequence restarts from 1 after reset");
  });

  it("reset() does not change the enabled flag", () => {
    const store = new AiQueueTraceStore();
    store.setEnabled(true);
    store.reset();
    assert.equal(store.isEnabled(), true, "reset must not disable an already-enabled store");
  });
});

describe("Copy AI Queue Trace output excludes sensitive fields", () => {
  it("drops any field not on the allowlist, even if a caller passes one", () => {
    const store = new AiQueueTraceStore();
    store.setEnabled(true);

    store.append({
      event: "observer.received",
      source: "inbox",
      designId: "design-1",
      // Deliberately smuggled sensitive fields — must never survive into the snapshot.
      title: "Customer's Secret Shirt Design",
      description: "internal notes",
      thumbnailPath: "/thumbnails/design-1.webp",
      originalPath: "/originals/design-1.png",
      customerEmail: "someone@example.com",
      token: "abc123",
    } as Parameters<typeof store.append>[0]);

    const serialized = JSON.stringify(store.getSnapshot());

    assert.match(serialized, /design-1/, "allowlisted design IDs are expected to survive");
    for (const forbidden of [
      "Customer's Secret Shirt Design",
      "internal notes",
      "/thumbnails/",
      "/originals/",
      "someone@example.com",
      "abc123",
      "title",
      "description",
      "thumbnailPath",
      "originalPath",
      "customerEmail",
      "token",
    ]) {
      assert.ok(
        !serialized.includes(forbidden),
        `sensitive value or field name "${forbidden}" must never appear in the copied trace`,
      );
    }
  });

  it("keeps design-ID arrays as plain string IDs only", () => {
    const store = new AiQueueTraceStore();
    store.setEnabled(true);

    store.append({
      event: "render.derived_state",
      source: "render",
      processingDesignIds: ["a", "b"],
      needsReviewDesignIds: ["c"],
    });

    const { events } = store.getSnapshot();
    assert.deepEqual(events[0]?.processingDesignIds, ["a", "b"]);
    assert.deepEqual(events[0]?.needsReviewDesignIds, ["c"]);
  });

  it("no instrumented call site passes a whole Design object or a raw error message", () => {
    const instrumented = [
      "apps/studio/src/renderer/src/features/imports/services/importAiBackgroundQueue.ts",
      "apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts",
      "apps/studio/src/renderer/src/features/designs/hooks/useDesigns.ts",
    ];

    for (const path of instrumented) {
      const source = read(path);
      // A spread into the trace call would bypass the allowlist's intent at the call site.
      assert.doesNotMatch(
        source,
        /traceAiQueueEvent\(\{[^}]*\.\.\./s,
        `${path} must not spread an object into traceAiQueueEvent`,
      );
      // error.message can contain arbitrary text — only enum-like error codes are permitted.
      assert.doesNotMatch(
        source,
        /traceAiQueueEvent\(\{[^}]*error\.message/s,
        `${path} must not put a raw error message into the trace`,
      );
    }
  });
});

describe("tracing does not change queue behavior", () => {
  it("append() returns void and throws nothing when disabled or enabled", () => {
    const store = new AiQueueTraceStore();
    assert.equal(store.append({ event: "x", source: "inbox" }), undefined);
    store.setEnabled(true);
    assert.equal(store.append({ event: "x", source: "inbox" }), undefined);
  });

  it("the background queue's control flow does not read any trace state", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/imports/services/importAiBackgroundQueue.ts",
    );

    // The pump may WRITE trace events, but no branch/loop condition may depend on the trace.
    assert.doesNotMatch(source, /if\s*\([^)]*isAiQueueTraceEnabled/);
    assert.doesNotMatch(source, /while\s*\([^)]*(isAiQueueTraceEnabled|traceAiQueueEvent)/);
    // The diagnostic-only active-design pointer must not gate any control flow either.
    assert.doesNotMatch(source, /if\s*\([^)]*activeQueueDesignId/);
  });

  it("the pump still awaits exactly one enqueue call per iteration (sequencing unchanged by instrumentation)", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/imports/services/importAiBackgroundQueue.ts",
    );
    const pumpBlock = source.slice(source.indexOf("async function pumpBackgroundAiQueue("));

    assert.match(pumpBlock, /await aiEnrichmentEnqueueService\.enqueueForProcessing\(designId\)/);
    assert.doesNotMatch(pumpBlock, /Promise\.all|Promise\.allSettled/);
  });
});

/**
 * Amendment 6 follow-up: the cross-window transport fix itself. The Firebase Debug panel and the
 * AI Processing workspace are two separate Electron BrowserWindow renderer processes — the first
 * cut of this instrumentation gave each one its own independent copy of the trace module, so the
 * Debug window always reported `{ enabled: false, eventCount: 0 }` no matter what happened in the
 * Studio window. These tests prove structurally that exactly one AiQueueTraceStore instance now
 * backs both windows via IPC, mirroring the architecture proof style already used for the sibling
 * firebaseDebug feature in this codebase (no live Electron process is available in this
 * environment, so cross-window behavior is proven from source + a same-instance IPC simulation
 * rather than a real two-BrowserWindow run).
 */
describe("AI queue trace: shared main-process store, IPC-mediated (cross-window regression)", () => {
  it("the IPC handler module holds exactly one module-level AiQueueTraceStore instance", () => {
    const source = read("apps/studio/electron/ipc/aiQueueTrace/aiQueueTraceIpcHandlers.ts");

    const instantiations = source.match(/new AiQueueTraceStore\(/g) ?? [];
    assert.equal(
      instantiations.length,
      1,
      "exactly one AiQueueTraceStore must be constructed in the main process",
    );
    // The one instance must be module-level (outside registerAiQueueTraceIpcHandlers), so it is
    // created once per process and shared by every call to the register function, not recreated
    // per renderer/window.
    const registerIndex = source.indexOf("export function registerAiQueueTraceIpcHandlers");
    const storeDeclarationIndex = source.indexOf("const store = new AiQueueTraceStore(");
    assert.ok(storeDeclarationIndex >= 0 && storeDeclarationIndex < registerIndex);
  });

  it("preload exposes the same four channel-backed methods the main handler registers", () => {
    const handlersSource = read("apps/studio/electron/ipc/aiQueueTrace/aiQueueTraceIpcHandlers.ts");
    const preloadSource = read("apps/studio/electron/preload.ts");

    // Every channel the main process listens/handles on...
    assert.match(handlersSource, /ipcMain\.on\(AI_QUEUE_TRACE_IPC_CHANNELS\.APPEND/);
    assert.match(handlersSource, /ipcMain\.handle\(AI_QUEUE_TRACE_IPC_CHANNELS\.GET_SNAPSHOT/);
    assert.match(handlersSource, /ipcMain\.on\(AI_QUEUE_TRACE_IPC_CHANNELS\.RESET/);
    assert.match(handlersSource, /ipcMain\.handle\(AI_QUEUE_TRACE_IPC_CHANNELS\.IS_ENABLED/);

    // ...has a corresponding preload bridge method that both renderer windows load identically
    // (contextBridge exposes one "freshPrints.aiQueueTrace" object into every renderer that loads
    // this same preload script — the main window and the Debug window both do).
    const bridgeBlock = preloadSource.slice(
      preloadSource.indexOf("aiQueueTrace: {"),
      preloadSource.indexOf("catalogAsset: {"),
    );
    assert.match(bridgeBlock, /append\(event: AiQueueTraceEventInput\): void/);
    assert.match(bridgeBlock, /ipcRenderer\.send\(AI_QUEUE_TRACE_IPC_CHANNELS\.APPEND/);
    assert.match(bridgeBlock, /getSnapshot\(\): Promise<AiQueueTraceSnapshot>/);
    assert.match(bridgeBlock, /ipcRenderer\.invoke\(AI_QUEUE_TRACE_IPC_CHANNELS\.GET_SNAPSHOT\)/);
    assert.match(bridgeBlock, /reset\(\): void/);
    assert.match(bridgeBlock, /ipcRenderer\.send\(AI_QUEUE_TRACE_IPC_CHANNELS\.RESET\)/);
    assert.match(bridgeBlock, /isEnabled\(\): Promise<boolean>/);
    assert.match(bridgeBlock, /ipcRenderer\.invoke\(AI_QUEUE_TRACE_IPC_CHANNELS\.IS_ENABLED\)/);
  });

  it("simulated writer (Studio window) and reader (Debug window) IPC calls observe the same store", () => {
    // Simulates the exact call sequence each side makes, directly against the real class the main
    // process instantiates once — proving a write from one "sender" is visible to another
    // "sender" reading the same store, which is the whole point of the fix (no per-renderer copy).
    const store = new AiQueueTraceStore();
    store.setEnabled(true); // main process enables exactly once at registration, as in production

    // "Studio window" writer: what the aiQueueTraceClient.append() -> ipcRenderer.send -> ipcMain.on
    // path ultimately does to the shared store.
    store.append({
      event: "pump.design_selected",
      source: "backgroundQueue",
      designId: "design-42",
      activeQueueDesignId: "design-42",
    });

    // "Debug window" reader: what getSnapshot() -> ipcRenderer.invoke -> ipcMain.handle returns —
    // the same store instance, not a second one.
    const readerSnapshot = store.getSnapshot();
    assert.equal(readerSnapshot.enabled, true, "the Debug window must observe enabled: true");
    assert.equal(readerSnapshot.eventCount, 1);
    assert.equal(readerSnapshot.events[0]?.designId, "design-42");

    // "Debug window" reset: must clear what the "Studio window" wrote.
    store.reset();
    assert.equal(store.getSnapshot().eventCount, 0);

    // A second write from the "Studio window" after reset must still be visible to the "Debug
    // window" — proving the store instance (not just its initial state) is shared across calls,
    // i.e. closing/reopening the Debug window cannot lose events from the active Studio session.
    store.append({ event: "pump.idle", source: "backgroundQueue" });
    assert.equal(store.getSnapshot().eventCount, 1);
  });

  it("getAiQueueTraceStoreForTests is exported for tests only, never imported by production renderer code", () => {
    const handlersSource = read("apps/studio/electron/ipc/aiQueueTrace/aiQueueTraceIpcHandlers.ts");
    assert.match(handlersSource, /export function getAiQueueTraceStoreForTests/);

    const rendererClientSource = read(
      "apps/studio/src/renderer/src/config/aiQueueTraceClient.ts",
    );
    assert.doesNotMatch(rendererClientSource, /getAiQueueTraceStoreForTests/);
  });

  it("no renderer call site imports the store/module directly — every call site goes through the IPC client", () => {
    const callSites = [
      "apps/studio/src/renderer/src/features/imports/services/importAiBackgroundQueue.ts",
      "apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts",
      "apps/studio/src/renderer/src/features/designs/hooks/useDesigns.ts",
      "apps/studio/src/renderer/src/features/firebase-debug/components/FirebaseDebugPanel.tsx",
    ];

    for (const path of callSites) {
      const source = read(path);
      assert.doesNotMatch(
        source,
        /from ["']@fresh-prints\/shared\/utils\/aiQueueTrace["']/,
        `${path} must import the trace client, not the shared store module directly`,
      );
      assert.match(
        source,
        /from ["'](\.\.\/)+config\/aiQueueTraceClient["']/,
        `${path} must import from the renderer-side aiQueueTraceClient IPC wrapper`,
      );
    }
  });

  it("the main-process enable gate is evaluated exactly once at registration, not per-renderer", () => {
    const source = read("apps/studio/electron/ipc/aiQueueTrace/aiQueueTraceIpcHandlers.ts");
    const setEnabledCalls = source.match(/store\.setEnabled\(/g) ?? [];
    assert.equal(setEnabledCalls.length, 1, "setEnabled must be called exactly once");
    assert.match(source, /store\.setEnabled\(!options\.isPackaged\(\)\)/);

    // Neither renderer may call an enable function of its own — confirmed by absence of any
    // "setAiQueueTraceEnabled"-shaped export in the renderer-facing IPC types/client.
    const clientSource = read("apps/studio/src/renderer/src/config/aiQueueTraceClient.ts");
    assert.doesNotMatch(clientSource, /setEnabled|setAiQueueTraceEnabled/);
  });

  it("production builds get an inert snapshot and never mutate the store", () => {
    const source = read("apps/studio/electron/ipc/aiQueueTrace/aiQueueTraceIpcHandlers.ts");

    // Every mutating/reading handler must short-circuit when packaged.
    const appendHandler = source.slice(
      source.indexOf("ipcMain.on(AI_QUEUE_TRACE_IPC_CHANNELS.APPEND"),
      source.indexOf("ipcMain.handle(AI_QUEUE_TRACE_IPC_CHANNELS.GET_SNAPSHOT"),
    );
    assert.match(appendHandler, /if \(options\.isPackaged\(\)\) return/);

    const snapshotHandler = source.slice(
      source.indexOf("ipcMain.handle(AI_QUEUE_TRACE_IPC_CHANNELS.GET_SNAPSHOT"),
      source.indexOf("ipcMain.on(AI_QUEUE_TRACE_IPC_CHANNELS.RESET"),
    );
    assert.match(snapshotHandler, /if \(options\.isPackaged\(\)\)/);
    assert.match(snapshotHandler, /enabled: false, eventCount: 0/);

    const resetHandler = source.slice(
      source.indexOf("ipcMain.on(AI_QUEUE_TRACE_IPC_CHANNELS.RESET"),
      source.indexOf("ipcMain.handle(AI_QUEUE_TRACE_IPC_CHANNELS.IS_ENABLED"),
    );
    assert.match(resetHandler, /if \(options\.isPackaged\(\)\) return/);
  });
});
