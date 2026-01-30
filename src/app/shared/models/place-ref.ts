import * as OJP_Types from 'ojp-shared-types';

export type PlaceRefSourceType = 'stop-point' | 'stop-place';

export class PlaceRef {
  public name: string;
  public ref: string;
  public source: PlaceRefSourceType;

  public constructor(name: string, ref: string, source: PlaceRefSourceType = 'stop-place') {
    this.name = name;
    this.ref = ref;
    this.source = source;
  }

  public static initFromPlaceRefSchema(placeRefSchema: OJP_Types.PlaceRefSchema | null | undefined): PlaceRef | null {
    if (!placeRefSchema) {
      return null;
    }

    const placeName = placeRefSchema.name.text ?? '';
    
    if (placeRefSchema.stopPlaceRef === undefined) {
      if (placeRefSchema.stopPointRef === undefined) {
        return null;
      } else {
        const placeRef = new PlaceRef(placeName, placeRefSchema.stopPointRef, 'stop-point');
        return placeRef;
      }
    } else {
      const placeRef = new PlaceRef(placeName, placeRefSchema.stopPlaceRef, 'stop-place');
      return placeRef;
    }
  }

  public asOJP_Schema(): OJP_Types.PlaceRefSchema {
    const schema: OJP_Types.PlaceRefSchema = {
      stopPointRef: undefined, // updated below
      stopPlaceRef: undefined, // updated below
      geoPosition: undefined,
      name: {
        text: this.name,
      },
    };

    if (this.source === 'stop-point') {
      schema.stopPointRef = this.ref;
    }

    if (this.source === 'stop-place') {
      schema.stopPlaceRef = this.ref;
    }

    return schema;
  }

  public asLegacyOJP_Schema(): OJP_Types.OJPv1_PlaceRefSchema {
    const schema: OJP_Types.OJPv1_PlaceRefSchema = {
      stopPointRef: undefined, // updated below
      stopPlaceRef: undefined, // updated below
      geoPosition: undefined,
      locationName: {
        text: this.name,
      },
    };

    if (this.source === 'stop-point') {
      schema.stopPointRef = this.ref;
    }

    if (this.source === 'stop-place') {
      schema.stopPlaceRef = this.ref;
    }

    return schema;
  }
}
