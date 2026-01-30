import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { catchError, firstValueFrom, map, Observable, shareReplay, throwError } from 'rxjs';

import * as GeoJSON from 'geojson';

import * as OJP_Next from 'ojp-sdk-next';
import OJP_Legacy from '../../config/ojp-legacy';

import { OJPHelpers } from '../../helpers/ojp-helpers';
import { TripLegLineType } from '../types/map-geometry-types';
import { MapHelpers } from '../../map/helpers/map.helpers';
import { APP_CONFIG } from 'src/app/config/app-config';
import { JourneyPointType } from '../types/_all';

type RequestMotType = 'rail' | 'bus' | 'coach' | 'foot' | 'tram' | 'subway' | 'gondola' | 'funicular' | 'ferry';

interface ViaPart {
  geoPosition: OJP_Next.GeoPosition,
  platform: string | null,
}

interface RequestData {
  mot: RequestMotType,
  viaParts: ViaPart[],
  url: string,
  demoURL: string,
};

export interface LegShapeResult {
  source: 'cache' | 'fetch',
  requestData: RequestData,
  fc: GeoJSON.FeatureCollection,
};

interface ShapeProviderResponse {
  type: 'FeatureCollection',
  properties: Record<string, any>,
  features: GeoJSON.Feature[],
};

const apiConfig = APP_CONFIG['stages']['SHAPE_PROVIDER'];

@Injectable({
  providedIn: 'root',
})
export class ShapeProviderService {
  private cache = new Map<string, Observable<GeoJSON.FeatureCollection>>();

  constructor(private http: HttpClient) {}

  private getLegShape$(leg: OJP_Legacy.TripLeg): Observable<LegShapeResult> {
    const viaParts = this.computeLegViaParts(leg);
    
    const viaKey = viaParts.map(el => {
      const key = el.geoPosition.asLatLngString() + '_' + (el.platform ?? '');
      return key;
    }).join('__');

    const requestData = this.computeRequestData(leg, viaParts);

    // 🚀 Cache hit → NO delay
    const cached$ = this.cache.get(viaKey);
    if (cached$) {
      const legShapeResult = cached$.pipe(
          map(value => {
            const result: LegShapeResult = {
              source: 'cache',
              requestData: requestData,
              fc: value,
            };
            return result;
          })
        );

      return legShapeResult;
    }

    if (apiConfig.authToken === null) {
      throw new Error("Missing authorization, please update SHAPE_PROVIDER in app-config.ts");
    }

    const headers = {
      'Authorization': apiConfig.authToken,
    };

    // 🆕 Cache miss → real HTTP + delay(ms)
    const request$ = this.http
      .get<ShapeProviderResponse>(requestData.url, { headers: headers })
      .pipe(
        map(raw => this.toGeoJSON(raw)),

        // share + cache result
        shareReplay({ bufferSize: 1, refCount: false }),

        catchError(err => {
          this.cache.delete(viaKey);
          return throwError(() => err);
        })
      );

    const legShapeResult = request$.pipe(
      map(value => {
        const result: LegShapeResult = {
          source: 'fetch',
          requestData: requestData,
          fc: value,
        };
        return result;
      })
    );

    this.cache.set(viaKey, request$);

    return legShapeResult;
  }

  public async fetchLegShape(leg: OJP_Legacy.TripLeg): Promise<LegShapeResult> {
    const response = await firstValueFrom(this.getLegShape$(leg))
    return response;
  }

  private toGeoJSON(raw: ShapeProviderResponse): GeoJSON.FeatureCollection {
    const fc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [],
    };

    raw.features.forEach(featureSrc => {
      const feature: GeoJSON.Feature = {
        type: 'Feature',
        properties: {},
        geometry: featureSrc.geometry,
      };

      fc.features.push(feature);
    });

