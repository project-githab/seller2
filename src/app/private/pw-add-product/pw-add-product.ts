import { Component } from '@angular/core';
import { CpHeader } from '../../shared/private/cp-header/cp-header';
import { CpMenuList } from '../../shared/private/cp-menu-list/cp-menu-list';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-pw-add-product',
  imports: [CpHeader, CpMenuList, NgOptimizedImage],
  templateUrl: './pw-add-product.html',
  styleUrl: './pw-add-product.css',
})
export class PwAddProduct {
  /*Переключение блоков "Простой товар", "Товар с вариантами"*/
  productType: 'simple' | 'variant' = 'simple';

  setProductType(type: 'simple' | 'variant') {
    /*Переключение блоков "Простой товар", "Товар с вариантами"*/
    this.productType = type;

    /*Для плавного опускания страницы (скролла) для блока который появляется с варинтами*/
    if (type === 'variant') {
      setTimeout(() => {
        document.getElementById('variant-block')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 0);
    }
  }
}
