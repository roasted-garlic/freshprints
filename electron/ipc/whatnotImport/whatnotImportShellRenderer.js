(function () {
  const scanButton = document.getElementById("scan-button");
  const cancelButton = document.getElementById("cancel-button");
  const confirmButton = document.getElementById("confirm-button");
  const resultsEl = document.getElementById("results");
  const emptyStateEl = document.getElementById("empty-state");
  const errorEl = document.getElementById("error");
  const hintEl = document.getElementById("hint");
  const unchangedSummaryEl = document.getElementById("unchanged-summary");
  const unchangedSummaryToggle = document.getElementById("unchanged-summary-toggle");
  const unchangedListEl = document.getElementById("unchanged-list");
  let isUnchangedListExpanded = false;
  let isWhatnotPageReady = false;
  let isScanning = false;
  let isImporting = false;

  /** @type {import("@fresh-prints/shared/utils/whatnotShowImportPlan").WhatnotShowImportPlanEntry[]} */
  let planEntries = [];
  const excludedIndexes = new Set();

  function showError(message) {
    errorEl.textContent = message;
    errorEl.style.display = message ? "block" : "none";
  }

  function updateScanButtonState() {
    if (isScanning) {
      scanButton.disabled = true;
      scanButton.textContent = "Scanning...";
      return;
    }

    scanButton.disabled = !isWhatnotPageReady;
    scanButton.textContent = isWhatnotPageReady ? "Scan visible shows" : "Loading Whatnot page...";
  }

  function badgeLabel(action) {
    return action === "needs_review" ? "Needs review" : action;
  }

  function updateRowBadge(row, entry, index) {
    const badge = row.querySelector(".entry-action-badge");
    const isExcluded = excludedIndexes.has(index);
    const effectiveAction = isExcluded && entry.action !== "needs_review" ? "ignore" : entry.action;
    badge.className = "badge entry-action-badge badge-" + effectiveAction;
    badge.textContent = badgeLabel(effectiveAction);
  }

  function hasConfirmableSelection() {
    return planEntries.some(function (entry, index) {
      return (
        !excludedIndexes.has(index) &&
        entry.action !== "needs_review" &&
        entry.action !== "unchanged"
      );
    });
  }

  function updateConfirmButtonState() {
    confirmButton.disabled = isImporting || !hasConfirmableSelection();
  }

  function buildEntryRow(entry, index, options) {
    const showCheckbox = !options || options.showCheckbox !== false;
    const row = document.createElement("div");
    row.className = "entry";

    const label = document.createElement("label");

    if (showCheckbox) {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = !excludedIndexes.has(index);
      checkbox.disabled = entry.action === "needs_review";
      checkbox.addEventListener("change", function () {
        if (excludedIndexes.has(index)) {
          excludedIndexes.delete(index);
        } else {
          excludedIndexes.add(index);
        }
        updateRowBadge(row, entry, index);
        updateConfirmButtonState();
      });
      label.appendChild(checkbox);
    }

    const text = document.createElement("span");
    const titleLine = document.createElement("span");
    titleLine.className = "entry-title";
    titleLine.textContent = entry.candidate.title;
    if (entry.candidate.status === "live") {
      const liveBadge = document.createElement("span");
      liveBadge.className = "badge badge-live";
      liveBadge.style.marginLeft = "6px";
      liveBadge.textContent = "Live now";
      titleLine.appendChild(liveBadge);
    }

    const metaLine = document.createElement("div");
    metaLine.className = "entry-meta";
    metaLine.textContent = entry.candidate.reviewReason
      ? entry.candidate.rawDateText + " — " + entry.candidate.reviewReason
      : entry.candidate.rawDateText;

    text.appendChild(titleLine);
    text.appendChild(metaLine);

    label.appendChild(text);

    const badge = document.createElement("span");
    badge.className = "entry-action-badge";
    row.appendChild(label);
    row.appendChild(badge);

    updateRowBadge(row, entry, index);

    return row;
  }

  function renderUnchangedSummary(unchangedEntries) {
    if (unchangedEntries.length === 0) {
      unchangedSummaryEl.style.display = "none";
      unchangedSummaryEl.classList.remove("is-expanded");
      unchangedListEl.style.display = "none";
      unchangedListEl.innerHTML = "";
      isUnchangedListExpanded = false;
      return;
    }

    unchangedSummaryEl.style.display = "flex";
    unchangedSummaryEl.classList.toggle("is-expanded", isUnchangedListExpanded);
    unchangedSummaryToggle.textContent =
      (isUnchangedListExpanded ? "Hide " : "Show ") +
      unchangedEntries.length +
      " unchanged show" +
      (unchangedEntries.length === 1 ? "" : "s");

    unchangedListEl.style.display = isUnchangedListExpanded ? "flex" : "none";

    if (isUnchangedListExpanded) {
      unchangedListEl.innerHTML = "";
      unchangedEntries.forEach(function (item) {
        unchangedListEl.appendChild(buildEntryRow(item.entry, item.index, { showCheckbox: false }));
      });
    }
  }

  function renderResults() {
    resultsEl.innerHTML = "";

    const unchangedEntries = [];
    const otherEntries = [];

    planEntries.forEach(function (entry, index) {
      if (entry.action === "unchanged") {
        unchangedEntries.push({ entry: entry, index: index });
      } else {
        otherEntries.push({ entry: entry, index: index });
      }
    });

    emptyStateEl.style.display = planEntries.length === 0 ? "block" : "none";
    resultsEl.style.display = otherEntries.length === 0 ? "none" : "flex";

    renderUnchangedSummary(unchangedEntries);

    otherEntries.forEach(function (item) {
      resultsEl.appendChild(buildEntryRow(item.entry, item.index));
    });

    updateConfirmButtonState();
  }

  unchangedSummaryToggle.addEventListener("click", function () {
    isUnchangedListExpanded = !isUnchangedListExpanded;
    renderResults();
  });

  if (!window.freshPrintsWhatnotImportShell) {
    showError(
      "Internal error: the import bridge did not load (window.freshPrintsWhatnotImportShell is missing). " +
        "Scan/Confirm/Cancel will not work. Please close this window and try again.",
    );
    scanButton.disabled = true;
    confirmButton.disabled = true;
    cancelButton.disabled = true;
    return;
  }

  scanButton.addEventListener("click", async function () {
    if (!isWhatnotPageReady || isScanning) {
      return;
    }

    showError("");
    isScanning = true;
    updateScanButtonState();

    try {
      const result = await window.freshPrintsWhatnotImportShell.scan();

      if (!result.success) {
        showError(result.error.message);
        return;
      }

      planEntries = result.data.planEntries;
      excludedIndexes.clear();
      isUnchangedListExpanded = false;
      planEntries.forEach(function (entry, index) {
        if (entry.candidate.status === "live") {
          excludedIndexes.add(index);
        }
      });
      hintEl.textContent = "Review the shows below, uncheck any you don't want to import, then confirm.";
      renderResults();
    } catch (error) {
      showError(error && error.message ? error.message : "Unable to scan the Whatnot page.");
    } finally {
      isScanning = false;
      updateScanButtonState();
    }
  });

  cancelButton.addEventListener("click", function () {
    window.freshPrintsWhatnotImportShell.cancel().catch(function (error) {
      showError(error && error.message ? error.message : "Unable to close this window.");
    });
  });

  confirmButton.addEventListener("click", async function () {
    if (isImporting || !hasConfirmableSelection()) {
      return;
    }

    showError("");
    isImporting = true;
    confirmButton.disabled = true;
    cancelButton.disabled = true;
    confirmButton.textContent = "Importing...";

    try {
      const result = await window.freshPrintsWhatnotImportShell.confirm({
        planEntries: planEntries,
        excludedIndexes: Array.from(excludedIndexes),
      });

      if (!result.success) {
        showError(result.error.message);
        isImporting = false;
        cancelButton.disabled = false;
        confirmButton.textContent = "Confirm import";
        updateConfirmButtonState();
      }
      // On success, the window is closed by the main process once the owner window reports completion.
    } catch (error) {
      showError(error && error.message ? error.message : "Unable to confirm the import.");
      isImporting = false;
      cancelButton.disabled = false;
      confirmButton.textContent = "Confirm import";
      updateConfirmButtonState();
    }
  });

  window.freshPrintsWhatnotImportShell.onImportCompleted(function (event) {
    if (event.status === "failed") {
      showError(event.error);
      isImporting = false;
      cancelButton.disabled = false;
      confirmButton.textContent = "Confirm import";
      updateConfirmButtonState();
    }
  });

  window.freshPrintsWhatnotImportShell.onPageStatus(function (event) {
    if (event.status === "loading") {
      isWhatnotPageReady = false;
      updateScanButtonState();
      return;
    }

    if (event.status === "failed") {
      isWhatnotPageReady = false;
      showError(event.error);
      scanButton.textContent = "Page did not load";
      scanButton.disabled = true;
      return;
    }

    isWhatnotPageReady = true;
    showError("");
    updateScanButtonState();
  });

  updateScanButtonState();
})();
