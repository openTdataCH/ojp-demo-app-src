import * as OJP_Types from 'ojp-shared-types';

import { Leg } from "./leg";
import { Duration } from '../../duration';
import { StopPlace } from '../../place/stop-place';
import { PlaceRef } from '../../place-ref';
import { DistanceData, DistanceHelpers } from '../../distance';

export class TransferLeg extends Leg {
  public transferType: OJP_Types.TransferTypeEnum;
  public fromPlaceRef: PlaceRef;
  public toPlaceRef: PlaceRef;

  private constructor(id: string, duration: Duration | null, distance: DistanceData, transferType: OJP_Types.TransferTypeEnum, fromPlaceRef: PlaceRef, toPlaceRef: PlaceRef) {
    super('TransferLeg', id, duration, distance);

    this.transferType = transferType;
    this.fromPlaceRef = fromPlaceRef;
    this.toPlaceRef = toPlaceRef;
  }

  public static initWithLegSchema(legSchema: OJP_Types.LegSchema, mapPlaces: Record<string, StopPlace>): TransferLeg | null {
    const id = legSchema.id;
    const duration = Leg.parseDuration(legSchema);

    const transferLegSchema = legSchema.transferLeg as OJP_Types.TransferLegSchema;
    
    const fromPlaceRef = PlaceRef.initFromPlaceRefSchema(transferLegSchema.legStart);
    const toPlaceRef = PlaceRef.initFromPlaceRefSchema(transferLegSchema.legEnd);

    if ((fromPlaceRef === null) || (toPlaceRef === null)) {
      console.error('TransferLeg.initWithLegSchema - fromPlaceRef, toPlaceRef cant be null');
      console.log(legSchema);
      return null;
    }

    const transferType = transferLegSchema.transferType;

    const distance = DistanceHelpers.initWithLegSchema(legSchema);

    const transferLeg = new TransferLeg(id, duration, distance, transferType, fromPlaceRef, toPlaceRef);

    transferLeg.fromPlace = mapPlaces[fromPlaceRef.ref] ?? null;
    transferLeg.toPlace = mapPlaces[toPlaceRef.ref] ?? null;

    transferLeg.emissionCO2_KgPerPersonKm = legSchema.emissionCO2?.kilogramPerPersonKm ?? null;
    transferLeg.computePathGuidance(transferLegSchema.pathGuidance?.pathGuidanceSection ?? [], mapPlaces);

    return transferLeg;
  }

  public override asOJP_Schema(): OJP_Types.LegSchema {
    const schema: OJP_Types.LegSchema = {
      id: this.id,
      duration: this.duration?.asOjpDurationText() ?? undefined,
      transferLeg: {
        transferType: this.transferType,
        legStart: {
          name: {
            text: this.fromPlaceRef.name,
          }
        },
        legEnd: {
          name: {
            text: this.toPlaceRef.name,
          }
        },
        duration: this.duration?.asOjpDurationText() ?? '',
      },
    };

    if (schema.transferLeg) {
      if (this.fromPlace) {
        schema.transferLeg.legStart.stopPlaceRef = this.fromPlaceRef?.ref;
        schema.transferLeg.legStart.geoPosition = this.fromPlace.geoPosition.asGeoPositionSchema();
      }
      if (this.toPlace) {
        schema.transferLeg.legEnd.stopPlaceRef = this.toPlaceRef?.ref;
        schema.transferLeg.legEnd.geoPosition = this.toPlace.geoPosition.asGeoPositionSchema();
      }
      if (this.pathGuidance.sections.length > 0) {
        schema.transferLeg.pathGuidance = {
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
      transferLeg: {
        transferType: this.transferType,
        legStart: {
          locationName: {
            text: this.fromPlaceRef.name,
          }
        },
        legEnd: {
          locationName: {
            text: this.toPlaceRef.name,
          }
        },
        duration: this.duration?.asOjpDurationText() ?? '',
      },
    };

    if (schema.transferLeg) {
      if (this.fromPlace) {
        schema.transferLeg.legStart.stopPlaceRef = this.fromPlaceRef?.ref;
        schema.transferLeg.legStart.geoPosition = this.fromPlace.geoPosition.asGeoPositionSchema();
      }
      if (this.toPlace) {
        schema.transferLeg.legEnd.stopPlaceRef = this.toPlaceRef?.ref;
        schema.transferLeg.legEnd.geoPosition = this.toPlace.geoPosition.asGeoPositionSchema();
      }
      if (this.pathGuidance.sections.length > 0) {
        schema.transferLeg.pathGuidance = {
          pathGuidanceSection: this.pathGuidance.sections.map(el => el.asLegacyOJP_Schema())
        };
      }
    }

    return schema;
  }
}
