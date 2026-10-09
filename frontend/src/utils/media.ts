export const getMediaUrl = (path?: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const domain = baseUrl.replace(/\/api\/v1\/?$/, '');
  return `${domain}${path.startsWith('/') ? '' : '/'}${path}`;
};
