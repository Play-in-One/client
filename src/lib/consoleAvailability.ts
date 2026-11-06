import { getConsoles } from '@/lib/api';
import { isConsolePlatform } from '@/lib/consoles';
import { CONSOLES_PUBLIC } from '@/lib/features';

/** Whether the server should render «Encuentra tu próxima consola» as a public
 *  link: the console pages are public and at least one published model exists
 *  (of `platformSlug`, when given). During the staff preview it is always
 *  false: an anonymous request sees no drafts, and the browser decides.
 *  A failure only hides the button. Cached like the console catalog. */
export async function consolesAvailable(platformSlug?: string): Promise<boolean> {
    if (!CONSOLES_PUBLIC) return false;
    if (platformSlug !== undefined && !isConsolePlatform(platformSlug)) return false;
    return getConsoles(platformSlug ? { platform: platformSlug } : {}, { revalidate: 300 })
        .then(page => page.count > 0)
        .catch(() => false);
}
