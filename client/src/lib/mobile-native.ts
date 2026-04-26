import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { PushNotifications } from '@capacitor/push-notifications';

let initialized = false;

export async function initializeNativeMobileRuntime() {
  if (initialized || !Capacitor.isNativePlatform()) return;
  initialized = true;

  await Network.addListener('networkStatusChange', (status) => {
    window.dispatchEvent(new CustomEvent('ecode:mobile-network-change', { detail: status }));
  });

  await App.addListener('appUrlOpen', ({ url }) => {
    window.dispatchEvent(new CustomEvent('ecode:mobile-deep-link', { detail: { url } }));
  });

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive === 'granted') {
    await PushNotifications.register();
  }

  await PushNotifications.addListener('registration', (token) => {
    window.dispatchEvent(new CustomEvent('ecode:mobile-push-token', { detail: token }));
  });

  await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
    window.dispatchEvent(new CustomEvent('ecode:mobile-push-action', { detail: event }));
  });
}

export function isNativeMobileRuntime() {
  return Capacitor.isNativePlatform();
}
