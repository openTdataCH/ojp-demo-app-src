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
    'stops-circle': stopsCircleLayer as mapboxgl.CircleLayer,
    'stops-label': stopsLabelLayer as mapboxgl.SymbolLayer,
    'address-circle': addressCircleLayer as mapboxgl.CircleLayer,
    'topographic-place-circle': topographicPlaceCircleLayer as mapboxgl.CircleLayer,

    'charging-station-icon': chargingStationIconLayer as mapboxgl.SymbolLayer,
    'charging-station-text-number': sharedVehicleTextNumberLayer as mapboxgl.SymbolLayer,
    'charging-station-text-provider': sharedVehicleTextProviderLayer as mapboxgl.SymbolLayer,
    
    'car-rental-icon': carRentalIconLayer as mapboxgl.SymbolLayer,
    'car-rental-text-number': sharedVehicleTextNumberLayer as mapboxgl.SymbolLayer,
    'car-rental-text-provider': sharedVehicleTextProviderLayer as mapboxgl.SymbolLayer,
    
    'bike-icon': bikeIconLayer as mapboxgl.SymbolLayer,
    'bike-text-number': sharedVehicleTextNumberLayer as mapboxgl.SymbolLayer,
    'bike-text-provider': sharedVehicleTextProviderLayer as mapboxgl.SymbolLayer,
    
    'scooter-icon': scooterIconLayer as mapboxgl.SymbolLayer,
    'scooter-text-number': sharedVehicleTextNumberLayer as mapboxgl.SymbolLayer,
    'scooter-text-provider': sharedVehicleTextProviderLayer as mapboxgl.SymbolLayer,
    
    'poi-all': poisIcon as mapboxgl.SymbolLayer,
}

export const MAP_LAYERS_DEFINITIONS = map_layers_def
