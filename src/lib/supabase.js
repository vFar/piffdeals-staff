import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'piffdeals-auth',
  },
});

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

