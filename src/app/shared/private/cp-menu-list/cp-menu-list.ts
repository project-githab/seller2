import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-cp-menu-list',
  imports: [RouterLink, RouterLinkActive, NgClass],
  templateUrl: './cp-menu-list.html',
  styleUrl: './cp-menu-list.css',
})
export class CpMenuList {
  private router = inject(Router);

  isActive(url: string): boolean {
    return this.router.url === url;
  }
}
