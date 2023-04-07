import { Session, cloudApi, serviceClients } from '@yandex-cloud/nodejs-sdk'
import { OutputFile, Plugin } from 'esbuild'
import JSZip from 'jszip'
import path from 'path'
import { EntrypointConfig, Entrypoints } from './entrypoint'
import getFromEnv from './getFromEnv'

const CreateFunctionVersionRequest =
  cloudApi.serverless.functions_function_service.CreateFunctionVersionRequest

const esbuildServerlessPlugin = (entrypoints: Entrypoints): Plugin => ({
  name: 'serverless',
  setup(build) {
    const session = new Session({
      serviceAccountJson: {
        accessKeyId: getFromEnv('YC_ACCESS_KEY_ID'),
        serviceAccountId: getFromEnv('YC_SERVICE_ACCOUNT_ID'),
        privateKey: getFromEnv('YC_PRIVATE_KEY')
      }
    })
    build.onEnd(async (result) => {
      if (result.outputFiles)
        for (const outputFile of result.outputFiles) {
          const { content, filename } = await packPayload(outputFile)
          const entrypointConfig = entrypoints[filename.name]
          if (!entrypointConfig)
            throw new Error('There should be a config for each entrypoint')
          const createVersionRequest = entrypointConfig()
          await uploadFunction(session, createVersionRequest, content)
        }
    })
  }
})

const packPayload = async (outputFile: OutputFile) => {
  console.log('Packing started')
  const zip = new JSZip()
  const filename = path.parse(outputFile.path.split('build')[1])
  console.log(
    `Packing ${outputFile.contents.length} bytes from ${filename.base}`
  )
  zip.file(filename.base, outputFile.contents)
  zip.file(
    'package.json',
    '{ "dependencies": { "@yandex-cloud/nodejs-sdk": "2.3.2" }}'
  )
  const content = await zip.generateAsync({ type: 'nodebuffer' })
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

export default esbuildServerlessPlugin
