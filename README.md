
# TSS-Client-SDk
Client Side SDK for tss signature verification.

### Installation and setup
<br />
1. Installing node_modules

```
yarn
```

<br />
2. Bootstrap

```
yarn bootstrap
```
<br />
3. Running the packages

```
yarn run dev
```

### Development
<br />
1. Setup any of the demo apps from `demo` folders.

```
cd demo/<folder-name>
```

<br />
2. Run example app.

```
npm i && npm start
```

NOTE: If you are using a local wasm file URL, Please copy the client wasm file from `packages/tss-lib/wasm/client.wasm` in your test app dist folder.

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
