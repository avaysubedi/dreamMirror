/**
 * Set this to the application ID of a registered DreamMirror Web Receiver.
 * Google Cast's Default Media Receiver only plays media and cannot run the
 * interactive WebGL experience.
 */
export const CAST_RECEIVER_APPLICATION_ID = '';

/** Runtime override makes it possible to try a registered app without rebuilding. */
export function getCastReceiverApplicationId(): string {
  const fromUrl = new URLSearchParams(location.search).get('castAppId')?.trim();
  const fromStorage = localStorage.getItem('dm-cast-receiver-app-id')?.trim();
  return fromUrl || fromStorage || CAST_RECEIVER_APPLICATION_ID;
}

