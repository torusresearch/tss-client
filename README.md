# TSS-Client-SDk

Client Side SDK for tss signature verification.

### Installation and setup

<br />
1. Installing node_modules

```
npm
```

<br />
2. Running the packages

```
npm run dev
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
npm run serve:local
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

Copy files into this repositories' path `packages/tss-lib`.

#### Step 3

Update version numbers for `@toruslabs/tss-lib`

#### Step 4

Publish changes to nmp for packages tss-lib and tss-client.
