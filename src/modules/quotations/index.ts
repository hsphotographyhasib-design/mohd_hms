// ─── Components ───────────────────────────────────────────────────────────────
export { QuotationList } from './components/quotation-list';
export { QuotationDetail } from './components/quotation-detail';
export { QuotationForm } from './components/quotation-form';
export { NewQuotation } from './components/new-quotation';
export { QuotationA4Template } from './components/quotation-a4-template';
export type { QuotationA4TemplateProps } from './components/quotation-a4-template';
export { QuotationPreviewDialog } from './components/quotation-preview-dialog';
export type { QuotationPreviewDialogProps } from './components/quotation-preview-dialog';

// ─── Services ─────────────────────────────────────────────────────────────────
export {
  type LineItem,
  computeTotals,
  generateQuotationNo,
  addNewQuotationFields,
} from './services/quotation-helpers';
export {
  generateQuotationHtml,
  type QuotationPdfData,
} from './services/quotation-pdf-html';