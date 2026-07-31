import { InjectionToken } from '@angular/core';

/**
 * Базовый адрес Go API.
 *
 * В браузере используется относительный путь /sapi.
 * Nginx на seller.localhost примет запрос
 * и передаст его Go-серверу.
 *
 * Для Angular SSR значение позднее будет
 * заменено внутренним адресом Go-сервера.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '/sapi',
});
