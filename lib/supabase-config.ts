
/**
 * ==========================================
 * CONFIGURAÇÃO DE SEGURANÇA E SUPABASE
 * ==========================================
 * 
 * Este arquivo gerencia a interação segura com o Supabase.
 * 
 * RECURSOS:
 * 1. Criptografia AES-GCM (Client-Side) para e-mails.
 * 2. Hashing Bcrypt para senhas.
 * 3. Rate Limiting (Leaky Bucket) para prevenir força bruta.
 * 4. Logs de Auditoria para rastreabilidade.
 * 5. Higienização de Inputs (Via lib/security).
 * 
 * Veja 'SUPABASE_SETUP.md' para as queries SQL necessárias.
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { security } from './security';

// --- CONSTANTES E CONFIGURAÇÃO ---

// Helper para obter variáveis de ambiente de diferentes fontes
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}
  
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
       // @ts-ignore
      return process.env[key];
    }
  } catch (e) {}
  
  return '';
};

// Configuração com Fallbacks Seguros fornecidos pelo usuário
const PROJECT_ID = getEnv('VITE_PROJECT_ID') || 'rtzkppowxsfrygeqvhui';
const SUPABASE_URL = getEnv('VITE_SUPABASE_URL') || `https://${PROJECT_ID}.supabase.co`;

// Chaves padrão para garantir que o app inicie mesmo sem .env local configurado
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY') || 'sb_publishable_AGRK81';
const CLIENT_ENCRYPTION_KEY = getEnv('VITE_ENCRYPTION_KEY') || 'a7bF9mQ2kX8nR5sL0pO4cD3vE1wI6jH9';

if (!SUPABASE_ANON_KEY) {
  console.warn('⚠️ AVISO DE SEGURANÇA: VITE_SUPABASE_ANON_KEY não definida. O Supabase não funcionará corretamente.');
}

if (!CLIENT_ENCRYPTION_KEY || CLIENT_ENCRYPTION_KEY.length < 32) {
  console.warn('⚠️ AVISO DE SEGURANÇA: VITE_ENCRYPTION_KEY insegura ou ausente. Use uma string de 32 caracteres.');
}

// Inicializa o cliente Supabase
// O Supabase JS Client utiliza internamente Prepared Statements para todas as queries,
// prevenindo SQL Injection por design.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- UTILITÁRIOS DE CRIPTOGRAFIA ---

/**
 * Converte string para ArrayBuffer
 */
const str2ab = (str: string) => {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
};

/**
 * Importa a chave de criptografia para a Web Crypto API
 */
const getCryptoKey = async () => {
  // Ensure we have a key of at least 32 chars by padding if necessary (fallback mode)
  const keyString = (CLIENT_ENCRYPTION_KEY || 'fallback_insecure_key_for_dev_only').padEnd(32, '0');
  const rawKey = str2ab(keyString.slice(0, 32));
  return await window.crypto.subtle.importKey(
    "raw",
    rawKey,
    "AES-GCM",
    false,
    ["encrypt", "decrypt"]
  );
};

/**
 * Criptografa dados sensíveis (como email) usando AES-GCM.
 * Retorna o dado criptografado e o IV (Vetor de Inicialização) em Base64.
 */
const encryptField = async (text: string): Promise<{ encrypted: string; iv: string }> => {
  const key = await getCryptoKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(text);

  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encodedText
  );

  const encryptedArray = new Uint8Array(encryptedContent);
  const encryptedBase64 = btoa(String.fromCharCode.apply(null, Array.from(encryptedArray)));
  const ivBase64 = btoa(String.fromCharCode.apply(null, Array.from(iv)));

  return { encrypted: encryptedBase64, iv: ivBase64 };
};

/**
 * Descriptografa dados recebidos do banco.
 */
const decryptField = async (encryptedBase64: string, ivBase64: string): Promise<string> => {
    try {
        const key = await getCryptoKey();
        
        const encryptedData = new Uint8Array(atob(encryptedBase64).split("").map(c => c.charCodeAt(0)));
        const iv = new Uint8Array(atob(ivBase64).split("").map(c => c.charCodeAt(0)));

        const decryptedContent = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            encryptedData
        );

        return new TextDecoder().decode(decryptedContent);
    } catch (e) {
        console.error("Falha na descriptografia:", e);
        return "Dados ilegíveis (Erro de chave)";
    }
};

// --- RATE LIMITING (Client-Side Leaky Bucket) ---

const ATTEMPT_WINDOW = 60 * 1000; // 1 minuto
const MAX_ATTEMPTS = 5;
const attempts: Record<string, number[]> = {};

const checkRateLimit = (identifier: string): boolean => {
  const now = Date.now();
  if (!attempts[identifier]) {
    attempts[identifier] = [];
  }

  // Remove tentativas antigas da janela de tempo
  attempts[identifier] = attempts[identifier].filter(time => now - time < ATTEMPT_WINDOW);

  if (attempts[identifier].length >= MAX_ATTEMPTS) {
    return false; // Bloqueado
  }

  attempts[identifier].push(now);
  return true; // Permitido
};

