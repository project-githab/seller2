import { Component } from '@angular/core';
import { CHeader } from '../../shared/public/c-header/c-header';
import { CFooter } from '../../shared/public/c-footer/c-footer';

@Component({
  selector: 'app-w-home',
  imports: [CHeader, CFooter],
  templateUrl: './w-home.html',
  styleUrl: './w-home.css',
  host: {
    class: 'flex f-col h100vh',
  },
})
export class WHome {}
