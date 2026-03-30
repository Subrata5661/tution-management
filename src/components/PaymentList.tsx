import React, { useEffect, useState } from 'react';
import { collection, db, getDocs, addDoc, query, where, Timestamp, onSnapshot, doc, getDoc, deleteDoc } from '../firebase';
import { Student, Payment, Settings } from '../types';
import { Search, CheckCircle, Receipt, Share2, Download, Filter, Calendar, X, ArrowLeft, Trash2, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { cn } from '../lib/utils';

export default function PaymentList() {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [loading, setLoading] = useState(true);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<{ student: Student, payment: Payment } | null>(null);
  const [pendingPayment, setPendingPayment] = useState<{ student: Student, month: string } | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const studentsSnapshot = await getDocs(collection(db, 'students'));
        const studentsData = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
        setStudents(studentsData);

        const settingsDoc = await getDoc(doc(db, 'settings', 'config'));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as Settings);
        } else {
          setSettings({ instituteName: 'Tuition Center' });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();

    const q = query(collection(db, 'payments'), where('month', '==', selectedMonth));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const paymentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
      setPayments(paymentsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedMonth]);

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search) ||
      s.class.toLowerCase().includes(search.toLowerCase()) ||
      (s.batchName && s.batchName.toLowerCase().includes(search.toLowerCase()));
    
    const matchesBatch = batchFilter === 'All' || s.batchName === batchFilter;
    
    const payment = payments.find(p => p.studentId === s.id);
    const matchesStatus = statusFilter === 'All' || 
      (statusFilter === 'Paid' && !!payment) || 
      (statusFilter === 'Unpaid' && !payment);

    return matchesSearch && matchesBatch && matchesStatus;
  });

  const batches = ['All', ...Array.from(new Set(students.map(s => s.batchName).filter(Boolean)))];

  const handleMarkAsPaid = async () => {
    if (!pendingPayment) return;
    
    setProcessing(true);
    const { student, month } = pendingPayment;
    const receiptNumber = `REC-${Date.now().toString().slice(-6)}`;
    const paymentData: Omit<Payment, 'id'> = {
      studentId: student.id,
      month: month,
      amount: student.monthlyFee,
      date: Timestamp.now(),
      receiptNumber,
      status: 'Paid',
    };

    try {
      const docRef = await addDoc(collection(db, 'payments'), paymentData);
      const newPayment = { id: docRef.id, ...paymentData } as Payment;
      setCurrentReceipt({ student, payment: newPayment });
      setIsConfirmModalOpen(false);
      setIsReceiptModalOpen(true);
      setPendingPayment(null);
    } catch (error) {
      console.error("Error saving payment:", error);
      alert("Error saving payment. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkAsUnpaid = async (paymentId: string) => {
    if (!window.confirm("Are you sure you want to mark this as unpaid? This will delete the payment record.")) return;
    
    try {
      await deleteDoc(doc(db, 'payments', paymentId));
    } catch (error) {
      console.error("Error deleting payment:", error);
      alert("Error deleting payment. Please try again.");
    }
  };

  const generatePDF = async (student: Student, payment: Payment) => {
    const doc = new jsPDF();
    const instName = settings?.instituteName || 'Tuition Center';
    const logoBase64 = settings?.logoBase64;
    const signatureBase64 = settings?.signatureBase64;

    // Helper for colors (Professional Palette: Indigo & Slate)
    const primaryColor = [79, 70, 229]; // Indigo-600
    const accentColor = [236, 72, 153]; // Pink-500 (for some color)
    const textColor = [31, 41, 55]; // Gray-800
    const lightTextColor = [107, 114, 128]; // Gray-500

    // 1. Simple but Colorful Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, 'F');
    
    // Decorative accent line
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(0, 38, 210, 2, 'F');

    // 2. Logo (Base64)
    if (logoBase64) {
      try {
        // Detect format from base64 string
        const format = logoBase64.split(';')[0].split('/')[1].toUpperCase();
        const finalFormat = ['PNG', 'JPEG', 'JPG', 'WEBP'].includes(format) ? format : 'PNG';
        doc.addImage(logoBase64, finalFormat, 15, 5, 30, 30);
      } catch (e) {
        console.error("Logo failed to load", e);
        // Fallback to text if logo fails
        doc.setFontSize(20);
        doc.setTextColor(255, 255, 255);
        doc.text(instName.charAt(0), 25, 25);
      }
    }

    // 3. Institute Name
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    const nameX = logoBase64 ? 50 : 20;
    doc.text(instName.toUpperCase(), nameX, 25);

    // 4. Receipt Title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('OFFICIAL FEE RECEIPT', nameX, 33);

    // 5. Receipt Info (Top Right)
    doc.setFontSize(10);
    doc.text(`No: ${payment.receiptNumber}`, 190, 15, { align: 'right' });
    doc.text(`Date: ${format(payment.date.toDate(), 'dd MMM yyyy')}`, 190, 22, { align: 'right' });

    // 6. Main Content Area
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('STUDENT INFORMATION', 20, 60);
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.line(20, 62, 70, 62);

    doc.setFont('helvetica', 'normal');
    const startY = 75;
    const lineSpacing = 10;
    
    doc.text('Name:', 20, startY);
    doc.setFont('helvetica', 'bold');
    doc.text(student.name, 50, startY);
    
    doc.setFont('helvetica', 'normal');
    doc.text('Class:', 20, startY + lineSpacing);
    doc.setFont('helvetica', 'bold');
    doc.text(student.class, 50, startY + lineSpacing);
    
    doc.setFont('helvetica', 'normal');
    doc.text('Batch:', 110, startY + lineSpacing);
    doc.setFont('helvetica', 'bold');
    doc.text(student.batchName || 'N/A', 130, startY + lineSpacing);
    
    doc.setFont('helvetica', 'normal');
    doc.text('Phone:', 110, startY);
    doc.setFont('helvetica', 'bold');
    doc.text(student.phone, 130, startY);

    // 7. Payment Details Table
    doc.setFillColor(249, 250, 251);
    doc.rect(20, 105, 170, 40, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.rect(20, 105, 170, 40, 'D');

    doc.setFont('helvetica', 'bold');
    doc.text('Description', 30, 115);
    doc.text('Amount', 160, 115);
    doc.line(20, 120, 190, 120);

    doc.setFont('helvetica', 'normal');
    doc.text(`Tuition Fee for ${format(new Date(payment.month + '-01'), 'MMMM yyyy')}`, 30, 132);
    doc.setFont('helvetica', 'bold');
    doc.text(`INR ${payment.amount}.00`, 160, 132);

    // 8. Total Amount
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(110, 155, 80, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL PAID:', 115, 165);
    doc.setFontSize(14);
    doc.text(`INR ${payment.amount}.00`, 185, 165, { align: 'right' });

    // 9. Signature (Base64)
    if (signatureBase64) {
      try {
        const sigFormat = signatureBase64.split(';')[0].split('/')[1].toUpperCase();
        const finalSigFormat = ['PNG', 'JPEG', 'JPG', 'WEBP'].includes(sigFormat) ? sigFormat : 'PNG';
        doc.addImage(signatureBase64, finalSigFormat, 140, 185, 40, 20);
      } catch (e) {
        console.error("Signature failed to load", e);
      }
    }
    
    doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.line(140, 205, 185, 205);
    doc.text('Authorized Signature', 162.5, 212, { align: 'center' });

    // 10. Footer
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Thank you for your payment!', 105, 240, { align: 'center' });
    doc.text('This is a computer-generated receipt.', 105, 245, { align: 'center' });

    return doc;
  };

  const handleDownloadPDF = async (student: Student, payment: Payment) => {
    const doc = await generatePDF(student, payment);
    doc.save(`Receipt_${student.name}_${payment.month}.pdf`);
  };

  const handleShareWhatsApp = (student: Student, payment: Payment) => {
    const message = `Dear ${student.name}, your fee of ₹${payment.amount} for ${format(new Date(payment.month + '-01'), 'MMMM yyyy')} has been received. Receipt No: ${payment.receiptNumber}. Thank you!`;
    const whatsappUrl = `https://wa.me/${student.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft size={24} />
          </Link>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Fee Management</h2>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-lg px-3 py-2">
          <Calendar size={18} className="text-gray-400" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="outline-none text-sm font-medium text-gray-700 dark:text-gray-300 bg-transparent"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, phone or class..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Batch</label>
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-lg text-sm outline-none text-gray-700 dark:text-gray-300"
          >
            {batches.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-lg text-sm outline-none text-gray-700 dark:text-gray-300"
          >
            <option value="All">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      {/* Payment List */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800/50 border-b dark:border-slate-800">
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Student</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Class/Batch</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Fee</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Status</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map(student => {
                  const payment = payments.find(p => p.studentId === student.id);
                  return (
                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 dark:text-white">{student.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{student.phone}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">{student.class}</p>
                        {student.batchName && <p className="text-[10px] text-indigo-500 font-bold uppercase">{student.batchName}</p>}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">₹{student.monthlyFee}</td>
                      <td className="px-6 py-4">
                        {payment ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                            <CheckCircle size={12} />
                            Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400">
                            Unpaid
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {payment ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setCurrentReceipt({ student, payment });
                                setIsReceiptModalOpen(true);
                              }}
                              className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                              title="View Receipt"
                            >
                              <Receipt size={18} />
                            </button>
                            <button
                              onClick={() => handleShareWhatsApp(student, payment)}
                              className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                              title="Share on WhatsApp"
                            >
                              <Share2 size={18} />
                            </button>
                            <button
                              onClick={() => handleMarkAsUnpaid(payment.id)}
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Mark as Unpaid"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => {
                                setPendingPayment({ student, month: selectedMonth });
                                setIsConfirmModalOpen(true);
                              }}
                              className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap"
                            >
                              Mark Paid
                            </button>
                            <p className="text-[10px] text-gray-400 text-center">
                              For {format(new Date(selectedMonth + '-01'), 'MMM yy')}
                            </p>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No students found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Payment Modal */}
      {isConfirmModalOpen && pendingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md overflow-hidden shadow-2xl border dark:border-slate-800">
            <div className="px-6 py-4 border-b dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Payment</h3>
              <button onClick={() => setIsConfirmModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <AlertCircle className="text-indigo-600 dark:text-indigo-400" size={20} />
                <p className="text-sm text-indigo-900 dark:text-indigo-300">
                  You are marking <strong>{pendingPayment.student.name}</strong> as paid.
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Month</label>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 border dark:border-slate-700 rounded-lg px-3 py-2">
                  <Calendar size={18} className="text-gray-400" />
                  <input
                    type="month"
                    value={pendingPayment.month}
                    onChange={(e) => setPendingPayment({ ...pendingPayment, month: e.target.value })}
                    className="w-full outline-none text-sm font-medium text-gray-700 dark:text-gray-300 bg-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center p-3 border dark:border-slate-800 rounded-lg">
                <span className="text-sm text-gray-500 dark:text-gray-400">Monthly Fee</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">₹{pendingPayment.student.monthlyFee}</span>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t dark:border-slate-800 flex gap-3">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkAsPaid}
                disabled={processing}
                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {isReceiptModalOpen && currentReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl border dark:border-slate-800">
            <div className="px-6 py-4 border-b dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Payment Receipt</h3>
              <button onClick={() => setIsReceiptModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6" id="receipt-content">
              <div className="text-center space-y-2">
                {settings?.logoBase64 && (
                  <img src={settings.logoBase64} alt="Logo" className="h-16 mx-auto mb-4 object-contain" />
                )}
                <h4 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{settings?.instituteName || 'Tuition Center'}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-widest">Fee Receipt</p>
              </div>

              <div className="grid grid-cols-2 gap-y-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Receipt No</p>
                  <p className="font-semibold dark:text-white">{currentReceipt.payment.receiptNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 dark:text-gray-400">Date</p>
                  <p className="font-semibold dark:text-white">{format(currentReceipt.payment.date.toDate(), 'dd MMM yyyy')}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Student Name</p>
                  <p className="font-semibold dark:text-white">{currentReceipt.student.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 dark:text-gray-400">Class</p>
                  <p className="font-semibold dark:text-white">{currentReceipt.student.class}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">For Month</p>
                  <p className="font-semibold dark:text-white">{format(new Date(currentReceipt.payment.month + '-01'), 'MMMM yyyy')}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 dark:text-gray-400">Amount Paid</p>
                  <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">₹{currentReceipt.payment.amount}</p>
                </div>
              </div>

              <div className="pt-6 border-t dark:border-slate-800 text-center text-xs text-gray-400">
                <p>This is a computer-generated receipt.</p>
                <p>Thank you for your payment!</p>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t dark:border-slate-800 flex gap-3">
              <button
                onClick={() => handleDownloadPDF(currentReceipt.student, currentReceipt.payment)}
                className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border dark:border-slate-700 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Download size={18} />
                Download PDF
              </button>
              <button
                onClick={() => handleShareWhatsApp(currentReceipt.student, currentReceipt.payment)}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                <Share2 size={18} />
                WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
