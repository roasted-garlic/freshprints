'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { ChevronLeftIcon, ChevronRightIcon } from '../../shared/components/PortalIcons';

interface CatalogDiscoveryCarouselProps {
  title: string;
  onViewAll: () => void;
  children: ReactNode;
}

export function CatalogDiscoveryCarousel({ title, onViewAll, children }: CatalogDiscoveryCarouselProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const rail = railRef.current;
    if (!rail) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const maxScroll = rail.scrollWidth - rail.clientWidth;
    setCanScrollLeft(rail.scrollLeft > 4);
    setCanScrollRight(maxScroll - rail.scrollLeft > 4);
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    updateScrollState();
    rail.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    const resizeObserver = new ResizeObserver(() => updateScrollState());
    resizeObserver.observe(rail);

    return () => {
      rail.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
      resizeObserver.disconnect();
    };
  }, [children, updateScrollState]);

  function scrollByDirection(direction: -1 | 1) {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    const amount = Math.max(rail.clientWidth * 0.75, 240);
    rail.scrollBy({ left: direction * amount, behavior: 'smooth' });
  }

  return (
    <section className="catalog-discovery-section" aria-label={title}>
      <header className="catalog-discovery-section-header">
        <h2 className="catalog-discovery-section-title">{title}</h2>
        <div className="catalog-discovery-section-actions">
          <button className="catalog-discovery-view-all" onClick={onViewAll} type="button">
            View all
          </button>
        </div>
      </header>

      <div
        className={`catalog-discovery-carousel${canScrollLeft ? ' has-fade-left' : ''}${canScrollRight ? ' has-fade-right' : ''}`}
      >
        {canScrollLeft ? (
          <>
            <div aria-hidden="true" className="catalog-discovery-fade catalog-discovery-fade--left" />
            <button
              aria-label={`Scroll ${title} left`}
              className="catalog-discovery-nav catalog-discovery-nav--prev"
              onClick={() => scrollByDirection(-1)}
              type="button"
            >
              <ChevronLeftIcon />
            </button>
          </>
        ) : null}

        <div className="catalog-discovery-rail" ref={railRef}>
          {children}
        </div>

        {canScrollRight ? (
          <>
            <div aria-hidden="true" className="catalog-discovery-fade catalog-discovery-fade--right" />
            <button
              aria-label={`Scroll ${title} right`}
              className="catalog-discovery-nav catalog-discovery-nav--next"
              onClick={() => scrollByDirection(1)}
              type="button"
            >
              <ChevronRightIcon />
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
