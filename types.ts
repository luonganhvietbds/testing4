
export type Language = 'vi' | 'en';
export type WebsiteType = 'landing' | 'website';

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'html' | 'css' | 'js' | 'json' | 'md';
}

export interface WebsiteData {
  files: GeneratedFile[];
  seo: {
    title: string;
    description: string;
    keywords: string;
  };
}

export interface Translation {
  title: string;
  subtitle: string;
  promptPlaceholder: string;
  generateBtn: string;
  landingLabel: string;
  websiteLabel: string;
  selectPages: string;
  selectOptions: string;
  // Pages
  about: string;
  services: string;
  products: string;
  blog: string;
  contact: string;
  portfolio: string;
  pricing: string;
  testimonials: string;
  faq: string;
  team: string;
  // New Pages
  booking: string;
  gallery: string;
  caseStudies: string;
  careers: string;
  privacy: string;
  resources: string;
  courses: string;
  // Options/Components
  chatbot: string;
  newsletter: string;
  partners: string;
  map: string;
  videoHero: string;
  stats: string;
  awards: string;
  promoPopup: string;
  appDownload: string;
  liveChat: string;
  multiLang: string;
  rating: string;
  // Terminal
  terminal_analyzing: string;
  terminal_detecting: string;
  terminal_content: string;
  terminal_design: string;
  terminal_seo: string;
  terminal_exporting: string;
  preview: string;
  code: string;
  deploy: string;
  download: string;
  donate: string;
  guide: string;
  features: string;
  adminLabel: string;
  referenceUrlLabel: string;
  referenceUrlPlaceholder: string;
  referenceImageLabel: string;
  referenceImagePlaceholder: string;
  removeImage: string;
}

export interface AppState {
  prompt: string;
  language: Language;
  type: WebsiteType;
  selectedPages: string[];
  selectedOptions: string[];  // NEW: Selected component options
  includeAdmin: boolean;
  referenceUrl: string;
  referenceImage: string | null;
  isGenerating: boolean;
  terminalLogs: string[];
  websiteData: WebsiteData | null;
  activeView: 'editor' | 'preview' | 'code';
}
