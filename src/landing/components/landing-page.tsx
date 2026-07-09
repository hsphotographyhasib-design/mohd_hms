'use client';

import { useEffect, useRef, useCallback } from 'react';

interface LandingPageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
}

const BRIDGE_SCRIPT = `
(function() {
  function interceptClicks() {
    document.addEventListener('click', function(e) {
      var t = e.target;
      // Check if clicked element or ancestor is a sign-in link
      var link = t.closest('a') || t.closest('[role="button"]') || t.closest('.signin');
      if (!link) return;
      var text = (link.textContent || '').toLowerCase();
      var href = (link.getAttribute('href') || '');
      if (text.includes('sign in') || link.classList.contains('signin') || link.closest('.mp-act')) {
        e.preventDefault();
        e.stopPropagation();
        window.parent.postMessage('signin', '*');
      }
    });
  }
  // Try immediately, or wait for DOM
  if (document.body) {
    interceptClicks();
  } else {
    document.addEventListener('DOMContentLoaded', interceptClicks);
  }
})();
`;

export function LandingPage({ onSignIn }: LandingPageProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const injected = useRef(false);

  // Listen for postMessage from iframe
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data === 'signin' || e.data === 'getStarted') {
        onSignIn();
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSignIn]);

  // Inject bridge script into iframe after load
  const injectBridge = useCallback(() => {
    if (injected.current) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc || !doc.body) return;

      const script = doc.createElement('script');
      script.textContent = BRIDGE_SCRIPT;
      doc.head.appendChild(script);
      injected.current = true;
    } catch {
      // Will retry
    }
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    function handleLoad() {
      // Retry injection a few times since fonts/scripts may delay DOM readiness
      injectBridge();
      const timers = [
        setTimeout(injectBridge, 500),
        setTimeout(injectBridge, 1500),
        setTimeout(injectBridge, 3000),
      ];
      return () => timers.forEach(clearTimeout);
    }

    iframe.addEventListener('load', handleLoad);
    return () => {
      iframe.removeEventListener('load', handleLoad);
      injected.current = false;
    };
  }, [injectBridge]);

  return (
    <iframe
      ref={iframeRef}
      src="/landing.html"
      className="fixed inset-0 w-full h-full border-0"
      title="MOHD.HMS ENTERPRISE"
      style={{ zIndex: 0 }}
    />
  );
}