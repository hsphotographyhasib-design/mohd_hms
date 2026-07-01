/**
 * TopUtilityBar — Full-width sticky contact information bar.
 *
 * Three-section layout (desktop):
 *   Left:   📍 Bandar Seri Begawan, Brunei  (opens Google Maps)
 *   Center: ✉ info@mohdhms.com             (opens mailto)
 *   Right:  ⚠ 24/7 Emergency: +673 999 9999 (tel: on mobile)
 *
 * Mobile (<768px): two rows — location first, email + emergency second.
 *
 * Pure CSS hover effects — no client JavaScript required.
 * Server Component.
 */

function LocationIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function TopUtilityBar() {
  return (
    <div
      className="w-full sticky top-0 z-50"
      style={{ backgroundColor: '#0A2F1F' }}
      role="banner"
      aria-label="Company contact information"
    >
      {/* ── Desktop & Tablet: single row, 42px ── */}
      <div
        className="hidden md:flex items-center justify-between w-full"
        style={{
          height: '42px',
          paddingLeft: '32px',
          paddingRight: '32px',
          fontFamily: 'var(--font-poppins), Poppins, sans-serif',
          fontSize: '14px',
          fontWeight: 500,
          color: '#FFFFFF',
        }}
      >
        {/* Left: Location */}
        <div className="flex items-center">
          <a
            href="https://www.google.com/maps/search/Bandar+Seri+Begawan,+Brunei"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open location on Google Maps: Bandar Seri Begawan, Brunei"
            className="utility-link flex items-center gap-2 min-h-[44px] min-w-[44px] px-1"
          >
            <LocationIcon />
            <span className="whitespace-nowrap">Bandar Seri Begawan, Brunei</span>
          </a>
        </div>

        {/* Center: Email */}
        <div className="flex items-center">
          <a
            href="mailto:info@mohdhms.com"
            aria-label="Send email to info@mohdhms.com"
            className="utility-link flex items-center gap-2 min-h-[44px] min-w-[44px] px-1"
          >
            <EmailIcon />
            <span className="whitespace-nowrap">info@mohdhms.com</span>
          </a>
        </div>

        {/* Right: Emergency */}
        <div className="flex items-center">
          <a
            href="tel:+6739999999"
            aria-label="Call 24/7 Emergency Hotline: +673 999 9999"
            className="utility-link flex items-center gap-2 min-h-[44px] min-w-[44px] px-1"
          >
            <WarningIcon />
            <span className="whitespace-nowrap">24/7 Emergency: +673 999 9999</span>
          </a>
        </div>
      </div>

      {/* ── Mobile (<768px): two rows ── */}
      <div
        className="flex md:hidden flex-col items-center justify-center w-full"
        style={{
          minHeight: '42px',
          paddingLeft: '16px',
          paddingRight: '16px',
          paddingTop: '6px',
          paddingBottom: '6px',
          fontFamily: 'var(--font-poppins), Poppins, sans-serif',
          fontSize: '13px',
          fontWeight: 500,
          color: '#FFFFFF',
          gap: '4px',
        }}
      >
        {/* Row 1: Location */}
        <a
          href="https://www.google.com/maps/search/Bandar+Seri+Begawan,+Brunei"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open location on Google Maps: Bandar Seri Begawan, Brunei"
          className="utility-link flex items-center justify-center gap-2 min-h-[44px] min-w-[44px]"
        >
          <LocationIcon />
          <span>Bandar Seri Begawan, Brunei</span>
        </a>

        {/* Row 2: Email + Emergency */}
        <div className="flex items-center justify-center gap-4">
          <a
            href="mailto:info@mohdhms.com"
            aria-label="Send email to info@mohdhms.com"
            className="utility-link flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-1"
          >
            <EmailIcon />
            <span>info@mohdhms.com</span>
          </a>
          <span className="text-white/30">|</span>
          <a
            href="tel:+6739999999"
            aria-label="Call 24/7 Emergency: +673 999 9999"
            className="utility-link flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-1"
          >
            <WarningIcon />
            <span>24/7 Emergency: +673 999 9999</span>
          </a>
        </div>
      </div>
    </div>
  );
}