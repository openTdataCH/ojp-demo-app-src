import { Injectable } from '@angular/core';

import * as OJP from 'ojp-sdk-v1';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  public language: OJP.Language;

  constructor() {
    this.language = this.guessLanguage();
  }

  private guessLanguage(): OJP.Language {
    const queryParams = new URLSearchParams(document.location.search);
    let langQueryParam = queryParams.get('lang');
    if (langQueryParam !== null) {
      langQueryParam = langQueryParam.trim().toLowerCase();
      if (langQueryParam === 'de') {
        return 'de'
      }
      if (langQueryParam === 'en') {
        return 'en'
      }
      if (langQueryParam === 'fr') {
        return 'fr'
      }
      if (langQueryParam === 'it') {
        return 'it'
      }
    }

    const supportedLanguages: Record<string, OJP.Language> = {
      'de': 'de',
      'de-DE': 'de',
      'de-AT': 'de',
      'de-CH': 'de',

      'en': 'en',
      'en-US': 'en',
      'en-GB': 'en',
      'en-AU': 'en',
      'en-CA': 'en',
      
      'fr': 'fr',
      'fr-FR': 'fr',
      'fr-CA': 'fr',
      'fr-BE': 'fr',
      'fr-CH': 'fr',

      'it': 'it',
      'it-IT': 'it',
      'it-CH': 'it',
    };

    const browserLanguages = navigator.languages ? navigator.languages : [navigator.language];

    for (const lang of browserLanguages) {
      const baseLang = lang.split('-')[0];
      if (supportedLanguages[lang]) {
        return supportedLanguages[lang];
      } else if (supportedLanguages[baseLang]) {
        return supportedLanguages[baseLang];
      }
    }

    return 'en';
  }
}