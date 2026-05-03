import { IDatabaseProvider, DatabaseProvider, ProvisioningOptions } from './database-provider.interface';
import { neonProvider } from './neon.provider';
import { cloudNativePGProvider } from './cloudnativepg.provider';
import { localProvider } from './local.provider';
import { createLogger } from '../../utils/logger';

const logger = createLogger('DatabaseProviderFactory');

export * from './database-provider.interface';
export { neonProvider } from './neon.provider';
export { cloudNativePGProvider } from './cloudnativepg.provider';
export { localProvider } from './local.provider';

// Supported providers. 'supabase' is retained in the type union for backward
// compatibility with any existing DB rows that have provider='supabase', but it
// is NOT a valid selection for new provisions — the provision endpoints reject it.
// Requests for 'supabase' fall back to 'local' with a deprecation warning so that
// old rows continue to function while new code never silently routes there.
const providers: Record<DatabaseProvider, IDatabaseProvider> = {
  neon: neonProvider,
  cloudnativepg: cloudNativePGProvider,
  // DEPRECATED: 'supabase' was removed as a selectable provider.
  // Any existing rows with provider='supabase' fall back to localProvider.
  supabase: localProvider,
  local: localProvider
};

export function getProvider(providerName: DatabaseProvider = 'neon'): IDatabaseProvider {
  if (providerName === 'supabase') {
    logger.warn('[Providers] DEPRECATED: provider=supabase is not supported. Falling back to local. Update the database row to provider=local.');
  }
  const provider = providers[providerName];
  if (!provider) {
    logger.warn(`[Providers] Unknown provider "${providerName}", falling back to local`);
    return localProvider;
  }
  return provider;
}

export async function selectBestProvider(options: ProvisioningOptions): Promise<IDatabaseProvider> {
  if (options.provider) {
    if (options.provider === 'supabase') {
      throw new Error("Provider 'supabase' is not supported. Choose from: neon, cloudnativepg, local.");
    }
    return getProvider(options.provider);
  }
  
  const deploymentMode = process.env.DEPLOYMENT_MODE || 'single-vm';
  
  if (deploymentMode === 'kubernetes') {
    const isK8sHealthy = await cloudNativePGProvider.isHealthy();
    if (isK8sHealthy) {
      logger.info('Selected CloudNativePG provider for Kubernetes deployment');
      return cloudNativePGProvider;
    }
    logger.warn('CloudNativePG not available, falling back to Neon');
  }
  
  const neonApiKey = process.env.NEON_API_KEY;
  if (neonApiKey) {
    const isNeonHealthy = await neonProvider.isHealthy();
    if (isNeonHealthy) {
      logger.info('Selected Neon provider');
      return neonProvider;
    }
    logger.warn('Neon not healthy, falling back to local');
  }
  
  logger.info('Selected local provider (default fallback)');
  return localProvider;
}

export async function getProviderHealth(): Promise<Record<Exclude<DatabaseProvider, 'supabase'>, boolean>> {
  const [neonHealth, k8sHealth, localHealth] = await Promise.all([
    neonProvider.isHealthy().catch(() => false),
    cloudNativePGProvider.isHealthy().catch(() => false),
    localProvider.isHealthy().catch(() => false)
  ]);
  
  return {
    neon: neonHealth,
    cloudnativepg: k8sHealth,
    local: localHealth
  };
}
