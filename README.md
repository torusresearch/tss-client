
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
