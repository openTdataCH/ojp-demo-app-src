# Application URLs

OJP-Demo URL: https://opentdatach.github.io/ojp-demo-app/

---- 

# 1. Journey Search

## Query Parameters

| Param  | Example (decoded) | Description |
|--|--|--|
|from| `8503000` for Zürich HB or `47.378173,8.540264` for same location as coordinates.|[DiDok](https://opentransportdata.swiss/de/dataset/didok) id or [Latitude,Longitude](https://developers.google.com/maps/documentation/javascript/reference/coordinates) coordinates. |
|to|see `from`| |
|via| `47.044250,8.308174;47.163056,8.687139` | List of [Latitude,Longitude](https://developers.google.com/maps/documentation/javascript/reference/coordinates) coordinates separated by semi-colon `;`. |
|mot_types | `default;walk` | List of MOT types: `default`, `walk`, `self-drive-car` separated by semi-colon `;`. Number of MOT types is equal with number of via parameters + 1 . If missing it will use `default`, meaning that no `ItModesToCover` filter will be used for the [OJPTripRequest](https://opentransportdata.swiss/de/cookbook/ojptriprequest/) calls. |
|trip_datetime| Trip datetime in `yyyy-MM-dd HH:mm` format | `2022-08-01 10:00` |
|stage| `prod` or `test` | To specify the OJP API backend. |
|do_search| `false` or `true` | If `true` the search will be performed after the endpoints information is init-ed. Default is `false`. |

## Examples

- [Bern to Zürich](https://opentdatach.github.io/ojp-demo-app/) - the app will prefill the from/to with Bern/Zürich endpoints and use the current date / time + PROD stage. No `ItModesToCover` will be used.
- [Bern to Rütli for Aug.1 with stop in Luzern](https://opentdatach.github.io/ojp-demo-app/search?from=46.941621%2C7.462849&to=8508471&via=47.050180%2C8.310180&mot_types=default%3Bdefault&trip_datetime=2022-08-01+10%3A00&stage=prod) - the app will prefill the from/to and via points and set the datetime to 1st of August.
- [Croy-Romainmôtier to Glis](https://opentdatach.github.io/ojp-demo-app/search?from=46.673066%2C6.462309&to=46.311076%2C7.977560&mot_types=default&trip_datetime=2022-07-25+17%3A45&stage=test) - use `TEST` stage to demo the `demandAndResponseBus` in the `BusSubmode` TripRequest response. The journey takes place in a Sunday evening.
- [Meiringen demandAndResponseBus](https://opentdatach.github.io/ojp-demo-app/search?from=46.691000%2C8.223430&to=46.726650%2C8.222980&stage=test) - use `TEST` stage to demo the `demandAndResponseBus` mode in Meiringen area.
- [Walk trip in Bern](https://opentdatach.github.io/ojp-demo-app/search?from=46.933946%2C7.440027&to=46.947515%2C7.466062&via=46.936732%2C7.447386&mot_types=walk%3Bdefault&trip_datetime=2022-07-06+10%3A00&stage=test) - use walking MOT type that will use `walk` for `ItModesToCover`.
- [Self-drive car ride](https://opentdatach.github.io/ojp-demo-app/search?from=46.882350%2C7.470718&to=46.964427%2C7.432219&via=46.948819%2C7.439128&mot_types=self-drive-car%3Bdefault&trip_datetime=2022-07-06+10%3A00&stage=test) - use walking MOT type that will use `self-drive-car` for `ItModesToCover`.
- [Shared mobility(cycle) ride](https://opentdatach.github.io/ojp-demo-app/search?from=46.743506%2C7.590045&to=46.745899%2C7.637482&via=46.743386%2C7.595724&mot_types=walk%3Bshared-mobility&trip_datetime=2022-07-06+10%3A00&stage=test) - use walking MOT type that will use `cycle` for `ItModesToCover` in Thun (Donkey Republic provider).

# 2. Station Board

## Query Parameters

| Param  | Example (decoded) | Description |
|--|--|--|
|stop_id| `8503000` for Zürich HB | [DiDok](https://opentransportdata.swiss/de/dataset/didok) valid `StopRef` ids |

- [Zürich HB](https://opentdatach.github.io/ojp-demo-app/board?stop_id=8503000) departures.
