import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  Validators,
  ValidationErrors,
  AbstractControl,
  ReactiveFormsModule,
} from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

interface LoginForm {
  email: FormControl<string | null>;
  password: FormControl<string | null>;
}

export function institutionalEmailValidator(
  control: AbstractControl
): ValidationErrors | null {
  const email = control.value as string;
  if (email && !email.toLowerCase().endsWith('@uteq.edu.mx')) {
    return { institutionalEmail: true };
  }
  return null;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    InputTextModule,
    ButtonModule,
    PasswordModule,
    ToastModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export default class LoginComponent {
  private _formBuilder = inject(FormBuilder);
  private _authService = inject(AuthService);
  private _router = inject(Router);
  private _messageService = inject(MessageService);

  form = this._formBuilder.group<LoginForm>({
    email: this._formBuilder.control('', [
      Validators.required,
      Validators.email,
      institutionalEmailValidator,
    ]),
    password: this._formBuilder.control('', [Validators.required]),
  });

  private showToast(
    severity: 'success' | 'info' | 'warn' | 'error',
    summary: string,
    detail: string
  ) {
    this._messageService.add({ severity, summary, detail });
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const emailErrors = this.form.controls.email.errors;

      if (emailErrors?.['required']) {
        this.showToast(
          'warn',
          'Error en el formulario',
          'El correo es requerido.'
        );
      } else if (emailErrors?.['email']) {
        this.showToast(
          'warn',
          'Error en el formulario',
          'El formato del correo no es válido.'
        );
      } else if (emailErrors?.['institutionalEmail']) {
        this.showToast(
          'warn',
          'Error en el formulario',
          'El correo debe ser institucional (@uteq.edu.mx).'
        );
      } else if (this.form.controls.password.errors) {
        this.showToast(
          'warn',
          'Error en el formulario',
          'La contraseña es requerida.'
        );
      }
      return;
    }

    this.form.disable();

    try {
      const authResponse = await this._authService.logIn({
        email: this.form.value.email ?? '',
        password: this.form.value.password ?? '',
      });

      if (authResponse.error) {
        throw authResponse.error;
      }

      this.showToast(
        'success',
        '¡Bienvenido!',
        'Has iniciado sesión correctamente.'
      );
      setTimeout(() => {
        this._router.navigate(['/']);
      }, 3000);
    } catch (error) {
      this.form.enable();
      this.showToast(
        'error',
        'Error al iniciar sesión',
        'Credenciales inválidas. Por favor, verifica tu correo y contraseña.'
      );
    }
  }
}
