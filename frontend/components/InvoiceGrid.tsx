import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { ColDef, GridReadyEvent, CellEditingStoppedEvent, GridApi, CellClassParams } from 'ag-grid-community';
import * as XLSX from 'xlsx';

interface InvoiceGridProps {
  invoiceId?: number;
  readOnly?: boolean;
}

interface InvoiceLine {
  id?: number;
  invoice_id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  hs_code?: string;
  classification_method?: string;
  flagged?: boolean;
}

const InvoiceGrid: React.FC<InvoiceGridProps> = ({ invoiceId, readOnly = false }) => {
  const [rowData, setRowData] = useState<InvoiceLine[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const gridRef = useRef<AgGridReact>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Column definitions
  const columnDefs: ColDef[] = [
    { 
      field: 'description', 
      headerName: 'Description', 
      editable: !readOnly,
      flex: 2,
      minWidth: 200,
      cellStyle: { wordBreak: 'break-word' }
    },
    { 
      field: 'quantity', 
      headerName: 'Quantity', 
      editable: !readOnly,
      type: 'numericColumn',
      flex: 1,
      minWidth: 100
    },
    { 
      field: 'unit_price', 
      headerName: 'Unit Price', 
      editable: !readOnly,
      type: 'numericColumn',
      valueFormatter: (params) => {
        return params.value ? `$${params.value.toFixed(2)}` : '';
      },
      flex: 1,
      minWidth: 120
    },
    { 
      field: 'hs_code', 
      headerName: 'HS Code', 
      editable: !readOnly,
      flex: 1,
      minWidth: 120,
      cellStyle: (params: CellClassParams) => {
        return params.data.flagged ? { backgroundColor: '#FFECB3' } : null;
      }
    },
    { 
      field: 'classification_method', 
      headerName: 'Classification Method', 
      editable: false,
      flex: 1,
      minWidth: 150
    }
  ];

  // Default column settings
  const defaultColDef = {
    sortable: true,
    filter: true,
    resizable: true
  };

  // Load invoice lines when invoiceId changes
  useEffect(() => {
    if (invoiceId) {
      loadInvoiceLines();
    } else {
      // Initialize with empty row for new invoice
      setRowData([{ description: '', quantity: 0, unit_price: 0 }]);
    }
  }, [invoiceId]);

  // Load invoice lines from the API
  const loadInvoiceLines = async () => {
    if (!invoiceId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/invoices/${invoiceId}/lines`);
      if (!response.ok) throw new Error('Failed to load invoice lines');
      
      const data = await response.json();
      setRowData(data);
    } catch (error) {
      console.error('Error loading invoice lines:', error);
      // Initialize with empty row if error
      setRowData([{ description: '', quantity: 0, unit_price: 0 }]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-save changes
  const saveChanges = useCallback(async (updatedData: InvoiceLine[]) => {
    if (!invoiceId) return;
    
    try {
      const response = await fetch(`/api/v1/invoices/${invoiceId}/lines`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });
      
      if (!response.ok) throw new Error('Failed to save invoice lines');
      
      // Refresh data after save
      loadInvoiceLines();
    } catch (error) {
      console.error('Error saving invoice lines:', error);
    }
  }, [invoiceId]);

  // Handle cell editing
  const onCellEditingStopped = (event: CellEditingStoppedEvent) => {
    if (readOnly) return;
    
    // Clear previous timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    // Set new timeout for auto-save (debounce)
    const timeout = setTimeout(() => {
      const rowData = gridRef.current?.api.getRenderedNodes().map(node => node.data) || [];
      saveChanges(rowData as InvoiceLine[]);
    }, 1000);
    
    setSaveTimeout(timeout);
  };

  // Handle grid ready event
  const onGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api);
  };

  // Add new row
  const addNewRow = () => {
    if (readOnly) return;
    
    const newRow: InvoiceLine = {
      invoice_id: invoiceId,
      description: '',
      quantity: 0,
      unit_price: 0
    };
    
    const newData = [...rowData, newRow];
    setRowData(newData);
    
    // Focus on the new row after it's added
    setTimeout(() => {
      if (gridApi) {
        gridApi.setFocusedCell(newData.length - 1, 'description');
        gridApi.startEditingCell({
          rowIndex: newData.length - 1,
          colKey: 'description'
        });
      }
    }, 100);
  };

  // Handle file import
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first worksheet
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Map to InvoiceLine structure
        const importedData: InvoiceLine[] = jsonData.map((row: any) => ({
          invoice_id: invoiceId,
          description: row.Description || row.description || '',
          quantity: Number(row.Quantity || row.quantity || 0),
          unit_price: Number(row['Unit Price'] || row.unit_price || 0),
          hs_code: row['HS Code'] || row.hs_code || ''
        }));
        
        setRowData(importedData);
        
        // Save imported data
        if (invoiceId) {
          saveChanges(importedData);
        }
      } catch (error) {
        console.error('Error importing file:', error);
        alert('Failed to import file. Please check the file format.');
      }
    };
    reader.readAsArrayBuffer(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Trigger file input click
  const importFile = () => {
    if (readOnly) return;
    fileInputRef.current?.click();
  };

  // Export to CSV
  const exportToCSV = () => {
    if (gridApi) {
      gridApi.exportDataAsCsv({
        fileName: `invoice-${invoiceId || 'new'}-${new Date().toISOString().split('T')[0]}.csv`
      });
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    if (!gridApi) return;
    
    const rowData = gridApi.getRenderedNodes().map(node => node.data);
    const worksheet = XLSX.utils.json_to_sheet(rowData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoice Lines');
    XLSX.writeFile(workbook, `invoice-${invoiceId || 'new'}-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="flex flex-col w-full">
      <div className="flex justify-between mb-4">
        <div>
          {!readOnly && (
            <>
              <button 
                onClick={addNewRow}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
              >
                Add Row
              </button>
              <button 
                onClick={importFile}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                Import
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileImport}
                accept=".csv,.xlsx,.xls"
                className="hidden"
                aria-label="Import invoice data file"
              />
            </>
          )}
        </div>
        <div>
          <button 
            onClick={exportToCSV}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded mr-2"
          >
            Export CSV
          </button>
          <button 
            onClick={exportToExcel}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Export Excel
          </button>
        </div>
      </div>
      
      <div 
        className="ag-theme-alpine w-full h-[600px]"
        style={{ height: '600px', width: '100%' }}
      >
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
          onCellEditingStopped={onCellEditingStopped}
          rowSelection="multiple"
          enableRangeSelection={true}
          copyHeadersToClipboard={true}
          undoRedoCellEditing={true}
          undoRedoCellEditingLimit={20}
          stopEditingWhenCellsLoseFocus={true}
        />
      </div>
    </div>
  );
};

export default InvoiceGrid;