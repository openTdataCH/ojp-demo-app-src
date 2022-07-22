import { NgModule } from '@angular/core';

import { SbbAccordionModule } from '@sbb-esta/angular/accordion';
import { SbbAlertModule } from '@sbb-esta/angular/alert';
import { SbbAutocompleteModule } from '@sbb-esta/angular/autocomplete';
import { SbbBadgeModule } from '@sbb-esta/angular/badge';
import { SbbBreadcrumbModule } from '@sbb-esta/angular/breadcrumb';
import { SbbButtonModule } from '@sbb-esta/angular/button';
import { SbbCaptchaModule } from '@sbb-esta/angular/captcha';
import { SbbCheckboxModule } from '@sbb-esta/angular/checkbox';
import { SbbCheckboxPanelModule } from '@sbb-esta/angular/checkbox-panel';
import { SbbChipsModule } from '@sbb-esta/angular/chips';
import { SbbDatepickerModule } from '@sbb-esta/angular/datepicker';
import { SbbDialogModule } from '@sbb-esta/angular/dialog';
import { SbbFileSelectorModule } from '@sbb-esta/angular/file-selector';
import { SbbFormFieldModule } from '@sbb-esta/angular/form-field';
import { SbbHeaderLeanModule } from '@sbb-esta/angular/header-lean';
import { SbbIconModule } from '@sbb-esta/angular/icon';
import { SbbInputModule } from '@sbb-esta/angular/input';
import { SbbLightboxModule } from '@sbb-esta/angular/lightbox';
import { SbbLoadingIndicatorModule } from '@sbb-esta/angular/loading-indicator';
import { SbbMenuModule } from '@sbb-esta/angular/menu';
import { SbbNotificationModule } from '@sbb-esta/angular/notification';
import { SbbNotificationToastModule } from '@sbb-esta/angular/notification-toast';
import { SbbPaginationModule } from '@sbb-esta/angular/pagination';
import { SbbProcessflowModule } from '@sbb-esta/angular/processflow';
import { SbbRadioButtonModule } from '@sbb-esta/angular/radio-button';
import { SbbRadioButtonPanelModule } from '@sbb-esta/angular/radio-button-panel';
import { SbbSearchModule } from '@sbb-esta/angular/search';
import { SbbSelectModule } from '@sbb-esta/angular/select';
import { SbbSidebarModule } from '@sbb-esta/angular/sidebar';
import { SbbStatusModule } from '@sbb-esta/angular/status';
import { SbbTableModule } from '@sbb-esta/angular/table';
import { SbbTabsModule } from '@sbb-esta/angular/tabs';
import { SbbTagModule } from '@sbb-esta/angular/tag';
import { SbbTextareaModule } from '@sbb-esta/angular/textarea';
import { SbbTextexpandModule } from '@sbb-esta/angular/textexpand';
import { SbbTimeInputModule } from '@sbb-esta/angular/time-input';
import { SbbToggleModule } from '@sbb-esta/angular/toggle';
import { SbbTooltipModule } from '@sbb-esta/angular/tooltip';
import { SbbUsermenuModule } from '@sbb-esta/angular/usermenu';

const modules = [
  SbbAccordionModule,
  SbbAlertModule,
  SbbAutocompleteModule,
  SbbBadgeModule,
  SbbBreadcrumbModule,
  SbbButtonModule,
  SbbCaptchaModule,
  SbbCheckboxModule,
  SbbCheckboxPanelModule,
  SbbChipsModule,
  SbbDatepickerModule,
  SbbDialogModule,
  SbbFileSelectorModule,
  SbbFormFieldModule,
  SbbHeaderLeanModule,
  SbbIconModule,
  SbbInputModule,
  SbbLightboxModule,
  SbbLoadingIndicatorModule,
  SbbMenuModule,
  SbbNotificationModule,
  SbbNotificationToastModule,
  SbbPaginationModule,
  SbbProcessflowModule,
  SbbRadioButtonModule,
  SbbRadioButtonPanelModule,
  SbbSearchModule,
  SbbSelectModule,
  SbbSidebarModule,
  SbbStatusModule,
  SbbTableModule,
  SbbTabsModule,
  SbbTagModule,
  SbbTextareaModule,
  SbbTextexpandModule,
  SbbTimeInputModule,
  SbbToggleModule,
  SbbTooltipModule,
  SbbUsermenuModule,
];

@NgModule({
  imports: modules,
  exports: modules,
})
export class SbbModule {}
