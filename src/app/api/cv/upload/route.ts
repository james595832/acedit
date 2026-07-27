import {NextResponse} from 'next/server';
import {promises as fs} from 'fs';
import path from 'path';
import {analyzeCvBuffer} from '@/lib/ai';
import {extractPdfText} from '@/lib/cv-parse';
import {saveCv} from '@/lib/store';
import {hasBlob} from '@/lib/config';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        {error: 'Missing PDF file', code: 'VALIDATION_ERROR'},
        {status: 400},
      );
    }

    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      return NextResponse.json(
        {error: 'PDF only', code: 'INVALID_FILE_TYPE'},
        {status: 400},
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        {error: 'File must be under 10MB', code: 'FILE_TOO_LARGE'},
        {status: 400},
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    let fileUrl: string;

    if (hasBlob()) {
      fileUrl = `blob://pending/${file.name}`;
    } else {
      const uploadsDir = path.join(process.cwd(), '.data', 'uploads');
      await fs.mkdir(uploadsDir, {recursive: true});
      const safeName = `${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const dest = path.join(uploadsDir, safeName);
      await fs.writeFile(dest, bytes);
      fileUrl = `/local-uploads/${safeName}`;
    }

    let pdfText = '';
    try {
      pdfText = await extractPdfText(bytes);
    } catch (err) {
      console.error('PDF extract failed', err);
      pdfText = '';
    }

    const analysis = await analyzeCvBuffer(file.name, pdfText);
    const cv = await saveCv({
      file_name: file.name,
      file_url: fileUrl,
      parsed_text: analysis.parsed_text,
      skills_extracted: analysis.skills_extracted,
      experience_years: analysis.experience_years ?? 0,
    });

    return NextResponse.json({
      cv_id: cv.id,
      parsed_text: cv.parsed_text,
      skills: analysis.skills_extracted,
      experience_years: analysis.experience_years,
      projects: analysis.projects,
      companies: analysis.companies,
      roles: analysis.roles,
      text_extracted: Boolean(pdfText.trim()),
      stub: !process.env.ANTHROPIC_API_KEY || process.env.USE_STUBS === 'true',
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {error: 'CV upload failed', code: 'SERVER_ERROR'},
      {status: 500},
    );
  }
}
