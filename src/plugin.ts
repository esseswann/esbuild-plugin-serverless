import { Session, cloudApi, serviceClients } from '@yandex-cloud/nodejs-sdk'
import { ServiceAccountCredentialsConfig } from '@yandex-cloud/nodejs-sdk/dist/types'
import { OutputFile, Plugin } from 'esbuild'
import JSZip from 'jszip'
import path from 'path'
import { EntrypointConfig, Entrypoints } from './entrypoint'
import { getFromEnv } from './getFromEnv'

const CreateFunctionVersionRequest =
  cloudApi.serverless.functions_function_service.CreateFunctionVersionRequest

export const esbuildServerlessPlugin = (
  entrypoints: Entrypoints,
  external?: Record<string, string>
): Plugin => ({
  name: 'serverless',
  setup(build) {
    const session = new Session(
      process.env.YC_ACCESS_KEY_ID ? getSessionConfig() : {}
    )
    const cache = new Map()
    build.onEnd(async (result) => {
      if (result.outputFiles)
        for (const outputFile of result.outputFiles) {
          if (cache.get(outputFile.path) === outputFile.hash)
            continue
          cache.set(outputFile.path, outputFile.hash)
          const { content, filename } = await packPayload(outputFile, external)
          const entrypointConfig = entrypoints[filename.name]
          if (!entrypointConfig)
            throw new Error('There should be a config for each entrypoint')
          const createVersionRequest = entrypointConfig()
          await uploadFunction(session, createVersionRequest, content)
        }
    })
  }
})

const getSessionConfig = (): ServiceAccountCredentialsConfig => ({
  serviceAccountJson: {
    accessKeyId: getFromEnv('YC_ACCESS_KEY_ID'),
    serviceAccountId: getFromEnv('YC_SERVICE_ACCOUNT_ID'),
    privateKey: getFromEnv('YC_PRIVATE_KEY')
  }
})

const packPayload = async (
  outputFile: OutputFile,
  external?: Record<string, string>
) => {
  console.log('Packing started')
  const zip = new JSZip()
  const filename = path.parse(outputFile.path.split('build')[1])
  console.log(
    `Packing ${outputFile.contents.length} bytes from ${filename.base}`
  )
  zip.file(filename.base, outputFile.contents)
  if (external)
    zip.file('package.json', `{ "dependencies": ${JSON.stringify(external)}}`)
  const content = await zip.generateAsync({ type: 'nodebuffer' })
  console.log(
    `Generated ${content.length} bytes zip archive for ${filename.base}`
  )
  return {
    content,
    filename
  }
}

const uploadFunction = async (
  session: Session,
  entrypointConfig: EntrypointConfig,
  content: Buffer
) => {
  console.log('Uploading function')
  const client = session.client(serviceClients.FunctionServiceClient)
  const createVersionRequest = CreateFunctionVersionRequest.fromPartial({
    ...entrypointConfig,
    content
  })
  await client.createVersion(createVersionRequest)
  console.log('Function uploaded')
}
