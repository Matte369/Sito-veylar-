export const HERO_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260729_102822_0e6c87e8-c141-4744-bf32-ad30db296371.mp4'

export const HERO_POSTER_URL = '/hero-poster.jpg'

export const LOGO_URL = '/veylar-logo.png'
export const FOUNDER_PORTRAIT_URL = '/founder-matteo-carminati.jpg'

export const CONTACT_EMAIL = 'veylarmotors@gmail.com'

export const mailto = (subject?: string) =>
  `mailto:${CONTACT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`
