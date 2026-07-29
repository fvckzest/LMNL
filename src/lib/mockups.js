const FIRE_CREEK_MOCKUP = Object.freeze({
  slug: 'firecreek',
  businessName: 'Fire Creek',
  showIntroduction: false,
  projectTitle: 'a new digital direction for fire creek',
  intro: 'this concept explores how fire creek’s website could better reflect the warmth, energy, food, and neighborhood character of the restaurant itself.',
  supportingCopy: 'this is an independent design mockup created by lmnl to demonstrate a possible direction. it is not an official fire creek website or a finished production design.',
  images: {
    current: {
      src: '/mockups/firecreek/current-site.png',
      alt: 'Long-page screenshot of the current Fire Creek Grill and Ale House website.',
      width: 2218,
      height: 2653,
      loading: 'eager',
    },
    proposed: {
      src: '/mockups/firecreek/proposed-direction.png',
      alt: 'Long-page screenshot of an independent Fire Creek website redesign concept by LMNL.',
      width: 1857,
      height: 3089,
      loading: 'eager',
    },
  },
  currentExperience: {
    heading: 'your current website',
    copy: 'the existing website provides the essential information, but its structure and presentation do not fully communicate the personality of fire creek. the visual hierarchy is limited, key information competes for attention, and the overall experience feels disconnected from the atmosphere people encounter inside the restaurant.',
    points: [
      'weak visual hierarchy',
      'dated presentation',
      'limited emphasis on food and atmosphere',
      'important information competing for attention',
      'inconsistent spacing or organization',
      'little emotional connection to the in-person experience',
      'daily specials and useful restaurant information not presented prominently enough',
    ],
  },
  proposedDirection: {
    heading: 'the proposed direction',
    copy: 'the redesign gives fire creek a warmer, clearer, and more confident digital presence. it places the restaurant’s atmosphere, food, and daily experience at the center while making practical information easier to find.',
    points: [
      'stronger first impression',
      'clearer visual hierarchy',
      'more intentional typography',
      'prominent daily specials',
      'improved presentation of food, hours, location, and calls to action',
      'a warmer neighborhood restaurant identity',
      'better mobile behavior',
      'a structure that can expand into menus, events, ordering, and other future needs',
    ],
  },
  keyChanges: [
    {
      title: 'stronger identity',
      copy: 'the proposed design feels specific to fire creek rather than relying on a generic restaurant website structure.',
    },
    {
      title: 'clearer hierarchy',
      copy: 'visitors can quickly understand what fire creek is, what is happening today, and what action they should take next.',
    },
    {
      title: 'daily relevance',
      copy: 'specials, events, hours, and other changing information are treated as active content rather than secondary details.',
    },
    {
      title: 'better imagery',
      copy: 'food and atmosphere become central parts of the experience instead of decorative additions.',
    },
    {
      title: 'mobile-first',
      copy: 'the structure should remain clear and useful on a phone, where many customers will first encounter the restaurant.',
    },
  ],
  disclaimer: {
    heading: 'about this mockup',
    paragraphs: [
      'this page presents an early visual concept intended to communicate direction, structure, and possibility. it is not a completed website.',
      'a final project would include deeper collaboration with the fire creek team, refined copy, original photography and assets, complete mobile layouts, accessibility review, technical planning, performance optimization, and additional design refinement.',
      'all final content, functionality, and visual decisions would be developed and approved as part of the full project.',
    ],
  },
  cta: {
    heading: 'interested?',
    copy: 'if this direction feels right for fire creek, lmnl would be glad to walk through the concept, learn more about the restaurant’s needs, and discuss what a complete redesign could include.',
    label: 'talk with lmnl',
    href: '/contact',
  },
  seo: {
    title: 'fire creek website concept | lmnl',
    description: 'an independent website redesign concept created by lmnl for fire creek.',
    image: '/mockups/firecreek/proposed-direction.png',
    robots: 'noindex, follow',
    indexable: false,
  },
});

export const MOCKUP_PROJECTS = Object.freeze({
  firecreek: FIRE_CREEK_MOCKUP,
});

export function getMockupProject(slug) {
  return MOCKUP_PROJECTS[slug] || null;
}
