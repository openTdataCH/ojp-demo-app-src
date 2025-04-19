import { Component, OnInit } from '@angular/core';
import OJP_Legacy from './config/ojp-legacy';
import { AppService } from './shared/services/app.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  constructor(private appService: AppService) {

  }

  ngOnInit() {
    document.body.classList.add(this.appService.bgMainClassName);
  }
}
