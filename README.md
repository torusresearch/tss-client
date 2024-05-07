# DKLS Client Library

Client-side library for DKLS threshold signing.

## Installation and setup

```
npm install
```

## Running local test

```
npm run clean
npm run build
npm run serve:local
```

## Updating DKLS19

### Step 1

Build [DLKS19](https://github.com/torusresearch/dkls) with

```
cd dkls
wasm-pack build --release --target web
```

### Step 2

Copy the files from `dkls/pkg` (except the WASM and the package.json) to `packages/tss-lib`.

### Step 3

Copy the WASM file from `dkls/pkg` to `packages/tss-lib-wasm`.
