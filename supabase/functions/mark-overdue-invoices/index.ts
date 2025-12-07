// Mark Overdue Invoices Edge Function
// TESTING MODE: Marks invoices as overdue when due_date is more than 10 seconds in the past
// (Normally: Marks invoices as overdue when due_date has passed)
// Should be called daily via cron job (or manually for testing)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // TESTING MODE: Check for invoices overdue by 10 seconds instead of checking if date passed
    // Get all sent/pending invoices with due_date
    const { data: allInvoices, error: fetchError } = await supabase
      .from('invoices')
      .select('id, invoice_number, due_date, status')
      .in('status', ['sent', 'pending'])
      .not('due_date', 'is', null)

    if (fetchError) {
      throw fetchError
    }

    // Filter in JavaScript: due_date (as timestamp at midnight) must be more than 10 seconds ago
    const now = Date.now()
    const threshold = now - (10 * 1000) // 10 seconds ago
    
    // Debug: Log all invoices found
    const debugInfo = {
      total_found: allInvoices?.length || 0,
      current_time: new Date(now).toISOString(),
      threshold_time: new Date(threshold).toISOString(),
      invoices_checked: (allInvoices || []).map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        status: inv.status,
        due_date: inv.due_date,
        due_date_timestamp: inv.due_date ? new Date(inv.due_date + 'T00:00:00Z').toISOString() : null,
        is_overdue: inv.due_date ? new Date(inv.due_date + 'T00:00:00Z').getTime() < threshold : false
      }))
    }
    
    const overdueInvoices = (allInvoices || []).filter(inv => {
      if (!inv.due_date) return false
      // Convert due_date (YYYY-MM-DD) to timestamp at midnight UTC
      const dueDateTimestamp = new Date(inv.due_date + 'T00:00:00Z').getTime()
      return dueDateTimestamp < threshold
    })

    if (overdueInvoices.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          marked_overdue: 0,
          invoices: [],
          message: 'No invoices to mark as overdue',
          debug: debugInfo
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Update invoices to overdue status
    const invoiceIds = overdueInvoices.map(inv => inv.id)
    
    const { data: updatedInvoices, error: updateError } = await supabase
      .from('invoices')
      .update({ 
        status: 'overdue',
        updated_at: new Date().toISOString()
      })
      .in('id', invoiceIds)
      .select('id, invoice_number')

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({
        success: true,
        marked_overdue: updatedInvoices?.length || 0,
        invoices: updatedInvoices || [],
        message: `Successfully marked ${updatedInvoices?.length || 0} invoice(s) as overdue`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to mark overdue invoices',
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})




