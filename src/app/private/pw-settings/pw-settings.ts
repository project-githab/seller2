import { Component, signal } from '@angular/core';
import { CpHeader } from '../../shared/private/cp-header/cp-header';
import { CpMenuList } from '../../shared/private/cp-menu-list/cp-menu-list';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-pw-settings',
  imports: [CpHeader, CpMenuList, NgOptimizedImage],
  templateUrl: './pw-settings.html',
  styleUrl: './pw-settings.css',
})
export class PwSettings {
  colorCodeMain = signal('#FFDC26');
  colorCodeMainComplementary = signal('#2dd500');

  onColorChange(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    // Записываем новое HEX-значение в сигнал
    this.colorCodeMain.set(inputElement.value);
  }

  onColorChangeComplementary(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    // Записываем новое HEX-значение в сигнал
    this.colorCodeMainComplementary.set(inputElement.value);
  }
}
