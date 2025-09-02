import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fileProcessingResult } from "@shared/schema";
import multer from "multer";
import * as XLSX from "xlsx";

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1,
    fieldSize: 50 * 1024 * 1024 // 50MB field size limit
  },
  fileFilter: (req, file, cb) => {
    console.log('File filter check:', file.originalname, file.mimetype);
    cb(null, true); // Accept all files
  }
});

// Generate HTML for Brother QL printer labels
function generateLabelHTML(items: any[]) {
  const labelCSS = `
    <style>
      @page {
        size: 2.4in 1.2in;
        margin: 0;
      }
      
      @media print {
        body { 
          margin: 0; 
          padding: 0; 
          font-family: Arial, sans-serif; 
        }
        
        .label {
          width: 2.4in;
          height: 1.2in;
          padding: 0.05in;
          border: 1px solid #000;
          box-sizing: border-box;
          page-break-after: always;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        
        .label:last-child {
          page-break-after: avoid;
        }
        
        .label-header {
          font-weight: bold;
          font-size: 11px;
          text-align: center;
          line-height: 1.1;
          margin-bottom: 0.02in;
        }
        
        .label-body {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .barcode-section {
          flex: 1;
          display: flex;
          align-items: center;
        }
        
        .barcode {
          font-family: 'Libre Barcode 128', monospace;
          font-size: 20px;
          letter-spacing: 0;
          line-height: 1;
          writing-mode: horizontal-tb;
        }
        
        .price-section {
          font-weight: bold;
          font-size: 16px;
          text-align: right;
          margin-left: 0.1in;
        }
        
        .label-footer {
          position: absolute;
          bottom: 0.05in;
          right: 0.05in;
          font-size: 8px;
          font-weight: bold;
        }
        
        /* Hide everything except labels when printing */
        .no-print { display: none !important; }
      }
      
      /* Screen styles for preview */
      @media screen {
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          background: #f0f0f0;
        }
        
        .print-instructions {
          background: #e3f2fd;
          border: 1px solid #1976d2;
          border-radius: 4px;
          padding: 15px;
          margin-bottom: 20px;
        }
        
        .label {
          width: 240px;
          height: 120px;
          padding: 5px;
          border: 2px solid #000;
          box-sizing: border-box;
          margin: 10px;
          display: inline-flex;
          flex-direction: column;
          position: relative;
          background: white;
        }
        
        .label-header {
          font-weight: bold;
          font-size: 11px;
          text-align: center;
          line-height: 1.1;
          margin-bottom: 2px;
        }
        
        .label-body {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .barcode-section {
          flex: 1;
          display: flex;
          align-items: center;
        }
        
        .barcode {
          font-family: monospace;
          font-size: 8px;
          letter-spacing: 1px;
          line-height: 1;
          background: repeating-linear-gradient(90deg, #000 0px, #000 1px, #fff 1px, #fff 2px);
          color: transparent;
          padding: 5px 0;
        }
        
        .price-section {
          font-weight: bold;
          font-size: 16px;
          text-align: right;
          margin-left: 10px;
        }
        
        .label-footer {
          position: absolute;
          bottom: 5px;
          right: 5px;
          font-size: 8px;
          font-weight: bold;
        }
      }
    </style>
  `;

  const labelElements = items.map((item: any) => {
    const product = item.product;
    const brandWithSize = `${product.brandName} ${product.bottleSize}`;
    const price = typeof product.shelfPrice === 'number' ? `$${product.shelfPrice.toFixed(2)}` : product.shelfPrice;
    const barcode = item.scannedBarcode || product.upcCode1 || '';
    
    return `
      <div class="label">
        <div class="label-header">
          ${brandWithSize}
        </div>
        <div class="label-body">
          <div class="barcode-section">
            <div class="barcode">${barcode}</div>
          </div>
          <div class="price-section">
            ${price}
          </div>
        </div>
        <div class="label-footer">
          ${product.liquorCode}
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Liquor Shelf Labels</title>
      ${labelCSS}
      <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap" rel="stylesheet">
    </head>
    <body>
      <div class="print-instructions no-print">
        <h3>🏷️ Brother QL-820NWB Label Printing Instructions</h3>
        <ol>
          <li>Load 2.4" x 1.2" continuous length labels in your Brother QL-820NWB</li>
          <li>In your browser, go to <strong>File → Print</strong> (or Ctrl+P)</li>
          <li>Select your Brother QL-820NWB printer</li>
          <li>Choose <strong>More settings → Paper size → 2.4" x 1.2"</strong></li>
          <li>Set <strong>Margins to None</strong> and <strong>Scale to 100%</strong></li>
          <li>Click Print - labels will auto-cut between each item</li>
        </ol>
        <p><strong>Total labels to print: ${items.length}</strong></p>
      </div>
      
      ${labelElements}
    </body>
    </html>
  `;
}

// Field specifications matching the Python script
const FIELD_SPECS = [
  ["LIQUOR CODE", 0, 5],
  ["BRAND NAME", 5, 37],
  ["ADA NUMBER", 37, 40],
  ["ADA NAME", 40, 65],
  ["VENDOR NAME", 65, 90],
  ["PROOF", 110, 115],
  ["BOTTLE SIZE", 115, 122],
  ["PACK SIZE", 122, 125],
  ["ON PREMISE PRICE", 125, 136],
  ["OFF PREMISE PRICE", 136, 147],
  ["SHELF PRICE", 147, 158],
  ["UPC CODE 1", 158, 172],
  ["UPC CODE 2", 172, 186],
  ["EFFECTIVE DATE", 186, 194],
] as const;

function parseLine(line: string) {
  const row: any = {};
  
  for (const [name, start, end] of FIELD_SPECS) {
    let value = line.slice(start, end).trim();
    
    // Handle price conversion
    if (name.includes("PRICE")) {
      try {
        const numValue = parseFloat(value.replace(/[$,]/g, ''));
        if (!isNaN(numValue)) {
          value = numValue as any;
        }
      } catch {
        // Keep original value if conversion fails
      }
    }
    // Handle date formatting MMDDYYYY to YYYY-MM-DD
    else if (name === "EFFECTIVE DATE" && value.length === 8) {
      value = `${value.slice(4)}-${value.slice(0, 2)}-${value.slice(2, 4)}`;
    }
    
    row[name.toLowerCase().replace(/ /g, "")] = value;
  }
  
  return {
    liquorCode: row.liquorcode || "",
    brandName: row.brandname || "",
    adaNumber: row.adanumber || "",
    adaName: row.adaname || "",
    vendorName: row.vendorname || "",
    proof: row.proof || "",
    bottleSize: row.bottlesize || "",
    packSize: row.packsize || "",
    onPremisePrice: row.onpremiseprice || 0,
    offPremisePrice: row.offpremiseprice || 0,
    shelfPrice: row.shelfprice || 0,
    upcCode1: row.upccode1 || "",
    upcCode2: row.upccode2 || "",
    effectiveDate: row.effectivedate || "",
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Process liquor data file
  app.post("/api/process-file", upload.single('file'), async (req, res) => {
    console.log('Processing file upload request...');
    
    try {
      if (!req.file) {
        console.log('No file uploaded in request');
        return res.status(400).json({ success: false, error: "No file uploaded" });
      }

      console.log('File received:', req.file.originalname, 'Size:', req.file.size, 'bytes');

      const fileContent = req.file.buffer.toString('utf-8');
      const lines = fileContent.split('\n').filter(line => line.trim());
      
      console.log('File parsed, total lines:', lines.length);
      
      const records = [];
      const brands = new Set();
      const vendors = new Set();
      const prices: number[] = [];

      for (const line of lines) {
        if (line.trim()) {
          const record = parseLine(line);
          records.push(record);
          
          if (record.brandName) brands.add(record.brandName);
          if (record.vendorName) vendors.add(record.vendorName);
          
          // Collect prices for average calculation
          if (typeof record.shelfPrice === 'number') {
            prices.push(record.shelfPrice);
          }
        }
      }

      const avgPrice = prices.length > 0 
        ? prices.reduce((sum, price) => sum + price, 0) / prices.length 
        : 0;

      // Clear existing records and save new ones to storage
      await storage.clearLiquorRecords();
      console.log('Cleared existing liquor records');
      
      for (const record of records) {
        await storage.createLiquorRecord(record);
      }
      console.log(`Saved ${records.length} liquor records to storage`);

      const result = {
        success: true,
        totalRecords: records.length,
        uniqueBrands: brands.size,
        uniqueVendors: vendors.size,
        avgPrice: Number(avgPrice.toFixed(2)),
        records: records.slice(0, 100), // Return first 100 for preview
        allRecords: records, // Include all records for download
      };

      res.json(result);
    } catch (error) {
      console.error("File processing error:", error);
      
      // Check if response was already sent
      if (!res.headersSent) {
        res.status(500).json({ 
          success: false, 
          error: "Failed to process file",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  // Process file content directly (alternative to file upload)
  app.post("/api/process-file-content", async (req, res) => {
    console.log('Processing file content request...');
    
    try {
      const { content, filename } = req.body;
      
      if (!content) {
        console.log('No content provided in request');
        return res.status(400).json({ success: false, error: "No file content provided" });
      }

      console.log('Content received for file:', filename, 'Length:', content.length);

      const lines = content.split('\n').filter((line: string) => line.trim());
      console.log('File parsed, total lines:', lines.length);
      
      const records = [];
      const brands = new Set();
      const vendors = new Set();
      const prices: number[] = [];

      for (const line of lines) {
        if (line.trim()) {
          const record = parseLine(line);
          records.push(record);
          
          if (record.brandName) brands.add(record.brandName);
          if (record.vendorName) vendors.add(record.vendorName);
          
          // Collect prices for average calculation
          if (typeof record.shelfPrice === 'number') {
            prices.push(record.shelfPrice);
          }
        }
      }

      const avgPrice = prices.length > 0 
        ? prices.reduce((sum, price) => sum + price, 0) / prices.length 
        : 0;

      // Clear existing records and save new ones to storage
      await storage.clearLiquorRecords();
      console.log('Cleared existing liquor records');
      
      for (const record of records) {
        await storage.createLiquorRecord(record);
      }
      console.log(`Saved ${records.length} liquor records to storage`);

      const result = {
        success: true,
        totalRecords: records.length,
        uniqueBrands: brands.size,
        uniqueVendors: vendors.size,
        avgPrice: Number(avgPrice.toFixed(2)),
        records: records.slice(0, 100), // Return first 100 for preview
        allRecords: records, // Include all records for download
      };

      console.log('Processing complete:', result.totalRecords, 'records processed');
      res.json(result);
    } catch (error) {
      console.error("File content processing error:", error);
      
      // Check if response was already sent
      if (!res.headersSent) {
        res.status(500).json({ 
          success: false, 
          error: "Failed to process file content",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  // Scan barcode and lookup product
  app.post("/api/scan-barcode", async (req, res) => {
    console.log('Processing barcode scan request...');
    
    try {
      const { barcode, sessionId } = req.body;
      
      if (!barcode) {
        return res.status(400).json({ 
          success: false, 
          error: "No barcode provided" 
        });
      }

      console.log('Looking up barcode:', barcode);

      // Get all records for debugging
      const allRecords = await storage.getLiquorRecords();
      console.log('Total records in storage:', allRecords.length);
      
      // Don't process test barcodes that are just checking status
      if (barcode === 'test-check-only') {
        return res.json({
          success: false,
          barcode,
          error: "Status check only",
          totalRecords: allRecords.length
        });
      }
      
      // Find matching liquor record
      const matchedProduct = await storage.findLiquorByBarcode(barcode);
      
      // Debug: Show some UPC codes for comparison
      if (!matchedProduct && allRecords.length > 0) {
        console.log('Sample UPC codes from first 3 records:');
        allRecords.slice(0, 3).forEach((record, i) => {
          console.log(`Record ${i + 1}: UPC1="${record.upcCode1}", UPC2="${record.upcCode2}"`);
        });
        
        // Try to find any record with this UPC
        const foundRecord = allRecords.find(r => 
          r.upcCode1 === barcode || r.upcCode2 === barcode ||
          r.upcCode1?.trim() === barcode || r.upcCode2?.trim() === barcode
        );
        console.log('Direct search result:', foundRecord ? 'FOUND' : 'NOT FOUND');
      }
      
      if (matchedProduct) {
        // Add to scanned items if sessionId provided
        if (sessionId) {
          await storage.addScannedItem({
            sessionId,
            liquorRecordId: matchedProduct.id,
            scannedBarcode: barcode, // Store the actual scanned barcode, not the MLCC version
            scannedAt: new Date().toISOString(),
            quantity: 1,
          });
        }

        console.log('Product found:', matchedProduct.brandName);
        
        res.json({
          success: true,
          barcode: barcode, // Return the actual scanned barcode
          matchedProduct: {
            ...matchedProduct,
            // Keep the product details but note that we matched using the scanned barcode
            scannedUpc: barcode, // Add the actual scanned UPC for reference
          },
        });
      } else {
        console.log('No product found for barcode:', barcode);
        
        res.json({
          success: false,
          barcode,
          error: "Product not found in database",
        });
      }
    } catch (error) {
      console.error("Barcode scan error:", error);
      
      res.status(500).json({
        success: false,
        error: "Failed to process barcode scan",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get scanned items for a session
  app.get("/api/scanned-items/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      console.log('Getting scanned items for session:', sessionId);

      const scannedItems = await storage.getScannedItems(sessionId);
      
      // Get full product details for each scanned item
      const itemsWithDetails = await Promise.all(
        scannedItems.map(async (item) => {
          const liquorRecords = await storage.getLiquorRecords();
          const product = liquorRecords.find(r => r.id === item.liquorRecordId);
          return {
            ...item,
            product: product || null,
          };
        })
      );

      res.json({
        success: true,
        sessionId,
        items: itemsWithDetails,
        totalCount: itemsWithDetails.length,
      });
    } catch (error) {
      console.error("Get scanned items error:", error);
      
      res.status(500).json({
        success: false,
        error: "Failed to get scanned items",
      });
    }
  });

  // Delete individual scanned item
  app.delete("/api/scanned-items/:sessionId/:itemId", async (req, res) => {
    try {
      const { itemId } = req.params;
      console.log('Deleting scanned item:', itemId);

      const deleted = await storage.deleteScannedItem(itemId);
      
      if (deleted) {
        res.json({
          success: true,
          message: "Item deleted",
        });
      } else {
        res.status(404).json({
          success: false,
          error: "Item not found",
        });
      }
    } catch (error) {
      console.error("Delete item error:", error);
      
      res.status(500).json({
        success: false,
        error: "Failed to delete item",
      });
    }
  });

  // Clear scanned items for a session
  app.delete("/api/scanned-items/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      console.log('Clearing scanned items for session:', sessionId);

      await storage.clearScannedItems(sessionId);
      
      res.json({
        success: true,
        message: "Scanned items cleared",
      });
    } catch (error) {
      console.error("Clear scanned items error:", error);
      
      res.status(500).json({
        success: false,
        error: "Failed to clear scanned items",
      });
    }
  });

  // Generate Excel file
  app.post("/api/generate-excel", async (req, res) => {
    try {
      const { records, filename } = req.body;
      
      console.log('Excel generation request:', {
        recordsCount: records?.length,
        filename,
        sampleRecord: records?.[0]
      });
      
      if (!records || !Array.isArray(records)) {
        console.error('Invalid records data for Excel generation');
        return res.status(400).json({ error: "Invalid records data" });
      }

      if (records.length === 0) {
        console.error('Empty records array for Excel generation');
        return res.status(400).json({ error: "No data to export" });
      }

      console.log('Processing', records.length, 'records for Excel export');

      // Check if this is scanned items data (has different format)
      const isScannedItemsData = records[0] && records[0]["ADA Number"] !== undefined;
      
      let worksheetData;
      
      if (isScannedItemsData) {
        // Handle scanned items format
        console.log('Generating Excel for scanned items');
        worksheetData = [
          [
            "LIQUOR CODE", "ADA NUMBER", "ADA NAME", "VENDOR NAME", "PROOF", "BOTTLE SIZE", 
            "PACK SIZE", "ON PREMISE", "OFF PREMISE", "SHELF PRICE", 
            "UPC CODE 1", "UPC CODE 2", "EFFECTIVE DATE"
          ],
          ...records.map(record => [
            record["Liquor Code"],
            record["ADA Number"],
            record["ADA Name"],
            record["Vendor Name"],
            record["Proof"],
            record["Bottle Size"],
            record["Pack Size"],
            record["On Premise"],
            record["Off Premise"],
            record["Shelf Price"],
            record["UPC Code 1"],
            record["UPC Code 2"],
            record["Effective Date"],
          ])
        ];
      } else {
        // Handle original liquor data format
        console.log('Generating Excel for liquor data');
        worksheetData = [
          [
            "LIQUOR CODE", "BRAND NAME", "ADA NUMBER", "ADA NAME", "VENDOR NAME",
            "PROOF", "BOTTLE SIZE", "PACK SIZE", "ON PREMISE PRICE", "OFF PREMISE PRICE",
            "SHELF PRICE", "UPC CODE 1", "UPC CODE 2", "EFFECTIVE DATE"
          ],
          ...records.map(record => [
            record.liquorCode,
            record.brandName,
            record.adaNumber,
            record.adaName,
            record.vendorName,
            record.proof,
            record.bottleSize,
            record.packSize,
            record.onPremisePrice,
            record.offPremisePrice,
            record.shelfPrice,
            record.upcCode1,
            record.upcCode2,
            record.effectiveDate,
          ])
        ];
      }

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Add worksheet to workbook
      const sheetName = isScannedItemsData ? "Scanned Items" : "Liquor Data";
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      
      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      console.log('Excel buffer created, size:', excelBuffer.length, 'bytes');
      
      // Set headers for file download
      const outputFilename = filename || 
        (isScannedItemsData ? "scanned_liquor.xlsx" : "liquor_data.xlsx");
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
      res.setHeader('Content-Length', excelBuffer.length);
      
      res.send(excelBuffer);
    } catch (error) {
      console.error("Excel generation error:", error);
      res.status(500).json({ 
        error: "Failed to generate Excel file",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Fetch liquor data directly from Michigan state website
  app.post("/api/fetch-liquor-data", async (req, res) => {
    console.log('Fetching liquor data from Michigan state website...');
    
    try {
      const url = 'https://documents.apps.lara.state.mi.us/mlcc/webprbk.txt';
      console.log('Downloading from:', url);
      
      // Fetch the data from the website
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const fileContent = await response.text();
      console.log('Downloaded content, length:', fileContent.length);
      
      const lines = fileContent.split('\n').filter((line: string) => line.trim());
      console.log('File parsed, total lines:', lines.length);
      
      const records = [];
      const brands = new Set();
      const vendors = new Set();
      const prices: number[] = [];

      for (const line of lines) {
        if (line.trim()) {
          const record = parseLine(line);
          records.push(record);
          
          if (record.brandName) brands.add(record.brandName);
          if (record.vendorName) vendors.add(record.vendorName);
          
          // Collect prices for average calculation
          if (typeof record.shelfPrice === 'number') {
            prices.push(record.shelfPrice);
          }
        }
      }

      const avgPrice = prices.length > 0 
        ? prices.reduce((sum, price) => sum + price, 0) / prices.length 
        : 0;

      // Clear existing records and save new ones to storage
      await storage.clearLiquorRecords();
      console.log('Cleared existing liquor records');
      
      for (const record of records) {
        await storage.createLiquorRecord(record);
      }
      console.log(`Saved ${records.length} liquor records to storage`);

      const result = {
        success: true,
        totalRecords: records.length,
        uniqueBrands: brands.size,
        uniqueVendors: vendors.size,
        avgPrice: Number(avgPrice.toFixed(2)),
        records: records.slice(0, 100), // Return first 100 for preview
        allRecords: records, // Include all records for download
        source: 'Michigan State Website',
        url: url,
        fetchedAt: new Date().toISOString(),
      };

      console.log('Data fetch and processing complete:', result.totalRecords, 'records processed');
      res.json(result);
    } catch (error) {
      console.error("Data fetch error:", error);
      
      // Check if response was already sent
      if (!res.headersSent) {
        res.status(500).json({ 
          success: false, 
          error: "Failed to fetch liquor data from website",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  // Add item directly (for manual search selections)
  app.post("/api/add-item", async (req, res) => {
    try {
      const { liquorRecordId, sessionId, scannedBarcode } = req.body;
      console.log('Adding item directly:', { liquorRecordId, sessionId, scannedBarcode });

      if (!liquorRecordId || !sessionId) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields",
        });
      }

      // Get the liquor record
      const allRecords = await storage.getLiquorRecords();
      const liquorRecord = allRecords.find(r => r.id === liquorRecordId);
      
      if (!liquorRecord) {
        return res.status(404).json({
          success: false,
          error: "Liquor record not found",
        });
      }

      // Add to scanned items
      await storage.addScannedItem({
        sessionId,
        liquorRecordId: liquorRecord.id,
        scannedBarcode: scannedBarcode || liquorRecord.upcCode1 || 'manual-search',
        scannedAt: new Date().toISOString(),
        quantity: 1,
      });

      res.json({
        success: true,
        message: "Item added successfully",
        liquorRecord,
      });
    } catch (error) {
      console.error("Add item error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to add item",
      });
    }
  });

  // Search endpoint for liquor lookup by code, UPC, or name
  app.get("/api/search-liquor", async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query || typeof query !== 'string' || query.length < 2) {
        return res.json({
          success: true,
          results: [],
          message: "Query too short"
        });
      }

      console.log('Searching liquor records for:', query);
      
      const allRecords = await storage.getLiquorRecords();
      const searchTerm = query.toLowerCase().trim();
      
      // Helper function to normalize UPC codes by removing leading zeros
      const normalizeUpc = (upc: string | null): string => {
        if (!upc) return '';
        return upc.replace(/^0+/, '') || '0';
      };
      
      const normalizedSearchTerm = normalizeUpc(searchTerm);
      
      const results = allRecords.filter(record => {
        // Search by liquor code
        if (record.liquorCode?.toLowerCase().includes(searchTerm)) return true;
        
        // Search by brand name
        if (record.brandName?.toLowerCase().includes(searchTerm)) return true;
        
        // Search by UPC codes (exact and normalized)
        const normalizedUpc1 = normalizeUpc(record.upcCode1);
        const normalizedUpc2 = normalizeUpc(record.upcCode2);
        
        if (record.upcCode1?.includes(searchTerm) || 
            record.upcCode2?.includes(searchTerm) ||
            normalizedUpc1.includes(normalizedSearchTerm) ||
            normalizedUpc2.includes(normalizedSearchTerm)) {
          return true;
        }
        
        // Search by vendor name
        if (record.vendorName?.toLowerCase().includes(searchTerm)) return true;
        
        return false;
      });

      // Limit results to first 10 for dropdown
      const limitedResults = results.slice(0, 10);
      
      console.log(`Found ${results.length} results, returning first ${limitedResults.length}`);
      
      res.json({
        success: true,
        results: limitedResults,
        totalFound: results.length
      });
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to search liquor records"
      });
    }
  });

  // Generate printable labels for Brother QL printer
  app.post("/api/generate-labels", async (req, res) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: "Session ID is required",
        });
      }

      // Get scanned items with product details
      const scannedItems = await storage.getScannedItems(sessionId);
      const liquorRecords = await storage.getLiquorRecords();
      
      const itemsWithDetails = scannedItems
        .map(item => {
          const product = liquorRecords.find(r => r.id === item.liquorRecordId);
          return product ? {
            ...item,
            product
          } : null;
        })
        .filter(item => item !== null);

      if (itemsWithDetails.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No items to print",
        });
      }

      // Generate HTML for Brother QL printer labels (2.4" x 1.2")
      const labelHtml = generateLabelHTML(itemsWithDetails);
      
      res.setHeader('Content-Type', 'text/html');
      res.send(labelHtml);
    } catch (error) {
      console.error("Generate labels error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to generate labels",
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
