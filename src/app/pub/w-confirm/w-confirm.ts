import { Component } from '@angular/core';
import { CFooter } from '../../shared/pub/c-footer/c-footer';
import { CHeader } from '../../shared/pub/c-header/c-header';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-w-confirm',
  imports: [CFooter, CHeader, NgOptimizedImage],
  templateUrl: './w-confirm.html',
  styleUrl: './w-confirm.css',
  host: {
    class: 'flex flex-col height-screen',
  },
})
export class WConfirm {
  openExternalSite() {
    window.open('https://fias.nalog.ru/', '_blank');
  }
}
