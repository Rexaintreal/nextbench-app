export async function uploadPostImageMobile(localUri: string): Promise<string> {
  const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!CLOUD_NAME || !UPLOAD_PRESET) throw new Error('Cloudinary env vars missing');

  const filename = localUri.split('/').pop() || 'image.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  const formData = new FormData();
  formData.append('file', { uri: localUri, name: filename, type } as any);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', `nextbench/posts/${Date.now()}`);  // ← posts folder

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText).secure_url);
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(formData);
  });
}