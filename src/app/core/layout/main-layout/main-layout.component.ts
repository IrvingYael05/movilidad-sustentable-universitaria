import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { Subscription, filter } from 'rxjs';

// --- Importaciones de PrimeNG ---
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// --- AÑADIDO: Importaciones de Supabase Realtime ---
import { SupabaseService } from '../../../shared/data-access/supabase.service';
import { RealtimeChannel } from '@supabase/supabase-js';

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
export class MainLayoutComponent implements OnInit, OnDestroy {
  private _authService = inject(AuthService);
  private _messageService = inject(MessageService);
  private route = inject(Router);
  private userSubscription: Subscription | undefined;

  private _supabase = inject(SupabaseService);
  private channel: RealtimeChannel | null = null;

  public shouldShowMenuBar = true;

  sidebarVisible = false;
  sidebarItems: SideMenuItem[] = [];
  menuBarItems: MenuBarItem[] = [];

  ngOnInit(): void {
    this.userSubscription = this._authService.currentUserProfile$.subscribe(
      (profile) => {
        if (profile) {
          this.buildMenuBarItems(profile.roles);
          this.buildSidebarItems(profile.roles);
        }
      }
    );
    this.route.events.pipe(
      filter((event) => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      //Obtiene la URL actual
      const currentUrl = (event as NavigationEnd).urlAfterRedirects;
      // Define las rutas dónde SI se ocultará la barra de menú
      const routesToHideOn = ['/mi-perfil', '/mi-vehiculo'];

      //Comprobar si la URL actual está en la lista de rutas para ocultar la barra de menú
      if (routesToHideOn.includes(currentUrl)) {
        this.shouldShowMenuBar = false;
      } else {
        this.shouldShowMenuBar = true;
      }
    });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
    if (this.channel) {
      this._supabase.supabaseClient.removeChannel(this.channel);
    }
  }

  setupSessionListener(userId: string) {
    if (this.channel) {
      this._supabase.supabaseClient.removeChannel(this.channel);
    }

    const channelName = `session-user-${userId}`;
    this.channel = this._supabase.supabaseClient.channel(channelName);

    this.channel?.on('broadcast', { event: 'NEW_LOGIN' }, (payload) => {

        this._messageService.add({
          severity: 'warn',
          summary: 'Sesión terminada',
          detail: 'Has iniciado sesión en otro dispositivo. Cerrando esta sesión.',
          sticky: true,
        });

        setTimeout(() => {
          this.forceLogout();
        }, 1500);
      })
      .subscribe();
  }

  buildMenuBarItems(roles: string[]) {
    const items: MenuBarItem[] = [];

    if (roles.includes('usuario') || roles.includes('conductor')) {
      items.push({ label: 'Viajes', routerLink: '/' });
      items.push({ label: 'Mi Viaje', routerLink: '/lista-viajes' });
      items.push({ label: 'Acceso', routerLink: '/acceso-qr' });
    } 
    else if (roles.includes('guardia')) {
      items.push({ label: 'Escaner', routerLink: '/escanear-qr' });
    } 

    this.menuBarItems = items;
  }

  buildSidebarItems(roles: string[]) {
    const items: SideMenuItem[] = [];

    if (roles.includes('usuario') || roles.includes('conductor')) {
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
    }

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
    if (this.channel) {
      this._supabase.supabaseClient.removeChannel(this.channel);
      this.channel = null;
    }

    try {
      const response = await this._authService.logOut();

      if (response.error) throw response.error;

      this._messageService.add({
        severity: 'success',
        summary: 'Cerrando Sesión...',
        detail: 'Has cerrado sesión con éxito.',
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

  private async forceLogout() {
    if (this.channel) {
      this._supabase.supabaseClient.removeChannel(this.channel);
      this.channel = null;
    }

    localStorage.clear();
    
    await this._authService.logOut(); 
    this.route.navigate(['/auth/login']);
  }
}