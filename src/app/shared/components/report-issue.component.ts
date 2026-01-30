import { AfterViewInit, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import * as OJP_Next from 'ojp-sdk-next';

import { CreateIssueBody } from '../types/_all';
import { HTTP_Service } from '../services/http.service';
import { OJP_VERSION } from '../../config/constants';

interface PageModel {
  issueButtonCaption: string
  issueCreationState: 'IDLE' | 'PROCESSING' | 'DONE'
  issueURL: string | null,
  projects: {
    key: string
    caption: string
  }[],
};

@Component({
  selector: 'report-issue',
  // styleUrls: ['./report-issue.componentt.scss'],
  templateUrl: './report-issue.component.html',
})
export class ReportIssueComponent implements OnInit, AfterViewInit {
  public requestInfo: OJP_Next.RequestInfo | null;
  public model: PageModel;

  public form: FormGroup;

  private metadataRows: string[];
  
  constructor(private httpService: HTTP_Service, private fb: FormBuilder) {
    this.requestInfo = null;
    this.model = {
      issueButtonCaption: 'Create Issue',
      issueCreationState: 'IDLE',
      issueURL: null,
      projects: [
        { key: 'ojp2_backend_issues', caption: 'OJP 2.0 Backend Issues', },
        { key: 'ojp_siri_sx_current', caption: 'OJP DemoApp', },
      ],
    };

    this.form = this.fb.group({
      issueReporter: ['', Validators.required],
      issueTitle: ['', Validators.required],
      issueDescription: ['', Validators.required],
      projectId: ['ojp2_backend_issues'],
    });

    this.metadataRows = [];
  }

  ngOnInit(): void {

  }

  ngAfterViewInit(): void {
    
  }

  public async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const newMetadataRows = this.metadataRows.slice();
    newMetadataRows.unshift(...['reporter: ' + this.form.controls['issueReporter'].value.trim()]);

    const metadataSeparators = [
      '',
      '',
      '----',
      '',
    ];
    newMetadataRows.unshift(...metadataSeparators);
    const newMetadataRowsS = newMetadataRows.join('\n');

    const newDescription = this.form.controls['issueDescription'].value.trim() + newMetadataRowsS;
    this.setInputValue('issueDescription', newDescription);

    await this.createIssue();
  }

  // convenience shortcut for template
  public get f() {
    return this.form.controls;
  }

  private async createIssue() {
    if ((this.requestInfo === null) || (this.requestInfo.requestXML === null) || (this.requestInfo.responseXML === null)) {
      return;
    }

    const issueTitle = this.form.controls['issueTitle'].value.trim();
    const issueDescription = this.form.controls['issueDescription'].value.trim();
    const projectKey = this.form.controls['projectId'].value;

    const issueBody: CreateIssueBody = {
      title: issueTitle,
      description: issueDescription,
      requestXML: this.requestInfo.requestXML,
      responseXML: this.requestInfo.responseXML,
      projectKey: projectKey,
    };

    this.model.issueCreationState = 'PROCESSING';
    this.model.issueButtonCaption = 'Creating Issue ...';

    const createIssueResponse = await this.httpService.createIssue(issueBody);

    this.model.issueCreationState = 'DONE';
    this.model.issueButtonCaption = 'Done';

    this.model.issueURL = createIssueResponse.issue_url;
  }

  public setInputValue(inputName: 'issueTitle' | 'issueDescription', value: string) {
    this.form.controls[inputName].setValue(value);
  }

  public updateMetadataRows(requestURL: string) {
    const screenResolution = `${screen.width}x${screen.height} - ratio ${window.devicePixelRatio}x`;
    const viewportResolution = `${window.innerWidth}x${window.innerHeight}`;
    const ua = navigator.userAgent;

    this.metadataRows = [
      'URL: ' + requestURL,
      'OJP version: ' + OJP_VERSION,
      'ojp-sdk-legacy version: ' + OJP_Legacy.SDK_VERSION,
      'ojp-sdk-next version: ' + OJP_Next.SDK_VERSION,
      'viewport-resolution: ' + viewportResolution,
      'screen-resolution: ' + screenResolution,
      'user-agent:' + ua,
    ];
  }
}
