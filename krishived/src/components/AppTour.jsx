import { useEffect, useState, useRef, useCallback } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useTour } from '../context/TourContext';

function getVisibleTarget(selector) {
  if (!selector) return null;
  const list = Array.from(document.querySelectorAll(selector));
  if (list.length === 0) return null;
  const visible = list.find((el) => {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden'
    );
  });
  return visible || list[0];
}

export default function AppTour() {
  const {
    isOpen,
    currentStep,
    currentStepIndex,
    totalSteps,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
  } = useTour();

  const [targetRect, setTargetRect] = useState(null);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  const cardRef = useRef(null);

  // Position updater
  const updateTargetPosition = useCallback(() => {
    if (!isOpen || !currentStep) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    setWindowSize({ width: w, height: h });

    const el = getVisibleTarget(currentStep.targetSelector);
    if (el) {
      const r = el.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      // Smart scroll on mobile and desktop: ensure target element is placed nicely
      if (r.top < 80 || r.bottom > h - 90) {
        window.scrollTo({
          top: Math.max(0, scrollTop + r.top - (h < 700 ? 50 : 90)),
          behavior: 'smooth',
        });
      }

      // Re-read coordinates after scroll
      setTimeout(() => {
        const activeEl = getVisibleTarget(currentStep.targetSelector);
        if (activeEl) {
          const updated = activeEl.getBoundingClientRect();
          setTargetRect({
            top: updated.top,
            left: updated.left,
            bottom: updated.bottom,
            right: updated.right,
            width: updated.width,
            height: updated.height,
          });
        }
      }, 150);
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep]);

  useEffect(() => {
    updateTargetPosition();
    window.addEventListener('resize', updateTargetPosition);
    window.addEventListener('scroll', updateTargetPosition, true);

    return () => {
      window.removeEventListener('resize', updateTargetPosition);
      window.removeEventListener('scroll', updateTargetPosition, true);
    };
  }, [updateTargetPosition, currentStepIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        skipTour();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        prevStep();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, nextStep, prevStep, skipTour]);

  if (!isOpen || !currentStep) return null;

  const isLastStep = currentStepIndex === totalSteps - 1;
  const isMobile = windowSize.width < 640;

  // Measure card dimensions
  const cardWidth = Math.min(350, windowSize.width - 24);
  const cardHeight = cardRef.current?.offsetHeight || 220;
  const padding = isMobile ? 8 : 12;

  let placement = currentStep.position || 'bottom';
  let boxTop = 0;
  let boxLeft = 0;
  let arrowStyle = {};

  if (targetRect) {
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;

    const spaceBelow = windowSize.height - targetRect.bottom;
    const spaceAbove = targetRect.top;
    const spaceRight = windowSize.width - targetRect.right;
    const spaceLeft = targetRect.left;

    // Mobile specific: if target is in bottom nav area, always place above
    if (targetRect.bottom > windowSize.height - 100) {
      placement = 'top';
    } else if (targetRect.top < 90) {
      placement = 'bottom';
    } else {
      // Decide placement based on available vertical/horizontal room
      if (placement === 'bottom') {
        if (spaceBelow < cardHeight + 20 && spaceAbove > cardHeight + 20) {
          placement = 'top';
        }
      } else if (placement === 'top') {
        if (spaceAbove < cardHeight + 20 && spaceBelow > cardHeight + 20) {
          placement = 'bottom';
        }
      } else if (placement === 'right') {
        if (spaceRight < cardWidth + 20) {
          placement = spaceBelow > spaceAbove ? 'bottom' : 'top';
        }
      } else if (placement === 'left') {
        if (spaceLeft < cardWidth + 20) {
          placement = spaceBelow > spaceAbove ? 'bottom' : 'top';
        }
      }
    }

    // Calculate raw top/left
    if (placement === 'bottom') {
      boxTop = targetRect.bottom + padding;
      boxLeft = targetCenterX - cardWidth / 2;
    } else if (placement === 'top') {
      boxTop = targetRect.top - cardHeight - padding;
      boxLeft = targetCenterX - cardWidth / 2;
    } else if (placement === 'right') {
      boxLeft = targetRect.right + padding;
      boxTop = targetCenterY - cardHeight / 2;
    } else {
      // placement === 'left'
      boxLeft = targetRect.left - cardWidth - padding;
      boxTop = targetCenterY - cardHeight / 2;
    }

    // STRICT VIEWPORT CLAMPING: Box never overflows off the top, bottom, left, or right edge
    boxTop = Math.max(12, Math.min(boxTop, windowSize.height - cardHeight - (isMobile ? 70 : 16)));
    boxLeft = Math.max(12, Math.min(boxLeft, windowSize.width - cardWidth - 12));

    // Pointer Arrow alignment
    if (placement === 'bottom' || placement === 'top') {
      const arrowLeft = Math.max(20, Math.min(targetCenterX - boxLeft, cardWidth - 20));
      arrowStyle = {
        position: 'absolute',
        [placement === 'bottom' ? 'top' : 'bottom']: '-7px',
        left: `${arrowLeft}px`,
        transform: 'translateX(-50%) rotate(45deg)',
      };
    } else {
      const arrowTop = Math.max(20, Math.min(targetCenterY - boxTop, cardHeight - 20));
      arrowStyle = {
        position: 'absolute',
        [placement === 'right' ? 'left' : 'right']: '-7px',
        top: `${arrowTop}px`,
        transform: 'translateY(-50%) rotate(45deg)',
      };
    }
  } else {
    // Fallback centered at bottom with safe mobile nav clearance
    boxTop = windowSize.height - cardHeight - (isMobile ? 80 : 24);
    boxLeft = (windowSize.width - cardWidth) / 2;
  }

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Light non-intrusive backdrop */}
      <div
        onClick={skipTour}
        className="fixed inset-0 bg-ink/20 backdrop-blur-[1px] pointer-events-auto transition-opacity duration-300"
      />

      {/* Target Section Highlight Frame */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            top: `${Math.max(8, targetRect.top - 6)}px`,
            left: `${Math.max(8, targetRect.left - 6)}px`,
            width: `${Math.min(windowSize.width - 16, targetRect.width + 12)}px`,
            height: `${targetRect.height + 12}px`,
          }}
          className="pointer-events-none rounded-2xl ring-2 ring-canopy-500 shadow-[0_0_0_4px_rgba(34,197,94,0.25),0_8px_30px_rgba(0,0,0,0.15)] bg-canopy-600/5 transition-all duration-300 ease-out"
        >
          {/* Target Section Badge Tag */}
          <div className="absolute -top-3.5 left-4 px-2.5 py-0.5 rounded-full bg-canopy-700 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md border border-white/40 animate-in fade-in duration-200">
            <span className="h-1.5 w-1.5 rounded-full bg-turmeric-400 animate-pulse" />
            <span>Section {currentStepIndex + 1}/{totalSteps}</span>
          </div>
        </div>
      )}

      {/* Section-Anchored Pointer Message Box (Guaranteed In-Viewport & 100% Clickable) */}
      <div
        ref={cardRef}
        style={{
          position: 'fixed',
          top: `${boxTop}px`,
          left: `${boxLeft}px`,
          width: `${cardWidth}px`,
          zIndex: 10000,
        }}
        className="pointer-events-auto bg-white rounded-2xl p-5 border border-soil-200 shadow-2xl shadow-ink/25 transition-all duration-200 animate-in fade-in zoom-in-95"
      >
        {/* Pointer Arrow pointing directly to section */}
        {targetRect && (
          <div
            style={arrowStyle}
            className="w-3.5 h-3.5 bg-white border-l border-t border-soil-200 shadow-sm pointer-events-none z-10"
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-lg bg-canopy-100 text-canopy-800 flex items-center justify-center font-extrabold text-xs">
              {currentStepIndex + 1}
            </span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-canopy-700 bg-canopy-50 px-2 py-0.5 rounded-md border border-canopy-200/80">
              Demo Guide
            </span>
          </div>

          <button
            type="button"
            onClick={skipTour}
            className="p-1 rounded-lg text-soil-400 hover:text-ink hover:bg-soil-100 transition-colors cursor-pointer"
            title="Close Guide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Title & Subtitle */}
        <h3 className="text-base font-extrabold text-ink leading-snug">
          {currentStep.title}
        </h3>
        {currentStep.subtitle && (
          <p className="text-xs font-semibold text-turmeric-700 mt-0.5 mb-1.5">
            {currentStep.subtitle}
          </p>
        )}

        {/* Section Description */}
        <p className="text-xs text-soil-600 leading-relaxed mb-4">
          {currentStep.description}
        </p>

        {/* Footer controls */}
        <div className="flex items-center justify-between pt-3 border-t border-soil-100">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStepIndex
                    ? 'w-5 bg-canopy-600'
                    : 'w-1.5 bg-soil-200'
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-2.5 py-1.5 rounded-lg border border-soil-200 text-soil-700 text-xs font-bold hover:bg-soil-50 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
            )}

            <button
              type="button"
              onClick={isLastStep ? completeTour : nextStep}
              className="btn-primary !py-1.5 !px-3.5 !text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              {isLastStep ? (
                <>
                  <span>Finish</span>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  <span>Next Section</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
