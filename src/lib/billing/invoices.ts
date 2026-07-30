import {getStripe, isStripeConfigured} from '@/lib/stripe';

export type BillingInvoice = {
  id: string;
  number: string | null;
  status: string | null;
  /** Amount in major currency units, e.g. 7.5 */
  amountPaid: number;
  amountDue: number;
  currency: string;
  createdAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  description: string;
};

function unixToIso(seconds: number | null | undefined): string | null {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

function formatDescription(
  status: string | null,
  amountPaid: number,
): string {
  if (status === 'paid' && amountPaid === 0) return 'Trial / £0 invoice';
  if (status === 'paid') return 'Pro membership';
  if (status === 'open') return 'Open invoice';
  if (status === 'draft') return 'Draft';
  if (status === 'void') return 'Void';
  if (status === 'uncollectible') return 'Uncollectible';
  return 'Invoice';
}

export async function listBillingInvoices(
  customerId: string | null | undefined,
): Promise<BillingInvoice[]> {
  if (!customerId || !isStripeConfigured()) return [];

  const stripe = getStripe();
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit: 24,
  });

  return invoices.data
    .filter((invoice): invoice is typeof invoice & {id: string} =>
      Boolean(invoice.id),
    )
    .map(invoice => {
    const amountPaid = (invoice.amount_paid ?? 0) / 100;
    const amountDue = (invoice.amount_due ?? 0) / 100;
    return {
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amountPaid,
      amountDue,
      currency: (invoice.currency ?? 'gbp').toUpperCase(),
      createdAt: unixToIso(invoice.created) ?? new Date().toISOString(),
      periodStart: unixToIso(invoice.period_start),
      periodEnd: unixToIso(invoice.period_end),
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      invoicePdf: invoice.invoice_pdf ?? null,
      description: formatDescription(invoice.status, amountPaid),
    };
  });
}
