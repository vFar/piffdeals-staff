# Test Cases Documentation - Usage Instructions

## File
`test-cases-piffdeals-staff.csv` - Excel-compatible CSV file with 300 test cases

## Column Structure

1. **Test ID** - Unique test case number
2. **Test Case** - Test case description in English
3. **Category** - Frontend or Backend
4. **Subcategory** - Detailed category (e.g., Authentication, Invoices, API, etc.)
5. **Input Data** - What to input/test
6. **Expected Output** - What to expect as result
7. **Test Steps** - Actions to perform for test execution
8. **Result** - **THIS FIELD MUST BE FILLED** - enter "Passed" or "Failed"
9. **Notes** - **THIS FIELD MUST BE FILLED** - any notes, issues, screenshots, etc.

## Test Distribution

**Total: 300 test cases**
- **Frontend: 210 tests (70%)**
- **Backend: 90 tests (30%)**

## Testing Process

### Frontend Testing (2 people without programming knowledge)

1. Open `test-cases-piffdeals-staff.csv` file in Excel or Google Sheets
2. Filter by column "Category" = "Frontend"
3. Execute each test case sequentially
4. Fill in the **"Result"** column:
   - **"Passed"** - if test is successful
   - **"Failed"** - if test is unsuccessful
5. Fill in the **"Notes"** column with:
   - Problem description (if Failed)
   - Screenshot file path
   - Additional observations
   - Steps to reproduce the issue

### Backend Testing (Developer)

1. Filter by column "Category" = "Backend"
2. Execute each test case sequentially
3. Fill in the **"Result"** column with "Passed" or "Failed"
4. Fill in the **"Notes"** column with:
   - API responses
   - Log messages
   - Error messages
   - Performance metrics

## Test Case Categories

### Frontend Tests (~210 tests)

#### Authentication & Login (14 tests)
- Login with correct/incorrect credentials
- Form validation
- Account status checks (suspended, inactive)
- Remember me functionality
- Rate limiting
- UI elements display

#### Invoice Management (55+ tests)
- Create invoice with all fields
- Form validation for all fields
- Product selection and management
- Quantity and price calculations
- Invoice editing (draft only)
- Invoice deletion (draft only)
- Invoice status changes
- Sending invoices (email/link)
- Invoice list display
- Search and filtering
- Sorting and pagination
- Permission checks (Employee vs Admin)

#### User Management (35+ tests)
- Create user (Admin only)
- Role-based permissions
- Edit user profiles
- Change user status
- Delete users
- Bulk actions
- Search and filtering
- Password reset emails

#### Dashboard & Analytics (12+ tests)
- Dashboard cards display
- Charts rendering
- Data filtering
- Permission-based data display

#### Profile Management (10+ tests)
- Profile information display
- Password change
- Account deletion
- Form validation

#### Password Reset (5 tests)
- Reset password flow
- Token validation
- Form validation

#### Invoice Templates (4 tests)
- Template creation
- Template usage
- Template editing
- Template deletion

#### Activity Logs (6 tests)
- Access control (Super Admin only)
- Filtering options
- Search functionality

#### Form Validation & Security (10+ tests)
- XSS protection
- SQL injection protection
- Input sanitization
- Field validation

#### UI/UX Testing (35+ tests)
- Responsive design
- Loading states
- Error handling
- Toast notifications
- Modal functionality
- Keyboard navigation
- Accessibility
- Browser compatibility

#### Navigation & Routing (15+ tests)
- Protected routes
- Redirect logic
- Breadcrumbs
- Global search

### Backend Tests (~90 tests)

#### API Endpoints (30+ tests)
- Authentication endpoints
- Invoice CRUD operations
- User CRUD operations
- Email sending endpoints
- Product endpoints
- Error handling
- Response format validation

#### Database (15+ tests)
- Row Level Security (RLS) policies
- Unique constraints
- Foreign key constraints
- Cascade deletes
- Index performance
- Query optimization

