# Overdue Invoice Logic - Implementation Guide

## Overview
This document explains the logic and implementation for handling overdue invoices in the Piffdeals Staff Portal.

## Key Questions & Answers

### 1. Should Stripe payment be disabled for overdue invoices?
**Answer: NO** - Keep Stripe payment **ENABLED** for overdue invoices.

**Reasoning:**
- The customer still owes money - we want to make it as easy as possible for them to pay
- Disabling payment would be counterproductive to the business goal (getting paid)
- Overdue status is a reminder that payment is late, not a punishment
- If payment should be prevented, the invoice should be `cancelled` instead

**Implementation:**
```javascript
// PublicInvoice.jsx - Line 224
{['sent', 'pending', 'overdue'].includes(invoice?.status) && invoice?.stripe_payment_link && (
  <Button 
    type="primary"
    icon={<CreditCardOutlined />}
    onClick={handlePayInvoice}
    size="large"
    style={{ 
      background: invoice?.status === 'overdue' ? '#ef4444' : '#10b981', 
      borderColor: invoice?.status === 'overdue' ? '#ef4444' : '#10b981' 
    }}
  >
    {invoice?.status === 'overdue' ? 'Apmaksāt kavēto rēķinu' : 'Apmaksāt rēķinu'}
  </Button>
)}
```

### 2. Should overdue invoices still be publicly accessible?
**Answer: YES** - Keep overdue invoices **PUBLICLY ACCESSIBLE**.

**Reasoning:**
- Customer needs to see what they owe
- Customer needs access to pay the overdue invoice
- Hiding it would make it harder for customer to resolve the debt
- The invoice exists in the database for audit purposes
- Only `cancelled` invoices should be hidden from public view

**Implementation:**
```javascript
// PublicInvoice.jsx - Lines 55-58
if (invoiceData.status === 'cancelled') {
  setNotFound(true);
  return;
}
// All other statuses (including 'overdue') remain publicly accessible
```

### 3. Should "APMAKSĀTS" and "KAVĒTS" be displayed across the invoice?
**Answer: YES** - Display status watermarks for visual clarity.

**Implementation:**

#### Paid Watermark (existing)
```javascript
{invoice.status === 'paid' && (
  <div style={{
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-45deg)',
    fontSize: '72px',
    fontWeight: 700,
    color: 'rgba(16, 185, 129, 0.15)', // Light green
    pointerEvents: 'none',
    zIndex: 1000,
    whiteSpace: 'nowrap',
    textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
    userSelect: 'none',
  }}>
    APMAKSĀTS
  </div>
)}
```

#### Overdue Watermark (new)
```javascript
{invoice.status === 'overdue' && (
  <div style={{
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-45deg)',
    fontSize: '72px',
    fontWeight: 700,
    color: 'rgba(239, 68, 68, 0.15)', // Light red
    pointerEvents: 'none',
    zIndex: 1000,
    whiteSpace: 'nowrap',
    textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
    userSelect: 'none',
  }}>
    KAVĒTS
  </div>
)}
```

## Additional Visual Enhancements for Overdue Invoices

### 1. Alert Banner
A prominent red alert banner is displayed at the top of overdue invoices:

```javascript
{invoice?.status === 'overdue' && (
  <div className="no-print" style={{ 
    maxWidth: 900,
    margin: '24px auto 0',
    padding: '0 48px'
  }}>
    <div style={{
      background: '#fef2f2',
      border: '2px solid #ef4444',
      borderRadius: '8px',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }}>
      {/* Warning icon */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#991b1b' }}>
          Rēķins ir kavēts
        </div>
        <div style={{ fontSize: '14px', color: '#7f1d1d' }}>
          Apmaksas termiņš ir beidzies. Lūdzu, veiciet apmaksu pēc iespējas ātrāk.
        </div>
      </div>
    </div>
  </div>
)}
```

### 2. Due Date Highlighting
The due date is highlighted in red with a "NOKAVĒTS" badge:

```javascript
<div style={{ 
  marginTop: 4,
  color: invoice.status === 'overdue' ? '#ef4444' : '#6b7280',
  fontWeight: invoice.status === 'overdue' ? 600 : 400
}}>
  <strong>Apmaksas termiņš:</strong> {dayjs(invoice.due_date).format('DD.MM.YYYY')}
  {invoice.status === 'overdue' && (
    <span style={{ 
      marginLeft: 8,
      fontSize: '12px',
      background: '#fef2f2',
      color: '#991b1b',
      padding: '2px 8px',
      borderRadius: '4px',
      fontWeight: 600
    }}>
      NOKAVĒTS
    </span>
  )}
</div>
```

### 3. Payment Button Styling
The payment button changes to red for overdue invoices:

```javascript
style={{ 
  background: invoice?.status === 'overdue' ? '#ef4444' : '#10b981', 
  borderColor: invoice?.status === 'overdue' ? '#ef4444' : '#10b981' 
}}
```

## Database & Audit Trail

### Invoice Persistence
- **All invoices remain in the database**, including overdue ones
- This ensures:
  - Complete audit trail
  - Historical records for accounting
  - Ability to track payment patterns
  - Legal compliance

### Status Transitions
```
draft → sent → overdue → paid (when customer finally pays)
                      → cancelled (if business decides to write off)
```

### Auto-Update Logic
From PROJECT_OVERVIEW.md:
> Invoice becomes overdue when:
> - `due_date` has passed (is in the past)
> - Status is `sent` or `pending` (not `paid` or `cancelled`)

This is handled by the `mark-overdue-invoices` Edge Function (cron job).

## Business Logic Summary

| Aspect | Decision | Reasoning |
|--------|----------|-----------|
| **Stripe Payment** | ✅ Enabled | We want customer to pay, even if late |
| **Public Access** | ✅ Enabled | Customer needs to see and pay invoice |
| **Database Storage** | ✅ Kept | Audit trail and accounting records |
| **Visual Indicators** | ✅ Multiple | Clear communication of overdue status |
| **Payment Button** | 🔴 Red styling | Urgency indicator for overdue payment |

## User Experience Flow

### For Customers (Public Invoice View)
1. Customer opens overdue invoice link
2. Sees prominent red alert: "Rēķins ir kavēts"
3. Sees "KAVĒTS" watermark across invoice
4. Sees "NOKAVĒTS" badge next to due date
5. Can still click red "Apmaksāt kavēto rēķinu" button
6. Redirected to Stripe payment page
7. Completes payment
8. Invoice status automatically updates to `paid`

### For Staff (Internal View)
1. Staff can see invoice is overdue in the invoices list
2. Can send reminder emails to customer
3. Can manually mark as paid (after bank transfer verification)
4. Can cancel invoice if needed (write-off)
5. Cannot edit locked invoice (data integrity)

## Related Files Modified

- `src/pages/PublicInvoice.jsx` - Main implementation
  - Added overdue watermark
  - Added alert banner
  - Enhanced due date display
  - Updated payment button styling

## Testing Checklist

- [ ] Overdue invoice displays "KAVĒTS" watermark
- [ ] Alert banner appears at top of overdue invoices
- [ ] Due date shows "NOKAVĒTS" badge
- [ ] Payment button is red and says "Apmaksāt kavēto rēķinu"
- [ ] Stripe payment link works for overdue invoices
- [ ] Invoice remains publicly accessible
- [ ] Paid invoices show "APMAKSĀTS" watermark (existing feature)
- [ ] Non-overdue invoices display normally
- [ ] Cancelled invoices return 404 (existing feature)

## Future Enhancements (Optional)

1. **Late Payment Fees**: Add automatic late fee calculation
2. **Escalation Emails**: Send automated reminder emails at intervals
3. **Payment Plans**: Allow customers to set up payment plans for overdue invoices
4. **Overdue Report**: Dashboard widget showing all overdue invoices
5. **Customer Portal**: Allow customers to view all their invoices (paid/unpaid)

## Conclusion

The implemented logic prioritizes **getting paid** over punishing late customers. By keeping payment enabled and the invoice accessible, we maximize the chance of receiving payment while clearly communicating the overdue status through multiple visual indicators.