// --- AUDIT LOGGING ---

const logAction = async (action: string, raffleId: string, details: object, success: boolean) => {
  if (!SUPABASE_ANON_KEY) return;

  try {
    // Higieniza os detalhes do log antes de enviar para evitar injeção de lixo no log
    const safeDetails = security.prepareForDatabase(details);
    
    await supabase.from('audit_logs').insert({
      action,
      raffle_id: raffleId,
      details: { 
        ...safeDetails, 
        success, 
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent 
      },
      ip_address: 'client-hidden', 
    });
  } catch (error) {
    console.error("Falha silenciosa ao salvar log de auditoria", error);
  }
};

// --- FUNÇÕES DE ADMINISTRAÇÃO ---

export const adminSecurity = {
  
  /**
   * 1. Cria credenciais de admin seguras no Supabase.
   * Higieniza o email antes de criptografar.
   */
  createRaffleAdmin: async (raffleId: string, email: string, password: string) => {
    if (!SUPABASE_ANON_KEY) {
        console.error("Supabase not configured. Skipping security storage.");
        return { success: false, error: "Supabase not configured" };
    }

    // HIGIENIZAÇÃO: Garante que o email não contém caracteres maliciosos antes de processar
    const safeEmail = security.sanitize(email);

    try {
      // 1. Gerar Hash da Senha
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // 2. Criptografar Email (usando o email higienizado)
      const { encrypted, iv } = await encryptField(safeEmail);

      // 3. Salvar no Supabase (Prepared Statement implícito do supabase-js)
      const { error } = await supabase.from('raffle_admins').insert({
        raffle_id: raffleId,
        encrypted_email: encrypted,
        password_hash: passwordHash,
        iv: iv
      });

      if (error) throw error;
      
      const maskedEmail = safeEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3");
      await logAction('CREATE_ADMIN', raffleId, { email_masked: maskedEmail }, true);
      
      return { success: true };

    } catch (error) {
      await logAction('CREATE_ADMIN_FAILED', raffleId, { error: String(error) }, false);
      console.error("Erro ao criar credenciais seguras:", error);
      return { success: false, error };
    }
  },

  /**
   * 2. Verifica credenciais de admin.
   */
  verifyRaffleAdmin: async (raffleId: string, passwordInput: string): Promise<boolean> => {
    if (!SUPABASE_ANON_KEY) return false;

    // Identificador seguro para Rate Limit
    const safeId = security.sanitize(raffleId);

    if (!checkRateLimit(safeId)) {
      console.warn("Rate limit exceeded for raffle login:", safeId);
      await logAction('LOGIN_BLOCKED_RATE_LIMIT', safeId, {}, false);
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('raffle_admins')
        .select('password_hash')
        .eq('raffle_id', safeId) // Parametrização segura
        .single();

      if (error || !data) {
        await logAction('LOGIN_ATTEMPT', safeId, { status: 'not_found' }, false);
        return false;
      }

      const isValid = await bcrypt.compare(passwordInput, data.password_hash);
      
      await logAction('LOGIN_ATTEMPT', safeId, {}, isValid);
      return isValid;

    } catch (error) {
      console.error("Erro interno na verificação:", error);
      return false;
    }
  },

  /**
   * 3. Recupera o email original descriptografado.
   */
  getAdminEmail: async (raffleId: string): Promise<string | null> => {
    if (!SUPABASE_ANON_KEY) return null;
    
    const safeId = security.sanitize(raffleId);

    try {
      const { data, error } = await supabase
        .from('raffle_admins')
        .select('encrypted_email, iv')
        .eq('raffle_id', safeId)
        .single();

      if (error || !data) return null;

      const email = await decryptField(data.encrypted_email, data.iv);
      return email;
    } catch (error) {
      return null;
    }
  },

  /**
   * 4. Atualiza credenciais (email e/ou senha).
   */
  updateRaffleAdmin: async (raffleId: string, newEmail?: string, newPassword?: string) => {
    if (!SUPABASE_ANON_KEY) return { success: false, error: "Supabase not configured" };

    const safeId = security.sanitize(raffleId);

    try {
      const updates: any = { updated_at: new Date().toISOString() };

      if (newPassword) {
        const salt = await bcrypt.genSalt(10);
        updates.password_hash = await bcrypt.hash(newPassword, salt);
      }

      if (newEmail) {
        const safeEmail = security.sanitize(newEmail);
        const { encrypted, iv } = await encryptField(safeEmail);
        updates.encrypted_email = encrypted;
        updates.iv = iv;
      }

      const { error } = await supabase
        .from('raffle_admins')
        .update(updates)
        .eq('raffle_id', safeId);

      if (error) throw error;

      await logAction('UPDATE_CREDENTIALS', safeId, { fields_updated: Object.keys(updates) }, true);
      return { success: true };

    } catch (error) {
      await logAction('UPDATE_CREDENTIALS_FAILED', safeId, { error: String(error) }, false);
      return { success: false, error };
    }
  }
};
