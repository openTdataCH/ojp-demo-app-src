import { Component, OnInit } from '@angular/core';
import { AppService } from '../shared/services/app.service';
import { UserTripService } from '../shared/services/user-trip.service';

@Component({
  selector: 'station-board',
  templateUrl: './station-board.component.html',
  styleUrls: ['./station-board.component.scss'],
})
export class StationBoardComponent implements OnInit {
  constructor(private appService: AppService, public userTripService: UserTripService) {}

  ngOnInit(): void {
    this.appService.setTitle('StopEventRequest');
  }
}
