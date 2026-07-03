import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const testEmail = process.env.TEST_LOGIN_EMAIL
const testPassword = process.env.TEST_LOGIN_PASSWORD

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testLogin(email, password) {
  console.log(`\nTesting Email: [${email}]`)
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  })

  if (error) {
    console.error("-> Failed:", error.message)
  } else {
    console.log("-> SUCCESS! User ID:", data.user?.id)
  }
}

async function run() {
  if (!testEmail || !testPassword) {
    console.error('Set TEST_LOGIN_EMAIL and TEST_LOGIN_PASSWORD to run this manual login check.')
    process.exit(1)
  }

  await testLogin(testEmail, testPassword)
}

run()
