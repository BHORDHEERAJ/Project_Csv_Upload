export const PREDEFINED_TEMPLATES = [
    { label: 'ProfitSquare / NurserySeva', value: 'profitsquare_products' },
    { label: 'Empulse - Hotel', value: 'empulse_hotel' },
    { label: 'Empulse - Employee (Full-time)', value: 'empulse_employee_fulltime' },
    { label: 'Empulse - Employee (Contract-based)', value: 'empulse_employee_contract' },
];

export const TEMPLATE_HEADERS_MAP = {
    'profitsquare_products': {
        headers: ['Product Name', 'Variety', 'Barcode', 'Expiry', 'Brand', 'Category', 'Sub Category', 'HSN', 'GST', 'Buying Price', 'Selling Price', 'MRP', 'Qty'],
        data: ['Sample Product', '1 Litre', '123456789', '2025-12-31', 'BrandX', 'CategoryY', 'SubZ', '1234', '18%', '100', '150', '200', '10'],
        format: 'csv'
    },
    'empulse_hotel': {
        headers: ['First Name *', 'Middle Name', 'Surname *', 'Mobile *', 'Gender *', 'Employee ID *', 'Date of Joining *', 'Date of Birth *', 'Personal Email ID', 'Aadhaar Number *', 'PAN Card Number', 'Voter Card ID Number', 'Marital Status', 'Working Hours *', 'Payment Type *', 'Salary Amount *', 'Salary Type', 'Holiday Rate', 'Login Allowed', 'Password', 'Attendance Type', 'Tolerance', 'Double Check In', 'Multiple Check In/Out', 'No of In/Out', 'Referral Name', 'Referral Mobile Number', 'Branch Name *', 'Department Name', 'Shift Name', 'Designation Name', 'Work Module Name', 'Room Name', 'PF Enabled', 'PF Number', 'PF Auto Calculate Wage', 'PF Calc on Calendar Days', 'PF Wage Limit', 'PF Employee %', 'PF Employer %', 'ESI Enabled', 'ESI Number', 'ESI Auto Calculate Wage', 'ESI Wage Limit', 'ESI Employee %', 'ESI Employer %', 'PT Enabled', 'PT 11 Months', 'PT Feb', 'Bank Name', 'Account Number', 'IFSC Code', 'Employee Name as per Bank', 'Account Type', 'Relative Name', 'Relative Relation', 'Relative Mobile', 'Reference Name', 'Reference Relation', 'Reference Mobile', 'Last Company Name', 'Previous Experience', 'Joining Salary', 'Travelling Allowance', 'Reporting Manager', 'Worked in FML', 'FML Outlet Name', 'FML Old Designation', 'FML Working Date', 'Father Mobile Number', 'Current Address', 'Home Town Address', 'Interviewed By', 'Uniform - T-Shirt Size', 'Uniform - Pant Size', 'Uniform - Apron', 'Uniform - Cap/Bandana', 'Is Not Indian Citizen', 'Country Name', 'Document Type Name', 'Document Number', 'Last Working Day'],
        data: ['John', 'A.', 'Doe', '9876543210', 'Male', 'H001', '2024-01-01', '1990-01-01', 'john@example.com', '123456789012', 'ABCDE1234F', 'VOTER123', 'Married', '8', 'Monthly', '25000', 'Fixed', '500', 'Yes', 'P@ss123', 'Biometric', '15', 'No', 'Yes', '2', 'Referrer X', '9998887776', 'Main Branch', 'F&B', 'Morning', 'Waiter', 'Module A', 'Room 101', 'Yes', 'PF12345', 'Yes', 'Yes', '15000', '12', '13', 'Yes', 'ESI123', 'Yes', '21000', '0.75', '3.25', 'Yes', 'Yes', 'Yes', 'Sample Bank', '1234567890', 'SBIN0001234', 'John Doe', 'Savings', 'Jane Doe', 'Wife', '9876543211', 'Ref Person', 'Friend', '9888777666', 'Old Corp', '2 Years', '20000', '100', 'Manager Y', 'No', 'N/A', 'N/A', 'N/A', '9876543212', 'Line 1, City', 'Hometown, State', 'Interviewer Z', 'L', '34', 'Yes', 'Yes', 'No', 'India', 'Passport', 'P1234567', 'N/A'],
        format: 'xlsx'
    },
    'empulse_employee_fulltime': {
        headers: ['Name *', 'Mobile *', 'Gender *', 'Employee ID *', 'Date of Joining *', 'Working Hours *', 'Payment Type *', 'Salary Amount *', 'Login Allowed', 'Password', 'Attendance Type', 'Tolerance', 'Double Check In', 'Multiple Check In/Out', 'No of In/Out', 'Date of Birth', 'Email', 'Aadhaar Number', 'Referral Name', 'Referral Mobile Number', 'Branch Name', 'Department Name', 'Shift Name', 'Designation Name', 'Salary Type', 'Is Hourly Paid', 'Overtime Type', 'Wage Overtime', 'Holiday Rate', 'PF Enabled', 'PF Auto Calculate Wage', 'PF Calc on Calendar Days', 'PF Number', 'PF Wage Limit', 'PF Employee %', 'PF Employer %', 'ESI Enabled', 'ESI Auto Calculate Wage', 'ESI Number', 'ESI Wage Limit', 'ESI Employee %', 'ESI Employer %', 'PT Enabled', 'PT 11 Months', 'PT Feb', 'Bank Name', 'Account Number', 'IFSC Code'],
        data: ['Jane Doe', '9123456789', 'Female', 'F101', '2024-02-01', '9', 'Monthly', '30000', 'Yes', 'Secure123', 'Manual', '30', 'No', 'Yes', '4', '1995-05-15', 'jane@example.com', '987654321098', 'Referrer B', '9888777665', 'Corporate', 'HR', 'General', 'Manager', 'Monthly', 'No', 'Fixed', '200', '1000', 'Yes', 'Yes', 'No', 'PF5566', '15000', '12', '13', 'Yes', 'Yes', 'ESI7788', '21000', '0.75', '3.25', 'Yes', 'No', 'Yes', 'Global Bank', '987654321', 'GIBL001'],
        format: 'xlsx'
    },
    'empulse_employee_contract': {
        headers: ['Name *', 'Mobile *', 'Gender *', 'Employee ID *', 'Date of Joining *', 'Working Hours *', 'Contract Type *', 'Daily Salary *', 'Date of Birth', 'Aadhaar Number', 'Referral Name', 'Referral Mobile Number', 'Branch Name', 'Department Name', 'Shift Name', 'Designation Name', 'Bank Name', 'Account Number', 'IFSC Code', 'Employee Name as per Bank', 'Account Type'],
        data: ['Sam Smith', '9988776655', 'Male', 'C501', '2024-03-01', '10', 'Daily', '800', '1988-10-10', '556677889900', 'Referrer C', '9111222333', 'Warehouse', 'Logistics', 'Night', 'Picker', 'Local Bank', '554433221', 'LOCL002', 'Sam Smith', 'Current'],
        format: 'xlsx'
    }
};
