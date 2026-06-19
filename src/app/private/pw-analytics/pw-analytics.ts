import { Component } from '@angular/core';
import { CpHeader } from '../../shared/private/cp-header/cp-header';
import { CpMenuList } from '../../shared/private/cp-menu-list/cp-menu-list';

@Component({
  selector: 'app-pw-analytics',
  imports: [CpHeader, CpMenuList],
  templateUrl: './pw-analytics.html',
  styleUrl: './pw-analytics.css',
})
export class PwAnalytics {}
