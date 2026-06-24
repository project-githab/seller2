import { Component, signal } from '@angular/core';
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

  protected readonly filterOpen = signal(false);

  openFilter(): void {
    this.filterOpen.set(true);
  }

  closeFilter(): void {
    this.filterOpen.set(false);
  }
}
