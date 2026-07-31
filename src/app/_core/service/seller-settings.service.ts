import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api-base-url';
import { SellerSettingsResponse } from '../model/seller-settings.response';

@Injectable({
  providedIn: 'root',
})
export class SellerSettingsService {
  /**
   * HTTP-клиент выполняет запрос
   * к защищённому Go API.
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
   * Получает настройки магазина
   * текущего авторизованного продавца.
   *
   * sellerId намеренно не передаётся:
   * Go получает его только из серверной сессии.
   *
   * CSRF-токен не требуется, поскольку
   * запрос только читает данные.
   */
  current(): Observable<SellerSettingsResponse> {
    return this.httpClient.get<SellerSettingsResponse>(`${this.apiBaseUrl}/seller/settings`);
  }
}
