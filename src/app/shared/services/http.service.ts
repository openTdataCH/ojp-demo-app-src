import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { CreateIssueBody } from '../types/_all';

interface CreateIssueResponse {
  issue_url: string,
  gists: string[],
}

interface CreateGistsBody {
  requestXML: string;
  responseXML: string;
}

interface CreateGistsResponse {
  request: string;
  response: string;
}

@Injectable({
  providedIn: 'root',
})
export class HTTP_Service {
  constructor(private http: HttpClient) {}

  public async createIssue(issueBody: CreateIssueBody): Promise<CreateIssueResponse> {
    const url = 'https://tools.opentransportdata.swiss/github-proxy/ojp_sdk_issue';

    const response = this.http.post<CreateIssueResponse>(url, issueBody);

    return await firstValueFrom(response);
  }

  public async createGists(body: CreateGistsBody): Promise<CreateGistsResponse> {
    const url = 'https://tools.opentransportdata.swiss/github-proxy/ojp_tr_gist';
    const response = this.http.post<CreateGistsResponse>(url, body);

    return await firstValueFrom(response);
  }
}
