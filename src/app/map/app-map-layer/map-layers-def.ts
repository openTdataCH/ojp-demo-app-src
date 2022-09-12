import mapboxgl from 'mapbox-gl'

import stopsCircleLayer from './map-layers-def/stops/stops-circle.json'
import stopsLabelLayer from './map-layers-def/stops/stops-label.json'
import addressCircleLayer from './map-layers-def/address/address-circle.json';
import chargingStationIconLayer from './map-layers-def/poi/charging-station/charging-station-icon.json'
import carRentalIconLayer from './map-layers-def/poi/car-rental/car-rental-icon.json'
import bikeIconLayer from './map-layers-def/poi/bicycle-rental/bike-icon.json';
import scooterIconLayer from './map-layers-def/poi/scooter-rental/scooter-icon.json';
import poisAllCircleLayer from './map-layers-def/pois-all-circle.json'

const map_layers_def: Record<string, mapboxgl.Layer> = {
    'stops-circle': stopsCircleLayer as mapboxgl.CircleLayer,
    'stops-label': stopsLabelLayer as mapboxgl.SymbolLayer,
    'charging-station-icon': chargingStationIconLayer as mapboxgl.SymbolLayer,
    'address-circle': addressCircleLayer as mapboxgl.CircleLayer,
    'car-rental-icon': carRentalIconLayer as mapboxgl.SymbolLayer,
    'bike-icon': bikeIconLayer as mapboxgl.SymbolLayer,
    'scooter-icon': scooterIconLayer as mapboxgl.SymbolLayer,
    'pois-all-circle': poisAllCircleLayer as mapboxgl.CircleLayer,
}

export const MAP_LAYERS_DEFINITIONS = map_layers_def
