// src/lib/invoice/downloadInvoiceUtils.ts
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";

interface InvoiceData {
  id?: string;
  invoiceNumber?: string;
  customerName: string;
  customerId?: string;
  createdAt?: any;
  billedItems?: Array<{
    mainServiceName: string;
    packageName: string;
    amount: number;
    kgsOrQty: number;
  }>;
  mainServiceName?: string;
  packageName?: string;
  totalBill?: number;
  paidAmount?: number;
  balance?: number;
  taxes?: number;
  discount?: number;
  totalKgs?: number;
  totalQuantity?: number;
}

/**
 * Fetches invoice data and customer phone from Firestore
 */
export async function fetchInvoiceData(invoiceId: string): Promise<{
  invoice: InvoiceData;
  customerPhone: string;
}> {
  const invoiceSnap = await getDoc(doc(db, "invoices", invoiceId));
  
  if (!invoiceSnap.exists()) {
    throw new Error("Invoice not found");
  }

  const invoice: InvoiceData = { 
    id: invoiceSnap.id, 
    ...invoiceSnap.data() as any 
  };

  // Fetch customer phone
  let customerPhone = "Not provided";
  if (invoice.customerId) {
    const userSnap = await getDoc(doc(db, "users", invoice.customerId));
    if (userSnap.exists()) {
      const userData = userSnap.data();
      customerPhone = userData.phone || userData.phoneNumber || "Not provided";
    }
  }

  return { invoice, customerPhone };
}

/**
 * Downloads invoice as PDF from a rendered HTML element
 */
export async function downloadInvoiceFromElement(
  element: HTMLElement,
  invoiceNumber?: string,
  invoiceId?: string
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    width: element.scrollWidth,
    height: element.scrollHeight,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.8);
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth - 20;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 10;

  pdf.addImage(imgData, "JPEG", 10, position, imgWidth, imgHeight);
  heightLeft -= pageHeight - 20;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight + 10;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - 20;
  }

  pdf.save(`Invoice_${invoiceNumber || invoiceId}.pdf`);
}

/**
 * Main function to download invoice - creates hidden element, renders, downloads, and cleans up
 */
export async function downloadInvoiceById(
  invoiceId: string,
  InvoiceTemplateComponent: React.ComponentType<any>
): Promise<void> {
  try {
    // Fetch invoice data
    const { invoice, customerPhone } = await fetchInvoiceData(invoiceId);

    // Create hidden container
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "0";
    document.body.appendChild(container);

    // Dynamically import React and ReactDOM for rendering
    const React = await import("react");
    const ReactDOM = await import("react-dom/client");

    // Create root and render invoice
    const root = ReactDOM.createRoot(container);
    
    // Wait for render to complete
    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(InvoiceTemplateComponent, {
          invoice,
          customerPhone,
        })
      );
      
      // Give it time to render
      setTimeout(resolve, 500);
    });

    // Get the rendered element
    const invoiceElement = container.querySelector("div");
    if (!invoiceElement) {
      throw new Error("Failed to render invoice");
    }

    // Download the PDF
    await downloadInvoiceFromElement(
      invoiceElement as HTMLElement,
      invoice.invoiceNumber,
      invoice.id
    );

    // Cleanup
    root.unmount();
    document.body.removeChild(container);
  } catch (error) {
    console.error("Error downloading invoice:", error);
    throw error;
  }
}