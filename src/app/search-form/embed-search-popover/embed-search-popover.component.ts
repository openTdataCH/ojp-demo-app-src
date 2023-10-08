import { Component } from '@angular/core';

import * as OJP from 'ojp-sdk'

import { UserTripService } from '../../shared/services/user-trip.service';

@Component({
  selector: 'embed-search-popover',
  templateUrl: './embed-search-popover.component.html',
})
export class EmbedSearchPopoverComponent {
  public embedHTMLs: string = 'n/a'
  
  public fromLocationText: string = ''
  public toLocationText: string = ''

  public fromLocationChecked = false
  public toLocationChecked = true

  constructor(private userTripService: UserTripService) {
    this.fromLocationText = EmbedSearchPopoverComponent.computeLocationText(userTripService.fromTripLocation?.location);
    this.toLocationText = EmbedSearchPopoverComponent.computeLocationText(userTripService.toTripLocation?.location);

    this.updateEmbedHTML();
  }

  private static computeLocationText(location: OJP.Location | null | undefined): string {
    if (!location) {
      return ''
    }

    const locationType = location.getLocationType();

    if (locationType === 'stop') {
      const locationName = location.computeLocationName();
      const stopRef = location.stopPlace?.stopPlaceRef ?? '';

      const locationText = locationName + '(stopRef ' + stopRef + ')';
      return locationText;
    }

    const geoPosition = location.geoPosition;
    if (geoPosition) {
      const locationName = location.computeLocationName() ?? '';
      const geoPositionLngLatS = geoPosition.asLatLngString(true) ?? '';

      const locationText = locationName + '(coords ' + geoPositionLngLatS + ')';
      return locationText;
    }

    const defaultLocationText = locationType + ' - ' + (location.computeLocationName() ?? '');
    return defaultLocationText;
  }

  public updateEmbedHTML() {
    const queryParams = new URLSearchParams();
    ['from', 'to'].forEach(key => {
      const queryParamValue: string = (() => {
        const isChecked = (key === 'from' ? this.fromLocationChecked : this.toLocationChecked);
        if (isChecked) {
          const embedQueryParamValue = this.userTripService.embedQueryParams.get(key);
          if (embedQueryParamValue !== null) {
            return embedQueryParamValue;
          }
        }

        return '';
      })() 
      queryParams.append(key, queryParamValue);
    });

    const embedLinkRelativeURL = document.location.pathname.replace('/search', '/embed/search') + '?' + queryParams.toString();
    const embedURL = document.location.protocol + '//' + document.location.host + embedLinkRelativeURL;

    this.embedHTMLs = '<iframe src="' + embedURL + '" width="100%" height="100%" frameBorder="0"></iframe>';
  }
}
