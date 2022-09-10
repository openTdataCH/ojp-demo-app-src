import { Component, OnInit } from '@angular/core';

interface AppTab {
  link: string
  label: string
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  public appTabs: AppTab[];

  constructor() {
    this.appTabs = [
      {
        label: 'Journey Search',
        link: 'search'
      },
    ]
  }

  ngOnInit() {

  }
}
