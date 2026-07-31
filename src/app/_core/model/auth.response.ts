/**
 * Ответ после успешной регистрации
 * или входа пользователя.
 */
export interface AuthSessionResponse {
  /**
   * Открытый CSRF-токен текущей сессии.
   *
   * Защищённая cookie сессии передаётся
   * браузеру отдельно через Set-Cookie.
   */
  csrfToken: string;
}

/**
 * Состояние пользователя после проверки
 * существующей серверной сессии.
 */
export interface AuthSessionStateResponse {
  /**
   * Идентификатор вошедшего пользователя.
   */
  userId: string;

  /**
   * Идентификатор продавца.
   *
   * Поле отсутствует до завершения
   * обязательного оформления на /confirm.
   */
  sellerId?: string;

  /**
   * Нужно ли направить пользователя
   * на страницу обязательного оформления /confirm.
   */
  onboardingRequired: boolean;

  /**
   * Новый CSRF-токен текущей сессии.
   */
  csrfToken: string;
}

/**
 * Безопасная ошибка, возвращённая Go API.
 */
export interface AuthErrorResponse {
  /**
   * Сообщение для отображения пользователю.
   */
  error: string;
}
