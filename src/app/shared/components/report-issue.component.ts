import { Component, Inject } from '@angular/core';
import { SBB_DIALOG_DATA } from '@sbb-esta/angular/dialog';

import * as OJP from 'ojp-sdk';

import { HTTP_Service } from '../services/http.service';
import { UserTripService } from '../services/user-trip.service';
import { OJP_VERSION } from '../../config/constants';

@Component({
  selector: 'report-issue',
  templateUrl: './report-issue.component.html',
})
export class ReportIssueComponent {
  public issueTitle = '[TR issue] ';
  public isLoading = false;
  public errorMessage: string | null = null;
  public gistLinks: { request: string; response: string } | null = null;

  public metadataRows: string[] = [];

  constructor(
    private httpService: HTTP_Service,
    private userTripService: UserTripService,
    @Inject(SBB_DIALOG_DATA) private requestInfo: OJP.RequestInfo | null,
  ) {
    this.updateMetadataRows(window.location.href);
  }

  public async createGists(): Promise<void> {
    if (this.isLoading || this.gistLinks) {
      return;
    }

    this.errorMessage = null;
    if (!this.requestInfo?.requestXML || !this.requestInfo?.responseXML) {
      this.errorMessage = 'Request and response XML are required to create gists.';
      return;
    }

    this.isLoading = true;
    try {
      const gists = await this.httpService.createGists({
        requestXML: this.requestInfo.requestXML,
        responseXML: this.requestInfo.responseXML,
      });
      this.gistLinks = gists;
      const updateXMLRow = (row: string): string => {
        if (row.startsWith('RequestXML:')) return `RequestXML: ${gists.request}`;
        if (row.startsWith('ResponseXML:')) return `ResponseXML: ${gists.response}`;
        return row;
      };
      this.metadataRows = this.metadataRows.map(updateXMLRow);
    } catch (error) {
      this.errorMessage = 'Could not create gists. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  public openGitHubIssue(): void {
    if (this.isLoading) {
      return;
    }

    const url = new URL('https://github.com/openTdataCH/ojp-meta/issues/new');
    url.search = new URLSearchParams({
      template: '1-issue.yml',
      title: this.issueTitle,
      diagnostics: this.metadataRows.join('\n'),
      stage: this.userTripService.currentAppStage.replace(/^V2-/, ''),
    }).toString();
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  }

  public updateMetadataRows(requestURL: string) {
    const screenResolution = `${screen.width}x${screen.height} - ratio ${window.devicePixelRatio}x`;
    const viewportResolution = `${window.innerWidth}x${window.innerHeight}`;
    const ua = navigator.userAgent;

    this.metadataRows = [
      'RequestXML: ' + (this.gistLinks?.request ?? ''),
      'ResponseXML: ' + (this.gistLinks?.response ?? ''),
      'URL: ' + requestURL,
      'OJP version: ' + OJP_VERSION,
      'ojp-sdk version: ' + OJP.SDK_VERSION,
      'viewport-resolution: ' + viewportResolution,
      'screen-resolution: ' + screenResolution,
      'user-agent:' + ua,
    ];
  }
}
