// src/components/invoice/InvoiceTemplate.tsx
import { format } from "date-fns";

const serviceDescriptions: Record<string, string> = {
  "Fiber-Pillows":
    "Gently steam-cleaned to preserve softness and shape while removing odors and allergens.",
  "Duvet":
    "Deep steam-cleaned to eliminate germs and odors, leaving your bedding fresh, hygienic, and comfortable.",
  "Eyelet-Curtains":
    "Specialized cleaning with steam to removes dust and odors while protecting fabric quality and color.",
  "Laundry-Services":
    "Professionally washed, dried, and neatly finished for everyday freshness and comfort.",
  "Suits & Formal Wear":
    "Expertly cleaned and pressed to maintain structure, fabric quality, and sharp appearance.",
  "Mats-&-Rugs":
    "Deep-cleaned to remove dirt and odors, restoring cleanliness and comfort to your space.",
  "Carpet":
    "Power-cleaned to lift embedded dirt and refresh fibers for a cleaner, healthier home.",
};

interface InvoiceTemplateProps {
  invoice: {
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
  };
  customerPhone?: string;
}

export const InvoiceTemplate = ({ invoice, customerPhone = "Not provided" }: InvoiceTemplateProps) => {
  const items = invoice.billedItems || [
    {
      mainServiceName: invoice.mainServiceName || "Service",
      packageName: invoice.packageName || "N/A",
      amount: invoice.totalBill || 0,
      kgsOrQty: invoice.totalKgs || invoice.totalQuantity || 1,
    },
  ];

  const subtotal = items.reduce((sum: number, item: any) => sum + item.amount, 0);
  const taxes = invoice.taxes || 0;
  const discount = invoice.discount || 0;
  const amountPaid = invoice.paidAmount || 0;
  const balance = invoice.balance || 0;

  const invoiceTotal = subtotal + taxes - discount;
  const balanceDue = balance > 0 ? balance : invoiceTotal - amountPaid;

  const issueDate = invoice.createdAt
    ? format(invoice.createdAt.toDate(), "MMM d, yyyy")
    : format(new Date(), "MMM d, yyyy");

  return (
    <div
      className="bg-white rounded-2xl shadow-lg mx-auto p-10"
      style={{ minWidth: "850px" }}
    >
      {/* Header */}
      <div className="py-8">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-10">
            <img src="/Logo.png" alt="Laundry Room" className="h-36" />
          </div>

          <div className="text-right space-y-3">
            <p className="text-3xl font-bold text-primary">
              Invoice #{invoice.invoiceNumber || invoice.id}
            </p>
            <p className="text-lg">Issue Date: {issueDate}</p>
          </div>
        </div>
      </div>

      {/* Company Info */}
      <div className="pb-8 border-b-2 border-gray-200">
        <div className="text-lg">
          <p className="font-bold text-2xl">Laundry Room Inc.</p>
          <p>Ndagani</p>
          <p>Chuka, 60400</p>
          <p>Kenya</p>
          <p>laundryroom254@gmail.com</p>
          <p>+254 798 161 431</p>
        </div>
      </div>

      {/* Customer Info */}
      <div className="py-8">
        <h3 className="font-bold text-xl mb-4">Customer Info:</h3>
        <div className="space-y-1 text-lg">
          <p className="font-semibold text-xl">Customer Name: {invoice.customerName}</p>
          <p>Customer Contact: {customerPhone}</p>
        </div>
      </div>

      {/* Services Table with Descriptions */}
      <div className="pb-8">
        <div className="bg-blue-50 rounded-t-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-lg font-semibold text-gray-800">
                <th className="p-5">Service</th>
                <th className="p-5 text-center">Package</th>
                <th className="p-5 text-center">Price</th>
                <th className="p-5 text-center">Quantity/Kgs</th>
                <th className="p-5 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, index: number) => {
                const description = serviceDescriptions[item.mainServiceName] || "";
                const pricePerUnit = item.amount / (item.kgsOrQty || 1);

                return (
                  <tr key={index} className="bg-white border-b">
                    <td className="p-5 font-medium align-top">
                      {item.mainServiceName}
                      {description && (
                        <p className="text-sm text-gray-600 mt-2 italic">
                          {description}
                        </p>
                      )}
                    </td>
                    <td className="p-5 text-center font-medium align-top">
                      {item.packageName}
                    </td>
                    <td className="p-5 text-center align-top">
                      KSh {pricePerUnit.toFixed(0)}
                    </td>
                    <td className="p-5 text-center align-top">{item.kgsOrQty}</td>
                    <td className="p-5 text-right font-bold text-xl text-primary align-top">
                      KSh {item.amount.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals & Balance */}
      <div className="pb-8">
        <div className="flex justify-end">
          <div className="w-full max-w-md space-y-4">
            <div className="flex justify-between text-lg">
              <span>Subtotal</span>
              <span>KSh {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span>Taxes</span>
              <span>KSh {taxes.toLocaleString()}</span>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between font-bold text-xl">
                <span>Invoice Total</span>
                <span>KSh {invoiceTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-between text-lg">
              <span>Amount Paid</span>
              <span>KSh {amountPaid.toLocaleString()}</span>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 mt-6">
              <div className="flex justify-between font-bold text-xl text-primary">
                <span>Balance Due</span>
                <span>KSh {balanceDue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Details & Thank You */}
      <div className="border-t pt-8">
        <div className="max-w-md space-y-3">
          <p className="font-bold text-xl mb-4">Payment Details</p>
          <p><strong>Paybill:</strong> 4096483</p>
          <p><strong>Account No.:</strong> 7056M</p>
          <p><strong>Account Name:</strong> Etica Capital Ltd.</p>
          <p className="mt-6 italic text-gray-600">
            N/B: Payment is due before delivery unless agreed otherwise.
          </p>
        </div>

        <div className="text-center mt-16">
          <p className="text-6xl text-gray-700 font-allura font-normal">
            thank you
          </p>
          <p className="text-lg text-gray-600 mt-4">
            We appreciate your trust in Laundry Room.
          </p>
        </div>
      </div>
    </div>
  );
};