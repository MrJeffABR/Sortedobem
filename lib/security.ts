
/**
 * ==========================================
 * UTILITÁRIOS DE SEGURANÇA (SECURITY UTILS)
 * ==========================================
 * 
 * Este módulo fornece ferramentas para:
 * 1. Higienização de Entrada (Prevenção de XSS)
 * 2. Preparação de Dados para Banco de Dados
 * 
 * NOTA SOBRE SQL INJECTION:
 * O cliente Supabase JS utiliza consultas parametrizadas (Prepared Statements) 
 * nativamente. Isso significa que valores passados para funções como .eq(), .insert(), etc.,
 * são tratados estritamente como dados e nunca como código executável SQL.
 * 
 * Estas funções adicionam uma camada extra de "Limpeza" para garantir que o conteúdo 
 * armazenado não contenha scripts maliciosos (XSS) ou caracteres de controle inesperados.
 */

export const security = {
  /**
   * Higieniza uma string para prevenir ataques XSS (Cross-Site Scripting).
   * Escapa caracteres HTML perigosos.
   * 
   * @param input A string de entrada
   * @returns A string higienizada
   */
  sanitize: (input: string | undefined | null): string => {
    if (!input) return '';
    if (typeof input !== 'string') return String(input);
    
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .trim();
  },

  /**
   * Prepara um objeto para inserção no banco de dados, higienizando todas as propriedades de string.
   * Atua como uma camada de validação pré-persistência.
   */
  prepareForDatabase: <T extends object>(data: T): T => {
    const cleanData: any = {};
    
    if (!data) return cleanData;

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        cleanData[key] = security.sanitize(value);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Recursivo para objetos aninhados
        cleanData[key] = security.prepareForDatabase(value);
      } else if (Array.isArray(value)) {
        // Trata arrays de strings ou objetos
        cleanData[key] = value.map(item => {
            if (typeof item === 'string') return security.sanitize(item);
            if (typeof item === 'object') return security.prepareForDatabase(item);
            return item;
        });
      } else {
        cleanData[key] = value;
      }
    }
    
    return cleanData as T;
  },

  /**
   * Validação simples de formato de e-mail
   */
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
};
