import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScannedItem {
  id: string;
  sessionId: string;
  scannedBarcode: string;
  scannedAt: string;
  quantity: number;
  product?: {
    liquorCode: string;
    brandName: string;
    adaNumber: string;
    adaName: string;
    vendorName: string;
    proof: string;
    bottleSize: string;
    packSize: string;
    onPremisePrice: number | string;
    offPremisePrice: number | string;
    shelfPrice: number | string;
    upcCode1: string;
    upcCode2: string;
    effectiveDate: string;
  } | null;
}

interface ScannedItemsListProps {
  sessionId: string;
  refreshTrigger: number;
}

export function ScannedItemsList({ sessionId, refreshTrigger }: ScannedItemsListProps) {
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (sessionId) {
      fetchScannedItems();
    }
  }, [sessionId, refreshTrigger]);

  const fetchScannedItems = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/scanned-items/${sessionId}`);
      
      if (response.ok) {
        const result = await response.json();
        setScannedItems(result.items || []);
      } else {
        console.error('Failed to fetch scanned items');
      }
    } catch (error) {
      console.error('Error fetching scanned items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteScannedItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/scanned-items/${sessionId}/${itemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove the item from local state
        setScannedItems(prevItems => prevItems.filter(item => item.id !== itemId));
        toast({
          title: "Item deleted",
          description: "Product removed from your list",
        });
      } else {
        throw new Error('Failed to delete item');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Failed to delete item. Please try again.",
      });
    }
  };

  const clearScannedItems = async () => {
    try {
      const response = await fetch(`/api/scanned-items/${sessionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setScannedItems([]);
        toast({
          title: "Items cleared",
          description: "All scanned items have been removed.",
        });
      } else {
        throw new Error('Failed to clear items');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Clear failed",
        description: "Failed to clear scanned items. Please try again.",
      });
    }
  };

  const downloadExcel = async () => {
    if (scannedItems.length === 0) {
      toast({
        variant: "destructive",
        title: "No items to export",
        description: "Please scan some items first.",
      });
      return;
    }

    try {
      console.log('Exporting scanned items:', scannedItems.length);
      console.log('Items with products:', scannedItems.filter(item => item.product).length);
      
      // Format data for Excel export with only the columns you specified
      const excelData = scannedItems
        .filter(item => item.product)
        .map(item => {
          console.log('Processing item for export:', item.product?.brandName);
          return {
            "Liquor Code": item.product!.liquorCode,
            "ADA Number": item.product!.adaNumber,
            "ADA Name": item.product!.adaName,
            "Vendor Name": item.product!.vendorName,
            "Proof": item.product!.proof,
            "Bottle Size": item.product!.bottleSize,
            "Pack Size": item.product!.packSize,
            "On Premise": item.product!.onPremisePrice,
            "Off Premise": item.product!.offPremisePrice,
            "Shelf Price": item.product!.shelfPrice,
            "UPC Code 1": item.scannedBarcode, // Use the actual scanned barcode
            "UPC Code 2": item.product!.upcCode2,
            "Effective Date": item.product!.effectiveDate,
          };
        });

      console.log('Excel data prepared:', excelData.length, 'rows');

      const response = await fetch('/api/generate-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: excelData,
          filename: `scanned_liquor_${new Date().toISOString().split('T')[0]}.xlsx`,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scanned_liquor_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Excel exported!",
        description: `${scannedItems.length} scanned items exported successfully.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: "Failed to generate Excel file. Please try again.",
      });
    }
  };

  const formatPrice = (price: number | string) => {
    if (typeof price === 'number') {
      return `$${price.toFixed(2)}`;
    }
    return price || "";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Scanned Items ({scannedItems.length})</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={downloadExcel}
              disabled={scannedItems.length === 0}
              size="sm"
              data-testid="button-export-scanned"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button
              onClick={clearScannedItems}
              variant="outline"
              size="sm"
              disabled={scannedItems.length === 0}
              data-testid="button-clear-scanned"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading scanned items...</p>
          </div>
        ) : scannedItems.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No items scanned yet</p>
            <p className="text-sm text-muted-foreground">Start scanning barcodes to build your list</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {scannedItems.map((item, index) => (
              <div
                key={item.id}
                className="border border-border rounded-lg p-4 bg-card"
                data-testid={`scanned-item-${index}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {item.product ? (
                      <>
                        <h4 className="font-semibold text-card-foreground">
                          {item.product.brandName}
                        </h4>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Liquor Code:</span> {item.product.liquorCode}
                          </div>
                          <div>
                            <span className="text-muted-foreground">ADA:</span> {item.product.adaNumber}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Size:</span> {item.product.bottleSize}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Vendor:</span> {item.product.vendorName}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Price:</span> {formatPrice(item.product.shelfPrice)}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Proof:</span> {item.product.proof}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <h4 className="font-semibold text-destructive">
                          Product Not Found
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Barcode: {item.scannedBarcode}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col items-end space-y-2 ml-4">
                    <Button
                      onClick={() => deleteScannedItem(item.id)}
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      data-testid={`button-delete-item-${index}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <Badge variant="secondary">
                      {new Date(item.scannedAt).toLocaleTimeString()}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.scannedBarcode}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}