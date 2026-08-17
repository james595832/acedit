import {NextResponse} from 'next/server';
import {analyzeJobDescriptionText} from '@/lib/criteria';
import {featurePausedPayload, isFeatureEnabled} from '@/lib/feature-flags';
import {requireInterviewUser} from '@/lib/interview/auth';
import {
  assessPastedPortfolioText,
  fetchPortfolioPage,
} from '@/lib/portfolio/fetch';
import {auditPortfolioJdFit} from '@/lib/portfolio/jd-fit';
import {auditPortfolioFull} from '@/lib/portfolio/llm-enrich';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: Request) {
  if (!isFeatureEnabled('portfolio')) {
    return NextResponse.json(featurePausedPayload('portfolio'), {status: 503});
  }
  const auth = await requireInterviewUser();
  if (auth.response) return auth.response;

  try {
    const body = (await request.json()) as {
      url?: string;
      pasted_text?: string;
      jd_text?: string;
    };

    const pasted = String(body.pasted_text ?? '').trim();
    const url = String(body.url ?? '').trim();
    const jdText = String(body.jd_text ?? '').trim();

    if (!pasted && !url) {
      return NextResponse.json(
        {
          error: 'Provide a portfolio URL or paste case study text',
          code: 'VALIDATION_ERROR',
        },
        {status: 400},
      );
    }

    const extract = pasted
      ? assessPastedPortfolioText(pasted)
      : await fetchPortfolioPage(url);

    const jd = jdText ? analyzeJobDescriptionText(jdText) : null;

    if (!extract.ok) {
      return NextResponse.json({
        ok: false,
        source: pasted ? 'paste' : 'url',
        extract: {
          url: extract.url,
          pageTitle: extract.pageTitle,
          wordCount: extract.wordCount,
          confidence: extract.confidence,
          blockedReason: extract.blockedReason,
        },
        audit: null,
        jdFit: null,
        suggestPaste: !pasted,
      });
    }

    const audit = await auditPortfolioFull({
      text: extract.text,
      pageTitle: extract.pageTitle,
      confidence: extract.confidence,
      jd,
    });

    const jdFit = jd
      ? auditPortfolioJdFit({
          portfolioText: extract.text,
          jd,
          portfolioConfidence: extract.confidence,
        })
      : null;

    return NextResponse.json({
      ok: true,
      source: pasted ? 'paste' : 'url',
      extract: {
        url: extract.url,
        pageTitle: extract.pageTitle,
        wordCount: extract.wordCount,
        confidence: extract.confidence,
        blockedReason: extract.blockedReason,
      },
      audit,
      jdFit,
      suggestPaste: extract.confidence === 'low',
      stub: !process.env.ANTHROPIC_API_KEY || process.env.USE_STUBS === 'true',
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {error: 'Portfolio review failed', code: 'SERVER_ERROR'},
      {status: 500},
    );
  }
}
