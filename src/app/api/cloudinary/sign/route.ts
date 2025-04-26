import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

export async function POST(request: Request) {
  try {
    const { publicId, timestamp } = await request.json();

    // パラメータをアルファベット順にソート
    const params = {
      api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
      public_id: publicId,
      resource_type: 'video',
      timestamp: timestamp.toString(),
    };

    // パラメータをアルファベット順にソートして文字列化
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key as keyof typeof params]}`)
      .join('&');

    // 署名文字列を作成
    const message = sortedParams + process.env.CLOUDINARY_API_SECRET;

    console.log('Server-side signature generation:');
    console.log('Sorted params:', sortedParams);
    console.log('Message to sign:', message);

    // SHA-1ハッシュを生成
    const signature = createHash('sha1').update(message).digest('hex');

    console.log('Generated signature:', signature);

    return NextResponse.json({ signature });
  } catch (error) {
    console.error('Error generating signature:', error);
    return NextResponse.json(
      { error: 'Failed to generate signature' },
      { status: 500 }
    );
  }
} 