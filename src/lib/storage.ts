/**
 * Cloudinary Storage Helper for React Native
 * We use Cloudinary instead of Firebase Storage to keep the app 100% free
 */

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/**
 * Uploads a local image URI to Cloudinary via unauthenticated REST API.
 */
export async function uploadToCloudinary(uri: string, folder: string): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary environment variables are missing.');
  }

  const formData = new FormData();
  
  // In React Native, we can append a file to FormData by providing an object with uri, name, and type
  const filename = uri.split('/').pop() || 'upload.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  // @ts-ignore - React Native's FormData allows this object format
  formData.append('file', {
    uri,
    name: filename,
    type,
  });
  
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'multipart/form-data',
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Failed to upload image.');
  }

  const data = await response.json();
  return data.secure_url;
}
