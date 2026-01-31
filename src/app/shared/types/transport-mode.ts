// walk is in v1, foot is in v2
type DefaultIndividualTransportMode = 'public_transport' | 'walk' | 'foot' | 'cycle' | 'car';
type SharedIndividualTransportMode = 'escooter_rental' | 'car_sharing' | 'self-drive-car' | 'bicycle_rental';

type OtherTransportMode = 'charging_station' | 'taxi' | 'others-drive-car' | 'car-shuttle-train' | 'car-ferry';
export type IndividualTransportMode = DefaultIndividualTransportMode | SharedIndividualTransportMode | OtherTransportMode;
