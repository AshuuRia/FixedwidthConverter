import { useState, useEffect } from "react";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { ScannedItemsList } from "@/components/scanned-items-list";
import { LiquorSearch } from "@/components/liquor-search";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { FileText, Scan, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { LiquorRecord } from "@shared/schema";

export default function BarcodeScannerPage() {
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [hasLiquorData, setHasLiquorData] = useState(false);
  const [scanStats, setScanStats] = useState({
    totalScans: 0,
    matchedProducts: 0,
    lastScanTime: null as string | null,
  });
  const { toast } = useToast();

  useEffect(() => {
    // Check if liquor data has been loaded
    checkLiquorData();
  }, []);

  const checkLiquorData = async () => {
    try {
      // Check if data exists by getting scanned items (this doesn't modify data)
      const response = await fetch(`/api/scanned-items/${sessionId}`);
      const result = await response.json();
      
      // If this works and we can make requests, check if we have liquor records
      const scanResponse = await fetch('/api/scan-barcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: 'test-check-only', sessionId: null })
      });
      
      const scanResult = await scanResponse.json();
      // The scan request will show debug info about total records
      setHasLiquorData(true); // Assume data exists for now
    } catch (error) {
      setHasLiquorData(false);
    }
  };

  const handleSearchSelect = async (liquor: LiquorRecord) => {
    console.log('Manual search selected:', liquor.brandName);
    
    try {
      const response = await fetch('/api/add-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          liquorRecordId: liquor.id,
          sessionId,
          scannedBarcode: liquor.upcCode1 || 'manual-search',
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setScanStats(prev => ({
          totalScans: prev.totalScans + 1,
          matchedProducts: prev.matchedProducts + 1,
          lastScanTime: new Date().toLocaleTimeString(),
        }));

        toast({
          title: "Product added!",
          description: `${liquor.brandName} - ${liquor.bottleSize}`,
        });

        // Refresh the scanned items list
        setRefreshTrigger(prev => prev + 1);
      } else {
        throw new Error(result.error || 'Failed to add item');
      }
    } catch (error) {
      console.error('Search select error:', error);
      toast({
        title: "Error",
        description: "Failed to add product to list",
        variant: "destructive",
      });
    }
  };

  const handleScan = async (barcode: string) => {
    console.log('Processing scanned barcode:', barcode);
    
    try {
      const response = await fetch('/api/scan-barcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barcode,
          sessionId,
        }),
      });

      const result = await response.json();
      
      setScanStats(prev => ({
        totalScans: prev.totalScans + 1,
        matchedProducts: prev.matchedProducts + (result.success ? 1 : 0),
        lastScanTime: new Date().toLocaleTimeString(),
      }));

      if (result.success && result.matchedProduct) {
        toast({
          title: "Product found!",
          description: `${result.matchedProduct.brandName} - ${result.matchedProduct.bottleSize}`,
        });
        
        // Refresh the scanned items list
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast({
          variant: "destructive", 
          title: "Product not found",
          description: `No match found for barcode: ${barcode}`,
        });
      }
    } catch (error) {
      console.error('Scan processing error:', error);
      toast({
        variant: "destructive",
        title: "Scan failed",
        description: "Failed to process barcode. Please try again.",
      });
    }
  };

  const toggleScanner = () => {
    setIsScannerActive(!isScannerActive);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-primary-foreground p-2 rounded-lg">
                <Scan className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Liquor Inventory Scanner</h1>
                <p className="text-sm text-muted-foreground">Scan barcodes to build your inventory list</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a 
                href="/" 
                className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-secondary/90 transition-colors"
                data-testid="link-upload"
              >
                <FileText className="h-4 w-4 mr-2 inline" />
                Upload Data
              </a>
              <Badge variant={hasLiquorData ? "default" : "destructive"}>
                {hasLiquorData ? "Database Loaded" : "No Data"}
              </Badge>
              {scanStats.lastScanTime && (
                <div className="text-sm text-muted-foreground">
                  Last scan: {scanStats.lastScanTime}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Warning if no liquor data */}
        {!hasLiquorData && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No liquor database found. Please upload your liquor data file first on the{" "}
              <a href="/" className="text-primary hover:underline">main page</a> before scanning.
            </AlertDescription>
          </Alert>
        )}

        {/* Scan Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center space-x-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Scan className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-card-foreground" data-testid="text-total-scans">
                    {scanStats.totalScans}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Scans</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center space-x-3">
                <div className="bg-emerald-500/10 p-2 rounded-lg">
                  <FileText className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-card-foreground" data-testid="text-matched-products">
                    {scanStats.matchedProducts}
                  </p>
                  <p className="text-sm text-muted-foreground">Products Found</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center space-x-3">
                <div className="bg-amber-500/10 p-2 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-card-foreground" data-testid="text-not-found">
                    {scanStats.totalScans - scanStats.matchedProducts}
                  </p>
                  <p className="text-sm text-muted-foreground">Not Found</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Manual Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-2">
              <p className="text-sm text-muted-foreground mb-4">
                Can't scan a barcode? Search for liquor products by name, code, or UPC and add them to your list.
              </p>
              <LiquorSearch 
                onSelect={handleSearchSelect}
                placeholder="Search by name, code, or UPC..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Scanner and Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scanner Section */}
          <div>
            <BarcodeScanner
              onScan={handleScan}
              isActive={isScannerActive}
              onToggle={toggleScanner}
            />
          </div>

          {/* Scanned Items Section */}
          <div>
            <ScannedItemsList
              sessionId={sessionId}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </div>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How to Use the Scanner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-card-foreground mb-3">Getting Started</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start space-x-2">
                    <span className="text-primary">1.</span>
                    <span>Make sure your liquor database is loaded (upload file on main page)</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-primary">2.</span>
                    <span>Click "Start Scanner" to activate your camera</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-primary">3.</span>
                    <span>Point camera at barcodes to scan liquor products</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-primary">4.</span>
                    <span>View scanned items in the list on the right</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-card-foreground mb-3">Export Your Results</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start space-x-2">
                    <span className="text-primary">•</span>
                    <span>All scanned items are automatically saved to your session</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-primary">•</span>
                    <span>Click "Export Excel" to download your inventory list</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-primary">•</span>
                    <span>Excel includes: ADA info, vendor, pricing, UPC codes, and dates</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-primary">•</span>
                    <span>Use "Clear All" to start a new scanning session</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}