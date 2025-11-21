// Mark Overdue Invoices Edge Function
// Marks invoices as overdue when due_date has passed
// Should be called daily via cron job

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

    // Get current date (YYYY-MM-DD format)
    const today = new Date().toISOString().split('T')[0]

    // Find invoices that should be overdue
    // Status must be 'sent' or 'pending'
    // due_date must be in the past (less than today)
    const { data: overdueInvoices, error: selectError } = await supabase
      .from('invoices')
      .select('id, invoice_number, due_date, status')
      .in('status', ['sent', 'pending'])
      .lt('due_date', today)
      .not('due_date', 'is', null)

    if (selectError) {
      console.error('Error selecting overdue invoices:', selectError)
      throw selectError
    }

    if (!overdueInvoices || overdueInvoices.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          marked_overdue: 0,
          invoices: [],
          message: 'No invoices to mark as overdue'
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
      console.error('Error updating invoices:', updateError)
      throw updateError
    }

    console.log(`Marked ${updatedInvoices?.length || 0} invoices as overdue`)

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
    console.error('Error marking overdue invoices:', error)
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




