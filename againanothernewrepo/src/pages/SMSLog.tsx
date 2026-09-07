// src/pages/manager/SMSLog.tsx
import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

interface SMSLog {
  id: string;
  phone: string;
  message: string;
  status: "sent" | "failed";
  error?: string;
  sentAt: any;
  orderId: string;
}

const SMSLog = () => {
  const [logs, setLogs] = useState<SMSLog[]>([]);

  useEffect(() => {
    const q = query(collection(db, "smsLog"), orderBy("sentAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SMSLog)));
    });
    return unsub;
  }, []);

  const resendSMS = async (log: SMSLog) => {
    // Call your sendSMS function again
    // We'll implement this in utils/sendSMS.ts
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">SMS Delivery Log</h1>

      <div className="bg-card border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phone</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{log.phone}</TableCell>
                <TableCell className="max-w-lg">
  <div className="break-words whitespace-normal leading-relaxed">
    {log.message}
  </div>
</TableCell>
                <TableCell>
                  <Badge variant={log.status === "sent" ? "default" : "destructive"}>
                    {log.status}
                  </Badge>
                </TableCell>
                <TableCell>{format(log.sentAt.toDate(), "PP p")}</TableCell>
                <TableCell>
                  {log.status === "failed" && (
                    <Button size="sm" variant="outline" onClick={() => resendSMS(log)}>
                      Resend
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SMSLog;