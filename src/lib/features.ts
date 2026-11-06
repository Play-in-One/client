// The hardware backend and Gestión uploads are available independently.
// - 'off': the console pages do not exist (404).
// - 'staff': only a signed-in admin sees them; everyone else gets the 404 body,
//   and nothing links to them, so crawlers never find them.
// - 'public': server-rendered, indexed and linked from the whole site.
export type ConsolesVisibility = 'off' | 'staff' | 'public';
export const CONSOLES_VISIBILITY = 'public' as ConsolesVisibility;
export const CONSOLES_PUBLIC = CONSOLES_VISIBILITY === 'public';
export const CONSOLES_STAFF_PREVIEW = CONSOLES_VISIBILITY === 'staff';
