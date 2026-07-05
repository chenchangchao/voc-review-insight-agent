import dotenv from 'dotenv'
import pg from 'pg'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const { Client } = pg

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

dotenv.config({ path: resolve(apiRoot, '.env.production') })
dotenv.config({ path: resolve(apiRoot, '.env.local') })
dotenv.config({ path: resolve(apiRoot, '.env') })

const databaseUrl = process.env.DATABASE_URL


if (!databaseUrl) {
  console.error('❌ DATABASE_URL 未配置。请检查 .env 文件里是否有 DATABASE_URL，并确认没有被 # 注释。')
  process.exit(1)
}

const safeUrl = databaseUrl.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:******@')

console.log('🔍 正在测试 PostgreSQL 连接...')
console.log(`DATABASE_URL = ${safeUrl}`)

const client = new Client({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 5000,
  query_timeout: 10000,
})

try {
  await client.connect()

  console.log('✅ PostgreSQL 连接成功')

  const result = await client.query(`
    select
      now() as db_time,
      current_database() as database,
      current_user as user,
      inet_server_addr() as server_addr,
      inet_server_port() as server_port,
      version() as version
  `)

  const row = result.rows[0]

  console.log('📌 数据库信息：')
  console.log(`- db_time     : ${row.db_time}`)
  console.log(`- database    : ${row.database}`)
  console.log(`- user        : ${row.user}`)
  console.log(`- server_addr : ${row.server_addr}`)
  console.log(`- server_port : ${row.server_port}`)
  console.log(`- version     : ${row.version}`)
} catch (error) {
  console.error('❌ PostgreSQL 连接失败')

  if (error instanceof Error) {
    console.error(`错误信息: ${error.message}`)
  } else {
    console.error(error)
  }

  process.exitCode = 1
} finally {
  await client.end().catch(() => {})
}
