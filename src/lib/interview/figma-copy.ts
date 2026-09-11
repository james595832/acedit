/** Verbatim product copy from Figma Aced-IT App (file IAE5kzrQC9vqRTmjMgZPcP). */

export const FIGMA_COPY = {
  welcome: {
    title: (name: string) => `Welcome ${name},`,
    p1: 'First of all thank you for signing up to Aced-It. The place where we hope you can get yourself prepared for any interview in the design sector. With the rise of AI competition for designers is even more competitive.',
    p2: 'You probably signed up here because you have an interview coming up. So congratulations on that as even getting a recruiter call in 2026 is difficult.',
    p3: 'Lets get started on getting you ship shape for your next role!',
    cta: 'Lets Go!',
  },
  who: {
    title: 'Tell us who you are?',
    lead: 'You can choose a generic role and simulate an interview or you can upload a CV and get questions related to the actual job you are going for.',
    roleLabel: 'Choose a role',
    rolePlaceholder: 'Pick a role that is closest to the job you are going for',
    or: 'Or',
    cvDropzone: 'Upload a CV in either PDF or word format',
    continue: 'Continue',
  },
  job: {
    title: 'Tell us about the Job?',
    lead: 'Provide us with information about the role as this will make the interview much more realistic in terms of the questions you’ll be asked and ranked.',
    uploadLabel: 'Upload a job description',
    uploadDropzone: 'Upload a job description in either PDF or word format',
    or: 'Or',
    pastePlaceholder: 'Paste a job description here...',
    companyLabel: 'Finally add a company URL',
    companyLead:
      'We use this to pull information on the company to again help us simulate a more realistic interview',
    companyPlaceholder: 'Enter a URL for the company you are applying to',
    continue: 'Continue',
  },
  interviews: {
    title: 'Interviews',
    lead: 'We will keep a list of your interviews here for you to review or retake',
    create: 'Create an interview',
    dateTaken: (date: string) => `Date taken: ${date}`,
    readAnswers: 'Read answers',
    retake: 'Retake interview',
    assessmentScore: 'Assessment score',
    emptyTitle: 'No interviews yet',
    emptyDescription:
      'Create your first interview — pick a role or upload a CV, then add a job description if you have one.',
  },
} as const;
