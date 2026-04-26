const { notarize } = require('@electron/notarize');

exports.default = async function notarizeMac(context) {
  if (process.platform !== 'darwin') return;
  if (!process.env.APPLE_ID || !process.env.APPLE_APP_SPECIFIC_PASSWORD || !process.env.APPLE_TEAM_ID) {
    console.log('Skipping macOS notarization: Apple credentials are not configured.');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${context.appOutDir}/${appName}.app`;

  await notarize({
    appBundleId: context.packager.appInfo.appId,
    appPath,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });
};
