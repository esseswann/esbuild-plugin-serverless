import dotenv from 'dotenv'
import invariant from 'invariant'
dotenv.config()

const getFromEnv = (key: string) => {
  const value = process.env[key]
  invariant(value, `Provide ${key} environment variable`)
  return value
}

export default getFromEnv
