import { Component } from '@angular/core';

import * as OJP from './shared/ojp-sdk/index'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'ojp-demo-app';

  onLocationSelected(location: OJP.Location, originType: string) {
    console.log('onLocationSelected ' + originType);
    console.log(location);
  }
}
