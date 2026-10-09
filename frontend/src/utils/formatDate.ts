export const formatDate = (dateString: string | Date, forceFormat?: 'short' | 'long' | 'numeric') => {
  const locale = import.meta.env.VITE_DATE_LOCALE || 'es-CL';
  const formatPref = forceFormat || import.meta.env.VITE_DATE_FORMAT || 'short';
  
  const date = new Date(dateString);
  
  if (formatPref === 'long') {
    return date.toLocaleDateString(locale, { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  }
  
  if (formatPref === 'numeric') {
    return date.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  
  // default: short
  return date.toLocaleDateString(locale, { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
};
