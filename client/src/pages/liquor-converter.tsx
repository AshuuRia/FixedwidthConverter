import { useState } from "react";
import { FileUpload } from "@/components/file-upload";
import { DataPreview } from "@/components/data-preview";
import { ProgressIndicator } from "@/components/progress-indicator";
import { SummaryStats } from "@/components/summary-stats";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, HelpCircle, Book } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  currentRow: number;
  totalRows: number;
}

interface ProcessedData {
  success: boolean;
  totalRecords: number;
  uniqueBrands: number;
  uniqueVendors: number;
  avgPrice: number;
  records: any[];
  allRecords?: any[];
  error?: string;
  details?: string;
}

export default function LiquorConverter() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    currentRow: 0,
    totalRows: 0,
  });
  const [hasError, setHasError] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setProcessedData(null);
    setHasError(false);
    setIsComplete(false);
  };

  const handleFileRemove = () => {
    setSelectedFile(null);
    setProcessedData(null);
    setHasError(false);
    setIsComplete(false);
  };

  const processFile = async () => {
    if (!selectedFile) return;

    setProcessingState({
      isProcessing: true,
      progress: 0,
      currentRow: 0,
      totalRows: 0,
    });
    setHasError(false);

    // Simulate progress for user feedback
    const progressInterval = setInterval(() => {
      setProcessingState(prev => ({
        ...prev,
        progress: Math.min(prev.progress + Math.random() * 15, 95),
      }));
    }, 200);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/process-file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      clearInterval(progressInterval);
      setProcessingState(prev => ({ ...prev, progress: 100, isProcessing: false }));

      if (result.success) {
        setProcessedData(result);
        setIsComplete(true);
        toast({
          title: "File processed successfully!",
          description: `${result.totalRecords} records parsed from ${selectedFile.name}`,
        });
      } else {
        setHasError(true);
        setProcessedData(result);
        toast({
          variant: "destructive",
          title: "Processing failed",
          description: result.error || "Unknown error occurred",
        });
      }
    } catch (error) {
      clearInterval(progressInterval);
      setProcessingState(prev => ({ ...prev, isProcessing: false }));
      setHasError(true);
      setProcessedData({
        success: false,
        error: "Failed to process file",
        details: error instanceof Error ? error.message : "Unknown error",
        totalRecords: 0,
        uniqueBrands: 0,
        uniqueVendors: 0,
        avgPrice: 0,
        records: [],
      });
      toast({
        variant: "destructive",
        title: "Processing failed",
        description: "Unable to process the file. Please check the format and try again.",
      });
    }
  };

  const downloadExcel = async () => {
    if (!processedData?.allRecords && !processedData?.records) return;

    try {
      const response = await fetch('/api/generate-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: processedData.allRecords || processedData.records,
          filename: selectedFile?.name || 'liquor_data.txt',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedFile?.name ? 
        selectedFile.name.replace(/\.[^/.]+$/, "_converted.xlsx") : 
        "liquor_data_converted.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Excel file downloaded!",
        description: "Your converted file has been saved to downloads.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Unable to generate Excel file. Please try again.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-primary-foreground p-2 rounded-lg">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Liquor Data Parser</h1>
                <p className="text-sm text-muted-foreground">Convert fixed-width format to Excel</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">
                {processedData?.totalRecords || 0} files processed today
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* File Upload Section */}
        <div className="mb-8">
          <FileUpload
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            onFileRemove={handleFileRemove}
            onProcess={processFile}
            isProcessing={processingState.isProcessing}
          />
        </div>

        {/* Progress Section */}
        {processingState.isProcessing && (
          <div className="mb-8 fade-in">
            <ProgressIndicator
              progress={processingState.progress}
              currentRow={processingState.currentRow}
              totalRows={processingState.totalRows}
            />
          </div>
        )}

        {/* Error Section */}
        {hasError && processedData && (
          <div className="mb-8 fade-in">
            <Card className="bg-destructive/10 border-destructive/20">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-destructive text-destructive-foreground p-2 rounded-full">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-destructive">Processing Error</h3>
                    <p className="text-destructive/80">{processedData.error || "Unable to parse the file. Please check the format and try again."}</p>
                  </div>
                </div>
                {processedData.details && (
                  <div className="mt-4">
                    <details className="text-sm">
                      <summary className="text-destructive cursor-pointer hover:text-destructive/80">Show technical details</summary>
                      <div className="mt-2 p-3 bg-destructive/5 rounded border text-destructive/70 font-mono text-xs">
                        {processedData.details}
                      </div>
                    </details>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Success Section */}
        {isComplete && !hasError && processedData && (
          <div className="mb-8 fade-in">
            <Card className="bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-emerald-500 text-white p-2 rounded-full">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">Conversion Complete!</h3>
                    <p className="text-emerald-700 dark:text-emerald-300">Your file has been successfully converted to Excel format.</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center space-x-4">
                  <span className="text-sm text-emerald-600 dark:text-emerald-400">
                    File: <span className="font-mono">
                      {selectedFile?.name?.replace(/\.[^/.]+$/, "_converted.xlsx") || "liquor_data_converted.xlsx"}
                    </span>
                  </span>
                  <button 
                    onClick={downloadExcel}
                    className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200 text-sm font-medium transition-colors"
                    data-testid="button-download-again"
                  >
                    <Download className="h-4 w-4 mr-1 inline" />
                    Download Again
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Data Preview and Summary */}
        {isComplete && !hasError && processedData && (
          <>
            <div className="mb-8 fade-in">
              <SummaryStats data={processedData} />
            </div>
            <div className="mb-8 fade-in">
              <DataPreview 
                data={processedData} 
                onDownload={downloadExcel}
              />
            </div>
          </>
        )}

        {/* Instructions Section */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">File Format Requirements</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-card-foreground mb-3">Expected Field Structure</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-border pb-1">
                    <span className="text-muted-foreground">Liquor Code</span>
                    <span className="font-mono text-card-foreground">0-5</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-1">
                    <span className="text-muted-foreground">Brand Name</span>
                    <span className="font-mono text-card-foreground">5-37</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-1">
                    <span className="text-muted-foreground">ADA Number</span>
                    <span className="font-mono text-card-foreground">37-40</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-1">
                    <span className="text-muted-foreground">ADA Name</span>
                    <span className="font-mono text-card-foreground">40-65</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-1">
                    <span className="text-muted-foreground">Vendor Name</span>
                    <span className="font-mono text-card-foreground">65-90</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-1">
                    <span className="text-muted-foreground">Proof</span>
                    <span className="font-mono text-card-foreground">110-115</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-1">
                    <span className="text-muted-foreground">Bottle Size</span>
                    <span className="font-mono text-card-foreground">115-122</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-card-foreground mb-3">Data Processing Notes</h4>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start space-x-2">
                    <FileText className="h-4 w-4 text-primary mt-0.5" />
                    <span>Price fields are automatically converted to numeric values</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <FileText className="h-4 w-4 text-primary mt-0.5" />
                    <span>Dates are reformatted from MMDDYYYY to YYYY-MM-DD</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <FileText className="h-4 w-4 text-primary mt-0.5" />
                    <span>Output file maintains original filename with "_converted.xlsx" suffix</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <FileText className="h-4 w-4 text-primary mt-0.5" />
                    <span>All data processing happens locally in your browser</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sample Data Format */}
            <div className="mt-6">
              <h4 className="font-medium text-card-foreground mb-3">Sample Input Format</h4>
              <div className="bg-muted p-4 rounded-md font-mono text-xs overflow-x-auto">
                <pre className="text-muted-foreground whitespace-pre">08234Jack Daniel's Old No. 7        001Premium Whiskey        Brown-Forman Corp                                           80    750ML  12 $28.99    $26.99    $24.99    01234567890129876543210987015012024</pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <span>Liquor Data Parser © 2024</span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                <HelpCircle className="h-4 w-4 mr-1 inline" />
                Help
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                <Download className="h-4 w-4 mr-1 inline" />
                Sample File
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                <Book className="h-4 w-4 mr-1 inline" />
                Documentation
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
