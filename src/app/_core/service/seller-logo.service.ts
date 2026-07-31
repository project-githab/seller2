import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import { API_BASE_URL } from '../config/api-base-url';
import { AuthService } from './auth.service';
import { SellerLogoResponse } from '../model/seller-logo.response';

@Injectable({
  providedIn: 'root',
})
export class SellerLogoService {
  /**
   * HTTP-клиент отправляет multipart-запрос
   * в защищённый Go API.
   */
  private readonly httpClient = inject(HttpClient);

  /**
   * Базовый адрес API.
   */
  private readonly apiBaseUrl = inject(API_BASE_URL);

  /**
   * Сервис авторизации предоставляет CSRF-токен,
   * хранящийся только в памяти приложения.
   */
  private readonly authService = inject(AuthService);

  /**
   * Загружает или заменяет логотип магазина.
   *
   * sellerId не передаётся:
   * Go получает его только из серверной сессии.
   */
  upload(file: File): Observable<SellerLogoResponse> {
    const csrfToken = this.authService.csrfToken();

    if (csrfToken === null) {
      return throwError(
        () => new Error('CSRF-токен отсутствует. Необходимо повторно проверить сессию.'),
      );
    }

    const formData = new FormData();

    // Имя поля должно точно совпадать
    // с multipart-полем Go API.
    formData.append('logo', file, file.name);

    return this.httpClient.post<SellerLogoResponse>(`${this.apiBaseUrl}/seller/logo`, formData, {
      headers: {
        'X-CSRF-Token': csrfToken,
      },
    });
  }

  /**
   * Получает адреса текущего логотипа магазина.
   *
   * Если логотип ещё не загружен, Go API
   * вернёт пустые строки в обоих полях.
   *
   * CSRF-токен не требуется, поскольку
   * запрос только читает данные.
   */
  current(): Observable<SellerLogoResponse> {
    return this.httpClient.get<SellerLogoResponse>(`${this.apiBaseUrl}/seller/logo`);
  }
}
