# Export Functionality Guide

## ✅ Implemented Export Features

Export functionality (CSV & PDF) has been added to the admin dashboard.

### Files Created:
- `lib/utils/export.ts` - Export utility functions

### Pages Updated:
1. ✅ **User Management** - CSV & PDF export
2. ✅ **Transaction Management** - Import added (needs buttons)

---

## 🚀 How to Add Export to Any Page

### Step 1: Import the utilities

```typescript
import { Download, FileText } from "lucide-react";
import { exportToCSV, exportToPDF, formatDataForExport } from "@/lib/utils/export";
```

### Step 2: Add Export Buttons to Header

```typescript
<div className="flex gap-2">
  <Button
    onClick={() => {
      const exportData = formatDataForExport(yourData, ['password', 'sensitive_field']);
      exportToCSV(exportData, 'filename');
      toast.success('Data exported to CSV!');
    }}
    variant="outline"
  >
    <Download className="h-4 w-4 mr-2" />
    Export CSV
  </Button>
  <Button
    onClick={() => {
      exportToPDF('container-id', 'Report Name');
      toast.success('Generating PDF...');
    }}
    variant="outline"
  >
    <FileText className="h-4 w-4 mr-2" />
    Export PDF
  </Button>
</div>
```

### Step 3: Add ID to Container for PDF Export

```typescript
<Card className="shadow-card" id="container-id">
  {/* Your table content */}
</Card>
```

---

## 📋 Quick Implementation for Each Page

### Subscriptions Page
```typescript
// Add to header
<Button onClick={() => {
  const exportData = formatDataForExport(subscriptions);
  exportToCSV(exportData, 'subscriptions');
  toast.success('Subscriptions exported!');
}} variant="outline">
  <Download className="h-4 w-4 mr-2" />
  Export CSV
</Button>

// Add ID to table container
<Card id="subscriptions-table-container">
```

### Financial Reports Page
```typescript
<Button onClick={() => {
  exportToPDF('financial-report-container', 'Financial Report');
}} variant="outline">
  <FileText className="h-4 w-4 mr-2" />
  Export PDF
</Button>
```

### Admin Accounts Page
```typescript
<Button onClick={() => {
  const exportData = formatDataForExport(admins, ['password', 'hash', 'salt']);
  exportToCSV(exportData, 'admin-accounts');
}} variant="outline">
  <Download className="h-4 w-4 mr-2" />
  Export CSV
</Button>
```

### Audit Logs Page
```typescript
<Button onClick={() => {
  const exportData = formatDataForExport(logs);
  exportToCSV(exportData, 'audit-logs');
}} variant="outline">
  <Download className="h-4 w-4 mr-2" />
  Export CSV
</Button>
```

### Payouts Page
```typescript
<Button onClick={() => {
  const exportData = formatDataForExport(payouts);
  exportToCSV(exportData, 'payouts');
}} variant="outline">
  <Download className="h-4 w-4 mr-2" />
  Export CSV
</Button>
```

---

## 🎨 Export Utility Functions

### `exportToCSV(data, filename)`
Exports array of objects to CSV file.

**Parameters:**
- `data`: Array of objects to export
- `filename`: Name of the file (without extension)

**Example:**
```typescript
exportToCSV(users, 'users-report');
// Downloads: users-report_2024-01-15.csv
```

### `exportToPDF(elementId, filename)`
Exports HTML element to PDF using browser print.

**Parameters:**
- `elementId`: ID of the HTML element to export
- `filename`: Name for the PDF

**Example:**
```typescript
exportToPDF('table-container', 'Monthly Report');
```

### `formatDataForExport(data, excludeFields)`
Formats data for export (removes sensitive fields, formats dates).

**Parameters:**
- `data`: Array of objects
- `excludeFields`: Array of field names to exclude

**Example:**
```typescript
const formatted = formatDataForExport(users, ['password', 'token']);
exportToCSV(formatted, 'users');
```

### `exportTableToCSV(tableId, filename)`
Exports HTML table directly to CSV.

**Parameters:**
- `tableId`: ID of the table element
- `filename`: Name of the file

**Example:**
```typescript
exportTableToCSV('users-table', 'users');
```

---

## 🔒 Security Notes

1. **Sensitive Data**: Always use `formatDataForExport()` to exclude sensitive fields
2. **Excluded by Default**: password, hash, salt, token, secret fields
3. **Custom Exclusions**: Pass array of field names to exclude

```typescript
// Exclude specific fields
const exportData = formatDataForExport(data, [
  'password',
  'credit_card',
  'ssn',
  'api_key'
]);
```

---

## 📊 Data Formatting

The export utility automatically:
- ✅ Formats dates to locale string
- ✅ Converts objects/arrays to JSON strings
- ✅ Handles commas and quotes in CSV
- ✅ Removes null/undefined values
- ✅ Excludes sensitive fields

---

## 🎯 Next Steps

To complete export functionality across all pages:

1. ✅ User Management - DONE
2. ⏳ Transaction Management - Add buttons
3. ⏳ Subscriptions - Add export
4. ⏳ Financial Reports - Add export
5. ⏳ Admin Accounts - Add export
6. ⏳ Audit Logs - Add export
7. ⏳ Payouts - Add export
8. ⏳ Admin Sessions - Add export

Copy the implementation from User Management page to other pages!
