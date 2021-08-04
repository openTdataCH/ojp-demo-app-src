import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { SbbAccordionModule } from '@sbb-esta/angular-business/accordion';
import { SbbAutocompleteModule } from '@sbb-esta/angular-business/autocomplete';
import { SbbDatepickerModule } from '@sbb-esta/angular-business/datepicker';
import { SbbDialogModule } from '@sbb-esta/angular-business/dialog';
import { SbbFormFieldModule } from '@sbb-esta/angular-business/form-field';
import { SbbIconModule } from '@sbb-esta/angular-core/icon';
import { SbbNotificationToastModule } from '@sbb-esta/angular-business/notification-toast';
import { SbbRadioButtonModule } from '@sbb-esta/angular-business/radio-button';
import { SbbTimeInputModule } from '@sbb-esta/angular-business/time-input';
import { SbbTooltipModule } from '@sbb-esta/angular-business/tooltip';

import { AppComponent } from './app.component';

import { JourneyPointInputComponent } from './search-form/journey-point-input/journey-point-input.component';
import { JourneyResultsComponent } from './journey/journey-results/journey-results.component';
import { JourneyResultRowComponent } from './journey/journey-result-row/journey-result-row.component'
import { ResultTripLegComponent } from './journey/journey-result-row/result-trip-leg/result-trip-leg.component';
import { MapComponent } from './map/map.component';
import { SearchFormComponent } from './search-form/search-form.component';
import { TripMotTypeComponent } from './search-form/trip-mot-type/trip-mot-type.component';
import { DebugXmlPopoverComponent } from './search-form/debug-xml-popover/debug-xml-popover.component';
import { InputXmlPopoverComponent } from './search-form/input-xml-popover/input-xml-popover.component';

@NgModule({
  declarations: [
    AppComponent,

    MapComponent,
    JourneyPointInputComponent,
    JourneyResultsComponent,
    JourneyResultRowComponent,
    ResultTripLegComponent,
    SearchFormComponent,
    TripMotTypeComponent,
    DebugXmlPopoverComponent,
    InputXmlPopoverComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,

    HttpClientModule,

    FormsModule,
    ReactiveFormsModule,

    SbbAccordionModule,
    SbbAutocompleteModule,
    SbbDatepickerModule,
    SbbDialogModule,
    SbbIconModule,
    SbbNotificationToastModule,
    SbbFormFieldModule,
    SbbRadioButtonModule,
    SbbTimeInputModule,
    SbbTooltipModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
