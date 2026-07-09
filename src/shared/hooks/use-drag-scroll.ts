'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// ============================================================
// TYPES
// ============================================================

interface UseDragScrollOptions {
  /** Pixels of movement before treating interaction as a drag (default: 5) */
  threshold?: number;
}

interface ContainerProps {
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  className: string;
  style: React.CSSProperties;
}

interface UseDragScrollReturn {
  /** Whether the user is currently dragging */
  isDragging: boolean;
  /** Synchronous ref to check if dragging (useful in callbacks to suppress other behavior) */
  isDraggingRef: React.RefObject<boolean>;
  /** Props to spread onto the scrollable container element */
  getContainerProps: () => ContainerProps;
}

// ============================================================
// HOOK
// ============================================================

/**
 * Reusable hook that adds click-and-drag horizontal scrolling to any container.
 *
 * Desktop: mouse down → hold → drag left/right → release to stop.
 * Mobile/tablet: native touch scrolling (momentum, flick) works out of the box
 *               via the existing `overflow-x: auto` on the container.
 *
 * A movement threshold prevents accidental drags from blocking normal clicks.
 * After a drag ends, the next click event is suppressed so dropdowns / links
 * don't fire spuriously.
 */
export function useDragScroll(
  containerRef: React.RefObject<HTMLElement | null>,
  options: UseDragScrollOptions = {}
): UseDragScrollReturn {
  const { threshold = 5 } = options;

  // ---- Refs (mutable, no re-renders) ----
  const isDraggingRef = useRef(false);
  const hasDragged = useRef(false);       // true once the pointer moved > threshold
  const justDragged = useRef(false);      // true briefly after drag-end to block the click
  const startX = useRef(0);
  const startScrollLeft = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const velocity = useRef(0);

  // ---- Reactive state (only isDragging for cursor / selection style) ----
  const [dragging, setDragging] = useState(false);

  // ============================================================
  // MOUSE DOWN — start tracking
  // ============================================================

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only left button
      if (e.button !== 0) return;

      const container = containerRef.current;
      if (!container) return;

      isDraggingRef.current = true;
      hasDragged.current = false;
      startX.current = e.clientX;
      startScrollLeft.current = container.scrollLeft;
      lastX.current = e.clientX;
      lastTime.current = performance.now();
      velocity.current = 0;
    },
    [containerRef]
  );

  // ============================================================
  // MOUSE MOVE — scroll the container
  // ============================================================

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const container = containerRef.current;
      if (!container) return;

      const dx = e.clientX - startX.current;

      // Before the threshold is exceeded, do nothing (preserve normal click)
      if (!hasDragged.current && Math.abs(dx) < threshold) return;

      // First time we cross the threshold — activate drag mode
      if (!hasDragged.current) {
        hasDragged.current = true;
        setDragging(true);
      }

      // Update velocity tracking
      const now = performance.now();
      const dt = now - lastTime.current;
      if (dt > 0) {
        velocity.current = (e.clientX - lastX.current) / dt;
      }
      lastX.current = e.clientX;
      lastTime.current = now;

      // Apply scroll position synchronously.
      // Setting scrollLeft doesn't cause layout thrashing —
      // the browser batches multiple assignments within a single frame.
      container.scrollLeft = startScrollLeft.current - dx;
    },
    [containerRef, threshold]
  );

  // ============================================================
  // MOUSE UP — stop dragging
  // ============================================================

  const stopDrag = useCallback(() => {
    if (!isDraggingRef.current) return;

    isDraggingRef.current = false;

    if (hasDragged.current) {
      // Block the next click event so menu items / dropdowns don't fire
      justDragged.current = true;
      setTimeout(() => {
        justDragged.current = false;
      }, 0);

      // Apply a bit of momentum after the user releases
      const container = containerRef.current;
      if (container && Math.abs(velocity.current) > 0.05) {
        // Scale velocity → pixel distance (tuneable)
        const momentum = velocity.current * 250;
        container.scrollBy({ left: -momentum, behavior: 'smooth' });
      }
    }

    setDragging(false);
  }, [containerRef]);

  // ============================================================
  // MOUSE LEAVE — cancel drag when pointer leaves the container
  // ============================================================

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      // Only cancel if we were actually dragging (past threshold)
      if (hasDragged.current) {
        stopDrag();
      }
    },
    [stopDrag]
  );

  // ============================================================
  // CLICK — suppress click right after a drag
  // ============================================================

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (justDragged.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  // ============================================================
  // DOCUMENT-LEVEL LISTENERS (mousemove + mouseup)
  // ============================================================

  useEffect(() => {
    // mousemove is passive because we never call preventDefault on it
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseup', stopDrag);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopDrag);
    };
  }, [handleMouseMove, stopDrag]);

  // ============================================================
  // RETURNED CONTAINER PROPS
  // ============================================================

  const getContainerProps = useCallback((): ContainerProps => {
    return {
      onMouseDown: handleMouseDown,
      onMouseLeave: handleMouseLeave,
      onClick: handleClick,
      className: dragging ? 'cursor-grabbing' : 'cursor-grab',
      style: dragging
        ? { userSelect: 'none', WebkitUserSelect: 'none' }
        : {},
    };
  }, [handleMouseDown, handleMouseLeave, handleClick, dragging]);

  return {
    isDragging: dragging,
    isDraggingRef,
    getContainerProps,
  };
}