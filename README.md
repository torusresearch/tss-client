
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

1. Build [DKLS19](https://github.com/torusresearch/dkls) with
```
cd dkls
wasm-pack build --release --target web
```

2. From the `pkg` subfolder in `dkls`, copy the following files into this repositories' path `packages/tss-lib`.
```
dkls.js
dkls.d.ts
dkls_bg.wasm
dkls_bg.wasm.d.ts
```

3. In file `dkls.js`, function `init`, remove the usage of `import.meta.url`. This is necessary to enable running `dkls` in the web worker.
```ts
// input = new URL('dkls_bg.wasm', import.meta.url);
throw new Error('unsupported');
```
