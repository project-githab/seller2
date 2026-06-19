import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CpMenuList } from './cp-menu-list';

describe('CpMenuList', () => {
  let component: CpMenuList;
  let fixture: ComponentFixture<CpMenuList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CpMenuList],
    }).compileComponents();

    fixture = TestBed.createComponent(CpMenuList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
