import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testLogin(email, password) {
  console.log(`\nTesting Email: [${email}] | Password: [${password}]`)
  
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
  await testLogin('macuscapobiangomed@gmail.com', '33384110m') // missing 'r'
  await testLogin('marcuscapobiangomed@gmail.com', '#Wagner10') // correct spelling
  await testLogin('marcuscapobiangomed@gmail.com', '33384110m') // correct spelling 2
}

run()
