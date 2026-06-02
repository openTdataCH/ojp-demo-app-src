import { Component, OnInit } from '@angular/core';

import { AppService } from '../services/app.service';

@Component({
  selector: 'web-header',
  templateUrl: './web-header.html',
})
export class WebHeaderComponent implements OnInit {
  constructor(public appService: AppService) {

  }

  ngOnInit(): void {
  
  }
}
