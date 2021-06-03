import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { SbbAutocompleteModule } from '@sbb-esta/angular-business/autocomplete';
import { SbbDatepickerModule } from '@sbb-esta/angular-business/datepicker';
import { SbbFormFieldModule } from '@sbb-esta/angular-business/form-field';
import { SbbTimeInputModule } from '@sbb-esta/angular-business/time-input';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,

    HttpClientModule,

    FormsModule,
    ReactiveFormsModule,

    SbbAutocompleteModule,
    SbbDatepickerModule,
    SbbFormFieldModule,
    SbbTimeInputModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
