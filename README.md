# TSS-Client-SDk

Client Side SDK for tss signature verification.

### Installation and setup

<br />
```
npm install
```
<br />

### Running example

<br />
```
npm run clean
npm run build
npm run serve:local
```
<br />

### Updating DKLS19

#### Step 1

Build [DLKS19](https://github.com/torusresearch/dkls) with

```
cd dkls
wasm-pack build --release --target web
```

#### Step 2

From the `pkg` subfolder in `dkls`:

Copy the following files:

```
dkls.d.ts
dkls_bg.wasm.d.ts
```

into this repositories' path `packages/tss-lib`.

#### Step 3

Copy contents of `dkls.js` into `packages/tss-lib/browser.js`.

#### Step 4

Revert any changes to the following functions and exports in `browser.js`:

```
function initSync(module)
async function init(input)
export { initSync, finalizeInit, getImports }
```

#### Step 5

Copy and rename `dkls_bg.wasm` to `client.wasm` and overwrite `packages/tss-lib/wasm/client.wasm` with it.

#### Step 6

Publish changes to nmp for packages tss-lib and tss-client.
