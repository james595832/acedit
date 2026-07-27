import {NextResponse} from 'next/server';
import {promises as fs} from 'fs';
import path from 'path';
import {analyzeJobDescriptionText} from '@/lib/criteria';
import {extractPdfText} from '@/lib/cv-parse';
import {ocrImageToText} from '@/lib/ocr';
import {saveJobDescription} from '@/lib/store';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    const pasted = String(form.get('text') ?? '').trim();

    let rawText = pasted;
    let sourceType: 'image' | 'pdf' | 'text' = 'text';
    let fileName: string | null = null;
    let fileUrl: string | null = null;

    if (file instanceof File && file.size > 0) {
      fileName = file.name;
      const bytes = Buffer.from(await file.arrayBuffer());
      const uploadsDir = path.join(process.cwd(), '.data', 'uploads');
      await fs.mkdir(uploadsDir, {recursive: true});
      const safeName = `${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      await fs.writeFile(path.join(uploadsDir, safeName), bytes);
      fileUrl = `/local-uploads/${safeName}`;

      const lower = file.name.toLowerCase();
      const isPdf =
        file.type === 'application/pdf' || lower.endsWith('.pdf');
      const isImage =
        file.type.startsWith('image/') ||
        /\.(png|jpe?g|webp|gif)$/i.test(lower);

      if (isPdf) {
        sourceType = 'pdf';
        rawText = await extractPdfText(bytes);
      } else if (isImage) {
        sourceType = 'image';
        rawText = await ocrImageToText(bytes);
      } else {
        return NextResponse.json(
          {
            error: 'Upload a JD image (PNG/JPG), PDF, or paste text',
            code: 'INVALID_FILE_TYPE',
          },
          {status: 400},
        );
      }
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        {
          error:
            'Could not read job description text. Try a clearer screenshot or paste the JD text.',
          code: 'EMPTY_JD',
        },
        {status: 422},
      );
    }

    const analysis = analyzeJobDescriptionText(rawText);
    const jd = await saveJobDescription({
      source_type: sourceType,
      file_name: fileName,
      file_url: fileUrl,
      raw_text: analysis.raw_text,
      role_title: analysis.role_title,
      company_name: analysis.company_name,
      requirements: analysis.requirements,
      responsibilities: analysis.responsibilities,
      keywords: analysis.keywords,
    });

    return NextResponse.json({
      job_description_id: jd.id,
      role_title: jd.role_title,
      company_name: jd.company_name,
      requirements: jd.requirements,
      responsibilities: jd.responsibilities,
      keywords: jd.keywords,
      source_type: jd.source_type,
      excerpt: jd.raw_text.slice(0, 400),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {error: 'Job description upload failed', code: 'SERVER_ERROR'},
      {status: 500},
    );
  }
}
