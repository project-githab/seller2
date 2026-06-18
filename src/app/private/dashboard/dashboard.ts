import { Component } from '@angular/core';
import { CpHeader } from '../../shared/private/cp-header/cp-header';

@Component({
  selector: 'app-dashboard',
  imports: [CpHeader],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {}
