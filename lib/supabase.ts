import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

console.log('🔗 Supabase URL:', supabaseUrl)
console.log('🔑 Supabase Key (primeiros 10 chars):', supabaseAnonKey?.substring(0, 10))

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function initializeDatabase() {
  console.log('🔍 Testando conexão com Supabase...')
  try {
    console.log('💾 Enviando request para tabela ranking...')
    const { data, error, status, statusText, count } = await supabase
      .from("ranking")
      .select("count", { count: 'exact' })
      .limit(1)

    console.log('💾 Resposta completa:', { 
      data, 
      error, 
      status,
      statusText,
      count
    })

    if (error) {
      console.error('❌ Erro ao inicializar banco:', error)
      console.log('📝 Status:', error.code)
      console.log('ℹ️ Mensagem:', error.message)
      console.log('📄 Detalhes:', error.details)
      throw new Error(`Failed to check ranking table: ${error.message}`)
    }

    console.log('✅ Tabela ranking existe e está acessível!')
    return { success: true }
  } catch (error) {
    console.error('❌ Falha ao inicializar banco:', error)
    if (error instanceof Error) {
      console.log('📝 Nome do erro:', error.name)
      console.log('ℹ️ Mensagem:', error.message)
      console.log('📄 Stack:', error.stack)
    }
    throw new Error(`Failed to initialize database: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function getTop12Ranking() {
  console.log('🏆 Buscando top 12 ranking...')
  try {
    const { data, error } = await supabase
      .from("ranking")
      .select('*')
      .order('score', { ascending: false })
      .limit(12)

    if (error) {
      console.error('❌ Erro ao buscar top 12:', error)
      throw error
    }

    console.log('✅ Top 12 recebido:', data)
    return data
  } catch (error) {
    console.error('❌ Erro ao buscar top 12:', error)
    return []
  }
}

export async function getTop3Ranking() {
  console.log('🏆 Buscando top 3 ranking...')
  try {
    // Primeiro busca todos os jogadores para debug
    const { data: allPlayers } = await supabase
      .from("ranking")
      .select('*')
      .order('score', { ascending: false })
    
    console.log('📑 TODOS os jogadores:', allPlayers)

    // Depois busca só o top 3
    const { data, error, status, statusText, count } = await supabase
      .from("ranking")
      .select('*', { count: 'exact' })
      .order('score', { ascending: false })
      .limit(3)

    console.log('💾 Resposta completa:', { 
      data, 
      error, 
      status,
      statusText,
      count
    })

    if (error) {
      console.error('❌ Erro ao buscar top 3:', error)
      console.log('📝 Status:', error.code)
      console.log('ℹ️ Mensagem:', error.message)
      console.log('📄 Detalhes:', error.details)
      return []
    }

    console.log('✅ Top 3 obtido com sucesso:', data)
    return data
  } catch (error) {
    console.error('❌ Falha ao buscar top 3:', error)
    if (error instanceof Error) {
      console.log('📝 Nome do erro:', error.name)
      console.log('ℹ️ Mensagem:', error.message)
      console.log('📄 Stack:', error.stack)
    }
    return []
  }
}