    return fc;
  }

  private computeLegViaParts(leg: OJP_Legacy.TripLeg): ViaPart[] {
    const legEndpointViaParts: ViaPart[] = [];

    const endpointTypes: JourneyPointType[] = ['From', 'To'];
    endpointTypes.forEach(endPointType => {
      const isFrom = endPointType === 'From';
      const location = isFrom ? leg.fromLocation : leg.toLocation;

      if (location.geoPosition === null) {
        return;
      }

      // convert legacy GeoPosition
      const geoPosition = new OJP_Next.GeoPosition(location.geoPosition.longitude, location.geoPosition.latitude);

      const legEndpointViaPart: ViaPart = {
        geoPosition: geoPosition,
        platform: null,
      };

      if (leg.legType === 'TimedLeg') {
        const timedLeg = leg as OJP_Legacy.TripTimedLeg;
        const stopPoint = isFrom ? timedLeg.fromStopPoint : timedLeg.toStopPoint;
        const platform = stopPoint.actualPlatform ?? stopPoint.plannedPlatform;
        if (platform !== null) {
          legEndpointViaPart.platform = platform;
        }
      }

      legEndpointViaParts.push(legEndpointViaPart);
    });

    if (legEndpointViaParts.length !== 2) {
      throw new Error("Expected valid endpoints");
    }

    const dAB = MapHelpers.computeGeoPositionsDistance(legEndpointViaParts.map(el => el.geoPosition)) ?? 0;
    if (dAB < 5) {
      throw new Error("Endpoints are too close");
    }

    const viaParts = [
      legEndpointViaParts[0],
    ];

    if (leg.legType === 'TimedLeg') {
      const timedLeg = leg as OJP_Legacy.TripTimedLeg;

      timedLeg.intermediateStopPoints.forEach(stopPoint => {
        if (stopPoint.location.geoPosition === null) {
          return;
        }

        // convert legacy GeoPosition
        const geoPosition = new OJP_Next.GeoPosition(stopPoint.location.geoPosition.longitude, stopPoint.location.geoPosition.latitude);

        const viaPart: ViaPart = {
          geoPosition: geoPosition,
          platform: null,
        };

        const platform = stopPoint.actualPlatform ?? stopPoint.plannedPlatform;
        if (platform !== null) {
          viaPart.platform = platform;
        }

        viaParts.push(viaPart);
      });
    };

    viaParts.push(legEndpointViaParts[1]);

    return viaParts;
  }

  private computeRequestData(leg: OJP_Legacy.TripLeg, viaParts: ViaPart[]): RequestData {
    const footLegTypes: TripLegLineType[] = ['Guidance', 'Transfer', 'Walk'];
    const railTypes: TripLegLineType[] = ['LongDistanceRail', 'SBahn', 'CogRailway'];

    const motType: RequestMotType = (() => {
      const legType = OJPHelpers.computeLegLineType(leg);

      if (legType === 'Water') {
        return 'ferry';
      }

      if (legType === 'Tram') {
        return 'tram';
      }

      if (legType === 'PostAuto') {
        return 'bus';
      }

      if (footLegTypes.includes(legType)) {
        return 'foot';
      }

      if (railTypes.includes(legType)) {
        return 'rail';
      }

      if (legType === 'Funicular') {
        return 'funicular';
      }

      if (legType === 'Subway') {
        return 'subway';
      }

      return 'bus';
    })();

    const apiURL = (() => {
      const viaParam: string = (() => {
        const viaKeyParts: string[] = [];
        viaParts.forEach(viaPart => {
          // in API the hops are in lat,long format
          let viaKeyPart = viaPart.geoPosition.latitude + ',' + viaPart.geoPosition.longitude;
          if (viaPart.platform !== null) {
            viaKeyPart = '@' + viaKeyPart + '$' + viaPart.platform;
          }
          viaKeyParts.push(viaKeyPart);
        });

        const param = viaKeyParts.join('|');

        return param;
      })();

      const url = new URL(apiConfig['url']);
      url.searchParams.set('via', viaParam);
      url.searchParams.set('mot', motType);

      return url.toString();
    })();

    const demoURL = (() => {
      const viaParam: string = (() => {
        const viaKeyParts: string[] = [];
        viaParts.forEach(viaPart => {
          // in GUI the hops are in long,lat format - also no @ prefix when we have stops
          let viaKeyPart = viaPart.geoPosition.longitude + ',' + viaPart.geoPosition.latitude;
          if (viaPart.platform !== null) {
            viaKeyPart = viaKeyPart + '$' + viaPart.platform;
          }
          viaKeyParts.push(viaKeyPart);
        });

        const param = viaKeyParts.join('|');

        return param;
      })();

      const url = new URL('https://routing-demo.geops.io');

      url.searchParams.set('floorInfo', '0,0');
      url.searchParams.set('mot', motType);
      url.searchParams.set('resolve-hops', 'false');
      url.searchParams.set('via', viaParam);

      if (viaParts.length > 0) {
        const geoPosition = viaParts[0].geoPosition;
        const mapXY = MapHelpers.lngLatToWebMercator(geoPosition.longitude, geoPosition.latitude);
        
        url.searchParams.set('x', mapXY.x.toString());
        url.searchParams.set('y', mapXY.y.toString());

        const zoomLevel: number = (() => {
          const dAB = MapHelpers.computeGeoPositionsDistance(viaParts.map(el => el.geoPosition)) ?? 0;
          if (dAB > 2000) {
            return 15;
          }

          return 17;
        })();
        
        url.searchParams.set('z', zoomLevel.toString());
      }

      return url.toString();
    })();

    const requestData: RequestData = {
      mot: motType,
      viaParts: viaParts,
      url: apiURL,
      demoURL: demoURL,
    };
    
    return requestData;
  }
}
