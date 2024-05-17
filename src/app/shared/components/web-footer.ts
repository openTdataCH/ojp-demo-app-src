import { Component, OnInit } from '@angular/core';

import * as OJP from 'ojp-sdk'

type PageModel = {
  sdkVersion: string,
  lastUpdate: string
}

@Component({
  selector: 'web-footer',
  templateUrl: './web-footer.html',
})
export class WebFooterComponent implements OnInit {
  public model: PageModel

  constructor() {
    this.model = {
      sdkVersion: OJP.SDK_VERSION,
      lastUpdate: '17.May 2024',
    }
  }

  ngOnInit() {

  }
}
