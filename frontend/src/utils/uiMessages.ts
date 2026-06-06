export const SERVER_ERROR_MESSAGES: Record<string, string> = {
  ABANDON_REASON_REQUIRED: 'Укажите причину отмены текущего цикла.',
  ACTIVE_CYCLE_EXISTS:
    'У пользователя уже есть активный цикл сертификации. Сначала завершите или отмените текущий цикл.',
  ACTIVE_CYCLE_NOT_FOUND: 'Активный цикл сертификации не найден.',
  CERTIFICATE_CHAIN_GROUPS_NOT_CONFIGURED:
    'В системе не настроена цепочка групп для сертификатов. Обратитесь к техническому специалисту.',
  CERTIFICATE_FILE_MUST_BE_PDF: 'Для сертификата можно загрузить только PDF-файл.',
  CEU_NOT_IN_ACTIVE_CYCLE:
    'Эти CEU-баллы не относятся к активному циклу пользователя. Проверьте выбранную запись или активный цикл.',
  CEU_NOT_LINKED_TO_CYCLE:
    'Эти CEU-баллы не привязаны к циклу сертификации. Проверьте запись перед изменением.',
  CYCLE_ALREADY_HAS_CERTIFICATE: 'На этот цикл уже выдан сертификат.',
  CYCLE_NOT_ACTIVE: 'Этот цикл уже не активен.',
  CYCLE_NOT_FOUND: 'Цикл сертификации не найден.',
  CYCLE_NOT_OWNER_ACTIVE: 'Этот цикл не является активным циклом выбранного пользователя.',
  EXAM_PAYMENTS_REQUIRED: 'Нельзя подать заявку на экзамен: не все обязательные платежи оплачены.',
  EXAM_REQUIREMENTS_NOT_READY:
    'Нельзя подать заявку на экзамен: не все требования к сертификации выполнены.',
  FORBIDDEN: 'У вас нет прав для этого действия.',
  INVALID_CATEGORY: 'Выбрана некорректная категория.',
  INVALID_CREATED_FROM: 'Дата начала периода указана некорректно.',
  INVALID_CREATED_TO: 'Дата окончания периода указана некорректно.',
  INVALID_DISTRIBUTION_SUM: 'Распределение часов не совпадает с общим количеством часов.',
  INVALID_GOAL_MODE: 'Некорректный режим выбора цели.',
  INVALID_HOUR_STATE: 'Выбрано некорректное состояние часов.',
  INVALID_STATUS: 'Выбран некорректный статус.',
  INVALID_TARGET_LEVEL: 'Выбран некорректный целевой уровень сертификации.',
  INVALID_TRANSITION: 'Это действие сейчас недоступно для текущего статуса.',
  NO_ACTIVE_CYCLE:
    'У пользователя нет активного цикла сертификации. Сначала выберите целевой уровень.',
  SELF_REVIEW_FORBIDDEN: 'Нельзя отправить заявку на проверку самому себе.',
  SUPERVISION_NOT_IN_ACTIVE_CYCLE:
    'Эти часы не относятся к активному циклу пользователя. Проверьте выбранную запись или активный цикл.',
  SUPERVISION_NOT_LINKED_TO_CYCLE:
    'Эти часы не привязаны к циклу сертификации. Проверьте запись перед изменением.',
  TARGET_GROUP_NOT_CONFIGURED:
    'В системе не настроена группа для выбранного уровня. Обратитесь к техническому специалисту.',
  TARGET_ALREADY_SELECTED: 'Сначала нужно сбросить текущую цель сертификации.',
  TARGET_BELOW_ACTIVE: 'Нельзя выбрать цель ниже уже достигнутого уровня.',
  TARGET_LOCKED:
    'Цель уже выбрана. Сменить ее можно после завершения текущего цикла или через администратора.',
  TARGET_NOT_ALLOWED_FOR_ACTIVE_GROUP: 'Эта цель недоступна для текущего уровня пользователя.',
  TARGET_RATIO_NOT_CONFIGURED:
    'В системе не настроены правила распределения часов для выбранного уровня.',
  TARGET_REQUIREMENTS_NOT_CONFIGURED:
    'В системе не настроены требования для выбранного уровня сертификации.',
  NO_TARGET_FOR_SUPERVISOR:
    'Для супервизоров и опытных супервизоров обычная цель сертификации больше не требуется.',
  RENEWAL_NOT_AVAILABLE: 'Ресертификация сейчас недоступна.',
  RENEWAL_TARGET_NOT_ALLOWED: 'Ресертификация для текущего уровня недоступна.',
  USER_NOT_FOUND: 'Пользователь не найден.',
};

export const UI_TOAST_MESSAGES = {
  files: {
    fileUploaded: 'Файл загружен',
    fileDeleted: 'Файл удален',
    uploadFailed: 'Не удалось загрузить файл. Проверьте формат и размер файла.',
    deleteFailed: 'Не удалось удалить файл.',
  },
  ceu: {
    requestSent: 'Заявка на CEU отправлена',
    rejectReasonRequired: 'Укажите причину отклонения.',
    pointsRequired: 'Укажите количество CEU-баллов.',
    eventDateRequired: 'Укажите дату мероприятия.',
    eventDateInFuture: 'Дата мероприятия не может быть в будущем.',
    eventNameRequired: 'Укажите название или ведущего тренинга.',
  },
  documents: {
    requestSent: 'Заявка отправлена',
    fileTypeRequired: 'У каждого файла должен быть выбран тип документа.',
    deleteReasonRequired: 'Укажите причину удаления.',
  },
  supervision: {
    requestSent: 'Заявка отправлена',
    reviewReasonRequired: 'Укажите причину отклонения.',
    startDateInFuture: 'Дата начала не может быть в будущем.',
    endDateInFuture: 'Дата окончания не может быть в будущем.',
    endBeforeStart: 'Дата окончания не может быть раньше даты начала.',
  },
  auth: {
    loginFailed: 'Ошибка входа.',
    registerFailed: 'Регистрация прошла, но не удалось зафиксировать обязательные согласия.',
    passwordResetLinkInvalid: 'Ссылка устарела или недействительна.',
  },
} as const;

function isCodeLike(value: string) {
  return /^[A-Z0-9_]+$/.test(value.trim());
}

export function getServerErrorMessage(codeOrMessage: unknown) {
  if (typeof codeOrMessage !== 'string') return undefined;

  const value = codeOrMessage.trim();
  if (!value) return undefined;

  return SERVER_ERROR_MESSAGES[value] ?? (isCodeLike(value) ? 'Произошла ошибка. Обратитесь в поддержку.' : value);
}

export function getUiErrorMessage(error: any, fallback = 'Произошла ошибка. Попробуйте еще раз.') {
  const data = error?.response?.data;
  const raw = data?.errorCode ?? data?.error ?? data?.message ?? error?.message;
  return getServerErrorMessage(raw) ?? fallback;
}
