export interface Sponsor {
  name: string;
  logoUrl: string;
}

// Add new sponsors here and drop their logo in public/sponsors/
export const SPONSORS: Sponsor[] = [
  { name: 'Good Pilates', logoUrl: '/sponsors/good-pilates.png' },
  { name: 'Zeds', logoUrl: '/sponsors/zeds.webp' },
  { name: 'Washaroo', logoUrl: '/sponsors/washaroo.webp' },
];
