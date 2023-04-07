import { cloudApi } from '@yandex-cloud/nodejs-sdk'

export type EntrypointConfig =
  Partial<cloudApi.serverless.functions_function_service.CreateFunctionVersionRequest>

export type Entrypoints = Record<string, () => EntrypointConfig>
