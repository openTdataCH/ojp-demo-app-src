# OJP Demo App

This is the source-code repository used for developing and deploying [OJP Demo](https://opentdatach.github.io/ojp-demo-app/) web-application.

![OJP_Demo](./docs/img/OJP_Demo.jpg)

## Quick Resources

- https://opentdatach.github.io/ojp-demo-app/ - production URL
- [CHANGELOG](./CHANGELOG.md) - deployment changes
- [Architecture](./docs/architecture.md)
- [App Features](./docs/features.md)
- [Query Params Examples](./docs/URLs.md)

## Install & Development server

Requirements:
- [Node.js](https://nodejs.org/en/), [npm](https://www.npmjs.com/)
- [Angular](https://angular.io/guide/setup-local#install-the-angular-cli), version 14.x was used to generate this project via `ng new` CLI command.

Installation steps:
- clone this repo
- install dependencies via npm

```
npm install
```

- copy [src/app/config/app-config.ts](./src/app/config/app-config.ts) to `src/app/config/app-config.local.ts` 

- get an OJP 2.0 (or 1.0) key from https://api-manager.opentransportdata.swiss/

- replace the key placeholder
```
# src/app/config/app-config.local.ts

...

// OJP 2.0
'V2-PROD': {
    url: 'https://api.opentransportdata.swiss/ojp20',
    authToken: 'PLACEHOLDER_REPLACE__PROD',
},

...
```

- serve local development server

```
ng serve
```

- navigate to [http://localhost:4200](http://localhost:4200/) in the browser

## License

The project is released under a [MIT license](./LICENSE.txt).

Copyright (c) 2021 - 2026 Open Data Platform Mobility Switzerland - [opentransportdata.swiss](https://opentransportdata.swiss/en/).
