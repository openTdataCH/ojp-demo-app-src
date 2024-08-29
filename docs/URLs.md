# Application URLs

OJP-Demo URL: https://opentdatach.github.io/ojp-demo-app/

---- 

# 1. Journey Search

## Query Parameters

| Param  | Example (decoded) | Description |
|--|--|--|
|lang| `de`, `en`, `fr` or `it` | Choose the ISO language in which the OJP repsonse will be deliverd, default is the browser locale. |
|from| `8503000` for Zürich HB or `47.378173,8.540264` for same location as coordinates.|[DiDok](https://opentransportdata.swiss/de/dataset/didok) id or [Latitude,Longitude](https://developers.google.com/maps/documentation/javascript/reference/coordinates) coordinates. |
|to|see `from`| |
|via| `47.044250,8.308174;47.163056,8.687139` | List of [Latitude,Longitude](https://developers.google.com/maps/documentation/javascript/reference/coordinates) coordinates separated by semi-colon `;`. |
| mode_types | `monomodal` | Mono-, multi- modal journey type switcher. List of mode types: `monomodal`, `mode_at_start`, `mode_at_end`, `mode_at_start_end`.  Multiple values (journeys with via points) are separated by semi-colon `;`. Number of the values is equal with number of via parameters + 1 |
| transport_modes | `public_transport` | The MOT used, list of possible values": `public_transport`, `walking` `cycle`, `car_self_driving`, `bicycle_rental`, `escooter_rental`, `car_sharing`. All values, except `public_transport` will set `ItModesToCover` filter in the [OJPTripRequest](https://opentransportdata.swiss/de/cookbook/ojptriprequest/) calls. Multiple values (joruneys with via points) are separated by semi-colon `;`. Number of the values is equal with number of via parameters + 1 |
|trip_datetime| Trip datetime in `yyyy-MM-dd HH:mm` format | `2022-08-01 10:00` |
|stage| `prod` or `test` | To specify the OJP API backend. |
|do_search| `false` or `true` | If `true` the search will be performed after the endpoints information is init-ed. Default is `false`. |

## Examples

- [Bern to Zürich](https://opentdatach.github.io/ojp-demo-app/) - the app will prefill the from/to with Bern/Zürich endpoints and use the current date / time + PROD stage. No `ItModesToCover` will be used.
- [Bern to Rütli for Aug.1 with stop in Luzern](https://opentdatach.github.io/ojp-demo-app/search?from=46.941621,7.462849&to=8508471&via=47.050180,8.310180&mode_types=monomodal;monomodal&transport_modes=public_transport;public_transport&trip_datetime=2022-08-01%2010:00&stage=prod) - the app will prefill the from/to and via points and set the datetime to 1st of August.
- [Croy-Romainmôtier to Glis](https://opentdatach.github.io/ojp-demo-app/search?from=46.673066%2C6.462309&to=46.311076%2C7.977560&&mode_types=monomodal&trip_datetime=2022-07-25+17%3A45&stage=test) - use `TEST` stage to demo the `demandAndResponseBus` in the `BusSubmode` TripRequest response. The journey takes place in a Sunday evening.
- [Meiringen demandAndResponseBus](https://opentdatach.github.io/ojp-demo-app/search?from=46.691000%2C8.223430&to=46.726650%2C8.222980&stage=test) - use `TEST` stage to demo the `demandAndResponseBus` mode in Meiringen area.
- [Multi-modal trip with shared bicycle at start](https://opentdatach.github.io/ojp-demo-app/search?from=46.925047,7.417903&to=47.056009,7.630737&mode_types=mode_at_start&transport_modes=bicycle_rental&trip_datetime=2022-10-09%2023:28&stage=prod) - use `mode_at_start` mode_type and `cycle` MOT type for `ItModesToCover`.
- [Self-drive car ride](https://opentdatach.github.io/ojp-demo-app/search?from=46.944397,7.414940&to=46.934726,7.497647&mode_types=monomodal&transport_modes=car_self_driving) - use `monomodal` mode type and `self-drive-car` MOT type for `ItModesToCover`.

# 2. Station Board

## Query Parameters

| Param  | Example (decoded) | Description |
|--|--|--|
|type| `arr`, `dep` | Station board type, arrivals or departure, default value is `dep` (departures) |
|stop_id| `8503000` for Zürich HB | [DiDok](https://opentransportdata.swiss/de/dataset/didok) valid `StopRef` ids |
|day| `2022-12-01` for 1.Dec 2022 | Day used for the station board; if not given, the current day will be used |
|time| `14:20` | Time used for the station board; if not given, the current time will be used |


## Examples

- [Zürich HB](https://opentdatach.github.io/ojp-demo-app/board?stop_id=8503000) departures.
- [Bern Bahnhof](https://opentdatach.github.io/ojp-demo-app/board?type=arr&stop_id=8576646&time=15:00) arrivals for 15:00 in the current day.

----

CHANGELOG
- Aug 2024 - added `lang` param
- Oct 2022 - updated mono-, multi- modal journey examples
- Sep 2022 - adds Station Board
- Mar 2022 - adds `do_search` param
- Jul 2021 - created this document