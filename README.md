
# TSS-Client-SDK

Client-side SDK for threshold signing.

## Setup

1. Download dependencies and link local packages.
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
To make `tss-client` use the local development version of `tss-lib`, change the entry for `@toruslabs/tss-lib` in `tss-client/package.json`.
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
dkls.d.ts
dkls_bg.wasm.d.ts
```

3. Copy contents of `dkls.js` into `packages/tss-lib/browser.js`.
Revert any changes to the following functions and exports.
```
function initSync(module)
async function init(input)
export { initSync, finalizeInit, getImports }
```

4. Copy and rename `dkls_bg.wasm` to `client.wasm` and overwrite `packages/tss-lib/wasm/client.wasm` with it.
