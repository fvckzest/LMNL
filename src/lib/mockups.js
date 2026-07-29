const FIRE_CREEK_MOCKUP = Object.freeze({
  slug: 'firecreek',
  businessName: 'Fire Creek',
  showIntroduction: false,
  projectTitle: 'a new digital direction for fire creek',
  intro: 'This concept explores how Fire Creek’s website could better reflect the warmth, energy, food, and neighborhood character of the restaurant itself.',
  supportingCopy: 'This is an independent design mockup created by LMNL to demonstrate a possible direction. It is not an official Fire Creek website or a finished production design.',
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
    copy: 'The existing website provides the essential information, but its structure and presentation do not fully communicate the personality of Fire Creek. The visual hierarchy is limited, key information competes for attention, and the overall experience feels disconnected from the atmosphere people encounter inside the restaurant.',
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
    copy: 'The redesign gives Fire Creek a warmer, clearer, and more confident digital presence. It places the restaurant’s atmosphere, food, and daily experience at the center while making practical information easier to find.',
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
      copy: 'The proposed design feels specific to Fire Creek rather than relying on a generic restaurant website structure.',
    },
    {
      title: 'clearer hierarchy',
      copy: 'Visitors can quickly understand what Fire Creek is, what is happening today, and what action they should take next.',
    },
    {
      title: 'daily relevance',
      copy: 'Specials, events, hours, and other changing information are treated as active content rather than secondary details.',
    },
    {
      title: 'better imagery',
      copy: 'Food and atmosphere become central parts of the experience instead of decorative additions.',
    },
    {
      title: 'mobile-first',
      copy: 'The structure should remain clear and useful on a phone, where many customers will first encounter the restaurant.',
    },
  ],
  disclaimer: {
    heading: 'about this mockup',
    paragraphs: [
      'This page presents an early visual concept intended to communicate direction, structure, and possibility. It is not a completed website.',
      'A final project would include deeper collaboration with the Fire Creek team, refined copy, original photography and assets, complete mobile layouts, accessibility review, technical planning, performance optimization, and additional design refinement.',
      'All final content, functionality, and visual decisions would be developed and approved as part of the full project.',
    ],
  },
  cta: {
    heading: 'interested?',
    copy: 'If this direction feels right for Fire Creek, LMNL would be glad to walk through the concept, learn more about the restaurant’s needs, and discuss what a complete redesign could include.',
    replyPrompt: 'Reply to the email you got this in',
    label: 'send an email',
    href: 'mailto:4evr@lmnl.art',
  },
  seo: {
    title: 'fire creek website concept | lmnl',
    description: 'An independent website redesign concept created by LMNL for Fire Creek.',
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
