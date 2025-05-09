import { Component, OnInit } from '@angular/core';
import { AppService } from '../shared/services/app.service';
import { UserTripService } from '../shared/services/user-trip.service';

@Component({
  selector: 'trip-info',
  templateUrl: './trip-info.component.html',
  styleUrls: ['./trip-info.component.scss'],
})
export class TripInfoComponent implements OnInit {
  constructor(private appService: AppService, public userTripService: UserTripService) {}

  ngOnInit(): void {
    this.appService.setTitle('TripInfoRequest');
  }
}
