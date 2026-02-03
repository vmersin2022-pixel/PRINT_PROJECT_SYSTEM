
/**
 * Optimizes Supabase Storage image URLs by appending transformation parameters.
 * 
 * @param url - The original image URL
 * @param width - Target width in pixels
 * @param quality - JPEG/WebP compression quality (default 80)
 * @returns The optimized URL with query parameters
 */
export const getImageUrl = (url: string | undefined, width: number, quality: number = 80): string => {
  if (!url) return '';
  
  // Skip optimization for:
  // 1. External images (like picsum.photos used for placeholders)
  // 2. Images that already have query parameters (to avoid duplication)
  // 3. Non-Supabase URLs (safety check)
  if (url.includes('picsum.photos') || url.includes('?') || !url.includes('supabase.co')) {
    return url;
  }

  // Append Supabase Image Transformation parameters
  // mode=cover ensures the image fills the dimensions (cropping if necessary)
  // format=webp ensures modern compression (much smaller than png)
  return `${url}?width=${width}&quality=${quality}&resize=cover&format=webp`;
};

/**
 * Formats a phone number string into +7 (XXX) XXX-XX-XX
 */
export const formatPhoneNumber = (value: string): string => {
  if (!value) return value;
  
  // Remove all non-digits
  const phoneNumber = value.replace(/\D/g, '');
  
  // If empty or short, just return current input
  if (phoneNumber.length === 0) return '';

  // Handle backspace/deletion naturally by returning if small length, 
  // but generally we construct the string
  
  // Standardize 8... to 7...
  let cleanPhone = phoneNumber;
  if (phoneNumber[0] === '8') {
      cleanPhone = '7' + phoneNumber.slice(1);
  }
  
  // Limit to 11 digits
  cleanPhone = cleanPhone.substring(0, 11);

  // Build the mask
  let formatted = '';
  
  if (cleanPhone.length > 0) {
      formatted += '+7';
  }
  if (cleanPhone.length > 1) {
      formatted += ' (' + cleanPhone.substring(1, 4);
  }
  if (cleanPhone.length >= 5) {
      formatted += ') ' + cleanPhone.substring(4, 7);
  }
  if (cleanPhone.length >= 8) {
      formatted += '-' + cleanPhone.substring(7, 9);
  }
  if (cleanPhone.length >= 10) {
      formatted += '-' + cleanPhone.substring(9, 11);
  }

  return formatted;
};

/**
 * Formats currency to Russian standard (e.g. "15 000 ₽")
 */
export const formatPrice = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null) return '0 ₽';
    return amount.toLocaleString('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 0
    });
};

/**
 * Formats date to Russian standard (e.g. "24.05.2024 14:30")
 */
export const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return '-';
    try {
        return new Date(dateString).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
};
