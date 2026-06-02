import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { APP_STAGE, DEBUG_LEVEL, DEFAULT_APP_STAGE, OJP_VERSION } from '../../config/constants';

@Injectable({
  providedIn: 'root',
})
export class AppService {
  public baseTitle: string;
  public bgMainClassName: 'ojpv2-prod' | 'ojpv1-beta' | 'ojpv2-beta';

  constructor(private title: Title) {
    this.baseTitle = (() => {
      const titleParts: string[] = [
        'OJP Demo',
      ];

      if (DEBUG_LEVEL === 'DEBUG') {
        titleParts.push('BETA');
      }
      
      titleParts.push('OJP ' + OJP_VERSION);

      const titleS = titleParts.join(' - ');

      return titleS;
    })();

    this.title.setTitle(this.baseTitle);

    this.bgMainClassName = (() => {
      const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
      if (!isBrowser) {
        return 'ojpv2-prod';
      }
  
      if (window.location.hostname.includes('github.io')) {
        return 'ojpv2-prod';
      }

      if (OJP_VERSION === '2.0') {
        return 'ojpv2-beta'
      } else {
        return 'ojpv1-beta';
      }
    })();
  }

  setTitle(title: string, baseTitle = this.baseTitle): void {
    this.title.setTitle(title + ' | ' + baseTitle);
  }

  getTitle(): string {
    return this.title.getTitle();
  }

  private computeHeaderTitle(stage: APP_STAGE): string {
    const titleParts: string[] = [
      'OJP Demo',
    ];

    const isOJPv2 = OJP_VERSION === '2.0';
    if (isOJPv2) {
      if (stage !== DEFAULT_APP_STAGE) {
        titleParts.push(stage);
      }
    } else {
      // example: OJP Demo - OJP 1.0
      const titlePartsV1 = ['OJP ' + OJP_VERSION];
      if (stage !== DEFAULT_APP_STAGE) {
        // example: OJP Demo - OJP 1.0 (INT)
        titlePartsV1.push(' (' + stage + ')');
      }
      titleParts.push(titlePartsV1.join(''));
    }

    const titleS = titleParts.join(' - ');

    return titleS;
  }
}
