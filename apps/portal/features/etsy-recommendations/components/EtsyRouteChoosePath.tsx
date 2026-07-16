'use client';

import { Binoculars, Palette, Sparkles } from 'lucide-react';
import type { Ref, RefObject } from 'react';

interface EtsyRouteChoosePathProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  onFindDesign: () => void;
}

export function EtsyRouteChoosePath({ headingRef, onFindDesign }: EtsyRouteChoosePathProps) {
  return (
    <section aria-labelledby="etsy-route-choose-title" className="etsy-route-choose">
      <header className="etsy-route-choose-header">
        <h1
          className="etsy-route-choose-title"
          id="etsy-route-choose-title"
          ref={headingRef as Ref<HTMLHeadingElement>}
          tabIndex={-1}
        >
          How can we help with your design?
        </h1>
        <p className="portal-muted etsy-route-choose-lead">
          Choose how you want design help. Tell us what you are looking for and we will help you
          find matching designs.
        </p>
      </header>

      <div className="etsy-route-cards">
        <article className="etsy-route-card etsy-route-card-active">
          <div aria-hidden="true" className="etsy-route-card-icon">
            <Binoculars absoluteStrokeWidth strokeWidth={1.25} />
          </div>
          <div className="etsy-route-card-body">
            <h2 className="etsy-route-card-title">Help Me Find a Design</h2>
            <p className="etsy-route-card-description">
              Tell us what you are looking for and we will search for designs that may match.
            </p>
          </div>
          <button
            className="portal-button portal-button-primary etsy-route-card-action"
            onClick={onFindDesign}
            type="button"
          >
            Find a design
          </button>
        </article>

        <article aria-disabled="true" className="etsy-route-card etsy-route-card-disabled">
          <div aria-hidden="true" className="etsy-route-card-icon">
            <Sparkles absoluteStrokeWidth strokeWidth={1.25} />
          </div>
          <div className="etsy-route-card-body">
            <div className="etsy-route-card-badge-row">
              <h2 className="etsy-route-card-title">Create My Design with AI</h2>
              <span className="etsy-route-card-badge">Coming soon</span>
            </div>
            <p className="etsy-route-card-description">
              Choose a design style and tell us what you want the design to include.
            </p>
          </div>
          <button
            aria-disabled="true"
            className="portal-button portal-button-secondary etsy-route-card-action"
            disabled
            type="button"
          >
            Coming soon
          </button>
        </article>

        <article aria-disabled="true" className="etsy-route-card etsy-route-card-disabled">
          <div aria-hidden="true" className="etsy-route-card-icon">
            <Palette absoluteStrokeWidth strokeWidth={1.25} />
          </div>
          <div className="etsy-route-card-body">
            <div className="etsy-route-card-badge-row">
              <h2 className="etsy-route-card-title">Fresh Prints Assisted Creation</h2>
              <span className="etsy-route-card-badge">Coming soon</span>
            </div>
            <p className="etsy-route-card-description">
              Send Fresh Prints the details for a design you would like us to help create.
            </p>
          </div>
          <button
            aria-disabled="true"
            className="portal-button portal-button-secondary etsy-route-card-action"
            disabled
            type="button"
          >
            Coming soon
          </button>
        </article>
      </div>
    </section>
  );
}
