import { getAuth } from 'firebase/auth';

const API_BASE_URL =
  'https://api.grancoffeepecas.com.br';

async function getIdToken(): Promise<string | undefined> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) return undefined;

    return await user.getIdToken(true);
  } catch {
    return undefined;
  }
}

export async function apiGet<T>(
  path: string
): Promise<T> {
  const token = await getIdToken();

  const res = await fetch(
    `${API_BASE_URL}${path}`,
    {
      headers: {
        'Content-Type': 'application/json',
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
      },
    }
  );

  if (!res.ok) {
    const body = await res
      .text()
      .catch(() => '');

    throw new Error(
      `GET ${path} falhou (${res.status}) ${body}`
    );
  }

  return res.json();
}