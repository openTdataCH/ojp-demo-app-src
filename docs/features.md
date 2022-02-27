# OJP App Features

## From / To / Via Search

- from/to endpoints can be pick-ed up using the autocomplete (type-ahead) feature

![image](./img/features/search_type_ahead_v2.jpg)

- clicking on the `From`, `To` labels will zoom the map to the endpoint locations

![image](./img/features/from_to_zoom_to_map.jpg)

- the `From`/ `To`/ `Via` endpoints can be chosen from the map via right-click action

![image](./img/features/map_right_click.jpg)

- the `From`/ `To`/ `Via` position of the map markers can be adjusted via dragging the marker on the map

![image](./img/features/map_drag_marker.jpg)

## Multi-modal Journeys Search

- a simple search has only a `From` and a `To` endpoint without any `Via`(intermediary) point. This search will return `ojp:TripResult/ojp:Trip` entries which are composed of individual, mono-modal `ojp:TripLeg` entries. See [request](./request_examples/Gurten_Zuerich-simple-01-request.xml) and [response](./request_examples/Gurten_Zuerich-simple-02-response.xml) XMLs.

![image](./img/features/OJPTripRequest-Search-Map_v2.jpg)

----

VIP

----

CHANGELOG
- Feb 2022 - created this document