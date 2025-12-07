# Frontend Testing Guide - Specific Test Cases

This guide provides detailed instructions for testing the following specific test cases:

1. **Test 202: Email client compatibility**
2. **Test 197: Network error handling**
3. **Test 198: Optimistic UI updates**
4. **Test 194: Error boundary handling**

---

## Test 202: Email Client Compatibility

### Objective
Verify that invoice emails display correctly in various email clients.

### Prerequisites
- Access to the application with an account that can send invoices
- At least one invoice created and ready to send
- Access to multiple email accounts/clients for testing

### Test Steps

#### Step 1: Send a Test Invoice Email
1. Log in to the application
2. Navigate to **Invoices** page
3. Find an invoice with status "sent" or create a new invoice and send it
4. Click the **"..."** (More) button on an invoice
5. Select **"Nosūtīt vēlreiz"** (Send again)
6. In the modal, click **"Nosūtīt e-pastu"** (Send email)
7. Wait for the success message: "E-pasts veiksmīgi nosūtīts uz [email]!"

#### Step 2: Check Email in Different Clients

Test the email in the following clients (use the same email address or forward to multiple accounts):

**Desktop Email Clients:**
1. **Microsoft Outlook** (Windows/Mac)
   - Open the email
   - Check: Logo displays correctly
   - Check: Text logo displays correctly
   - Check: Invoice number is visible
   - Check: Total amount is visible and formatted correctly (€X.XX)
   - Check: "Skatīt rēķinu" button is clickable
   - Check: Alternative link text is visible
   - Check: Footer logo displays
   - Check: Colors match brand (blue gradient header)
   - Check: Layout is not broken
   - **Screenshot**: Take screenshot if any issues

2. **Apple Mail** (Mac/iOS)
   - Same checks as Outlook
   - **Note**: Some email clients may block images by default
   - Check if images load when "Load Images" is clicked

3. **Thunderbird**
   - Same checks as Outlook
   - Verify HTML rendering

**Web-Based Email Clients:**
4. **Gmail** (web and mobile app)
   - Open email in Gmail web interface
   - Check all elements display correctly
   - Check on mobile Gmail app
   - **Note**: Gmail may strip some CSS
   - **Screenshot**: Take screenshot

5. **Outlook.com** (web)
   - Open email in Outlook.com web interface
   - Check all elements display correctly
   - **Screenshot**: Take screenshot

6. **Yahoo Mail**
   - Open email in Yahoo Mail
   - Check all elements display correctly
   - **Screenshot**: Take screenshot

**Mobile Email Clients:**
7. **Gmail Mobile App** (Android/iOS)
   - Open email on mobile device
   - Check: Layout adapts to mobile screen
   - Check: Button is tappable
   - Check: Link is tappable
   - Check: Text is readable without zooming
   - **Screenshot**: Take screenshot

8. **Apple Mail Mobile** (iOS)
   - Same checks as Gmail Mobile
   - **Screenshot**: Take screenshot

9. **Outlook Mobile App**
   - Same checks as Gmail Mobile
   - **Screenshot**: Take screenshot

#### Step 3: Test Email Elements

For each email client, verify:

✅ **Header Section:**
- Blue gradient background displays
- Logo image (S-3.png) displays correctly
- Text logo (piffdeals_text_accent.png) displays correctly
- Both logos are side-by-side

✅ **Content Section:**
- Greeting text: "Sveiki, [Customer Name]!"
- Main message text is readable
- Invoice details card displays:
  - Invoice number label and value
  - Total amount label and value (€X.XX format)
