
# TSS-Client-SDK

Client-side SDK for threshold signing.

## Setup

Download dependencies and link local packages.
```
npm install
npm run bootstrap
```

## Development

### Build

The following command builds the packages and also watches for changes and rebuilds automatically.
```
npm run dev
```

### Use local dependecies
To make package `tss-client` use the local version of `tss-lib`, open `tss-client/package.json` and change the entry for `@toruslabs/tss-lib`.
```
"@toruslabs/tss-lib": "file:../tss-lib"
```

### Update DKLS19
In subdirectory `packages/tss-lib`, run the following.
```
npm run upgrade-dkls <path to dkls crate>
```
