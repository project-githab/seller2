import { Component } from '@angular/core';
import { CpHeader } from '../../shared/private/cp-header/cp-header';
import { CpMenuList } from '../../shared/private/cp-menu-list/cp-menu-list';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-pw-settings',
  imports: [CpHeader, CpMenuList, NgOptimizedImage],
  templateUrl: './pw-settings.html',
  styleUrl: './pw-settings.css',
})
export class PwSettings {}
