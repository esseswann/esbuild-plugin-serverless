# Esbuild Serverless Plugin
[![Node version](https://img.shields.io/npm/v/esbuild-plugin-serverless.svg?style=flat)](https://www.npmjs.com/package/esbuild-plugin-serverless) \
This plugin allows you to imitate [hot-module-replacement](https://webpack.js.org/guides/hot-module-replacement/) when working with NodeJS based Cloud Functions in Yandex Cloud. \
Using [esbuild](esbuild.github.io) it rebuilds the code on save and deploys it to the cloud without even saving compiled files to the disk

## Setup
Install the neccessary packages
````bash
npm install esbuild esbuild-plugin-serverless ts-node
````

Create a file with a name similar to `build.ts`

Describe your Cloud Functions entrypoints and pass them to esbuild `build` function.
```typescript
import {
  EntrypointConfig,
  Entrypoints,
  getFromEnv,
  esbuildServerlessPlugin
} from 'esbuild-plugin-serverless'

const common: EntrypointConfig = {
  runtime: 'nodejs16',
  tag: ['latest'],
  resources: {
    $type: 'yandex.cloud.serverless.functions.v1.Resources',
    memory: 128 * 1024 * 1024
  },
  executionTimeout: {
    $type: 'google.protobuf.Duration',
    seconds: 5,
    nanos: 0
  }
}

const entrypoints: Entrypoints = {
  index: () => ({
    ...common,
    functionId: getFromEnv('CLOUD_FUNCTION_ID'),
    entrypoint: 'index.handler'
  })
}

import { context as createContext } from 'esbuild'
import esbuildServerlessPlugin from 'esbuild-plugin-serverless'
import { Entrypoints } from 'esbuild-plugin-serverless/entrypoint'

const build = async (entrypointConfig: Entrypoints) => {
  process.env.NODE_ENV = 'PRODUCTION'
  const entryPoints = Object.keys(entrypointConfig).map(
    // This should include the path to a folder
    // where your entrypoints reside as individual files or folders
    (entrypoint) => `./src/${entrypoint}`
  )

  // Some packages can break the build process so we can move them outside
  const external = {
    '@yandex-cloud/nodejs-sdk': '*',
    googleapis: '*'
  }
  const context = await createContext({
    entryPoints,
    bundle: true,
    minify: true,
    platform: 'node',
    target: 'node16',
    external: Object.keys(external),
    treeShaking: true,
    outdir: 'build',
    write: false,
    plugins: [esbuildServerlessPlugin(entrypointConfig, external)]
  })
  await context.watch()
}

export default build
```

Bind `build` function to `dev` script by adding it into your package.json
```json
{
  "scripts": {
    "dev": "ts-node chores/index.ts"
  }
}
```

Add some authorization by providing the following variables from [service sccount authorized key](https://cloud.yandex.ru/docs/iam/operations/authorized-key/create). You can use `getFromEnv` helper.
```
YC_ACCESS_KEY_ID=
YC_SERVICE_ACCOUNT_ID=
YC_PRIVATE_KEY=
```
This method is used for security reasons, as using OAuth token is not recommended. If these variables are not provided the library will attempt to authorize from Metadata service. One can also work entirely in the cloud using a VM with service-account attached to it.

Run
```bash
npm run dev
```
and enjoy automatic re-deployment on save