#### Edge Functions (15+ tests)
- create-user function
- send-invoice-email function
- send-password-reset-email function
- update-mozello-stock function
- create-stripe-payment-link function
- stripe-webhook handler
- Cron jobs (mark-overdue-invoices, delete-old-drafts)
- Error handling
- Authentication required

#### Email Functionality (15+ tests)
- Email template rendering
- Resend API integration
- Email cooldown enforcement
- Error handling
- Rate limiting

#### API Integrations (12+ tests)
- Mozello API integration
- Stripe API integration
- Authentication handling
- Error handling

#### Activity Logging (10+ tests)
- Log creation for all actions
- Log querying and filtering

#### Security (10+ tests)
- Password hashing
- JWT token management
- CORS configuration
- HTTPS enforcement
- Input sanitization
- SQL injection prevention
- XSS prevention

#### Business Logic (8+ tests)
- Invoice number generation
- Date calculations
- Status workflows
- Stock management

## Important!

- **All tests must be executed before deployment**
- If a test fails, add detailed notes
- Screenshots must be saved and referenced in notes
- Backend tests must include API responses and log messages
- Test both positive and negative scenarios
- Test edge cases and error handling

## Result Analysis

After executing all tests:
1. Count "Passed" and "Failed" results
2. Create a list of all Failed tests
3. Prioritize critical Failed tests
4. Fix issues and re-run Failed tests

## Example Fill-Out

| Test ID | Test Case | ... | Result | Notes |
|---------|-----------|-----|--------|-------|
| 1 | Login with correct credentials | ... | Passed | Everything worked correctly |
| 2 | Login with incorrect password | ... | Failed | Error message does not appear. Screenshot: screenshots/error1.png |
| 3 | Login with invalid email format | ... | Passed | Validation works properly |

## Testing Checklist

### Pre-Testing
- [ ] Test environment is set up
- [ ] All dependencies are installed
- [ ] Test accounts are created (Employee, Admin, Super Admin)
- [ ] Test data is prepared
- [ ] Browser tools are ready (DevTools, Network tab)

### During Testing
- [ ] Execute tests in order
- [ ] Take screenshots for failed tests
- [ ] Document all issues clearly
- [ ] Note any unexpected behavior
- [ ] Record error messages exactly

### Post-Testing
- [ ] Review all Failed tests
- [ ] Prioritize fixes
- [ ] Create bug reports for critical issues
- [ ] Re-test fixed issues
- [ ] Update test results

## Test Environment Setup

### Required Accounts
- **Employee Account** - Regular user with limited permissions
- **Admin Account** - Administrator with user management
- **Super Admin Account** - Full system access

### Required Test Data
- Sample invoices (draft, sent, paid, overdue)
- Sample users (different roles and statuses)
- Sample invoice templates
- Sample products (for invoice creation)

### Required Tools
- Modern web browser (Chrome, Firefox, Edge)
- Developer tools (F12)
- API testing tool (Postman, Insomnia, or curl)
- Database client (if needed for backend tests)
- Screenshot tool

## Common Issues & Solutions

### Frontend Issues
- **Forms not submitting**: Check browser console for errors
- **API calls failing**: Check Network tab for failed requests
- **UI not updating**: Check for JavaScript errors
- **Permissions not working**: Verify user role and RLS policies

### Backend Issues
- **401 Unauthorized**: Check authentication token
- **429 Too Many Requests**: Wait for rate limit cooldown
- **500 Internal Server Error**: Check server logs
- **Database errors**: Check RLS policies and constraints

## Reporting

After completing all tests, create a test report with:
1. Total tests executed
2. Pass/Fail count
3. Failed test list with details
4. Critical issues summary
5. Recommendations for fixes

## Help

If you encounter questions or issues:
- Consult with the developer
- Review project documentation
- Check console messages (F12)
- Review API documentation
- Check activity logs (Super Admin)

---

**Good luck with testing!** 🚀






