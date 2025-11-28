import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// In development, route requests through Vite proxy to avoid CORS issues
const isDev = import.meta.env.DEV;

// Custom fetch function that routes through proxy in development
const customFetch = isDev 
  ? (url, options = {}) => {
      // Extract URL from Request object or use string directly
      let targetUrl = typeof url === 'string' ? url : (url instanceof Request ? url.url : url);
      
      // Replace Supabase URL with proxy URL for all Supabase API requests
      if (typeof targetUrl === 'string' && targetUrl.includes(supabaseUrl)) {
        const proxiedUrl = targetUrl.replace(supabaseUrl, `${window.location.origin}/supabase-api`);
        
        // If it was a Request object, create a new one with the proxied URL
        if (url instanceof Request) {
          // Extract all properties from the original request
          const requestInit = {
            method: url.method,
            headers: url.headers,
            body: url.body,
            mode: url.mode,
            credentials: url.credentials,
            cache: url.cache,
            redirect: url.redirect,
            referrer: url.referrer,
            referrerPolicy: url.referrerPolicy,
            integrity: url.integrity,
            keepalive: url.keepalive,
            signal: url.signal,
          };
          
          // Create new request with proxied URL
          const newRequest = new Request(proxiedUrl, requestInit);
          return fetch(newRequest);
        }
        
        // For options object, ensure headers are properly set
        const headers = new Headers(options.headers || {});
        
        // Ensure Accept header is set for Supabase REST API
        if (!headers.has('Accept')) {
          headers.set('Accept', 'application/json');
        }
        
        // Set Content-Type for requests with body
        if (options.body && !headers.has('Content-Type')) {
          // Only set if body is a string or object (not FormData, Blob, etc.)
          if (typeof options.body === 'string' || (typeof options.body === 'object' && !(options.body instanceof FormData) && !(options.body instanceof Blob))) {
            headers.set('Content-Type', 'application/json');
          }
        }
        
        // Merge headers back into options
        const updatedOptions = {
          ...options,
          headers: headers,
        };
        
        return fetch(proxiedUrl, updatedOptions);
      }
      
      // Pass through non-Supabase requests
      return fetch(url, options);
    }
  : undefined;

export const supabase = createClient(
  supabaseUrl, // Always use the real URL for client initialization
  supabaseAnonKey, 
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'piffdeals-auth',
      flowType: 'pkce', // Use PKCE flow for better security and CORS handling
    },
    ...(customFetch && {
      global: {
        fetch: customFetch,
      },
    }),
  }
);

// Export URL and key for edge function calls
supabase.supabaseUrl = supabaseUrl;
supabase.supabaseKey = supabaseAnonKey;

// Database helper functions for CRUD operations
export const db = {
  // CREATE - Insert data into a table
  async create(table, data) {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  },

  // READ - Get all records from a table
  async getAll(table, options = {}) {
    let query = supabase.from(table).select(options.select || '*');
    
    // Add filters if provided
    if (options.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    // Add ordering if provided
    if (options.orderBy) {
      query = query.order(options.orderBy.column, { 
        ascending: options.orderBy.ascending ?? true 
      });
    }
    
    // Add limit if provided
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // READ - Get a single record by ID
  async getById(table, id, idColumn = 'id') {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq(idColumn, id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // UPDATE - Update a record
  async update(table, id, updates, idColumn = 'id') {
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq(idColumn, id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // DELETE - Delete a record
  async delete(table, id, idColumn = 'id') {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq(idColumn, id);
    
    if (error) throw error;
    return true;
  },

  // CUSTOM QUERY - For complex queries
  from(table) {
    return supabase.from(table);
  },
};

