import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, CameraOff, RotateCcw, Keyboard, Scan } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  isActive: boolean;
  onToggle: () => void;
}

export function BarcodeScanner({ onScan, isActive, onToggle }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader>();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>("");
  const [lastScan, setLastScan] = useState<string>("");
  const [scanMode, setScanMode] = useState<"camera" | "manual">("manual");
  const [manualInput, setManualInput] = useState("");

  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();
    
    return () => {
      if (codeReader.current) {
        // Use the correct cleanup method
        codeReader.current.stopContinuousDecode?.();
      }
    };
  }, []);

  useEffect(() => {
    if (isActive && scanMode === "camera" && !isScanning) {
      startScanning();
    } else if ((!isActive || scanMode === "manual") && isScanning) {
      stopScanning();
    }
  }, [isActive, scanMode]);

  useEffect(() => {
    // Focus the input when switching to manual mode
    if (scanMode === "manual" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [scanMode]);

  const startScanning = async () => {
    if (!videoRef.current || !codeReader.current) return;

    try {
      setIsScanning(true);
      setError("");
      
      console.log('Starting barcode scanner...');
      
      await codeReader.current.decodeFromVideoDevice(
        undefined, // Use default camera
        videoRef.current,
        (result, error) => {
          if (result) {
            const scannedText = result.getText();
            console.log('Barcode scanned:', scannedText);
            
            // Avoid duplicate scans
            if (scannedText !== lastScan) {
              setLastScan(scannedText);
              onScan(scannedText);
            }
          }
          
          if (error) {
            // Only log actual errors, not NotFoundErrors which are normal
            if (error.name !== 'NotFoundException') {
              console.error('Scanner error:', error);
            }
          }
        }
      );
    } catch (err) {
      console.error('Failed to start scanner:', err);
      setError(err instanceof Error ? err.message : 'Failed to start camera');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (codeReader.current) {
      console.log('Stopping barcode scanner...');
      codeReader.current.stopContinuousDecode?.();
      setIsScanning(false);
      setLastScan("");
    }
  };

  const resetScanner = () => {
    stopScanning();
    setTimeout(() => {
      if (isActive && scanMode === "camera") {
        startScanning();
      }
    }, 100);
  };

  const handleManualScan = () => {
    if (manualInput.trim()) {
      console.log('Manual barcode entered:', manualInput.trim());
      
      // Avoid duplicate scans
      if (manualInput.trim() !== lastScan) {
        setLastScan(manualInput.trim());
        onScan(manualInput.trim());
      }
      
      // Clear input for next scan
      setManualInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleManualScan();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Barcode Scanner</span>
          <div className="flex items-center space-x-2">
            {scanMode === "camera" && (
              <>
                <Button
                  onClick={resetScanner}
                  variant="outline"
                  size="sm"
                  disabled={!isActive}
                  data-testid="button-reset-scanner"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  onClick={onToggle}
                  variant={isActive ? "destructive" : "default"}
                  size="sm"
                  data-testid="button-toggle-scanner"
                >
                  {isActive ? <CameraOff className="h-4 w-4 mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
                  {isActive ? "Stop" : "Start"} Scanner
                </Button>
              </>
            )}
            {scanMode === "manual" && (
              <div className="text-sm text-muted-foreground">
                Ready for input
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={scanMode} onValueChange={(value) => setScanMode(value as "camera" | "manual")}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="manual" className="flex items-center space-x-2" data-testid="tab-manual">
              <Keyboard className="h-4 w-4" />
              <span>Manual Input</span>
            </TabsTrigger>
            <TabsTrigger value="camera" className="flex items-center space-x-2" data-testid="tab-camera">
              <Camera className="h-4 w-4" />
              <span>Camera Scan</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="barcode-input">Barcode Input</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Type or use your Bluetooth scanner to input barcodes
                </p>
              </div>
              <div className="flex space-x-2">
                <Input
                  id="barcode-input"
                  ref={inputRef}
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Scan or type barcode here..."
                  className="flex-1"
                  data-testid="input-barcode"
                />
                <Button
                  onClick={handleManualScan}
                  disabled={!manualInput.trim()}
                  data-testid="button-scan-manual"
                >
                  <Scan className="h-4 w-4 mr-2" />
                  Scan
                </Button>
              </div>
              <div className="text-center text-sm text-muted-foreground">
                <p>✓ Bluetooth barcode scanners supported</p>
                <p>✓ Press Enter or click Scan to process</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="camera" className="space-y-4">
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">Error: {error}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Make sure your browser has camera permissions and try again.
                </p>
              </div>
            )}
            
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-64 bg-black rounded-md object-cover"
                style={{ display: isActive && scanMode === "camera" ? 'block' : 'none' }}
                data-testid="video-scanner"
              />
              
              {(!isActive || scanMode !== "camera") && (
                <div className="w-full h-64 bg-muted rounded-md flex items-center justify-center">
                  <div className="text-center">
                    <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Click "Start Scanner" to begin</p>
                  </div>
                </div>
              )}
              
              {isActive && scanMode === "camera" && (
                <div className="absolute inset-0 border-2 border-primary rounded-md pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-32 border-4 border-primary rounded-lg opacity-50"></div>
                </div>
              )}
            </div>
            
            {isScanning && (
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Point your camera at a barcode to scan
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {lastScan && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <p className="text-sm text-green-700 dark:text-green-400" data-testid="text-last-scan">
              <strong>Last scan:</strong> {lastScan}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}