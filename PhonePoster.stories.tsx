import type { Meta, StoryObj } from '@storybook/react';
import PhonePoster from './PhonePoster';

const meta: Meta<typeof PhonePoster> = {
  title: 'Components/PhonePoster',
  component: PhonePoster,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    onCtaClick: { action: 'ctaClicked' },
  },
};

export default meta;
type Story = StoryObj<typeof PhonePoster>;

export const Default: Story = {
  args: {
    tag: 'ÉVÉNEMENT',
    title: 'Festival de Musique 2025',
    subtitle: 'Une nuit inoubliable sous les étoiles avec les meilleurs artistes.',
    ctaLabel: 'Réserver ma place',
  },
};

export const WithBackground: Story = {
  args: {
    backgroundImage: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800',
    tag: 'CONCERT',
    title: 'Nuit Électro',
    subtitle: 'Le meilleur de la musique électronique en live.',
    ctaLabel: 'Acheter des billets',
  },
};

export const Promotion: Story = {
  args: {
    tag: 'OFFRE LIMITÉE',
    title: 'Vente Flash',
    subtitle: "Jusqu'à −70 % sur toute la collection. Ce week-end seulement.",
    ctaLabel: 'Voir les offres',
  },
};

export const MinimalTitleOnly: Story = {
  args: {
    title: 'Grande Annonce',
  },
};

export const NoTag: Story = {
  args: {
    title: 'Conférence Tech 2025',
    subtitle: 'Les tendances qui redéfinissent le futur du numérique.',
    ctaLabel: "S'inscrire gratuitement",
  },
};
