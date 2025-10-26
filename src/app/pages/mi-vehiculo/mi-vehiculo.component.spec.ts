import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MiVehiculoComponent } from './mi-vehiculo.component';

describe('MiVehiculoComponent', () => {
  let component: MiVehiculoComponent;
  let fixture: ComponentFixture<MiVehiculoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MiVehiculoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MiVehiculoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
