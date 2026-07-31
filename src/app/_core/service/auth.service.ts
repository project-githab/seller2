import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { API_BASE_URL } from '../config/api-base-url';
import { AuthSessionResponse, AuthSessionStateResponse } from '../model/auth.response';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  /**
   * HTTP-клиент Angular для отправки
   * запросов в Go API.
   */
  private readonly httpClient = inject(HttpClient);

  /**
   * Базовый адрес API.
   *
   * В браузере запрос будет отправлен
   * через https://seller.localhost/sapi.
   */
  private readonly apiBaseUrl = inject(API_BASE_URL);

  /**
   * CSRF-токен хранится только в оперативной памяти.
   *
   * После перезагрузки страницы он исчезнет,
   * и позднее будет получен заново через /auth/session.
   */
  private readonly csrfTokenState = signal<string | null>(null);

  /**
   * Доступное только для чтения состояние CSRF-токена.
   */
  readonly csrfToken = this.csrfTokenState.asReadonly();

  /**
   * Регистрирует нового пользователя-продавца.
   *
   * На этом этапе Go создаёт пользователя
   * и серверную сессию, но ещё не создаёт seller.
   * Данные продавца будут заполнены позднее на /confirm.
   */
  register(
    email: string,
    password: string,
    rememberMe: boolean,
    acceptedTerms: boolean,
  ): Observable<AuthSessionResponse> {
    return this.httpClient
      .post<AuthSessionResponse>(`${this.apiBaseUrl}/auth/register`, {
        email,
        password,
        rememberMe,
        acceptedTerms,
      })
      .pipe(
        /**
         * После успешной регистрации сохраняем
         * CSRF-токен только в памяти приложения.
         */
        tap((response) => {
          this.csrfTokenState.set(response.csrfToken);
        }),
      );
  }

  /**
   * Выполняет вход пользователя по email и паролю.
   *
   * Go устанавливает защищённую cookie сессии,
   * а открытый CSRF-токен возвращает в JSON.
   */
  login(email: string, password: string, rememberMe: boolean): Observable<AuthSessionResponse> {
    return this.httpClient
      .post<AuthSessionResponse>(`${this.apiBaseUrl}/auth/login`, {
        email,
        password,
        rememberMe,
      })
      .pipe(
        /**
         * После успешного входа сохраняем
         * CSRF-токен только в памяти приложения.
         */
        tap((response) => {
          this.csrfTokenState.set(response.csrfToken);
        }),
      );
  }

  /**
   * Проверяет cookie текущей серверной сессии.
   *
   * Go возвращает сведения о пользователе,
   * состояние оформления продавца и новый CSRF-токен.
   */
  checkSession(): Observable<AuthSessionStateResponse> {
    return this.httpClient
      .post<AuthSessionStateResponse>(`${this.apiBaseUrl}/auth/session`, null)
      .pipe(
        /**
         * Обновлённый CSRF-токен также хранится
         * только в оперативной памяти Angular.
         */
        tap((response) => {
          this.csrfTokenState.set(response.csrfToken);
        }),
      );
  }
}
