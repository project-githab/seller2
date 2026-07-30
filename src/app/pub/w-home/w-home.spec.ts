import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WHome } from './w-home';

describe('WHome', () => {
  let component: WHome;
  let fixture: ComponentFixture<WHome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WHome],
    }).compileComponents();

    fixture = TestBed.createComponent(WHome);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
