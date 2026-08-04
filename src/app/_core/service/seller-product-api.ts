import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import { API_BASE_URL } from '../config/api-base-url';
import {
  SellerCreateProductDraftRequest,
  SellerCreateProductDraftResponse,
  SellerProductEditorResponse,
  SellerProductOfferResponse,
  SellerSaveProductAttributesRequest,
  SellerSaveProductDetailsRequest,
  SellerSaveProductOfferRequest,
  SellerSaveProductVariantConfigurationRequest,
  SellerSaveProductVariantConfigurationResponse,
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
   * Загружает существующий черновик товара
   * для продолжения его редактирования.
   *
   * Это читающий запрос, поэтому CSRF-токен
   * для него не требуется.
   */
  getProductEditor(productCardId: string): Observable<SellerProductEditorResponse> {
    return this.httpClient.get<SellerProductEditorResponse>(
      `${this.apiBaseUrl}/seller/products/${productCardId}/editor`,
    );
  }

  /**
   * Создаёт первоначальный черновик товара.
   *
   * Сервер связывает черновик с продавцом
   * на основании защищённой cookie сессии.
   */
  createProductDraft(
    input: SellerCreateProductDraftRequest,
  ): Observable<SellerCreateProductDraftResponse> {
    return this.withCSRF((headers) =>
      this.httpClient.post<SellerCreateProductDraftResponse>(
        `${this.apiBaseUrl}/seller/products/drafts`,
        input,
        {
          headers,
        },
      ),
    );
  }

  /**
   * Полностью заменяет значения характеристик
   * ранее созданного черновика товара.
   *
   * Успешный серверный ответ не содержит JSON
   * и возвращается со статусом 204 No Content.
   */
  saveProductAttributes(
    productCardId: string,
    input: SellerSaveProductAttributesRequest,
  ): Observable<void> {
    return this.withCSRF((headers) =>
      this.httpClient.put<void>(
        `${this.apiBaseUrl}/seller/products/${productCardId}/attributes`,
        input,
        {
          headers,
        },
      ),
    );
  }

  /**
   * Сохраняет цену и доступный остаток
   * одиночного товара.
   *
   * Сервер создаёт базовую вариацию при первом
   * сохранении и обновляет её при следующих.
   */
  saveProductOffer(
    productCardId: string,
    input: SellerSaveProductOfferRequest,
  ): Observable<SellerProductOfferResponse> {
    return this.withCSRF((headers) =>
      this.httpClient.put<SellerProductOfferResponse>(
        `${this.apiBaseUrl}/seller/products/${productCardId}/offer`,
        input,
        {
          headers,
        },
      ),
    );
  }

  /**
   * Полностью сохраняет селекторы, дерево вариантов,
   * цены и остатки вариантного товара.
   *
   * Идентификаторы существующих вариантов позволяют
   * серверу обновлять записи без их пересоздания.
   */
  saveProductVariantConfiguration(
    productCardId: string,
    input: SellerSaveProductVariantConfigurationRequest,
  ): Observable<SellerSaveProductVariantConfigurationResponse> {
    return this.withCSRF((headers) =>
      this.httpClient.put<SellerSaveProductVariantConfigurationResponse>(
        `${this.apiBaseUrl}/seller/products/${productCardId}/variants`,
        input,
        {
          headers,
        },
      ),
    );
  }

  /**
   * Обновляет название, бренд и преимущества
   * существующей карточки товара.
   *
   * Успешный серверный ответ имеет статус
   * 204 No Content и не содержит JSON.
   */
  saveProductDetails(
    productCardId: string,
    input: SellerSaveProductDetailsRequest,
  ): Observable<void> {
    return this.withCSRF((headers) =>
      this.httpClient.put<void>(
        `${this.apiBaseUrl}/seller/products/${productCardId}/details`,
        input,
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
