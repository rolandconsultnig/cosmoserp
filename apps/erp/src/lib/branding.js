/** Vite `base` is `/erp/` — public assets must use BASE_URL so the browser requests `/erp/logo.svg`, not `/logo.png`. */
export const LOGO_URL = `${import.meta.env.BASE_URL}logo.svg`;
