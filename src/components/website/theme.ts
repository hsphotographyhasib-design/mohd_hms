// MOHD.HMS ENTERPRISE — Original Theme Tokens
// Extracted from mohd-hms-enterprise (4).html

export const THEME = {
  // Backgrounds
  paper: '#F7F8F3',
  paper2: '#FFFFFF',
  stone: '#ECEEE4',
  stone2: '#E4E7DA',

  // Greens
  forest: '#123B2B',
  forest2: '#0B281D',
  forest3: '#194E39',
  green: '#1E7A4B',
  greenBright: '#2E9D63',

  // Text
  ink: '#13241B',
  muted: '#566359',
  faint: '#8A968C',

  // Borders
  line: 'rgba(18,59,43,.16)',
  lineSoft: 'rgba(18,59,43,.09)',

  // Layout
  radius: '14px',
  radiusSm: '9px',
  radiusLg: '22px',
  container: '1220px',
  headerH: '72px',

  // Easing
  ease: 'cubic-bezier(.22,.7,.3,1)',

  // Fonts
  fontDisplay: "'Bricolage Grotesque', system-ui, sans-serif",
  fontBody: "'IBM Plex Sans', system-ui, sans-serif",
  fontMono: "'IBM Plex Mono', ui-monospace, monospace",
} as const;

export type ThemeKey = keyof typeof THEME;

// Re-export all components from theme.tsx so that import { SectionHeader, ... } from '../theme'
// resolves correctly (TypeScript picks .ts before .tsx when both exist).
export {
  SectionHeader,
  IconBox,
  ThemeSection,
  ThemeCard,
  ThemeButton,
  MonoLabel,
  DisplayHeading,
  Reveal,
  bodyStyle,
  Divider,
  PlaceholderFig,
  PageWrapper,
  ThemeLink,
} from './theme';

// Reusable CSS class names for common patterns
export const CLASSES = {
  container: 'max-w-[1220px] mx-auto px-7',
  section: 'py-24 relative',
  sectionStone: 'py-24 relative',
  sectionForest: 'py-24 relative bg-[#123B2B] text-[#F7F8F3]',

  // Section header: numbered label + title
  shead: 'mb-14 max-w-[880px]',
  sheadTop: 'flex items-center gap-4 mb-6',
  sheadIx: "font-['IBM_Plex_Mono',ui-monospace,monospace] text-[0.72rem] tracking-[0.16em] text-[#1E7A4B] uppercase whitespace-nowrap",
  sheadRule: 'flex-1 h-px bg-[rgba(18,59,43,.16)]',
  sheadH2: "font-['Bricolage_Grotesque',system-ui,sans-serif] text-[clamp(2rem,4.4vw,3.3rem)] font-semibold text-[#123B2B] leading-[1.04] tracking-[-0.02em] max-w-[16ch]",
  sheadLede: 'text-[#566359] text-[1.08rem] mt-[18px] max-w-[60ch]',

  // Cards
  card: 'bg-white border border-[rgba(18,59,43,.16)] rounded-[14px] p-6 transition-all duration-300',
  cardHover: 'hover:border-[#123B2B] hover:-translate-y-[3px]',

  // Buttons
  btnBase: "font-['IBM_Plex_Sans',system-ui,sans-serif] font-semibold text-[0.94rem] cursor-pointer inline-flex items-center gap-2.5 px-5.5 py-3 rounded-[9px] border border-transparent transition-all duration-[250ms] whitespace-nowrap",
  btnFill: 'bg-[#123B2B] text-[#F7F8F3] hover:bg-[#1E7A4B] hover:-translate-y-px',
  btnGreen: 'bg-[#1E7A4B] text-white hover:bg-[#2E9D63] hover:-translate-y-px',
  btnOut: 'bg-transparent border-[rgba(18,59,43,.16)] text-[#13241B] hover:border-[#123B2B] hover:bg-[#123B2B] hover:text-[#F7F8F3] hover:-translate-y-px',
  btnPaper: 'bg-[#F7F8F3] text-[#123B2B] hover:bg-white hover:-translate-y-px',

  // Mono label
  mono: "font-['IBM_Plex_Mono',ui-monospace,monospace]",

  // Display font
  disp: "font-['Bricolage_Grotesque',system-ui,sans-serif]",

  // Body font
  body: "font-['IBM_Plex_Sans',system-ui,sans-serif]",
} as const;
