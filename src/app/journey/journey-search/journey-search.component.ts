import { Component, OnInit } from '@angular/core';
import { AppService } from '../../shared/services/app.service';
import { UserTripService } from '../../shared/services/user-trip.service';

@Component({
  selector: 'journey-search',
  templateUrl: './journey-search.component.html',
  styleUrls: ['./journey-search.component.scss'],
})
export class JourneySearchComponent implements OnInit {
  constructor(private appService: AppService, public userTripService: UserTripService) {}

  ngOnInit(): void {
    this.appService.setTitle('TripRequest');
  }
}
