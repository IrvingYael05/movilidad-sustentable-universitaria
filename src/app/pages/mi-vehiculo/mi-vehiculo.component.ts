import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, // Reemplaza a FormsModule
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
  FormControl,
  FormGroup,
} from '@angular/forms';
import { RouterModule } from '@angular/router';

//PrimeNG
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

//Servicios
import { MiVehiculoService } from './services/mi-vehiculo.service';
import { SupabaseService } from '../../shared/data-access/supabase.service';

// --- Validadores (copiados del ejemplo de Register) ---
export function lettersOnlyValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  if (value && !/^[a-zA-ZÀ-ÿ\s]+$/.test(value)) {
    return { lettersOnly: true };
  }
  return null;
}

export function plateValidator(control: AbstractControl): ValidationErrors | null {
  const plate = control.value as string;
  if (plate && !/^[A-Z0-9]{6,7}$/i.test(plate)) {
    return { invalidPlate: true };
  }
  return null;
}

export function yearValidator(control: AbstractControl): ValidationErrors | null {
  const year = control.value as number;
  const currentYear = new Date().getFullYear();
  if (year && (year < 1900 || year > currentYear)) {
    return { invalidYear: true };
  }
  return null;
}

// --- Interface para el formulario ---
interface VehiculoForm {
  marca: FormControl<string | null>;
  modelo: FormControl<string | null>;
  ano: FormControl<number | null>; // Usamos number para el input type="number"
  color: FormControl<string | null>;
  placa: FormControl<string | null>;
}

@Component({
  selector: 'app-mi-vehiculo',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule, // Actualizado
    RouterModule,
    InputTextModule,
    ButtonModule,
    ToastModule,
  ],
  providers: [MessageService], // Movido aquí desde el @NgModule original (si lo tuvieras)
  templateUrl: './mi-vehiculo.component.html',
  styleUrls: ['./mi-vehiculo.component.scss'],
})
export class MiVehiculoComponent implements OnInit {
  
  // Inyección de dependencias con inject()
  private miVehiculoService = inject(MiVehiculoService);
  private supabase = inject(SupabaseService);
  private messageService = inject(MessageService);
  private fb = inject(FormBuilder);

  usuarioId: string | null = null;
  vehiculoId: string | null = null; // Para saber si crear o actualizar
  cargando = false;

  // Definición del FormGroup
  form = this.fb.group<VehiculoForm>({
    marca: this.fb.control('', [Validators.required, lettersOnlyValidator]),
    modelo: this.fb.control('', [Validators.required]),
    ano: this.fb.control(null, [Validators.required, yearValidator]),
    color: this.fb.control('', [Validators.required, lettersOnlyValidator]),
    placa: this.fb.control('', [Validators.required, plateValidator]),
  });

  async ngOnInit() {
    const { data: { user } } = await this.supabase.supabaseClient.auth.getUser();
    this.usuarioId = user?.id;

    if (this.usuarioId) {
      try {
        const vehiculoData = await this.miVehiculoService.obtenerVehiculo(this.usuarioId);
        if (vehiculoData) {
          // Usamos patchValue para llenar el formulario reactivo
          this.form.patchValue(vehiculoData);
          this.vehiculoId = vehiculoData.vehiculo_id; // Guardamos el ID
        }
      } catch (err: any) {
        this.messageService.add({
          severity: 'info',
          summary: 'Sin vehículo',
          detail: 'No tienes vehículo registrado aún.',
          life: 3000,
        });
      }
    }
  }

  // Helper para mostrar toasts de validación
  private showValidationError(detail: string) {
    this.messageService.add({
      severity: 'warn',
      summary: 'Error en el formulario',
      detail: detail,
    });
  }

  async actualizarVehiculo() {
    // 1. Lógica de validación
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const controls = this.form.controls;

      if (controls.marca?.errors?.['required'] ||
          controls.modelo?.errors?.['required'] ||
          controls.ano?.errors?.['required'] ||
          controls.color?.errors?.['required'] ||
          controls.placa?.errors?.['required']) {
        return this.showValidationError('Por favor, completa todos los campos requeridos.');
      } 
      
      if (controls.marca?.errors?.['lettersOnly']) {
        return this.showValidationError('La marca solo debe contener letras.');
      }
      if (controls.color?.errors?.['lettersOnly']) {
        return this.showValidationError('El color solo debe contener letras.');
      }
      if (controls.ano?.errors?.['invalidYear']) {
        return this.showValidationError('El año del vehículo no es válido.');
      }
      if (controls.placa?.errors?.['invalidPlate']) {
        return this.showValidationError('La placa debe tener 6 o 7 caracteres alfanuméricos.');
      }
      
      return; // Detiene si hay cualquier otro error no manejado
    }

    // 2. Lógica de guardado (si el formulario es válido)
    if (!this.usuarioId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Error',
        detail: 'No hay usuario autenticado.',
        life: 3000,
      });
      return;
    }

    this.cargando = true;
    this.form.disable(); // Deshabilita el formulario mientras se guarda

    try {
      const formData = this.form.getRawValue(); // Obtiene valores incluso si está deshabilitado

      if (this.vehiculoId) {
        // Actualizar
        await this.miVehiculoService.actualizarVehiculo(this.vehiculoId, formData);
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Vehículo actualizado correctamente.',
          life: 3000,
        });
      } else {
        // Registrar
        const nuevo = await this.miVehiculoService.registrarVehiculo(this.usuarioId, formData);
        this.vehiculoId = nuevo.vehiculo_id; // Guarda el ID del nuevo vehículo
        this.messageService.add({
          severity: 'success',
          summary: 'Registrado',
          detail: 'Vehículo agregado correctamente.',
          life: 3000,
        });
      }
    } catch (err) {
      console.error('Error al guardar vehículo:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Ocurrió un error al guardar el vehículo.',
        life: 3000,
      });
    } finally {
      this.cargando = false;
      this.form.enable(); // Rehabilita el formulario
    }
  }
}