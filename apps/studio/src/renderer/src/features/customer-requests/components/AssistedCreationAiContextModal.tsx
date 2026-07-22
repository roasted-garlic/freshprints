import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";

import type { AssistedCreationAnswers } from "@fresh-prints/shared/types/assistedCreation/assistedCreation.types";
import type { AssistedCreationFulfillmentMode } from "@fresh-prints/shared/types/assistedCreation/assistedCreation.types";
import type { AssistedCreationReferenceImage } from "@fresh-prints/shared/types/assistedCreation/assistedCreation.types";
import { buildAssistedCreationAiContextProfile } from "@fresh-prints/shared/utils/assistedCreationAiContextProfile";
import {
  buildAssistedCreationAiArtworkPrompt,
  buildAssistedCreationFullAiInput,
} from "@fresh-prints/shared/utils/assistedCreationAiArtworkPrompt";

import { Button } from "../../../shared/components/Button";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "../../../shared/components/Modal";

export interface AssistedCreationAiContextModalProps {
  requestId: string;
  answers: AssistedCreationAnswers | null;
  referenceImages: AssistedCreationReferenceImage[];
  fulfillmentMode: AssistedCreationFulfillmentMode | null;
  onClose: () => void;
  onToast: (message: string) => void;
}

type CopyTarget = "prompt" | "json" | "full";

const COPY_FEEDBACK_MS = 2000;

const COPY_IDLE_LABELS: Record<CopyTarget, string> = {
  prompt: "Copy AI Prompt",
  json: "Copy Context JSON",
  full: "Copy Full AI Input",
};

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  document.body.removeChild(area);
}

function CopyActionLabel({ copied, idleLabel }: { copied: boolean; idleLabel: string }) {
  return (
    <span
      className={`customer-requests-assisted-ai-context-copy-label${copied ? " is-copied" : ""}`}
    >
      {copied ? (
        <>
          <Check aria-hidden="true" size={15} strokeWidth={2.2} />
          Copied
        </>
      ) : (
        idleLabel
      )}
    </span>
  );
}

/**
 * Studio-only copy surface for AI-ready design context (no AI API).
 */
export function AssistedCreationAiContextModal({
  requestId,
  answers,
  referenceImages,
  fulfillmentMode,
  onClose,
  onToast,
}: AssistedCreationAiContextModalProps) {
  const [busy, setBusy] = useState(false);
  const [copiedTarget, setCopiedTarget] = useState<CopyTarget | null>(null);
  const [liveAnnounce, setLiveAnnounce] = useState("");
  const resetTimerRef = useRef<number | null>(null);
  const hasRefs = referenceImages.length > 0;

  useEffect(() => {
    return () => {
      if (resetTimerRef.current != null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const profile = useMemo(
    () =>
      buildAssistedCreationAiContextProfile({
        id: requestId,
        answers,
        referenceImages,
        fulfillmentMode,
      }),
    [answers, fulfillmentMode, referenceImages, requestId],
  );

  const prompt = useMemo(
    () => buildAssistedCreationAiArtworkPrompt({ hasReferenceImages: hasRefs }),
    [hasRefs],
  );

  const jsonText = useMemo(() => JSON.stringify(profile, null, 2), [profile]);
  const fullInput = useMemo(
    () =>
      buildAssistedCreationFullAiInput({
        hasReferenceImages: hasRefs,
        profile,
      }),
    [hasRefs, profile],
  );

  async function handleCopy(target: CopyTarget, label: string, text: string): Promise<void> {
    setBusy(true);
    try {
      await copyText(text);
      if (resetTimerRef.current != null) {
        window.clearTimeout(resetTimerRef.current);
      }
      setCopiedTarget(target);
      setLiveAnnounce(`${label} copied`);
      resetTimerRef.current = window.setTimeout(() => {
        setCopiedTarget((current) => (current === target ? null : current));
        resetTimerRef.current = null;
      }, COPY_FEEDBACK_MS);
      onToast(`${label} copied`);
    } catch {
      onToast("Unable to copy. Select the text and copy manually.");
    } finally {
      setBusy(false);
    }
  }

  function copyButtonProps(target: CopyTarget) {
    const idleLabel = COPY_IDLE_LABELS[target];
    const copied = copiedTarget === target;
    return {
      "aria-label": copied ? `${idleLabel} — copied` : idleLabel,
      children: <CopyActionLabel copied={copied} idleLabel={idleLabel} />,
      className: copied
        ? "customer-requests-assisted-ai-context-copy-btn is-copied"
        : "customer-requests-assisted-ai-context-copy-btn",
      disabled: busy,
      type: "button" as const,
      variant: "secondary" as const,
    };
  }

  return (
    <div className="modal-overlay modal-overlay-blur" onClick={onClose} role="presentation">
      <Modal
        aria-labelledby="assisted-ai-context-title"
        className="customer-requests-assisted-ai-context-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <ModalHeader>
          <h2 id="assisted-ai-context-title">AI Context</h2>
        </ModalHeader>
        <ModalBody className="customer-requests-assisted-ai-context-body">
          <p className="customer-requests-muted">
            Copy-only helpers for an external AI tool. No images, URLs, or customer account data are
            included. Attach reference files separately as REFERENCE_IMAGE_1…
            {hasRefs ? ` (${referenceImages.length} attached on this request).` : " (none on this request)."}
          </p>

          <div aria-live="polite" className="visually-hidden">
            {liveAnnounce}
          </div>

          <section className="customer-requests-assisted-ai-context-section">
            <div className="customer-requests-assisted-ai-context-section-head">
              <h3>AI Prompt</h3>
              <Button
                {...copyButtonProps("prompt")}
                onClick={() => void handleCopy("prompt", "AI Prompt", prompt)}
              />
            </div>
            <pre className="customer-requests-assisted-ai-context-pre">{prompt}</pre>
          </section>

          <section className="customer-requests-assisted-ai-context-section">
            <div className="customer-requests-assisted-ai-context-section-head">
              <h3>Context JSON</h3>
              <Button
                {...copyButtonProps("json")}
                onClick={() => void handleCopy("json", "Context JSON", jsonText)}
              />
            </div>
            <pre className="customer-requests-assisted-ai-context-pre">{jsonText}</pre>
          </section>

          <section className="customer-requests-assisted-ai-context-section">
            <div className="customer-requests-assisted-ai-context-section-head">
              <h3>Full AI Input</h3>
              <Button
                {...copyButtonProps("full")}
                onClick={() => void handleCopy("full", "Full AI Input", fullInput)}
              />
            </div>
            <pre className="customer-requests-assisted-ai-context-pre is-full">{fullInput}</pre>
          </section>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose} type="button" variant="secondary">
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
