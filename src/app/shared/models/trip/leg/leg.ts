import * as OJP_Types from 'ojp-shared-types';

import { Duration } from "../../duration";
import { AnyPlace } from '../../place/place-builder';
import { LegTrack, PathGuidance } from '../../leg-track';
import { StopPlace } from '../../place/stop-place';
import { DistanceData } from '../../distance';

type LegType = 'ContinuousLeg' | 'TimedLeg' | 'TransferLeg';

export abstract class Leg {
  public type: LegType;
  public id: string;

  public duration: Duration | null;
  public distance: DistanceData;

  public fromPlace: AnyPlace | null;
  public toPlace: AnyPlace | null;

  public legTrack: LegTrack;
  public pathGuidance: PathGuidance;

  public emissionCO2_KgPerPersonKm: number | null;

  protected constructor(type: LegType, id: string, duration: Duration | null, distance: DistanceData) {
    this.type = type;
    this.id = id;
    
    this.duration = duration;
    this.distance = distance;

    this.fromPlace = null;
    this.toPlace = null;

    this.legTrack = LegTrack.Empty();
    this.pathGuidance = PathGuidance.Empty();

    this.emissionCO2_KgPerPersonKm = null;
  }

  protected static parseDuration(legSchema: OJP_Types.LegSchema): Duration | null {
    const duration = Duration.initWithDurationSchema(legSchema.duration);    
    return duration;
  }

  protected computeLegTrack(trackSectionsSchema: OJP_Types.TrackSectionSchema[], mapPlaces: Record<string, StopPlace>) {
    this.legTrack = LegTrack.initWithLegTrackSectionsSchema(trackSectionsSchema, mapPlaces);
  }

  protected computePathGuidance(pathGuidanceSectionsSchema: OJP_Types.PathGuidanceSectionSchema[], mapPlaces: Record<string, StopPlace>) {
    this.pathGuidance = PathGuidance.initWithPathGuidanceSectionsSchema(pathGuidanceSectionsSchema, mapPlaces);
  }

  public abstract asOJP_Schema(): OJP_Types.LegSchema;
  public abstract asLegacyOJP_Schema(): OJP_Types.OJPv1_TripLegSchema;
}
