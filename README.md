# eisti-celcat

## Description

Extracts the current month's planning from celcat and converts to ics.

`puppeteer-version.js` uses puppeteer, slow but it's the first version, used for testing

`index.js` uses direct requests

Will gather data from the previous month to the following year.

## Requirements

> - nodejs
> - puppeteer (for the puppeteer version)

## Dependencies

Listed in package.json

## Instalation

> - Clone the repo
> - Rename settings.json.example to settings.json and change "login" and "password". Add people using their federation ids from the example
> - Install the dependencies via `npm install`

for the puppeteer version, install puppeteer via `npm install puppeteer`

## Usage

`node index.js`

## TODO

```none
remove the puppeteer part
command line arguments
```

## Other versions

a go version, which is faster, can be found [here](https://github.com/Obito1903/CY-celcat-to-ics)
