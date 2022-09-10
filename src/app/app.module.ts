import { NgModule } from '@angular/core';

import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';

import { AppComponent } from './app.component';
import { SbbModule } from './sbb.module';

import { DebugXmlPopoverComponent } from './search-form/debug-xml-popover/debug-xml-popover.component';
import { InputXmlPopoverComponent } from './search-form/input-xml-popover/input-xml-popover.component';

import { JourneyPointInputComponent } from './search-form/journey-point-input/journey-point-input.component';
import { JourneyResultsComponent } from './journey/journey-results/journey-results.component';
import { JourneyResultRowComponent } from './journey/journey-result-row/journey-result-row.component'
import { JourneySearchComponent } from './journey/journey-search/journey-search.component';
import { MapComponent } from './map/map.component';
import { ResultTripLegComponent } from './journey/journey-result-row/result-trip-leg/result-trip-leg.component';
import { SearchFormComponent } from './search-form/search-form.component';

import { StationBoardInputComponent } from './station-board/input/station-board-input.component';
import { StationBoardResultComponent } from './station-board/result/station-board-result.component';
import { StationBoardSearchComponent } from './station-board/search/station-board-search.component';

import { TripModeTypeComponent } from './search-form/trip-mode-type/trip-mode-type.component';


@NgModule({
  declarations: [
    AppComponent,

    JourneyPointInputComponent,
    JourneyResultsComponent,
    JourneyResultRowComponent,
    JourneySearchComponent,
    MapComponent,
    ResultTripLegComponent,
    SearchFormComponent,
    TripModeTypeComponent,

    StationBoardInputComponent,
    StationBoardResultComponent,
    StationBoardSearchComponent,

    DebugXmlPopoverComponent,
    InputXmlPopoverComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,

    AppRoutingModule,

    FormsModule,
    ReactiveFormsModule,

    SbbModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
