import { Component } from '@angular/core';
import { CpHeader } from '../../shared/private/cp-header/cp-header';
import { CpMenuList } from '../../shared/private/cp-menu-list/cp-menu-list';

@Component({
  selector: 'app-pw-dashboard',
  imports: [CpHeader, CpMenuList],
  templateUrl: './pw-dashboard.html',
  styleUrl: './pw-dashboard.css',
})
export class PwDashboard {}
