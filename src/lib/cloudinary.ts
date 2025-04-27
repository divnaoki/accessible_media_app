// クライアントサイドではcloudinaryの設定は不要
// import { v2 as cloudinary } from 'cloudinary';

// cloudinary.config({
//   cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

export const uploadVideo = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/cloudinary', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload video');
    }

    const data = await response.json();
    return {
      url: data.secure_url,
      publicId: data.public_id,
    };
  } catch (error) {
    console.error('Error uploading video:', error);
    throw error;
  }
};

export const deleteVideo = async (publicId: string) => {
  try {
    const response = await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicId }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete video');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting video:', error);
    throw error;
  }
};

export const generateSignature = async (publicId: string, timestamp: number) => {
  try {
    const response = await fetch('/api/cloudinary/sign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        publicId,
        timestamp,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate signature');
    }

    const data = await response.json();
    return data.signature;
  } catch (error) {
    console.error('Error generating signature:', error);
    throw error;
  }
}; 