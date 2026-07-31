import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import { API_BASE_URL } from '../config/api-base-url';
import { SellerOnboardingRequest, SellerOnboardingResponse } from '../model/seller-onboarding';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class SellerOnboardingService {
  /**
   * HTTP-клиент Angular для отправки
   * запроса в Go API.
   */
  private readonly httpClient = inject(HttpClient);

  /**
   * Базовый адрес API.
   */
  private readonly apiBaseUrl = inject(API_BASE_URL);

  /**
   * Сервис авторизации предоставляет CSRF-токен,
   * хранящийся только в оперативной памяти.
   */
  private readonly authService = inject(AuthService);

  /**
   * Отправляет полные сведения продавца.
   *
   * userId и sellerId не передаются:
   * Go определит пользователя по защищённой cookie.
   */
  completeOnboarding(request: SellerOnboardingRequest): Observable<SellerOnboardingResponse> {
    const csrfToken = this.authService.csrfToken();

    if (csrfToken === null) {
      return throwError(
        () => new Error('CSRF-токен отсутствует. Необходимо повторно проверить сессию.'),
      );
    }

    return this.httpClient.post<SellerOnboardingResponse>(
      `${this.apiBaseUrl}/seller/onboarding`,
      request,
      {
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      },
    );
  }
}
