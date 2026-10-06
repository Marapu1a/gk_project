import { describe, expect, it } from 'vitest';

import { getUiErrorMessage } from './uiMessages';

describe('getUiErrorMessage', () => {
  it('translates duplicate certificate instead of exposing a backend code', () => {
    expect(getUiErrorMessage({ response: { status: 409, data: { error: 'duplicate_certificate' } } }))
      .toContain('Обновите страницу');
    expect(getUiErrorMessage({ response: { status: 409, data: { errorCode: 'CERTIFICATE_SAVE_CONFLICT' } } }))
      .toContain('Обновите страницу');
  });

  it('does not expose unknown technical messages to users', () => {
    expect(getUiErrorMessage({ response: { status: 400, data: { error: 'some_unknown_code' } } }, 'Проверьте форму.'))
      .toBe('Проверьте форму.');
    expect(getUiErrorMessage({ response: { status: 400, data: { error: 'SQL constraint failed' } } }, 'Проверьте форму.'))
      .toBe('Проверьте форму.');
  });

  it('keeps a useful Russian explanation when an unknown code accompanies it', () => {
    expect(getUiErrorMessage({ response: { status: 422, data: {
      errorCode: 'NEW_BACKEND_CODE', message: 'Проверьте дату и попробуйте ещё раз.',
    } } })).toBe('Проверьте дату и попробуйте ещё раз.');
  });

  it('explains a connection failure', () => {
    expect(getUiErrorMessage({ code: 'ERR_NETWORK', message: 'Network Error' }))
      .toContain('Нет связи с сервером');
  });
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
    ).toBe('Не удалось отправить заявку. Если повторится, сообщите техническому специалисту код req-42.');
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
