import * as OJP_Types from 'ojp-shared-types';

import { Leg } from "./leg";
import { Duration } from '../../duration';
import { StopPlace } from '../../place/stop-place';
import { PlaceLocation } from '../../place/location';
import { PlaceRef } from '../../place-ref';
import { DistanceData, DistanceHelpers } from '../../distance';

export class ContinuousLeg extends Leg {
  public fromPlaceRef: PlaceRef | null;
  public toPlaceRef: PlaceRef | null;
  public service: OJP_Types.ContinuousServiceSchema;

  private constructor(id: string, duration: Duration | null, distance: DistanceData, fromPlaceRef: PlaceRef | null, toPlaceRef: PlaceRef | null, service: OJP_Types.ContinuousServiceSchema) {
    super('ContinuousLeg', id, duration, distance);

    this.fromPlaceRef = fromPlaceRef;
    this.toPlaceRef = toPlaceRef;
    this.service = service;
  }

  public static initWithLegSchema(legSchema: OJP_Types.LegSchema, mapPlaces: Record<string, StopPlace>): ContinuousLeg | null {
    const id = legSchema.id;
    const duration = Leg.parseDuration(legSchema);

    const continuousLegSchema = legSchema.continuousLeg as OJP_Types.ContinuousLegSchema;

    const fromPlaceRef = PlaceRef.initFromPlaceRefSchema(continuousLegSchema.legStart);
    const toPlaceRef = PlaceRef.initFromPlaceRefSchema(continuousLegSchema.legEnd);

    const service = continuousLegSchema.service;

    const distance = DistanceHelpers.initWithLegSchema(legSchema);

    const continuousLeg = new ContinuousLeg(id, duration, distance, fromPlaceRef, toPlaceRef, service);

    if (fromPlaceRef === null) {
      const geoPosition = continuousLegSchema.legStart.geoPosition;
      if (geoPosition) {
        continuousLeg.fromPlace = new PlaceLocation(geoPosition.longitude, geoPosition.latitude);
      } else {
        console.error('ContinuousLeg.initWithLegSchema - cant compute fromPlaceRef');
        console.log(continuousLegSchema);
        return null;
      }
    } else {
      continuousLeg.fromPlace = mapPlaces[fromPlaceRef.ref] ?? null;
    }

    if (toPlaceRef === null) {
      const geoPosition = continuousLegSchema.legEnd.geoPosition;
      if (geoPosition) {
        continuousLeg.toPlace = new PlaceLocation(geoPosition.longitude, geoPosition.latitude);
      } else {
        console.error('ContinuousLeg.initWithLegSchema - cant compute toPlaceRef');
        console.log(continuousLegSchema);
        return null;
      }
    } else {
      continuousLeg.toPlace = mapPlaces[toPlaceRef.ref] ?? null;
    }
    
    continuousLeg.emissionCO2_KgPerPersonKm = legSchema.emissionCO2?.kilogramPerPersonKm ?? null;
    continuousLeg.computeLegTrack(continuousLegSchema.legTrack?.trackSection ?? [], mapPlaces);
    continuousLeg.computePathGuidance(continuousLegSchema.pathGuidance?.pathGuidanceSection ?? [], mapPlaces);

    return continuousLeg;
  }

  public isDriveCarLeg(): boolean {
    return this.service.personalMode === 'car';
  }

  public isSharedMobility() {
    return false;
  }

  public isWalking(): boolean {
    return this.service.personalMode === 'foot';
  }

  public isTaxi(): boolean {
    return false;
  }

  public isWater(): boolean {
    return false;
  }

  public override asOJP_Schema(): OJP_Types.LegSchema {
    const schema: OJP_Types.LegSchema = {
      id: this.id,
      duration: this.duration?.asOjpDurationText() ?? undefined,
      continuousLeg: {
        legStart: {
          name: {
            text: this.fromPlaceRef?.name ?? 'n/a',
          },
        },
        legEnd: {
          name: {
            text: this.toPlaceRef?.name ?? 'n/a',
          },
        },
        service: this.service,
        duration: this.duration?.asOjpDurationText() ?? '',
      }
    };

    if (schema.continuousLeg) {
      if (this.fromPlaceRef) {
        schema.continuousLeg.legStart = this.fromPlaceRef.asOJP_Schema();
      } else {
        if (this.fromPlace) {
          schema.continuousLeg.legStart.geoPosition = this.fromPlace.geoPosition.asGeoPositionSchema();
        }
      }

      if (this.toPlaceRef) {
        schema.continuousLeg.legEnd = this.toPlaceRef.asOJP_Schema();
      } else {
        if (this.toPlace) {
          schema.continuousLeg.legEnd.geoPosition = this.toPlace.geoPosition.asGeoPositionSchema();
        }
      }

      if (this.legTrack.trackSections.length > 0) {
        schema.continuousLeg.legTrack = this.legTrack.asOJP_Schema();
      };
      
      if (this.pathGuidance.sections.length > 0) {
        schema.continuousLeg.pathGuidance = {
          pathGuidanceSection: this.pathGuidance.sections.map(el => el.asOJP_Schema())
        };
      }
    }

    return schema;
  }

  public override asLegacyOJP_Schema(): OJP_Types.OJPv1_TripLegSchema {
    const schema: OJP_Types.OJPv1_TripLegSchema = {
      legId: this.id,
      duration: this.duration?.asOjpDurationText() ?? undefined,
      continuousLeg: {
        legStart: {
          locationName: {
            text: this.fromPlaceRef?.name ?? 'n/a',
          },
        },
        legEnd: {
          locationName: {
            text: this.toPlaceRef?.name ?? 'n/a',
          },
        },
        service: this.service,
        duration: this.duration?.asOjpDurationText() ?? '',
      }
    };
    
    if (schema.continuousLeg) {
      if (this.fromPlaceRef) {
        schema.continuousLeg.legStart = this.fromPlaceRef.asLegacyOJP_Schema();
      } else {
        if (this.fromPlace) {
          schema.continuousLeg.legStart.geoPosition = this.fromPlace.geoPosition.asGeoPositionSchema();
        }
      }

      if (this.toPlaceRef) {
        schema.continuousLeg.legEnd = this.toPlaceRef.asLegacyOJP_Schema();
      } else {
        if (this.toPlace) {
          schema.continuousLeg.legEnd.geoPosition = this.toPlace.geoPosition.asGeoPositionSchema();
        }
      }
      
      if (this.legTrack.trackSections.length > 0) {
        schema.continuousLeg.legTrack = this.legTrack.asLegacyOJP_Schema();
      };
      
      if (this.pathGuidance.sections.length > 0) {
        schema.continuousLeg.pathGuidance = {
          pathGuidanceSection: this.pathGuidance.sections.map(el => el.asLegacyOJP_Schema())
        };
      }
    }

    return schema;
  }
}
