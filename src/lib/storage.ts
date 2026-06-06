import * as FileSystem from 'expo-file-system/legacy';

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export async function uploadToCloudinary(uri: string, folder: string): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary environment variables are missing.');
  }

  // Read file as base64 using expo-file-system — bypasses fetch/blob issues on Android
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const filename = uri.split('/').pop() || 'upload.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const mimeType = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';
  
  // Cloudinary accepts base64 data URIs directly as the file field
  const dataUri = `data:${mimeType};base64,${base64}`;

  const formData = new FormData();
  formData.append('file', dataUri);
  formData.append('upload_preset', UPLOAD_PRESET!);
  formData.append('folder', folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Failed to upload image.');
  }

  const data = await response.json();
  return data.secure_url;
}