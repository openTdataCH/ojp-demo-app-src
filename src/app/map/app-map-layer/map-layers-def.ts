import mapgl from 'maplibre-gl'

import stopsCircleLayer from './map-layers-def/stops/stops-circle.json'
import stopsLabelLayer from './map-layers-def/stops/stops-label.json'
import addressCircleLayer from './map-layers-def/address/address-circle.json';
import topographicPlaceCircleLayer from './map-layers-def/topographic-place-circle.json'

import chargingStationIconLayer from './map-layers-def/poi/charging-station/charging-station-icon.json'
import carRentalIconLayer from './map-layers-def/poi/car-rental/car-rental-icon.json'
import bikeIconLayer from './map-layers-def/poi/bicycle-rental/bike-icon.json';
import scooterIconLayer from './map-layers-def/poi/scooter-rental/scooter-icon.json';

import sharedVehicleTextNumberLayer from './map-layers-def/poi/shared-vehicle/shared-vehicle-text-number.json'
import sharedVehicleTextProviderLayer from './map-layers-def/poi/shared-vehicle/shared-vehicle-text-provider.json'

import poisIcon from './map-layers-def/pois-icon.json'

const map_layers_def: Record<string, mapgl.LayerSpecification> = {
    'stops-circle': stopsCircleLayer as mapgl.CircleLayerSpecification,
    'stops-label': stopsLabelLayer as mapgl.SymbolLayerSpecification,
    'address-circle': addressCircleLayer as mapgl.CircleLayerSpecification,
    'topographic-place-circle': topographicPlaceCircleLayer as mapgl.CircleLayerSpecification,

    'charging-station-icon': chargingStationIconLayer as mapgl.SymbolLayerSpecification,
    'charging-station-text-number': sharedVehicleTextNumberLayer as mapgl.SymbolLayerSpecification,
    'charging-station-text-provider': sharedVehicleTextProviderLayer as mapgl.SymbolLayerSpecification,
    
    'car-rental-icon': carRentalIconLayer as mapgl.SymbolLayerSpecification,
    'car-rental-text-number': sharedVehicleTextNumberLayer as mapgl.SymbolLayerSpecification,
    'car-rental-text-provider': sharedVehicleTextProviderLayer as mapgl.SymbolLayerSpecification,
    
    'bike-icon': bikeIconLayer as mapgl.SymbolLayerSpecification,
    'bike-text-number': sharedVehicleTextNumberLayer as mapgl.SymbolLayerSpecification,
    'bike-text-provider': sharedVehicleTextProviderLayer as mapgl.SymbolLayerSpecification,
    
    'scooter-icon': scooterIconLayer as mapgl.SymbolLayerSpecification,
    'scooter-text-number': sharedVehicleTextNumberLayer as mapgl.SymbolLayerSpecification,
    'scooter-text-provider': sharedVehicleTextProviderLayer as mapgl.SymbolLayerSpecification,
    
    'poi-all': poisIcon as mapgl.SymbolLayerSpecification,
}

export const MAP_LAYERS_DEFINITIONS = map_layers_def
