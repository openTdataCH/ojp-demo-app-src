import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { CreateIssueBody } from '../types/_all';

interface CreateIssueResponse {
  issue_url: string,
  gists: string[],
}

@Injectable({
  providedIn: 'root',
})
export class HTTP_Service {
  constructor(private http: HttpClient) {}

  public async createIssue(issueBody: CreateIssueBody): Promise<CreateIssueResponse> {
    const url = 'https://tools.odpch.ch/github-proxy/ojp_sdk_issue';

    const params = new HttpParams()
      .set('rand', Date.now().toString());

    const response = this.http.post<CreateIssueResponse>(url, issueBody);

    return await firstValueFrom(response);
  }
}
