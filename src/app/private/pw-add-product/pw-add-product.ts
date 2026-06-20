import { Component } from '@angular/core';
import { CpHeader } from '../../shared/private/cp-header/cp-header';
import { CpMenuList } from '../../shared/private/cp-menu-list/cp-menu-list';

@Component({
  selector: 'app-pw-add-product',
  imports: [CpHeader, CpMenuList],
  templateUrl: './pw-add-product.html',
  styleUrl: './pw-add-product.css',
})
export class PwAddProduct {}
