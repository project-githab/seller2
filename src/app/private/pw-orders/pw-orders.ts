import { Component } from '@angular/core';
import { CpHeader } from '../../shared/private/cp-header/cp-header';
import { CpMenuList } from '../../shared/private/cp-menu-list/cp-menu-list';
import { NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pw-orders',
  imports: [CpHeader, CpMenuList, NgOptimizedImage, FormsModule],
  templateUrl: './pw-orders.html',
  styleUrl: './pw-orders.css',
})
export class PwOrders {
  selectedDate = '';
}
