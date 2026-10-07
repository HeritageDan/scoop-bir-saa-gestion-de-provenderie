/**
 * Configuration Supabase par défaut pour COOPS BIR SAA (Provenda)
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
// Ces valeurs servent de secours immédiat si aucune variable d'environnement
// ou clé dans le localStorage n'est détectée.
export const defaultSupabaseConfig: DefaultSupabaseConfig = {
  url: (import.meta as any).env?.VITE_SUPABASE_URL || '',
  anonKey: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '',
};
