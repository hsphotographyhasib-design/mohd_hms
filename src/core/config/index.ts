// Config barrel export

// Environment variables
export { env } from './env';
export type { Env } from './env';

// Re-export from env-lib (convenience alias)
export { env as envConfig } from './env-lib';
export type { Env as EnvConfig } from './env-lib';

// Setup wizard
export { default as SupabaseSetupWizard } from './setup/supabase-setup-wizard';
export type { SupabaseSetupWizardProps } from './setup/supabase-setup-wizard';