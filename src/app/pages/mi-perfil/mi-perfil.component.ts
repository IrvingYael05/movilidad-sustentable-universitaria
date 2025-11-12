import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
  FormGroup,
  FormControl,
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PerfilService } from './services/mi-perfil.service';

// --- PrimeNG ---
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

// --- Validadores personalizados ---
export function institutionalEmailValidator(control: AbstractControl): ValidationErrors | null {
  const email = control.value as string;
  if (email && !email.toLowerCase().endsWith('@uteq.edu.mx')) {
    return { institutionalEmail: true };
  }
  return null;
}

export function passwordValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.value as string;
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (password && !regex.test(password)) {
    return { invalidPassword: true };
  }
  return null;
}

interface PerfilForm {
  nombre: FormControl<string | null>;
  apellidoPaterno: FormControl<string | null>;
  apellidoMaterno: FormControl<string | null>;
  correo: FormControl<string | null>;
  passwordActual: FormControl<string | null>;
  passwordNueva: FormControl<string | null>;
}

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    InputTextModule,
    ButtonModule,
    PasswordModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.scss'],
})
export class MiPerfilComponent implements OnInit {
  private perfilService = inject(PerfilService);
  private msg = inject(MessageService);
  private fb = inject(FormBuilder);

  cargando = false;

  form = this.fb.group<PerfilForm>({
    // Sin validadores porque son readonly
    nombre: this.fb.control(''),
    apellidoPaterno: this.fb.control(''),
    apellidoMaterno: this.fb.control(''),
    
    // Campos editables
    correo: this.fb.control('', [
      Validators.required,
      Validators.email,
      institutionalEmailValidator,
    ]),
    passwordActual: this.fb.control('', []),
    passwordNueva: this.fb.control('', [passwordValidator]),
  });

  async ngOnInit() {
    try {
      const data = await this.perfilService.obtenerPerfil();
      const [paterno = '', materno = ''] = (data.apellido || '').split(' ');

      this.form.patchValue({
        nombre: data.nombre,
        apellidoPaterno: paterno,
        apellidoMaterno: materno,
        correo: data.email,
      });

    } catch (error) {
      console.error('Error al cargar perfil:', error);
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar tu perfil' });
    }
  }

  private showValidationError(detail: string) {
    this.msg.add({
      severity: 'warn',
      summary: 'Error en el formulario',
      detail,
    });
  }

  async actualizarPerfil() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const controls = this.form.controls;

      if (controls.correo?.errors?.['required']) {
        this.showValidationError('El correo es obligatorio.');
      } else if (controls.correo?.errors?.['email']) {
        this.showValidationError('El formato del correo no es válido.');
      } else if (controls.correo?.errors?.['institutionalEmail']) {
        this.showValidationError('El correo debe ser institucional (@uteq.edu.mx).');
      } else if (controls.passwordNueva?.errors?.['invalidPassword']) {
        this.showValidationError(
          'La nueva contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y símbolos.'
        );
      } else {
        this.showValidationError('Por favor completa todos los campos requeridos correctamente.');
      }
      return; 
    }

    try {
      this.cargando = true;
      const formValue = this.form.getRawValue();

      const perfilActualizado = {
        nombre: formValue.nombre!,
        apellido: `${formValue.apellidoPaterno} ${formValue.apellidoMaterno}`.trim(),
        email: formValue.correo!,
      };

      await this.perfilService.actualizarPerfil(perfilActualizado);

      const passwordNueva = formValue.passwordNueva;
      const passwordActual = formValue.passwordActual;

      if (passwordNueva && passwordActual) {
        await this.perfilService.cambiarPassword(passwordActual, passwordNueva);
      }

      this.msg.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Perfil actualizado correctamente',
      });
    } catch (error: any) {
      console.error('Error al actualizar perfil:', error);
      this.msg.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'No se pudo actualizar el perfil',
      });
    } finally {
      this.cargando = false;
    }
  }
}