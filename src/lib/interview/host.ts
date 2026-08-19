export const INTERVIEWER_NAME = 'Tom';
export const INTERVIEWER_TITLE = 'Your AI interviewer';
export const INTERVIEW_DURATION_LABEL = 'about an hour';

export function interviewPositionLine(input: {
  roleTitle?: string | null;
  companyName?: string | null;
}): string {
  const role = input.roleTitle?.trim();
  const company = input.companyName?.trim();
  if (role && company) return `${role} at ${company}`;
  if (role) return role;
  return 'a product design role';
}
