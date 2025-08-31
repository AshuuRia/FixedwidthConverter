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

  // Generate Excel file
  app.post("/api/generate-excel", async (req, res) => {
    try {
      const { records, filename } = req.body;
      
      if (!records || !Array.isArray(records)) {
        return res.status(400).json({ error: "Invalid records data" });
      }

      // Create worksheet data with headers
      const worksheetData = [
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

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Liquor Data");
      
      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      // Set headers for file download
      const outputFilename = filename ? 
        filename.replace(/\.[^/.]+$/, "_converted.xlsx") : 
        "liquor_data_converted.xlsx";
      
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

  const httpServer = createServer(app);
  return httpServer;
}
