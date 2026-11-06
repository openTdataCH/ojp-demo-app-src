import { DomSanitizer, SafeHtml } from "@angular/platform-browser";

import * as OJP_Types from 'ojp-shared-types';
import * as OJP from 'ojp-sdk';

import { AnyPtSituationElement } from "../types/_all";

export class SituationContent {
  public situationNumber: string;
  public summaries: string[];
  public descriptions: string[];
  public safeDetails: SafeHtml[];

  private constructor(situationNumber: string, summaries: string[], descriptions: string[], safeDetails: SafeHtml[]) {
    this.situationNumber = situationNumber;
    this.summaries = summaries;
    this.descriptions = descriptions;
    this.safeDetails = safeDetails;
  }

  public static initWithData(sanitizer: DomSanitizer, situationNumber: string, summaries: string[], descriptions: string[], detailTexts: string[]) {
    const safeDetails = SituationContent.computeSafeItems(sanitizer, detailTexts);
    const situationContent = new SituationContent(situationNumber, summaries, descriptions, safeDetails);
    
    return situationContent;
  }

  public static initWithAnySituationSchema(sanitizer: DomSanitizer, version: OJP.OJP_VERSION, schema: AnyPtSituationElement, language: OJP.Language): SituationContent[] {
    try {
      if (version === '2.0') {
        return SituationContent.initWithSituationSchema(sanitizer, schema as OJP_Types.PtSituationElement, language);
      } else {
        return SituationContent.initWithLegacySituationSchema(sanitizer, schema as OJP_Types.OJPv1_PtSituationElement);
      }
    } catch (error) {
      console.error('SituationContent.initWithAnySituationSchema - skipping malformed situation', error, schema);
      return [];
    }
  }

  public static initWithSituationSchema(sanitizer: DomSanitizer, schema: OJP_Types.PtSituationElement, language: OJP.Language): SituationContent[] {
    const publishingActions = schema.publishingActions?.publishingAction ?? [];
    const situationNumber = schema.situationNumber;

    const situationsContent: SituationContent[] = [];

    publishingActions.forEach(publishingAction => {
      const summaryTexts: string[] = [];
      const descriptionTexts: string[] = [];
      const detailTexts: string[] = [];
      
      publishingAction.passengerInformationAction.forEach(passengerInformationAction => {
        passengerInformationAction.textualContent.forEach(textualContent => {
          SituationContent.appendTextsForLanguage(textualContent.summaryContent, 'summaryText', language, summaryTexts);

          if (textualContent.descriptionContent) {
            textualContent.descriptionContent.forEach(item => {
              SituationContent.appendTextsForLanguage(item, 'descriptionText', language, descriptionTexts);
            });
          }

          if (textualContent.consequenceContent) {
            textualContent.consequenceContent.forEach(item => {
              SituationContent.appendTextsForLanguage(item, 'consequenceText', language, detailTexts);
            });
          }

          if (textualContent.durationContent) {
            SituationContent.appendTextsForLanguage(textualContent.durationContent, 'durationText', language, detailTexts);
          }

          if (textualContent.reasonContent) {
            SituationContent.appendTextsForLanguage(textualContent.reasonContent, 'reasonText', language, detailTexts);
          }

          if (textualContent.recommendationContent) {
            textualContent.recommendationContent.forEach(item => {
              SituationContent.appendTextsForLanguage(item, 'recommendationText', language, detailTexts);
            });
          }

          if (textualContent.remarkContent) {
            textualContent.remarkContent.forEach(item => {
              SituationContent.appendTextsForLanguage(item, 'remark', language, detailTexts);
            });
          }
          const infoLinks = textualContent.infoLink ?? [];
          infoLinks.forEach(infoLink => {
            // Some responses contain a single label despite the declared array type.
            const labels = infoLink.label as string | string[] | undefined;
            if (Array.isArray(labels) && labels.length > 0) {
              SituationContent.appendTextsForLanguage(infoLink, 'label', language, detailTexts);
            } else if (typeof labels === 'string' && labels.length > 0) {
              SituationContent.appendTextsForLanguage(infoLink, 'label', language, detailTexts);
            } else {
              detailTexts.push(infoLink.uri);
            }
          });
        });
      });

      if (summaryTexts.length === 0) {
        console.log('SituationContent.initWithSituationSchema - ERROR: no summary found');
        console.log(publishingAction);
        return;
      }

      const safeDetails = SituationContent.computeSafeItems(sanitizer, detailTexts);

      const situationContent = new SituationContent(situationNumber, summaryTexts, descriptionTexts, safeDetails);
      situationsContent.push(situationContent);
    });

    return situationsContent;
  }

  private static appendTextsForLanguage(content: object, textKey: string, language: OJP.Language, target: string[]): void {
    const contentWithAttributes = content as Record<string, unknown>;
    const textValues = contentWithAttributes[textKey];
    let texts: string[];
    if (Array.isArray(textValues)) {
      texts = textValues;
    } else if (typeof textValues === 'string') {
      texts = [textValues];
    } else {
      throw new Error('Missing or invalid situation text: ' + textKey);
    }

    // The SDK flattens XML language attributes into parallel arrays, e.g. summaryText.@_lang.
    const textLanguages = contentWithAttributes[textKey + '.@_lang'];
    texts.forEach((text, index) => {
      let textLanguage = textLanguages;
      if (Array.isArray(textLanguages)) {
        textLanguage = textLanguages[index];
      }

      if (typeof textLanguage === 'string') {
        const baseLanguage = textLanguage.toLowerCase().split('-')[0];
        if (baseLanguage !== language) {
          return;
        }
      }

      target.push(text);
    });
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

    // OJPv1 is using one sumamry
    const situationContent = new SituationContent(situationNumber, [summary], descriptionTexts, safeDetails);
    const situationsContent = [situationContent];
    
    return situationsContent;
  }
}
