import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Incidencia } from './incidencia';

describe('Incidencia', () => {
  let component: Incidencia;
  let fixture: ComponentFixture<Incidencia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Incidencia],
    }).compileComponents();

    fixture = TestBed.createComponent(Incidencia);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
