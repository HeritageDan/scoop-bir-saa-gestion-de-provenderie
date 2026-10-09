/**
 * Configuration Supabase par défaut pour SCOOPS BIR SAA (Provenda)
 * 
 * Ce fichier permet d'embarquer les clés du projet Supabase afin que
 * chaque nouveau navigateur, appareil mobile ou installation de bureau
 * dispose immédiatement de la connexion à la base de données cloud
 * sans nécessiter de saisie manuelle dans le localStorage.
 */

export interface DefaultSupabaseConfig {
  url: string;
  anonKey: string;
}

// Renseignez ici l'URL et la clé Anon de votre projet Supabase.
// Il vous suffit de coller vos clés entre les guillemets simples '' à droite du ||.
export const defaultSupabaseConfig: DefaultSupabaseConfig = {
  // 1. COLLEZ VOTRE URL SUPABASE ICI ENTRE LES GUILLEMETS '' :
  url: (import.meta as any).env?.VITE_SUPABASE_URL || 'https://ejnfykevetgaragiiqqc.supabase.co',

  // 2. COLLEZ VOTRE CLÉ PUBLIQUE ANON (qui commence par eyJ...) ICI ENTRE LES GUILLEMETS '' :
  anonKey: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqbmZ5a2V2ZXRnYXJhZ2lpcXFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTMyNDYxNywiZXhwIjoyMTA2OTAwNjE3fQ.ebRvq90s8M0JFr2NMc8-ILidijYmEIWCyYxdcVCDZOM',
};
