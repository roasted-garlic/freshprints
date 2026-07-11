'use client';

import type { PortalPrintProgressStage } from '@fresh-prints/shared/utils/portalPrintProgressStage';
import { getPortalPrintProgressStageLabel } from '@fresh-prints/shared/utils/portalPrintProgressStage';

const STAGES: PortalPrintProgressStage[] = ['queued', 'printing', 'done'];

interface PortalPrintRequestProgressPanelProps {
  activeStage: PortalPrintProgressStage;
  formattedElapsed?: string;
  isLive?: boolean;
  isLoading?: boolean;
  isPaused?: boolean;
  showElapsed?: boolean;
}

function getStatusChipLabel(input: {
  activeStage: PortalPrintProgressStage;
  isRunning: boolean;
  isLoading: boolean;
  isPaused: boolean;
}): string {
  if (input.isLoading) {
    return 'Loading';
  }
  if (input.activeStage === 'done') {
    return 'Finished';
  }
  if (input.isPaused) {
    return 'Paused';
  }
  if (input.isRunning || input.activeStage === 'printing') {
    return 'Running';
  }
  return 'Queued';
}

export function PortalPrintRequestProgressPanel({
  activeStage,
  formattedElapsed = '0:00',
  isLive = false,
  isLoading = false,
  isPaused = false,
  showElapsed = false,
}: PortalPrintRequestProgressPanelProps) {
  const activeIndex = Math.max(0, STAGES.indexOf(activeStage));
  const isRunning = !isLoading && (isLive || (activeStage === 'printing' && !isPaused));
  const elapsedIsPending = !showElapsed && !isRunning && !isPaused && activeStage !== 'done';
  const statusChip = getStatusChipLabel({ activeStage, isRunning, isLoading, isPaused });
  const showPulse = isRunning && activeStage === 'printing';

  return (
    <section
      aria-label="Print progress"
      className={[
        'portal-print-progress-panel',
        `is-stage-${activeStage}`,
        isRunning ? 'is-live' : '',
        isPaused ? 'is-paused' : '',
        activeStage === 'done' ? 'is-finished' : '',
        isLoading ? 'is-loading' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="portal-print-progress-readout" aria-live="polite">
        <div className="portal-print-progress-label-row">
          <span
            aria-hidden="true"
            className={['portal-print-progress-live-dot', showPulse ? 'is-pulsing' : '']
              .filter(Boolean)
              .join(' ')}
          />
          <p className="portal-eyebrow">Live printing</p>
          <span className="portal-print-progress-status-chip">{statusChip}</span>
        </div>

        <p
          className={['portal-print-progress-elapsed', elapsedIsPending ? 'is-pending' : '']
            .filter(Boolean)
            .join(' ')}
        >
          {elapsedIsPending ? '0:00' : formattedElapsed}
        </p>
      </div>

      <div className="portal-print-progress-side">
        <ol className="portal-print-progress-rail">
          {STAGES.map((stage, index) => {
            const isComplete = index < activeIndex;
            const isActive = index === activeIndex;
            const showCheck = isComplete || (isActive && stage === 'done');
            const segmentFilled = index < activeIndex;

            return (
              <li
                aria-current={isActive ? 'step' : undefined}
                className={[
                  'portal-print-progress-step',
                  isComplete ? 'is-complete' : '',
                  isActive ? 'is-active' : '',
                  isActive && showPulse ? 'is-live' : '',
                  segmentFilled ? 'has-filled-segment' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                key={stage}
              >
                {index < STAGES.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className={[
                      'portal-print-progress-segment',
                      segmentFilled ? 'is-filled' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  />
                ) : null}
                <span aria-hidden="true" className="portal-print-progress-marker">
                  {showCheck ? '✓' : null}
                </span>
                <span className="portal-print-progress-step-label">
                  {getPortalPrintProgressStageLabel(stage)}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
