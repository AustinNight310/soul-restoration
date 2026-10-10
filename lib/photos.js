// Customer photos for a booking. Phone photos are big, so they're shrunk to a 1600px JPEG first,
// then uploaded under incoming/ with a random name. create_booking ties them to the order.
// The bucket is private: customers can add files there but can't read anything back.
import { supabase } from './supabase';

const MAX_SIDE = 1600;
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' };

async function shrink(file) {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (blob) return blob;
  } catch {
    // the browser can't open this format (HEIC on some desktops): send the original
  }
  return file;
}

// Returns { path, preview } or throws with a message to show.
export async function uploadPhoto(file) {
  const blob = await shrink(file);
  const ext = TYPES[blob.type];
  if (!ext) throw new Error('That file isn’t a photo we can use. Try a JPEG or PNG.');
  const path = `incoming/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('photos').upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw new Error('A photo didn’t upload. Check your connection and try again.');
  // a HEIC original can't be shown in every browser; the tile then shows a plain placeholder
  const preview = blob.type === 'image/jpeg' || blob.type === 'image/png' || blob.type === 'image/webp' ? URL.createObjectURL(blob) : null;
  return { path, preview };
}
