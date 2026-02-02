import { DomSanitizer, SafeHtml } from "@angular/platform-browser";

import * as OJP_Types from 'ojp-shared-types';
import * as OJP_Next from 'ojp-sdk-next';

import { AnyPtSituationElement } from "../types/_all";

export class SituationContent {
  public situationNumber: string;
  public summary: string;
  public descriptions: string[];
  public safeDetails: SafeHtml[];

  private constructor(situationNumber: string, summary: string, descriptions: string[], safeDetails: SafeHtml[]) {
    this.situationNumber = situationNumber;
    this.summary = summary;
    this.descriptions = descriptions;
    this.safeDetails = safeDetails;
  }

  public static initWithData(sanitizer: DomSanitizer, situationNumber: string, summary: string, descriptions: string[], detailTexts: string[]) {
    const safeDetails = SituationContent.computeSafeItems(sanitizer, detailTexts);
    const situationContent = new SituationContent(situationNumber, summary, descriptions, safeDetails);
    
    return situationContent;
  }

  public static initWithAnySituationSchema(sanitizer: DomSanitizer, version: OJP_Next.OJP_VERSION, schema: AnyPtSituationElement): SituationContent[] {
    if (version === '2.0') {
      return SituationContent.initWithSituationSchema(sanitizer, schema as OJP_Types.PtSituationElement);
    } else {
      return SituationContent.initWithLegacySituationSchema(sanitizer, schema as OJP_Types.OJPv1_PtSituationElement);
    }
  }

  public static initWithSituationSchema(sanitizer: DomSanitizer, schema: OJP_Types.PtSituationElement): SituationContent[] {
    const publishingActions = schema.publishingActions?.publishingAction ?? [];
    const situationNumber = schema.situationNumber;

    const situationsContent: SituationContent[] = [];

    publishingActions.forEach(publishingAction => {
      const summaryTexts: string[] = [];
      const descriptionTexts: string[] = [];
      const detailTexts: string[] = [];
      
      publishingAction.passengerInformationAction.forEach(passengerInformationAction => {
        passengerInformationAction.textualContent.forEach(textualContent => {
          summaryTexts.push(textualContent.summaryContent.summaryText);

          textualContent.descriptionContent.forEach(item => {
            descriptionTexts.push(item.descriptionText);
          });

          textualContent.consequenceContent.forEach(item => {
            detailTexts.push(item.consequenceText);
          });
          const durationText = textualContent.durationContent?.durationText ?? null;
          if (durationText !== null) {
            detailTexts.push(durationText);
          }
          const reasonText = textualContent.reasonContent?.reasonText ?? null;
          if (reasonText !== null) {
            detailTexts.push(reasonText);
          }
          textualContent.recommendationContent.forEach(item => {
            detailTexts.push(item.recommendationText);
          });
          textualContent.remarkContent.forEach(item => {
            detailTexts.push(item.remark);
          });
        });
      });

      if (summaryTexts.length === 0) {
        console.log('SituationContent.initWithSituationSchema - ERROR: no summary found');
        console.log(publishingAction);
        return;
      }

      if (summaryTexts.length > 1) {
        console.log('SituationContent.initWithSituationSchema - WARNING: more than 1 summary found, using first');
        console.log(publishingAction);
      }

      const firstSummary = summaryTexts[0];
      const safeDetails = SituationContent.computeSafeItems(sanitizer, detailTexts);

      const situationContent = new SituationContent(situationNumber, firstSummary, descriptionTexts, safeDetails);
      situationsContent.push(situationContent);
    });

    return situationsContent;
  }

  private static computeSafeItems(sanitizer: DomSanitizer, items: string[]) {
    const safeItems = items.map(detailS => {
      // HACK: always open in a new tab/window
      detailS = detailS.replace('<a href', '<a target="_blank" href');

      const textarea = document.createElement('textarea');
      textarea.innerHTML = detailS;
      const safeDetail = sanitizer.bypassSecurityTrustHtml(textarea.value);
      return safeDetail;
    });

    return safeItems;
  }

  public static initWithLegacySituationSchema(sanitizer: DomSanitizer, schema: OJP_Types.OJPv1_PtSituationElement) {
    const situationNumber = schema.situationNumber;
    const summary = schema.summary;
    const descriptionTexts = schema.description ?? [];
    const detailTexts = schema.detail ?? [];
    const safeDetails = SituationContent.computeSafeItems(sanitizer, detailTexts);

    const situationContent = new SituationContent(situationNumber, summary, descriptionTexts, safeDetails);
    const situationsContent = [situationContent];
    
    return situationsContent;
  }
}
