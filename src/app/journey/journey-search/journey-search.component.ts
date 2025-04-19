import { Component, OnInit } from '@angular/core';
import { AppService } from '../../shared/services/app.service';

@Component({
  selector: 'journey-search',
  templateUrl: './journey-search.component.html',
  styleUrls: ['./journey-search.component.scss'],
})
export class JourneySearchComponent implements OnInit {
  constructor(private appService: AppService) {}

  ngOnInit(): void {
    this.appService.setTitle('TripRequest');
  }
}
