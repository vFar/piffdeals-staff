# Security Testing Guide

This guide provides step-by-step instructions for performing security tests on the Piffdeals Staff application.

## Test 116: XSS Protection in Forms

**Objective**: Verify that script tags and malicious JavaScript are sanitized and do not execute when entered in forms.

### Test Steps:

1. **Test in Create Invoice Form**:
   - Navigate to `/create-invoice` (or click "Izveidot rēķinu")
   - In the "Klienta vārds" (Customer Name) field, enter:
     ```
     <script>alert('XSS')</script>
     ```
   - Fill in other required fields (email, phone, address)
   - Save the invoice
   - **Expected Result**: The script tag should be displayed as plain text, NOT executed. No alert popup should appear.

2. **Test in Customer Email Field**:
   - In the same form, try entering in the email field:
     ```
     test<script>alert('XSS')</script>@example.com
     ```
   - **Expected Result**: Form validation should reject this (invalid email format), or if accepted, it should be displayed as text, not executed.

3. **Test in Notes Field**:
   - In the "Piezīmes" (Notes) field, enter:
     ```
     <script>alert('XSS')</script>
     <img src=x onerror=alert('XSS')>
     <svg onload=alert('XSS')>
     ```
   - Save the invoice
   - View the invoice
   - **Expected Result**: All HTML/script tags should be displayed as plain text, not executed.

4. **Test in User Accounts Form**:
   - Navigate to `/user-accounts`
   - Click "Pievienot jaunu lietotāju"
   - In the "Vārds, Uzvārds" field, enter:
     ```
     <script>alert('XSS')</script>
     ```
   - Fill other required fields
   - Create the user
   - **Expected Result**: The script should appear as text in the user list, not execute.

5. **Test in Invoice Notes Display**:
   - Create an invoice with notes containing:
     ```
     <script>alert('XSS')</script>
     ```
   - View the invoice in `/invoices` or `/view-invoice/:number`
   - **Expected Result**: Notes should display the script tag as text, not execute.

### Verification:
- Open browser Developer Tools (F12)
- Check the Console tab - no JavaScript errors from script execution
- Check the Elements/Inspector tab - script tags should be visible as text content, not as actual `<script>` elements in the DOM
- No alert popups should appear

### What to Look For:
✅ **PASS**: Script tags are displayed as plain text, no alerts appear
❌ **FAIL**: Alert popup appears, or script executes in any way

---

## Test 117: SQL Injection Protection

**Objective**: Verify that SQL commands cannot be injected through form inputs.

### Test Steps:

1. **Test in Customer Name Field**:
   - Navigate to `/create-invoice`
   - In "Klienta vārds" field, enter:
     ```
     ' OR '1'='1
     ```
   - Fill other required fields
   - Save the invoice
   - **Expected Result**: The string should be saved as-is, not interpreted as SQL. Check database - the customer_name should contain the literal string `' OR '1'='1`.

2. **Test with UNION SELECT**:
   - In customer name field, enter:
     ```
     ' UNION SELECT * FROM user_profiles--
     ```
   - Save the invoice
   - **Expected Result**: Should save as literal text, no data leakage.

3. **Test in Email Field**:
   - In customer email field, enter:
     ```
     test@example.com'; DROP TABLE invoices;--
     ```
   - **Expected Result**: Form validation may reject this (invalid format), or if accepted, it should be saved as literal text. The invoices table should NOT be deleted.

4. **Test in Search Field** (User Accounts):
   - Navigate to `/user-accounts`
   - In the search box, enter:
     ```
     ' OR '1'='1'--
     ```
   - **Expected Result**: Should search for users with this literal string in their name/email, not return all users.

5. **Test in Invoice Number** (if editable):
   - Try to create invoice with invoice number:
     ```
     '; DELETE FROM invoices WHERE '1'='1
     ```
   - **Expected Result**: Should be rejected or saved as literal text. No invoices should be deleted.

### Verification:
- Check the database directly (if you have access):
  ```sql
  SELECT customer_name FROM invoices ORDER BY created_at DESC LIMIT 1;
  ```
  The value should be the literal string you entered, not interpreted as SQL.

- Check application logs for SQL errors
- Verify no unexpected data changes occurred
- Check that tables still exist (no DROP TABLE executed)

### What to Look For:
✅ **PASS**: SQL commands are saved as literal text, no SQL execution occurs
❌ **FAIL**: SQL commands are executed, data is leaked, or tables are modified

### Note:
Since this application uses Supabase (which uses parameterized queries), SQL injection should be prevented. However, this test verifies that protection is working correctly.

---

## Test 118: Email HTML Sanitization

**Objective**: Verify that HTML in email content is properly sanitized to prevent XSS in emails.

### Test Steps:

