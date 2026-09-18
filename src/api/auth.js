import client from './client';

export async function login(username, password) {
  const { data } = await client.post(
    '/datalogger/SVHSPL-login/',
    { user_name: username, password },
    { skipAuth: true },
  );
  return data;
}
