import { Component } from '@angular/core';
import { CpHeader } from '../../shared/private/cp-header/cp-header';
import { CpMenuList } from '../../shared/private/cp-menu-list/cp-menu-list';

@Component({
  selector: 'app-pw-orders',
  imports: [CpHeader, CpMenuList],
  templateUrl: './pw-orders.html',
  styleUrl: './pw-orders.css',
})
export class PwOrders {}
