import { describe, expect, it } from 'vitest';

import { getUiErrorMessage } from './uiMessages';

describe('getUiErrorMessage', () => {
  it('keeps known server error messages for expected errors', () => {
    expect(
      getUiErrorMessage({
        response: { status: 409, data: { error: 'CEU_FILE_DUPLICATE' } },
      }),
    ).toContain('Этот файл уже добавлен');
  });

  it('returns an actionable fallback and request id for server errors', () => {
    expect(
      getUiErrorMessage(
        {
          response: {
            status: 500,
            data: { error: 'Внутренняя ошибка сервера', requestId: 'req-42' },
          },
        },
        'Не удалось отправить заявку.',
      ),
    ).toBe('Не удалось отправить заявку. Код ошибки: req-42.');
  });

  it('does not expose a raw server message for 5xx without a request id', () => {
    expect(
      getUiErrorMessage(
        {
          response: {
            status: 500,
            data: { error: 'Internal database details' },
          },
        },
        'Повторите попытку позже.',
      ),
    ).toBe('Повторите попытку позже.');
  });
});
