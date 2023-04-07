# Esbuild Serverless Plugin
This plugin allows you to imitate (hot-module-replacement)[https://webpack.js.org/guides/hot-module-replacement/] when working with NodeJS based Cloud Functions in Yandex Cloud

## Setup
Install the package
`npm install esbuild-plugin-serverless`

Create a file with a name similar to `build.ts`

Describe your Cloud Functions entrypoints and pass them to esbuild `build` function.
```typescript
import {
  EntrypointConfig,
  Entrypoints
} from 'esbuild-plugin-serverless/entrypoint'
import getFromEnv from 'esbuild-plugin-serverless/getFromEnv'

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
    // This should include the path to a folder where your entrypoints reside as individual files
    (entrypoint) => `./src/${entrypoint}`
  )
  const context = await createContext({
    entryPoints,
    bundle: true,
    minify: true,
    platform: 'node',
    target: 'node16',
    // If you are using this package it's gonna break without this line
    external: ['@yandex-cloud/nodejs-sdk'],
    treeShaking: true,
    outdir: 'build',
    write: false,
    plugins: [esbuildServerlessPlugin(entrypointConfig)]
  })
  await context.watch()
}

export default build
```