- "Skatīt rēķinu" button:
  - Displays with blue background (#0068FF)
  - Is clickable/functional
  - Links to correct invoice URL
- Alternative link text displays below button
- Footer message displays correctly

✅ **Footer Section:**
- Footer logo (piffdeals_text_primary.png) displays
- Copyright text displays
- Website link displays

✅ **Functionality:**
- "Skatīt rēķinu" button links to correct invoice page
- Alternative link text is clickable
- Invoice page opens correctly when clicked

#### Step 4: Document Results

For each email client tested:
- **Result**: Passed / Failed
- **Notes**: 
  - Any display issues (e.g., "Logo didn't load in Outlook")
  - Any layout issues (e.g., "Button alignment broken in Gmail")
  - Any functionality issues (e.g., "Link doesn't work in Yahoo Mail")
  - Screenshot file path (if issues found)

### Expected Results
- Email displays correctly in all major email clients
- All images load (or have fallback)
- Layout is responsive and not broken
- All links and buttons work correctly
- Brand colors and styling are consistent

### Common Issues to Watch For
- Images blocked by email client (security feature)
- CSS not supported (some clients strip CSS)
- Layout broken in mobile clients
- Links not clickable
- Text too small on mobile
- Colors not displaying correctly

---

## Test 197: Network Error Handling

### Objective
Verify that network errors display user-friendly error messages to users.

### Prerequisites
- Access to the application
- Browser Developer Tools (F12)
- Ability to simulate network errors

### Test Steps

#### Method 1: Using Browser DevTools (Recommended)

**Test Case 1: Simulate Network Error During Login**
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Select **"Offline"** from the throttling dropdown (or use "No throttling" and block requests)
4. Navigate to login page
5. Enter valid credentials
6. Click **"Pieslēgties"** (Login)
7. **Expected**: User-friendly error message appears (e.g., "Neizdevās izveidot savienojumu. Pārbaudiet interneta savienojumu")
8. **Screenshot**: Take screenshot of error message
9. **Result**: Passed / Failed
10. **Notes**: Document exact error message shown

**Test Case 2: Simulate Network Error During Invoice Fetch**
1. Log in successfully
2. Open DevTools → Network tab
3. Navigate to **Invoices** page
4. In Network tab, right-click on the request to `/invoices` or Supabase API
5. Select **"Block request URL"** (or use "Offline" mode)
6. Refresh the Invoices page (F5)
7. **Expected**: Error message appears (e.g., "Neizdevās ielādēt rēķinus")
8. **Screenshot**: Take screenshot
9. **Result**: Passed / Failed
10. **Notes**: Document error message

**Test Case 3: Simulate Network Error During Email Send**
1. Log in and navigate to Invoices
2. Open DevTools → Network tab
3. Find an invoice and click **"Nosūtīt vēlreiz"**
4. Before clicking "Nosūtīt e-pastu", go to Network tab
5. Enable **"Offline"** mode or block the Edge Function URL
6. Click **"Nosūtīt e-pastu"**
7. **Expected**: User-friendly error message (e.g., "Neizdevās izveidot savienojumu. Pārbaudiet interneta savienojumu un mēģiniet vēlreiz.")
8. **Screenshot**: Take screenshot
9. **Result**: Passed / Failed
10. **Notes**: Document error message

**Test Case 4: Simulate Timeout Error**
1. Log in and navigate to Invoices
2. Open DevTools → Network tab
3. Set throttling to **"Slow 3G"** or **"Fast 3G"**
4. Try to send an invoice email
5. Wait for timeout (should timeout after 35 seconds)
6. **Expected**: Timeout error message (e.g., "Pieprasījums aizņēma pārāk daudz laika. Lūdzu, mēģiniet vēlreiz.")
7. **Screenshot**: Take screenshot
8. **Result**: Passed / Failed
9. **Notes**: Document error message and timeout behavior

#### Method 2: Using Network Conditions (Chrome)

1. Open DevTools (F12)
2. Go to **Network** tab
3. Click **"Network conditions"** (or press Ctrl+Shift+P, type "Network conditions")
4. Uncheck **"Use browser cache"**
5. Set **"Network throttling"** to **"Offline"**
6. Perform actions (login, fetch data, send email)
7. Check error messages displayed

#### Method 3: Disconnect Internet (Physical Test)

1. Disconnect your computer from Wi-Fi/Ethernet
2. Try to perform actions in the application:
   - Login
   - Load invoices
   - Send email
   - Create invoice
   - Update profile
3. **Expected**: User-friendly error messages for each action
4. **Screenshot**: Take screenshots of each error
5. **Result**: Passed / Failed for each action
6. **Notes**: Document all error messages

### Test Scenarios to Cover

✅ **Login Page:**
- Network error during login attempt
- Timeout during login
- Offline mode

✅ **Invoices Page:**
- Network error when loading invoices
- Network error when sending email
- Network error when deleting invoice
- Network error when marking invoice as paid

✅ **Create Invoice Page:**
- Network error when saving invoice
- Network error when loading products
- Network error when fetching templates

✅ **User Accounts Page (Admin):**
- Network error when loading users
- Network error when creating user
- Network error when updating user

✅ **Dashboard:**
- Network error when loading dashboard data
- Network error when loading charts

### Expected Error Messages

The application should display user-friendly messages in Latvian:

- **Network Error**: "Neizdevās izveidot savienojumu. Pārbaudiet interneta savienojumu."
- **Timeout**: "Pieprasījums aizņēma pārāk daudz laika. Lūdzu, mēģiniet vēlreiz."
- **Service Unavailable**: "Serviss nav pieejams. Lūdzu, mēģiniet vēlreiz."
- **Generic Error**: "Neizdevās [action]. Lūdzu, mēģiniet vēlreiz."

### What to Check

✅ Error messages are:
- In Latvian language
- User-friendly (not technical jargon)
- Actionable (tell user what to do)
- Displayed prominently (not hidden)
- Not showing raw error codes or stack traces

✅ Error handling:
- Application doesn't crash
- User can retry the action
- Loading states are cleared
- UI returns to normal state

### Document Results

For each test scenario:
- **Test Action**: What you were trying to do
- **Error Method**: How you simulated the error
- **Error Message Shown**: Exact text of error message
- **Result**: Passed / Failed
- **Notes**: 
  - Was message user-friendly?
  - Could user understand what to do?
  - Any technical errors visible?
  - Screenshot file path

---

## Test 198: Optimistic UI Updates

### Objective
Verify that UI updates immediately before API response is received.

### Prerequisites
- Access to the application
- Browser Developer Tools (F12)
- Network tab open to observe API calls

### Test Steps

#### Test Case 1: Invoice Status Update (Mark as Paid)

1. Log in to the application
2. Navigate to **Invoices** page
3. Open DevTools → **Network** tab
4. Find an invoice with status "sent", "pending", or "overdue"
5. **Before clicking**: Note the current status badge color/text
6. Click the **"..."** (More) button
7. Select **"Atzīmēt kā apmaksātu"** (Mark as paid)
8. Click **"Apstiprināt"** (Confirm) in the popup
9. **Immediately check** (before API response):
   - Does the status badge change to "Apmaksāts" (Paid) immediately?
   - Does the badge color change to green immediately?
   - Does the success message appear?
10. **Wait for API response** in Network tab
11. **After API response**: Verify status is still correct
12. **Screenshot**: Take screenshot showing immediate update
13. **Result**: Passed / Failed
14. **Notes**: 
    - How fast was the UI update? (immediate vs delayed)
    - Did status persist after API response?
    - Any flickering or rollback?

#### Test Case 2: Invoice Deletion

1. Navigate to **Invoices** page
2. Open DevTools → **Network** tab
3. Find a **draft** invoice
4. **Before clicking**: Note the invoice in the list
5. Click the **"..."** button on a draft invoice
6. Select **"Dzēst"** (Delete)
7. Click **"Dzēst"** (Delete) in confirmation modal
8. **Immediately check** (before API response):
   - Does the invoice disappear from the list immediately?
   - Does the success message appear immediately?
9. **Wait for API response** in Network tab
10. **After API response**: Verify invoice is still gone
11. **Screenshot**: Take screenshot
12. **Result**: Passed / Failed
13. **Notes**: Document update speed

#### Test Case 3: Invoice Creation

1. Navigate to **Invoices** → **"Izveidot rēķinu"** (Create Invoice)
2. Fill in all required fields:
   - Client name
   - Client email
   - Client phone
   - Client address
   - Add at least one product
3. Open DevTools → **Network** tab
4. Click **"Izveidot rēķinu"** (Create Invoice) button
5. **Immediately check** (before API response):
   - Does the loading spinner appear?
   - Does the form show "saving" state?
6. **After API response**:
   - Does success message appear?
   - Does navigation to Invoices page happen?
   - Is the new invoice visible in the list?
7. **Screenshot**: Take screenshot
8. **Result**: Passed / Failed
9. **Notes**: Document if UI updates optimistically or waits for response

#### Test Case 4: User Account Status Change (Admin)

1. Log in as **Admin** or **Super Admin**
2. Navigate to **User Accounts** page
3. Open DevTools → **Network** tab
4. Find a user account
5. **Before clicking**: Note the current status
6. Change user status (e.g., from "active" to "suspended")
7. **Immediately check** (before API response):
   - Does the status badge change immediately?
   - Does the table row update immediately?
8. **Wait for API response**
9. **After API response**: Verify status persisted
10. **Screenshot**: Take screenshot
11. **Result**: Passed / Failed
12. **Notes**: Document update behavior

#### Test Case 5: Copy Invoice Link

1. Navigate to **Invoices** page
2. Find an invoice with status "sent"
3. Click **"..."** → **"Nosūtīt vēlreiz"** (Send again)
4. In the modal, click **"Kopēt"** (Copy) button next to the link
5. **Immediately check**:
   - Does button text change to "Kopēts!" (Copied!) immediately?
   - Does success message appear immediately?
6. **Verify**: Check clipboard (Ctrl+V) - link should be copied
7. **Screenshot**: Take screenshot
8. **Result**: Passed / Failed
9. **Notes**: Document if update is immediate

### What to Check

✅ **Immediate UI Updates:**
- UI changes happen **before** API response
- No waiting for network request to complete
- User sees instant feedback

✅ **Visual Feedback:**
- Loading states appear immediately
- Success messages appear quickly
- Status badges update instantly
- Buttons change state immediately

✅ **Persistence:**
- Updates persist after API response
- No rollback if API succeeds
- If API fails, UI should rollback gracefully

✅ **User Experience:**
- Application feels responsive
- No noticeable delay
- Smooth transitions

### Expected Behavior

**Optimistic Updates Should:**
1. Update UI immediately when user performs action
2. Show loading/saving state
3. Show success message quickly
4. If API fails, rollback the change and show error

**Non-Optimistic Updates (Acceptable):**
- Some actions may wait for API response (e.g., form submissions)
- Critical actions may not be optimistic (e.g., payment processing)

### Document Results

For each test case:
- **Action Performed**: What you did
- **UI Update Speed**: Immediate / Delayed / After API
- **Visual Feedback**: What changed immediately
- **API Response Time**: How long API took (from Network tab)
- **Result**: Passed / Failed
- **Notes**:
  - Was update immediate?
  - Did it feel responsive?
  - Any flickering or rollback?
  - Screenshot file path

---

## Test 194: Error Boundary Handling

### Objective
Verify that error boundaries catch and display errors gracefully.

### Prerequisites
- Access to the application
- Browser Developer Tools (F12)
- Knowledge of how to trigger errors (or developer assistance)

### Important Note
**The application may not have an Error Boundary component yet.** If errors cause the entire page to crash (white screen), this test will fail. An Error Boundary component should be implemented first.

### Test Steps

#### Step 1: Check if Error Boundary Exists

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Look for any error boundary related code
4. Check if there's an error boundary component in the codebase
5. **If no error boundary exists**: This test will likely fail. Document this.

#### Step 2: Trigger a React Error (If Error Boundary Exists)

**Method 1: Using Browser Console (Developer Assistance Required)**

1. Open DevTools → **Console** tab
2. Navigate to any page in the application
3. In console, try to trigger an error (this may require developer assistance):
   ```javascript
   // This is just an example - actual method depends on implementation
   throw new Error('Test error boundary');
   ```
4. **Expected**: Error boundary should catch the error and display a user-friendly message
5. **Screenshot**: Take screenshot of error boundary UI
6. **Result**: Passed / Failed
7. **Notes**: Document what error boundary displayed

**Method 2: Simulate Component Error**

1. Navigate to a page that loads data (e.g., Invoices, Dashboard)
2. Open DevTools → **Network** tab
3. Block the API request that the page depends on
4. Cause the component to throw an error (may require code changes)
5. **Expected**: Error boundary catches error and shows fallback UI
6. **Screenshot**: Take screenshot
7. **Result**: Passed / Failed

#### Step 3: Test Error Boundary Behavior

**What to Check:**

✅ **Error Display:**
- Error boundary shows a user-friendly message (not technical error)
- Message is in Latvian (if application is in Latvian)
- Message suggests what user can do (e.g., "Refresh page", "Go back")

✅ **Application State:**
- Application doesn't completely crash (white screen)
- Other parts of application still work
- User can navigate away from error
- User can refresh the page

✅ **Error Information:**
- Technical error details are NOT shown to user
- Error is logged to console (for developers)
- Error boundary shows helpful UI (not blank screen)

✅ **Recovery Options:**
- User can click "Refresh" or "Try again" button
- User can navigate to another page
- User can go back to previous page

#### Step 4: Test Different Error Scenarios

**Scenario 1: Component Render Error**
- Trigger error during component render
- Check if error boundary catches it

**Scenario 2: API Error (Non-Network)**
- Cause API to return error response
- Check if error boundary handles it (or if it's handled by component)

**Scenario 3: JavaScript Error**
- Trigger JavaScript error in component
- Check if error boundary catches it

**Scenario 4: Missing Data Error**
- Navigate to page that requires data
- Block data loading
- Check if error boundary or component handles it gracefully

### Expected Error Boundary UI

If error boundary exists, it should display something like:

```
┌─────────────────────────────────────┐
│  ⚠️ Kaut kas nogāja greizi          │
│                                     │
│  Radās neparedzēta kļūda.           │
│  Lūdzu, mēģiniet:                   │
│  • Atjaunot lapu (F5)               │
│  • Doties uz sākumlapu              │
│                                     │
│  [Atjaunot lapu] [Sākumlapa]       │
└─────────────────────────────────────┘
```

### What NOT to Show

❌ **Technical Error Details:**
- Stack traces
- Error codes
- File paths
- Technical jargon

❌ **Blank Screen:**
- White screen of death
- Completely broken UI
- No way to recover

### Document Results

For each test scenario:
- **Error Triggered**: How you triggered the error
- **Error Boundary Displayed**: Yes / No
- **Error Message**: What message was shown to user
- **Recovery Options**: What options user had
- **Result**: Passed / Failed
- **Notes**:
  - Was error boundary present?
  - Was message user-friendly?
  - Could user recover?
  - Screenshot file path

### If Error Boundary Doesn't Exist

If the application doesn't have an error boundary:
1. **Result**: Failed
2. **Notes**: "Error boundary component not implemented. Application shows white screen when errors occur. Error boundary should be added to catch React errors gracefully."
3. **Recommendation**: Implement Error Boundary component in `src/components/ErrorBoundary.jsx` and wrap the App component with it.

---

## General Testing Tips

### Screenshots
- Take screenshots of all issues
- Name screenshots clearly: `test-202-email-gmail-issue.png`
- Save in a `screenshots/` folder

### Browser Console
- Always check browser console (F12) for errors
- Document any console errors in Notes

### Network Tab
- Use Network tab to verify API calls
- Check response times
- Verify error responses

### Test Environment
- Test in different browsers (Chrome, Firefox, Edge)
- Test on different screen sizes (desktop, tablet, mobile)
- Test with different network conditions

### Documentation
- Fill in **Result** column: Passed / Failed
- Fill in **Notes** column with:
  - Exact error messages
  - Screenshot paths
  - Steps to reproduce
  - Browser and version
  - Any other observations

---

## Quick Reference Checklist

### Test 202: Email Client Compatibility
- [ ] Tested in Outlook
- [ ] Tested in Gmail
- [ ] Tested in Apple Mail
- [ ] Tested in mobile clients
- [ ] All images load correctly
- [ ] Layout is not broken
- [ ] Links work correctly
- [ ] Branding is consistent

### Test 197: Network Error Handling
- [ ] Simulated network error during login
- [ ] Simulated network error during data fetch
- [ ] Simulated network error during email send
- [ ] Simulated timeout error
- [ ] Error messages are user-friendly
- [ ] Error messages are in Latvian
- [ ] User can retry actions

### Test 198: Optimistic UI Updates
- [ ] Invoice status updates immediately
- [ ] Invoice deletion updates immediately
- [ ] Copy link updates immediately
- [ ] UI feels responsive
- [ ] Updates persist after API response

### Test 194: Error Boundary Handling
- [ ] Error boundary component exists
- [ ] Errors are caught gracefully
- [ ] User-friendly error message displayed
- [ ] User can recover from error
- [ ] No white screen of death

---

**Good luck with testing!** 🚀




