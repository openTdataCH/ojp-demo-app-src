# OJP Demo App

This is the source-code repository used for developing and deploying [OJP Demo](https://opentdatach.github.io/ojp-demo-app/) web-application.

![OJP_Demo](./docs/img/OJP_Demo.jpg)

## Quick Resources

- https://opentdatach.github.io/ojp-demo-app/ - production URL
- [docs](./docs/README.md) - documentation main page
- [CHANGELOG](./CHANGELOG.md) - deployment changes

## Install & Development server

Requirements:
- [Node.js](https://nodejs.org/en/), [npm](https://www.npmjs.com/)
- [Angular](https://angular.io/guide/setup-local#install-the-angular-cli), version 11.x was used to generate this project via `ng new` CLI command.

Installation steps:
- clone this repo
- install dependencies via npm
```
npm install
```
- serve development server via `ng serve` cli
```
ng serve
```
- navigate to [http://localhost:4200](http://localhost:4200/) in the browser

## Deploy to production

[Github Pages](https://pages.github.com/) is used to publish and host the OJP Demo app.

- run `ng deploy` to deploy the app. 
- the CLI will bundle the app files and assets in production mode and upload them to `gh-pages` branch of https://github.com/openTdataCH/ojp-demo-app 
- read/write access is needed to push to repo
- if you need to deploy to another repo, change `..architect.deploy` config in [./angular.json](./angular.json#L133-L140) for a different repo.
```
  "deploy": {
    "builder": "angular-cli-ghpages:deploy",
    "options": {
      "repo": "git@github.com:openTdataCH/ojp-demo-app.git",
      "baseHref": "https://openTdataCH.github.io/ojp-demo-app/",
      "name": "OJP Demo App"
    }
  }
```

## License

The project is released under a [MIT license](./LICENSE.txt).

Copyright (c) 2021 - 2022 Open Data Platform Mobility Switzerland - [opentransportdata.swiss](https://opentransportdata.swiss/en/).