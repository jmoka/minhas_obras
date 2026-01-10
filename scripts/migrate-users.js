/**
 * Script de Migração de Usuários para Supabase Auth
 * 
 * IMPORTANTE: Leia o arquivo README-MIGRATION.md antes de executar!
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Erro: Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function migrateUsers() {
  console.log('🚀 Iniciando migração de usuários...\n');

  const { data: users, error: fetchError } = await supabaseAdmin
    .from('user')
    .select('id, nome, email, admin')
    .not('email', 'is', null);

  if (fetchError) {
    console.error('❌ Erro ao buscar usuários:', fetchError);
    return;
  }

  if (!users || users.length === 0) {
    console.log('ℹ️  Nenhum usuário encontrado para migrar.');
    return;
  }

  console.log(`📊 Encontrados ${users.length} usuários:\n`);
  users.forEach(u => console.log(`   - ${u.nome} (${u.email})`));
  
  console.log('\n⚠️  Todos receberão senha temporária: "MudarSenha123!"');
  console.log('\n⚠️  ATENÇÃO: Esta operação NÃO pode ser desfeita!');
  console.log('Continue? (Ctrl+C para cancelar)\n');

  // Aguardar 5 segundos
  await new Promise(resolve => setTimeout(resolve, 5000));

  const results = { success: [], failed: [], skipped: [] };

  for (const user of users) {
    console.log(`\n👤 Migrando: ${user.nome} (${user.email})`);

    try {
      const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: 'MudarSenha123!',
        email_confirm: true,
        user_metadata: { nome: user.nome }
      });

      if (createError) {
        console.log(`   ❌ Erro:`, createError.message);
        results.failed.push({ email: user.email, error: createError.message });
        continue;
      }

      console.log(`   ✅ Criado em auth.users`);
      results.success.push({ email: user.email, nome: user.nome });

    } catch (error) {
      console.log(`   ❌ Erro:`, error.message);
      results.failed.push({ email: user.email, error: error.message });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO\n');
  console.log(`✅ Sucesso: ${results.success.length}`);
  console.log(`❌ Falhas: ${results.failed.length}`);
  console.log('='.repeat(60));

  if (results.success.length > 0) {
    console.log('\n✅ Próximos passos:');
    console.log('   1. Notifique os usuários para fazer reset de senha');
    console.log('   2. Execute: supabase/migrations/remove_duplicate_auth_fields.sql');
  }
}

migrateUsers().catch(console.error);
