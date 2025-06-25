import mapboxgl from 'mapbox-gl'

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

const map_layers_def: Record<string, mapboxgl.Layer> = {
    'stops-circle': stopsCircleLayer as mapboxgl.CircleLayerSpecification,
    'stops-label': stopsLabelLayer as mapboxgl.SymbolLayerSpecification,
    'address-circle': addressCircleLayer as mapboxgl.CircleLayerSpecification,
    'topographic-place-circle': topographicPlaceCircleLayer as mapboxgl.CircleLayerSpecification,

    'charging-station-icon': chargingStationIconLayer as mapboxgl.SymbolLayerSpecification,
    'charging-station-text-number': sharedVehicleTextNumberLayer as mapboxgl.SymbolLayerSpecification,
    'charging-station-text-provider': sharedVehicleTextProviderLayer as mapboxgl.SymbolLayerSpecification,
    
    'car-rental-icon': carRentalIconLayer as mapboxgl.SymbolLayerSpecification,
    'car-rental-text-number': sharedVehicleTextNumberLayer as mapboxgl.SymbolLayerSpecification,
    'car-rental-text-provider': sharedVehicleTextProviderLayer as mapboxgl.SymbolLayerSpecification,
    
    'bike-icon': bikeIconLayer as mapboxgl.SymbolLayerSpecification,
    'bike-text-number': sharedVehicleTextNumberLayer as mapboxgl.SymbolLayerSpecification,
    'bike-text-provider': sharedVehicleTextProviderLayer as mapboxgl.SymbolLayerSpecification,
    
    'scooter-icon': scooterIconLayer as mapboxgl.SymbolLayerSpecification,
    'scooter-text-number': sharedVehicleTextNumberLayer as mapboxgl.SymbolLayerSpecification,
    'scooter-text-provider': sharedVehicleTextProviderLayer as mapboxgl.SymbolLayerSpecification,
    
    'poi-all': poisIcon as mapboxgl.SymbolLayerSpecification,
}

export const MAP_LAYERS_DEFINITIONS = map_layers_def
