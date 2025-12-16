// Export utilities for CSV and PDF generation

// CSV Export
export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values with commas, quotes, or newlines
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// PDF Export (using browser print)
export function exportToPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  
  if (!element) {
    alert('Content not found for PDF export');
    return;
  }

  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert('Please allow popups to export PDF');
    return;
  }

  // Get current styles
  const styles = Array.from(document.styleSheets)
    .map(styleSheet => {
      try {
        return Array.from(styleSheet.cssRules)
          .map(rule => rule.cssText)
          .join('\n');
      } catch (e) {
        return '';
      }
    })
    .join('\n');

  // Create HTML for print
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${filename}</title>
        <style>
          ${styles}
          @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <h1>${filename}</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        ${element.innerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  
  // Wait for content to load then print
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

// Format data for export (remove sensitive fields, format dates)
export function formatDataForExport(data: any[], excludeFields: string[] = []) {
  return data.map(item => {
    const formatted: any = {};
    
    Object.keys(item).forEach(key => {
      // Skip excluded fields
      if (excludeFields.includes(key)) return;
      
      // Skip sensitive fields
      if (key.includes('password') || key.includes('token') || key.includes('secret')) return;
      
      const value = item[key];
      
      // Format dates
      if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)) && value.includes('-'))) {
        formatted[key] = new Date(value).toLocaleString();
      }
      // Format objects/arrays
      else if (typeof value === 'object' && value !== null) {
        formatted[key] = JSON.stringify(value);
      }
      // Keep other values
      else {
        formatted[key] = value;
      }
    });
    
    return formatted;
  });
}

// Export table data directly from DOM
export function exportTableToCSV(tableId: string, filename: string) {
  const table = document.getElementById(tableId);
  
  if (!table) {
    alert('Table not found');
    return;
  }

  const rows = Array.from(table.querySelectorAll('tr'));
  const csvContent = rows.map(row => {
    const cells = Array.from(row.querySelectorAll('th, td'));
    return cells.map(cell => {
      const text = cell.textContent?.trim() || '';
      // Handle commas and quotes
      if (text.includes(',') || text.includes('"')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    }).join(',');
  }).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
