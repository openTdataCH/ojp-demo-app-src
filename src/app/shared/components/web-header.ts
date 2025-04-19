import { Component, OnInit } from '@angular/core';
import { AppService } from '../services/app.service';

interface PageModel {
  headerText: string,
};

@Component({
  selector: 'web-header',
  templateUrl: './web-header.html',
})
export class WebHeaderComponent implements OnInit {
  public model: PageModel;

  constructor(private appService: AppService) {
    this.model = {
      headerText: this.appService.baseTitle,
    };
  }

  ngOnInit(): void {
  }
}
