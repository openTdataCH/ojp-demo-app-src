import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

import * as OJP from '../shared/ojp-sdk/index'

@Component({
  selector: 'app-search-form',
  templateUrl: './search-form.component.html',
})
export class SearchFormComponent implements OnInit {
  formGroup: FormGroup

  @Output() fromLocationSelected = new EventEmitter<OJP.Location>();
  @Output() toLocationSelected = new EventEmitter<OJP.Location>();

  constructor() {
    const nowDate = new Date()
    const timeFormatted = OJP.DateHelpers.formatTimeHHMM(nowDate);

    this.formGroup = new FormGroup({
      date: new FormControl(nowDate),
      time: new FormControl(timeFormatted)
    })
  }

  ngOnInit() {}

  onLocationSelected(location: OJP.Location, originType: string) {
    if (originType === 'from') {
      this.fromLocationSelected.emit(location)
    } else {
      this.toLocationSelected.emit(location)
    }
  }

}
