# TSS-Node POC
POC for tss signature verification.

### Installation and Setup
<br />
1. Installing node_modules

```
cd pkg && npm i && npm run build && cd ..
npm i
```

<br />
2. Generate info for your server nodes

```
npm run build:server
npm run serve:server 1
```

### Development
<br />
1. Run server

```
npm run build:server && npm run serve:server
```

<br />
2. Run client (browser)

```
npm run serve:client
```
