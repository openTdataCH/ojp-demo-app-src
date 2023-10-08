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
import { EmbedSearchPopoverComponent } from './search-form/embed-search-popover/embed-search-popover.component';
import { EmbedStationBoardPopoverComponent } from './station-board/search/embed-station-board-popover/embed-station-board-popover.component';

import { JourneyPointInputComponent } from './search-form/journey-point-input/journey-point-input.component';
import { JourneyResultsComponent } from './journey/journey-results/journey-results.component';
import { JourneyResultRowComponent } from './journey/journey-result-row/journey-result-row.component'
import { JourneySearchComponent } from './journey/journey-search/journey-search.component';
import { MapComponent } from './map/map.component';
import { ResultTripLegComponent } from './journey/journey-result-row/result-trip-leg/result-trip-leg.component';
import { SearchFormComponent } from './search-form/search-form.component';

import { CustomStopEventXMLPopoverComponent } from './station-board/search/custom-stop-event-xml-popover/custom-stop-event-xml-popover.component';

import { StationBoardComponent } from './station-board/station-board.component';
import { StationBoardInputComponent } from './station-board/input/station-board-input.component';
import { StationBoardMapComponent } from './station-board/map/station-board-map.component';
import { StationBoardResultComponent } from './station-board/result/station-board-result.component';
import { StationBoardSearchComponent } from './station-board/search/station-board-search.component';

import { TripModeTypeComponent } from './search-form/trip-mode-type/trip-mode-type.component';

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

    StationBoardComponent,
    StationBoardInputComponent,
    StationBoardMapComponent,
    StationBoardResultComponent,
    StationBoardSearchComponent,

    DebugXmlPopoverComponent,
    InputXmlPopoverComponent,
    CustomStopEventXMLPopoverComponent,
    EmbedSearchPopoverComponent,
    EmbedStationBoardPopoverComponent,
    
    WebFooterComponent,
    WebHeaderComponent,
    EmbedSearchComponent,
    EmbedStationBoardComponent,
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
