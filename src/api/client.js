import axios from 'axios';

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://extended.rashailagro.in';

const client = axios.create({
  baseURL: BASE_URL,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('ws_token');
  if (token && !config.skipAuth) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

export default client;
