import dotenv from 'dotenv'
dotenv.config()

const getFromEnv = (key: string) => {
  const value = process.env[key]
  if (!value) throw new Error(`Provide ${key} environment variable`)
  return value
}

export default getFromEnv
