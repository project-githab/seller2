import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import { API_BASE_URL } from '../config/api-base-url';
import {
  SellerCreateProductRequest,
  SellerCreateProductResponse,
} from '../model/seller-product.response';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class SellerProductApi {
  /**
   * HTTP-клиент выполняет запросы
   * к защищённому Go API.
   */
  private readonly httpClient = inject(HttpClient);

  /**
   * Базовый адрес API.
   *
   * В браузере запросы отправляются
   * через относительный адрес /sapi.
   */
  private readonly apiBaseUrl = inject(API_BASE_URL);

  /**
   * Сервис авторизации хранит актуальный
   * CSRF-токен текущей серверной сессии.
   */
  private readonly authService = inject(AuthService);

  /**
   * Отправляет всю форму нового товара
   * и выбранные изображения одним запросом.
   *
   * JSON добавляется первой частью payload.
   * Порядок файлов images совпадает с порядком
   * метаданных в input.images.
   *
   * Content-Type вручную не задаётся:
   * браузер самостоятельно добавляет boundary.
   */
  createProduct(
    input: SellerCreateProductRequest,
    images: File[],
  ): Observable<SellerCreateProductResponse> {
    const formData = new FormData();

    formData.append('payload', JSON.stringify(input));

    for (const image of images) {
      formData.append('images', image, image.name);
    }

    return this.withCSRF((headers) =>
      this.httpClient.post<SellerCreateProductResponse>(
        `${this.apiBaseUrl}/seller/products`,
        formData,
        {
          headers,
        },
      ),
    );
  }

  /**
   * Добавляет CSRF-токен к изменяющему запросу.
   *
   * Если токена нет в оперативной памяти,
   * запрос не отправляется на сервер.
   */
  private withCSRF<T>(request: (headers: HttpHeaders) => Observable<T>): Observable<T> {
    const csrfToken = this.authService.csrfToken();

    if (csrfToken === null) {
      return throwError(
        () => new Error('CSRF-токен отсутствует. Необходимо повторно проверить сессию.'),
      );
    }

    return request(
      new HttpHeaders({
        'X-CSRF-Token': csrfToken,
      }),
    );
  }
}
