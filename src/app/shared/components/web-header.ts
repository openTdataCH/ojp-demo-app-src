import { Component, OnInit } from '@angular/core';

import * as OJP from 'ojp-sdk';

import { AppService } from '../services/app.service';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'web-header',
  templateUrl: './web-header.html',
})
export class WebHeaderComponent implements OnInit {
  public languages: { code: OJP.Language; name: string }[] = [
    { code: 'de', name: 'Deutsch' },
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'it', name: 'Italiano' },
  ];

  constructor(public appService: AppService, public languageService: LanguageService) {

  }

  ngOnInit(): void {
  
  }

  public changeLanguage(language: OJP.Language): void {
    if (language === this.languageService.language) {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('lang', language);
    window.location.assign(url.toString());
  }
}
