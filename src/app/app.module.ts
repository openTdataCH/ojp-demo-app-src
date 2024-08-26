import { NgModule } from '@angular/core';

import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';

import { AppComponent } from './app.component';
import { SbbModule } from './sbb.module';

import { DebugXmlPopoverComponent } from './search-form/debug-xml-popover/debug-xml-popover.component';
import { InputXmlPopoverComponent } from './search-form/input-xml-popover/input-xml-popover.component';
import { EmbedSearchPopoverComponent } from './search-form/embed-search-popover/embed-search-popover.component';
import { EmbedStationBoardPopoverComponent } from './station-board/search/embed-station-board-popover/embed-station-board-popover.component';
import { CustomStopEventXMLPopoverComponent } from './station-board/search/custom-stop-event-xml-popover/custom-stop-event-xml-popover.component';
import { CustomTripInfoXMLPopoverComponent } from './trip-info/search/custom-trip-info-xml-popover/custom-trip-info-xml-popover.component';

import { JourneyPointInputComponent } from './search-form/journey-point-input/journey-point-input.component';
import { JourneyResultsComponent } from './journey/journey-results/journey-results.component';
import { JourneyResultRowComponent } from './journey/journey-result-row/journey-result-row.component'
import { JourneySearchComponent } from './journey/journey-search/journey-search.component';
import { MapComponent } from './map/map.component';
import { ResultTripLegComponent } from './journey/journey-result-row/result-trip-leg/result-trip-leg.component';
import { SearchFormComponent } from './search-form/search-form.component';
import { TripInfoResultPopoverComponent } from './journey/journey-result-row/result-trip-leg/trip-info-result-popover/trip-info-result-popover.component';

import { StationBoardComponent } from './station-board/station-board.component';
import { StationBoardInputComponent } from './station-board/input/station-board-input.component';
import { StationBoardMapComponent } from './station-board/map/station-board-map.component';
import { StationBoardResultComponent } from './station-board/result/station-board-result.component';
import { StationBoardSearchComponent } from './station-board/search/station-board-search.component';

import { TripInfoComponent } from './trip-info/trip-info.component';
import { TripInfoMapComponent } from './trip-info/map/trip-info-map.component';
import { TripInfoSearchComponent } from './trip-info/search/trip-info-search.component';
import { TripInfoResultComponent } from './trip-info/result/trip-info-result.component';

import { TripModeTypeComponent } from './search-form/trip-mode-type/trip-mode-type.component';

import { ServiceStopsComponent } from './shared/components/service-stops.component';

import { EmbedSearchComponent } from './embed/embed-search.component';
import { EmbedStationBoardComponent } from './embed/embed-station-board.component';
import { WebFooterComponent } from './shared/components/web-footer';
import { WebHeaderComponent } from './shared/components/web-header';

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
    TripInfoResultPopoverComponent,

    StationBoardComponent,
    StationBoardInputComponent,
    StationBoardMapComponent,
    StationBoardResultComponent,
    StationBoardSearchComponent,

    TripInfoComponent,
    TripInfoMapComponent,
    TripInfoSearchComponent,
    TripInfoResultComponent,

    DebugXmlPopoverComponent,
    InputXmlPopoverComponent,
    CustomStopEventXMLPopoverComponent,
    CustomTripInfoXMLPopoverComponent,
    EmbedSearchPopoverComponent,
    EmbedStationBoardPopoverComponent,

    ServiceStopsComponent,
    
    WebFooterComponent,
    WebHeaderComponent,
    EmbedSearchComponent,
    EmbedStationBoardComponent,
  ],
  imports: [
    CommonModule,

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
