export async function getCourseRequest(endpoint: string, data: Record<string, any>) {
  console.log(`[MOCK] Called ${endpoint}`, data);

  if (endpoint === 'account.profile.get') {
    if (!data.email) {
      throw new Error('Email is required');
    }

    return {
      success: true,
      account: {
        id: 123456,
        email: data.email,
        first_name: 'Иван',
        last_name: 'Иванов',
        groups: [
          { name: 'Пользователи' },
          { name: 'Супервизоры' }
        ]
      }
    };
  }

  return { success: false };
}
