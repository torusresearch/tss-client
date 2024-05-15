# TSS-Client-SDk

Client Side SDK for tss signature verification.

### Installation and setup
```
npm install
npm run clean
npm run build
```

### Running tests
```bash
# with `prod` servers
node scripts/e2e.js
# with `local` servers
node scripts/e2e.js --env=local
```
### Run Example App
```bash
# run example client app with `prod` servers
npm run serve:example
# run example client app locally
npm run serve:example:local
```

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
