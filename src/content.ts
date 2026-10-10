export type Member = { name: string; role: string; bio: string; photo: string; initials: string }

export const TEAM: Member[] = [
  {
    name: 'Matteo Carminati',
    role: 'Founder',
    bio: 'Leads the vision and the development of the VEYLAR platform.',
    photo: '/team/matteo-carminati.jpg',
    initials: 'MC',
  },
  {
    name: 'David Carminati',
    role: 'Marketing',
    bio: 'Builds the VEYLAR brand and the community around the project.',
    photo: '/team/david-carminati.jpg',
    initials: 'DC',
  },
  {
    // TODO: add the engineer's name and photo.
    name: '',
    role: 'Mechanical Engineer',
    bio: 'Leads the mechanical design of the platform and its energy system.',
    photo: '/team/mechanical-engineer.jpg',
    initials: 'ME',
  },
]

export const FIGURES = [
  { value: '1,200', unit: 'km', label: 'Range', note: 'On a full tank of bioethanol and water.' },
  { value: '27', unit: '%', label: 'System efficiency', note: 'From fuel to electricity at the wheels.' },
  { value: '10.3', unit: 'kW', label: 'Fuel cell power', note: 'Continuous output of the onboard fuel cell.' },
]

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'What is VEYLAR?',
    a: 'VEYLAR is an Italian automotive project developing an electric car that generates its own electricity on board, from bioethanol and water.',
  },
  {
    q: 'How does the car produce energy?',
    a: 'An onboard unit generates hydrogen from bioethanol and water. A fuel cell turns that hydrogen into electricity, which drives the electric motors and supports the battery.',
  },
  {
    q: 'What do I put in the tank?',
    a: 'Bioethanol and water. Bioethanol is produced from plant matter, so the energy chain can be renewable from the field to the wheels.',
  },
  {
    q: 'Where can I refuel?',
    a: 'There are about 21,000 refuelling points across Italy, so you can refuel along the roads you already drive.',
  },
  {
    q: 'How much does it cost to drive?',
    a: 'About €2.30 every 100 km. Use the savings calculator on this page to compare a year of driving with a petrol car.',
  },
  {
    q: 'Where does the 1,200 km figure come from?',
    a: 'It comes from the technical validation of the VEYLAR energy system, which has a system efficiency of 27%. It is not a type-approval (homologation) figure, which will come with the road-going vehicle.',
  },
  {
    q: 'Can I buy a VEYLAR today?',
    a: 'Not yet. VEYLAR is in development, and the next step is real-world validation. Leave us a message and we will keep you updated.',
  },
  {
    q: 'How can I support the project?',
    a: 'You can contribute to our crowdfunding campaign. Every contribution goes into the next stage of development.',
  },
]
