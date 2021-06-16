import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { SbbAccordionModule } from '@sbb-esta/angular-business/accordion';
import { SbbAutocompleteModule } from '@sbb-esta/angular-business/autocomplete';
import { SbbDatepickerModule } from '@sbb-esta/angular-business/datepicker';
import { SbbFormFieldModule } from '@sbb-esta/angular-business/form-field';
import { SbbRadioButtonModule } from '@sbb-esta/angular-business/radio-button';
import { SbbTimeInputModule } from '@sbb-esta/angular-business/time-input';

import { AppComponent } from './app.component';

import { JourneyPointInputComponent } from './search-form/journey-point-input/journey-point-input.component';
import { JourneyResultsComponent } from './journey/journey-results/journey-results.component';
import { JourneyResultRowComponent } from './journey/journey-result-row/journey-result-row.component'
import { MapComponent } from './map/map.component';
import { SearchFormComponent } from './search-form/search-form.component';

@NgModule({
  declarations: [
    AppComponent,

    MapComponent,
    JourneyPointInputComponent,
    JourneyResultsComponent,
    JourneyResultRowComponent,
    SearchFormComponent,
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
    SbbFormFieldModule,
    SbbRadioButtonModule,
    SbbTimeInputModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
