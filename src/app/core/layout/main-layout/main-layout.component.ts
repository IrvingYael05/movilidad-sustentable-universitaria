import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { Subscription } from 'rxjs';

// --- Importaciones de PrimeNG ---
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

interface SideMenuItem {
  label: string;
  icon: string;
  route?: string;
  action?: () => void;
}

interface MenuBarItem {
  label: string;
  routerLink: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ToolbarModule,
    ButtonModule,
    ToastModule,
  ],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
})
export class MainLayoutComponent {
  private _authService = inject(AuthService);
  private _messageService = inject(MessageService);
  private route = inject(Router);
  private userSubscription: Subscription | undefined;

  sidebarVisible = false;
  sidebarItems: SideMenuItem[] = [];
  menuBarItems: MenuBarItem[] = [];

  ngOnInit(): void {
    this.userSubscription = this._authService.currentUserProfile$.subscribe(
      (profile) => {
        if (profile) {
          this.buildSidebarItems();
          this.buildMenuBarItems(profile.roles);
        }
      }
    );
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  buildMenuBarItems(roles: string[]) {
    const items: MenuBarItem[] = [];

    // Opciones para roles 'usuario''
    if (roles.includes('usuario')) {
      items.push({ label: 'Viajes', routerLink: '/' });
      items.push({ label: 'Mi Viaje', routerLink: '/lista-viajes' });
    }

    // Opciones para roles 'conductor'
    if (roles.includes('conductor')) {
      items.push({ label: 'Viajes', routerLink: '/' });
      items.push({ label: 'Nuevo Viaje', routerLink: '/nuevo-viaje' });
      items.push({ label: 'Mi Viaje', routerLink: '/lista-viajes' });
    }
 
    // Opciones para el rol 'guardia'
    if (roles.includes('guardia')) {
      items.push({ label: 'Validación de Acceso', routerLink: '/escanear-qr' });
    }

    this.menuBarItems = items;
  }

  buildSidebarItems() {
    const items: SideMenuItem[] = [];

    items.push({
      label: 'Tu Perfil',
      icon: 'pi pi-user',
      route: '/mi-perfil',
    });
    items.push({
      label: 'Tu Vehículo',
      icon: 'pi pi-car',
      route: '/mi-vehiculo',
    });

    items.push({
      label: 'Cerrar Sesión',
      icon: 'pi pi-sign-out',
      action: () => this.logout(),
    });

    this.sidebarItems = items;
  }

  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible;
  }

  closeSidebar() {
    this.sidebarVisible = false;
  }

  onSidebarItemClick(item: SideMenuItem) {
    this.closeSidebar();
    if (item.action) {
      item.action();
    } else if (item.route) {
      this.route.navigate([item.route]);
    }
  }

  async logout() {
    try {
      const response = await this._authService.logOut();

      if (response.error) throw response.error;

      this._messageService.add({
        severity: 'success',
        summary: 'Cerrando Sesión...',
        detail: 'Haz cerrado sesión con éxito.',
      });

      this.closeSidebar();

      setTimeout(() => {
        this.route.navigate(['/auth/login']);
      }, 1500);
    } catch (error) {
      this._messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Hubo un problema al cerrar sesión.',
      });
    }
  }
}
