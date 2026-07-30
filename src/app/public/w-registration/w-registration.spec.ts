import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WRegistration } from './w-registration';

describe('WRegistration', () => {
  let component: WRegistration;
  let fixture: ComponentFixture<WRegistration>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WRegistration],
    }).compileComponents();

    fixture = TestBed.createComponent(WRegistration);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
