import { useMemo } from 'react';
import { detectPackagesInCode, checkInstalledPackages, generateInstallCommand, DetectedPackage } from '@/lib/package-detector';

export function usePackageDetector(code: string, installedPackages: string[]) {
  const installedSet = useMemo(() => new Set(installedPackages), [installedPackages]);
  
  const { detectedPackages, missingPackages, installCommand } = useMemo(() => {
    const detected = detectPackagesInCode(code);
    const missing = detected.filter(pkg => !installedSet.has(pkg.name));
    const command = missing.length > 0 
      ? generateInstallCommand(missing.map(p => p.name))
      : '';
    
    return {
      detectedPackages: detected,
      missingPackages: missing,
      installCommand: command,
    };
  }, [code, installedSet]);

  return {
    detectedPackages,
    missingPackages,
    installCommand,
    hasMissingPackages: missingPackages.length > 0,
  };
}
