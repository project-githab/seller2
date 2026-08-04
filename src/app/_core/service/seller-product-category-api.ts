import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api-base-url';
import {
  SellerProductCategoryFormDefinition,
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

  getCategoryFormDefinition(categoryId: string): Observable<SellerProductCategoryFormDefinition> {
    return this.httpClient.get<SellerProductCategoryFormDefinition>(
      `${this.apiBaseUrl}/categories/${categoryId}/attributes`,
      {
        withCredentials: true,
      },
    );
  }
}
