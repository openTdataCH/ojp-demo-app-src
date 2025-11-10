import { Component } from '@angular/core';

import OJP_Legacy from '../../config/ojp-legacy';

import { UserTripService } from '../../shared/services/user-trip.service';
import { PlaceBuilder } from '../../shared/models/place/place-builder';

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
    this.fromLocationText = EmbedSearchPopoverComponent.computeLocationText(userTripService.fromTripLocation);
    this.toLocationText = EmbedSearchPopoverComponent.computeLocationText(userTripService.toTripLocation);

    this.updateEmbedHTML();
  }

  private static computeLocationText(tripLocationPoint: OJP_Legacy.TripLocationPoint | null): string {
    if (!tripLocationPoint) {
      return '';
    }

    const place = PlaceBuilder.initWithLegacyLocation(tripLocationPoint.location);
    return place?.computeName() ?? '';
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
