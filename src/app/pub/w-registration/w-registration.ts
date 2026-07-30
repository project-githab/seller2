import { Component } from '@angular/core';
import { CHeader } from '../../shared/pub/c-header/c-header';
import { CFooter } from '../../shared/pub/c-footer/c-footer';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-w-registration',
  imports: [CHeader, CFooter, RouterLink],
  templateUrl: './w-registration.html',
  styleUrl: './w-registration.css',
  host: {
    class: 'flex flex-col height-screen',
  },
})
export class WRegistration {
  sellerBuyerSwitch = false;

  setUserType(isSeller: boolean) {
    if (this.sellerBuyerSwitch !== isSeller) {
      this.sellerBuyerSwitch = isSeller;
    }
  }
}
