import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api-base-url';
import {
  SellerProductCategoryFormDefinition,
  SellerProductCategorySearchResponse,
  SellerProductCategoryTreeResponse,
} from '../model/seller-product-category.response';

@Injectable({
  providedIn: 'root',
})
export class SellerProductCategoryApi {
  private readonly httpClient = inject(HttpClient);

  private readonly apiBaseUrl = inject(API_BASE_URL);

  getCategories(): Observable<SellerProductCategoryTreeResponse> {
    return this.httpClient.get<SellerProductCategoryTreeResponse>(`${this.apiBaseUrl}/categories`, {
      withCredentials: true,
    });
  }

  // Загружает только корневые категории либо
  // непосредственных детей выбранной категории.
  getCategoryLevel(parentCategoryId: string | null): Observable<SellerProductCategoryTreeResponse> {
    const params = new HttpParams().set('parentCategoryId', parentCategoryId ?? 'root');

    return this.httpClient.get<SellerProductCategoryTreeResponse>(`${this.apiBaseUrl}/categories`, {
      params,
      withCredentials: true,
    });
  }

  // Ищет активные конечные категории по всему каталогу.
  searchCategories(search: string): Observable<SellerProductCategorySearchResponse> {
    const params = new HttpParams().set('search', search.trim());

    return this.httpClient.get<SellerProductCategorySearchResponse>(
      `${this.apiBaseUrl}/categories`,
      {
        params,
        withCredentials: true,
      },
    );
  }

  getCategoryFormDefinition(categoryId: string): Observable<SellerProductCategoryFormDefinition> {
    return this.httpClient.get<SellerProductCategoryFormDefinition>(
      `${this.apiBaseUrl}/categories/${categoryId}/attributes`,
      {
        withCredentials: true,
      },
    );
  }
}
