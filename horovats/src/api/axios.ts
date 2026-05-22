import axios from 'axios';

const rawApi = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');

export const API_URL = rawApi;

/** Site origin for static paths (/uploads). Empty when API is same-origin relative `/api`. */
export const BASE_URL = rawApi.endsWith('/api') ? rawApi.slice(0, -4) : rawApi;

export const $api = axios.create({
  baseURL: API_URL,
});

$api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default $api;
