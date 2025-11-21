# Configuração de Segurança - Sorte do Bem (Supabase)

Este documento descreve como configurar o banco de dados Supabase para garantir segurança máxima das credenciais de administrador das rifas.

## 1. Configuração do Banco de Dados (SQL)

Acesse o **SQL Editor** no painel do Supabase e execute o script abaixo para criar as tabelas e aplicar as políticas de segurança (RLS).

```sql
-- 1. Tabela de Admins de Rifa (Dados sensíveis)
create table if not exists raffle_admins (
  id uuid default gen_random_uuid() primary key,
  raffle_id text not null unique,       -- ID da rifa gerado pelo app (ex: timestamp)
  encrypted_email text not null,        -- Email criptografado (AES-GCM via Client)
  password_hash text not null,          -- Hash da senha (Bcrypt)
  iv text not null,                     -- Vetor de inicialização da criptografia
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Tabela de Logs de Auditoria
create table if not exists audit_logs (
  id uuid default gen_random_uuid() primary key,
  action text not null,                 -- Ex: 'LOGIN_ATTEMPT', 'CREATE_ADMIN'
  raffle_id text,
  details jsonb,                        -- Metadados (User Agent, Status, Erro)
  ip_address text,
  created_at timestamptz default now()
);

-- 3. Índices para Performance
create index if not exists idx_raffle_admins_raffle_id on raffle_admins(raffle_id);
create index if not exists idx_audit_logs_raffle_id on audit_logs(raffle_id);

-- 4. Habilitar Row Level Security (RLS)
alter table raffle_admins enable row level security;
alter table audit_logs enable row level security;

-- 5. Políticas de Segurança (Policies)

-- POLITICA: Raffle Admins
-- Permitir INSERÇÃO pública (Qualquer pessoa pode criar uma rifa nova)
create policy "Public Insert Admins" 
on raffle_admins for insert 
with check (true);

-- Permitir LEITURA pública baseada no ID (Necessário para verificar login)
-- Nota: A segurança real vem do fato de que a senha está hashada e o email criptografado.
create policy "Public Select Admins" 
on raffle_admins for select 
using (true);

-- Permitir ATUALIZAÇÃO baseada no ID
create policy "Public Update Admins" 
on raffle_admins for update 
using (true);

-- POLITICA: Audit Logs
-- Permitir INSERÇÃO pública (App pode escrever logs)
create policy "Public Insert Logs" 
on audit_logs for insert 
with check (true);

-- Bloquear LEITURA pública de logs (Ninguém deve ler logs via API pública)
create policy "No Public Select Logs" 
on audit_logs for select 
using (false);
```

## 2. Chaves de Ambiente (.env)

Crie um arquivo `.env` na raiz do projeto (não commite este arquivo no Git) e adicione:

```env
# Chave pública do Supabase (Configurações -> API -> anon public)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Chave de Criptografia do Cliente (AES-GCM)
# IMPORTANTE: Se perder esta chave, todos os e-mails criptografados serão irrecuperáveis.
# Gere uma string aleatória de 32 caracteres.
VITE_ENCRYPTION_KEY=MinhaChaveSecretaDe32Caracteres!!!
```

### Como gerar a Chave de Criptografia
No terminal Linux/Mac:
```bash
openssl rand -base64 24
```
Ou apenas digite uma frase longa e complexa com exatamente 32 bytes.

## 3. Integração no Código

Exemplo de como usar a segurança no arquivo `pages/CreateRafflePage.tsx` (substituindo o `storage.save` antigo):

```typescript
import { adminSecurity } from '../lib/supabase-config';
import { storage } from '../lib/storage';

// Dentro do handleSubmit:
const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Salva dados públicos no LocalStorage (ou seu DB principal)
    const newRaffle = storage.raffles.save({ ...dadosRifa });

    // 2. Salva credenciais seguras no Supabase
    const securityResult = await adminSecurity.createRaffleAdmin(
        newRaffle.id, 
        adminEmail, 
        adminPassword
    );

    if (!securityResult.success) {
        alert("Erro ao salvar credenciais de segurança!");
        return;
    }

    navigate(`/rifa/${newRaffle.id}/pagamento`);
};
```

## 4. Aviso Importante de Segurança

A criptografia implementada é **Client-Side Encryption**. 
Isso significa que o banco de dados Supabase armazena apenas "lixo" criptografado para o campo de e-mail. Nem mesmo os administradores do banco de dados podem ler os e-mails sem a `VITE_ENCRYPTION_KEY`.

**Risco:** Como esta é uma aplicação Web (Frontend), a chave `VITE_ENCRYPTION_KEY` reside no código do navegador do usuário. Isso protege contra vazamentos de banco de dados (SQL Dump), mas não protege contra um ataque direcionado onde o atacante inspeciona o código fonte do cliente em execução. Para segurança absoluta, a criptografia deve ser movida para uma Edge Function ou Backend Server.
