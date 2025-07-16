import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { DEBUG_LEVEL, OJP_VERSION } from '../../config/constants';

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
}