export const LOGO_URL = '/veylar-logo.png'

export const CONTACT_EMAIL = 'veylarmotors@gmail.com'

/** Crowdfunding campaign. Leave empty until the link is ready: the donate button shows "coming soon". */
export const CROWDFUNDING_URL = ''

/** Contact form delivery via FormSubmit (no backend needed). */
export const FORM_ENDPOINT = `https://formsubmit.co/ajax/${CONTACT_EMAIL}`

/** Running cost of VEYLAR, euro per 100 km. */
export const COST_PER_100KM = 2.3

export const REFUEL_POINTS = 21000

export const mailto = (subject?: string) =>
  `mailto:${CONTACT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`
