import type { MetadataRoute } from 'next';
import { absoluteUrl, SITE_URL } from '@/lib/seo';

// AI / generative-engine crawlers we explicitly welcome (GEO). Listing them
// grants access and signals the site is meant to be cited by these engines.
const AI_CRAWLERS = [
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'PerplexityBot',
    'Perplexity-User',
    'ClaudeBot',
    'anthropic-ai',
    'Claude-Web',
    'Google-Extended',
    'Applebot-Extended',
    'Amazonbot',
    'CCBot',
    'cohere-ai',
];

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            { userAgent: '*', allow: '/', disallow: ['/saved', '/api/'] },
            ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: '/' })),
        ],
        sitemap: absoluteUrl('/sitemap.xml'),
        host: SITE_URL,
    };
}
