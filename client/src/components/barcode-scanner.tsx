import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, RotateCcw } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  isActive: boolean;
  onToggle: () => void;
}

export function BarcodeScanner({ onScan, isActive, onToggle }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader>();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>("");
  const [lastScan, setLastScan] = useState<string>("");

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
    if (isActive && !isScanning) {
      startScanning();
    } else if (!isActive && isScanning) {
      stopScanning();
    }
  }, [isActive]);

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
      if (isActive) {
        startScanning();
      }
    }, 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Barcode Scanner</span>
          <div className="flex items-center space-x-2">
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
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
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
            style={{ display: isActive ? 'block' : 'none' }}
            data-testid="video-scanner"
          />
          
          {!isActive && (
            <div className="w-full h-64 bg-muted rounded-md flex items-center justify-center">
              <div className="text-center">
                <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Click "Start Scanner" to begin</p>
              </div>
            </div>
          )}
          
          {isActive && (
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
            {lastScan && (
              <p className="text-xs text-green-600 mt-1" data-testid="text-last-scan">
                Last scan: {lastScan}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}