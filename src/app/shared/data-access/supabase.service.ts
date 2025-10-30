import {Injectable} from '@angular/core';
import {createClient} from '@supabase/supabase-js';
import {environment} from '../../../environments/environment';

const SUPABASE_URL = environment.supabaseUrl;
const SUPABASE_ANON_KEY = environment.supabaseKey;

@Injectable({
  providedIn: 'root'
})

export class SupabaseService {
    supabaseClient: any;
    constructor() {
        this.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
}