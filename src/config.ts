export const LOGO_URL = '/veylar-logo.png'
export const FOUNDER_PORTRAIT_URL = '/founder-matteo-carminati.jpg'

export const CONTACT_EMAIL = 'veylarmotors@gmail.com'

export const mailto = (subject?: string) =>
  `mailto:${CONTACT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`
