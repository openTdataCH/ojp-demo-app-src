import { SafeHtml } from "@angular/platform-browser";

// Derived from OJP_Legacy.SituationContent but with SafeHtml rows
export interface SituationContent {
  summary: string;
  descriptions: string[];
  safeDetails: SafeHtml[];
}
