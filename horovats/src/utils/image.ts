import { BASE_URL } from '../api/axios';

export const getImageUrl = (url?: string): string => {
    if (!url) return '';
    if (url.startsWith('/uploads')) {
        return `${BASE_URL}${url}`;
    }
    return url;
};