1. **Test with Script Tag in Customer Name**:
   - Create an invoice with customer name:
     ```
     <script>alert('XSS')</script>Test Customer
     ```
   - Send the invoice via email (click "Nosūtīt e-pastu")
   - Check the received email
   - **Expected Result**: The script tag should be escaped/sanitized in the email HTML. When viewing the email, you should see the text, not have JavaScript execute.

2. **Test with HTML Tags in Customer Name**:
   - Create invoice with customer name:
     ```
     <b>Bold Name</b><img src=x onerror=alert('XSS')>
     ```
   - Send email
   - **Expected Result**: HTML should be escaped. The email should display the literal text `<b>Bold Name</b><img...>` or the tags should be stripped, not rendered.

3. **Test with JavaScript Event Handlers**:
   - Create invoice with customer name:
     ```
     Customer<img src=x onerror=alert('XSS')>
     ```
   - Send email
   - **Expected Result**: The `onerror` handler should not execute. The email should show the text or escaped HTML.

4. **Test in Invoice Notes**:
   - Create invoice with notes containing:
     ```
     <script>alert('XSS')</script>
     <iframe src="javascript:alert('XSS')"></iframe>
     ```
   - Send email
   - **Expected Result**: Scripts and iframes should be sanitized/escaped in the email.

5. **Test with Email Injection**:
   - Try to inject email headers in customer email field:
     ```
     test@example.com\nBcc: attacker@example.com
     ```
   - **Expected Result**: Should be rejected by email validation or sanitized.

### Verification:

1. **Check Email Source**:
   - In your email client, view the email source/raw HTML
   - Look for the customer name in the email HTML
   - Script tags should be HTML-encoded (e.g., `&lt;script&gt;` instead of `<script>`)

2. **Check Email Rendering**:
   - Open the email in a web email client (Gmail, Outlook web)
   - Check browser console (F12) - no JavaScript should execute
   - No alert popups should appear

3. **Check Email Function Code**:
   - Review `supabase/functions/send-invoice-email/index.ts`
   - Verify that user input is properly escaped when inserted into HTML template
   - Look for HTML encoding functions or sanitization libraries

### Current Implementation Check:

Looking at the email function, user input is inserted directly into template literals:
```typescript
Sveiki, ${customerName}!
```

**This is potentially vulnerable** if not sanitized. The test will reveal if sanitization is needed.

### What to Look For:
✅ **PASS**: HTML/scripts are escaped in email, no JavaScript executes when viewing email
❌ **FAIL**: Scripts execute in email, HTML is rendered unsafely, or email injection occurs

### Recommended Fix (if test fails):
If the test reveals vulnerabilities, implement HTML sanitization:
- Use a library like `DOMPurify` or `sanitize-html`
- HTML-encode special characters: `<` → `&lt;`, `>` → `&gt;`, `&` → `&amp;`, `"` → `&quot;`, `'` → `&#x27;`

---

## General Testing Tips

1. **Use Browser Developer Tools**:
   - F12 to open DevTools
   - Console tab: Check for JavaScript errors or execution
   - Elements/Inspector tab: Verify how content is rendered in DOM
   - Network tab: Check API requests/responses

2. **Test in Multiple Browsers**:
   - Chrome/Edge
   - Firefox
   - Safari (if available)

3. **Test Edge Cases**:
   - Very long strings
   - Special characters: `<>"'&`
   - Unicode characters
   - Null bytes: `\0`

4. **Document Results**:
   - Take screenshots of test inputs and results
   - Note any unexpected behavior
   - Record which tests pass/fail

5. **Test Both Frontend and Backend**:
   - Frontend: React should auto-escape, but verify
   - Backend: Check database values and email content

---

## Quick Test Checklist

- [ ] XSS Test 1: Script tag in customer name form
- [ ] XSS Test 2: Script tag in notes field
- [ ] XSS Test 3: Script tag in user accounts form
- [ ] SQL Injection Test 1: SQL in customer name
- [ ] SQL Injection Test 2: SQL in search field
- [ ] Email Sanitization Test 1: Script tag in customer name (email)
- [ ] Email Sanitization Test 2: HTML tags in customer name (email)
- [ ] Email Sanitization Test 3: Script tag in notes (email)

---

## Expected Results Summary

| Test | Expected Behavior |
|------|------------------|
| XSS in Forms | Script tags displayed as text, no execution |
| SQL Injection | SQL commands saved as literal text, no execution |
| Email HTML | HTML/scripts escaped in email, no execution |

---

## If Tests Fail

If any test fails, document:
1. Which test failed
2. What happened (screenshots/descriptions)
3. Where the vulnerability exists (which file/function)
4. Recommended fix

Then implement appropriate sanitization/encoding before deploying to production.











