import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RouterModule } from '@angular/router';

// --- Módulos de PrimeNG ---
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// --- NUEVO: Validador personalizado para el correo institucional ---
export function institutionalEmailValidator(
  control: AbstractControl
): ValidationErrors | null {
  const email = control.value as string;
  if (email && !email.toLowerCase().endsWith('@uteq.edu.mx')) {
    return { institutionalEmail: true }; // Si no termina con @uteq.edu.mx, el form es inválido
  }
  return null; // Si es válido, retorna null
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    InputTextModule,
    ButtonModule,
    PasswordModule,
    CheckboxModule,
    DividerModule,
    ToastModule,
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  providers: [MessageService], // Importante para que funcionen los Toasts
})
export class RegisterComponent {
  registerForm: FormGroup;
  showVehicleForm = false; // Controla la visibilidad del form de vehículo

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private messageService: MessageService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      // Grupo para los datos del perfil
      perfil: this.fb.group({
        nombre: ['', Validators.required],
        apellido_p: ['', Validators.required],
        apellido_m: ['', Validators.required],
      }),
      // Datos de autenticación
      email: [
        '',
        [Validators.required, Validators.email, institutionalEmailValidator],
      ],
      password: ['', [Validators.required, Validators.minLength(8)]],
      // Control para el Checkbox
      addVehicle: [false],
      // Grupo para los datos del vehículo (inicialmente deshabilitado)
      vehiculo: this.fb.group({
        placa: ['', Validators.required],
        marca: [''],
        modelo: [''],
        color: [''],
      }),
    });

    // Deshabilitamos el sub-formulario de vehículo al inicio
    this.registerForm.get('vehiculo')?.disable();
  }

  ngOnInit() {
    // Escuchamos los cambios en el checkbox para habilitar/deshabilitar el form de vehículo
    this.registerForm.get('addVehicle')?.valueChanges.subscribe((checked) => {
      this.showVehicleForm = checked;
      const vehicleForm = this.registerForm.get('vehiculo');
      if (checked) {
        vehicleForm?.enable();
      } else {
        vehicleForm?.disable();
      }
    });
  }

  async onSubmit() {
    if (this.registerForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario Inválido',
        detail: 'Por favor, revisa todos los campos.',
      });
      return;
    }

    this.registerForm.disable(); // Deshabilitamos para evitar doble envío

    const formValue = this.registerForm.value;

    const { user, error } = await this.authService.signUpWithEmail(
      formValue.email,
      formValue.password,
      formValue.perfil,
      formValue.addVehicle ? formValue.vehiculo : undefined // Solo enviamos datos de vehículo si el checkbox está activo
    );

    if (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error en el Registro',
        detail: error.message,
      });
      this.registerForm.enable(); // Habilitamos de nuevo si hay error
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Registro pendiente',
        detail: 'Confirma tu email para completar el registro.',
      });
      this.router.navigate(['/auth']);
    }
  }
}
