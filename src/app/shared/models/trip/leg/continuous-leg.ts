import * as OJP_Types from 'ojp-shared-types';

import { Leg } from "./leg";
import { Duration } from '../../duration';
import { StopPlace } from '../../place/stop-place';
import { PlaceLocation } from '../../place/location';
import { PlaceRef } from '../../place-ref';
import { DistanceData, DistanceHelpers } from '../../distance';
import { TripLegLineType } from '../../../types/map-geometry-types';

export class ContinuousLeg extends Leg {
  public fromPlaceRef: PlaceRef | null;
  public toPlaceRef: PlaceRef | null;
  public service: OJP_Types.ContinuousServiceSchema;

  public legacyIndividualMode: string | null;

  private constructor(id: string, duration: Duration | null, distance: DistanceData, fromPlaceRef: PlaceRef | null, toPlaceRef: PlaceRef | null, service: OJP_Types.ContinuousServiceSchema) {
    super('ContinuousLeg', id, duration, distance);

    this.fromPlaceRef = fromPlaceRef;
    this.toPlaceRef = toPlaceRef;
    this.service = service;

    this.legacyIndividualMode = null;
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
        continuousLeg.fromPlace = new PlaceLocation(geoPosition.longitude, geoPosition.latitude, continuousLegSchema.legStart.name.text);
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
        continuousLeg.toPlace = new PlaceLocation(geoPosition.longitude, geoPosition.latitude, continuousLegSchema.legEnd.name.text);
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

    if (continuousLeg.fromPlace === null) {
      continuousLeg.fromPlace = continuousLeg.legTrack.computeBestFromPlace();
    }
    if (continuousLeg.toPlace === null) {
      continuousLeg.toPlace = continuousLeg.legTrack.computeBestToPlace();
    }

    return continuousLeg;
  }

  public isDriveCarLeg(): boolean {
    return this.service.personalMode === 'car';
  }

  public isCarAutoTrain(): boolean {
    const isATZ = this.service.mode?.railSubmode === 'vehicleTunnelTransportRailService';
    return isATZ;
  }

  public isCarFerry(): boolean {
    const isFerry = this.service.mode?.waterSubmode === 'localCarFerry';
    return isFerry;
  }

  public isSharedMobility() {
    const sharedModes: OJP_Types.PersonalModesEnum[] = ['bicycle', 'scooter'];
    const isSharedMobility = sharedModes.includes(this.service.personalMode);
    return isSharedMobility;
  }

  // TODOTRIPMIGRATION
  // public isWalking(): boolean {
  //   return this.legTransportMode === 'walk';
  // }
  public isWalking(): boolean {
    return this.service.personalMode === 'foot';
  }

  public isTaxi(): boolean {
    const isTaxi = this.legacyIndividualMode === 'taxi';
    return isTaxi;
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
    const serviceIndividuaMode: string = (() => {
      if (this,this.service.personalMode === 'car') {
        return 'self-drive-car';
      }

      return 'n/a';
    })(); 

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
        service: {
          individualMode: serviceIndividuaMode,
        },
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

  public computeLegColorType(): TripLegLineType {
    // These are also isDriveCarLeg() - THEY NEED TO BE BEFORE
    if (this.isCarAutoTrain()) {
      return 'Walk';
    }
    if (this.isCarFerry()) {
      return 'Water';
    }

    if (this.isDriveCarLeg()) {
      return 'Self-Drive Car';
    }

    if (this.isSharedMobility()) {
      return 'Shared Mobility';
    }

    if (this.type === 'TransferLeg') {
      return 'Transfer';
    }

    if (this.isTaxi()) {
      return 'OnDemand';
    }

    return 'Walk';
  }

  public updateLegacyIndividualMode(legacyValue: string) {
    if (legacyValue === 'walk') {
      this.legacyIndividualMode = legacyValue;
      this.service.personalMode = 'foot'; // 'foot' is in OJP 2.0
    }

    if (legacyValue === 'cycle') {
      this.legacyIndividualMode = legacyValue;
      this.service.personalMode = 'bicycle';
    }

    if (legacyValue === 'scooter') {
      this.legacyIndividualMode = legacyValue;
      this.service.personalMode = 'scooter';
    }

    if (legacyValue === 'taxi') {
      this.legacyIndividualMode = legacyValue;
      // cant assign to this.service.personalMode - no taxi yet present
    }

    if (legacyValue === 'self-drive-car') {
      this.legacyIndividualMode = legacyValue;
      // cant assign to this.service.personalMode - no self-drive-car yet present
    }

    if (this.legacyIndividualMode === null) {
      console.log('ContinuousLeg.updateLegacyIndividualMode cant handle: ' + legacyValue);
    }
  }
}
