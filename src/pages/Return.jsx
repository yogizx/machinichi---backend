import {
  AlertCircle,
  Camera,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Clock3,
  FileText,
  Eye,
  HelpCircle,
  Mail,
  PackageCheck,
  Phone,
  RotateCcw,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";

const recentOrders = [
  {
    id: "ORDER #MCH-92381",
    productId: "PRD-RICE-1042",
    productName: "Premium Brown Basmati Rice",
    orderDate: "October 12, 2024",
    deliveryDate: "October 15, 2024",
    rate: "Rs. 1,249",
    status: "Delivered",
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=420&q=90",
  },
  {
    id: "ORDER #MCH-91472",
    productId: "PRD-ATTA-2238",
    productName: "Stone Ground Wheat Atta",
    orderDate: "October 08, 2024",
    deliveryDate: "October 11, 2024",
    rate: "Rs. 459",
    status: "Delivered",
    image: "https://images.unsplash.com/photo-1602928321679-560bb453f190?auto=format&fit=crop&w=420&q=90",
  },
  {
    id: "ORDER #MCH-90615",
    productId: "PRD-AMLA-9011",
    productName: "Cold Pressed Amla Juice",
    orderDate: "September 26, 2024",
    deliveryDate: "September 29, 2024",
    rate: "Rs. 349",
    status: "Delivered",
    image: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&w=420&q=90",
  },
  {
    id: "ORDER #MCH-88940",
    productId: "PRD-ALMD-6612",
    productName: "Premium California Almonds",
    orderDate: "September 18, 2024",
    deliveryDate: "September 22, 2024",
    rate: "Rs. 899",
    status: "Delivered",
    image: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&w=420&q=90",
  },
];

const returnReasons = [
  "Product damaged",
  "Wrong item received",
  "Product quality issue",
  "Missing items",
  "Packaging issue",
  "Others",
];

const initialReturnRequests = [
  {
    id: "RET-MN-10482",
    productName: "Stone Ground Wheat Atta",
    productId: "PRD-ATTA-2238",
    rate: "Rs. 459",
    requestDate: "October 08, 2024",
    status: "Completed",
  },
  {
    id: "RET-MN-10397",
    productName: "Cold Pressed Amla Juice",
    productId: "PRD-AMLA-9011",
    rate: "Rs. 349",
    requestDate: "September 26, 2024",
    status: "Approved",
  },
];

const trackerSteps = ["Submitted", "Review", "Pickup", "Refund"];
const statusTones = {
  Approved: "bg-[#e5f2d8] text-[#4d8a35]",
  Completed: "bg-[#e5f2d8] text-[#4d8a35]",
  Pending: "bg-[#fff1d8] text-[#9b5b05]",
  Processing: "bg-[#e7edf8] text-[#315c9f]",
  Rejected: "bg-[#ffe4df] text-[#b62917]",
};

function Return() {
  const cameraInputRef = useRef(null);
  const [selectedOrderId, setSelectedOrderId] = useState(recentOrders[0].id);
  const [activeRequest, setActiveRequest] = useState(null);
  const [selectedReason, setSelectedReason] = useState(returnReasons[0]);
  const [otherReason, setOtherReason] = useState("");
  const [evidenceImages, setEvidenceImages] = useState([]);
  const [returnRequests, setReturnRequests] = useState(initialReturnRequests);
  const [message, setMessage] = useState("");
  const [trackingRequest, setTrackingRequest] = useState(null);
  const selectedOrder = recentOrders.find((order) => order.id === selectedOrderId) || recentOrders[0];
  const latestRequest = returnRequests[0];
  const canSubmit = selectedReason !== "Others" || otherReason.trim().length >= 8;
  const evidenceSlots = useMemo(() => Array.from({ length: Math.max(0, 5 - evidenceImages.length) }), [evidenceImages.length]);

  const addEvidenceImages = (files) => {
    const nextFiles = Array.from(files || []).slice(0, 5 - evidenceImages.length);

    if (!nextFiles.length) return;

    setEvidenceImages((current) => [
      ...current,
      ...nextFiles.map((file) => ({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID?.() || Date.now()}`,
        name: file.name,
        url: URL.createObjectURL(file),
      })),
    ]);
  };

  const removeEvidenceImage = (id) => {
    setEvidenceImages((current) => {
      const imageToRemove = current.find((image) => image.id === id);
      if (imageToRemove) URL.revokeObjectURL(imageToRemove.url);

      return current.filter((image) => image.id !== id);
    });
  };

  const startReturnRequest = () => {
    const request = {
      id: `RET-MN-${Date.now().toString().slice(-5)}`,
      productId: selectedOrder.productId,
      productName: selectedOrder.productName,
      rate: selectedOrder.rate,
      requestDate: new Date().toLocaleDateString("en-US", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      status: "Pending",
    };

    setActiveRequest(request);
    setReturnRequests((current) => [request, ...current]);
    setSelectedReason(returnReasons[0]);
    setOtherReason("");
    setEvidenceImages([]);
    setMessage(`Return request ${request.id} has been created. Add the reason and capture proof images below.`);
  };

  const submitReturnDetails = () => {
    if (!canSubmit) {
      setMessage("Please add at least 8 characters explaining the return reason.");
      return;
    }

    setMessage(`Return details for ${activeRequest.id} have been submitted successfully.`);
  };

  return (
    <main className="account-shell relative h-full overflow-hidden bg-[#fffaf5] text-[#191411] antialiased">
      <div className="account-sidebar-fixed border-t border-[#efe5dc]">
        <Sidebar />
      </div>

      <section className="h-full overflow-y-auto border-t border-[#efe5dc]">
        <div className="mx-auto max-w-[1390px] md:pl-[var(--account-sidebar-width)]">
          <div className="px-7 pb-12 pt-9 sm:px-10 sm:pb-16 lg:px-[88px] lg:pb-[48px] lg:pt-[38px]">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[12px] font-black uppercase tracking-[0.2em] text-[#b64008]">Account Support</p>
                <h1 className="mt-3 font-serif text-[39px] font-black leading-none tracking-[-0.045em] sm:text-[46px]">
                  Return Request
                </h1>
                <p className="mt-4 max-w-[680px] text-[15px] font-medium leading-7 text-[#5f5650]">
                  Submit return complaints, attach product proof, and follow every request from review to refund.
                </p>
              </div>
              <div className="rounded-full bg-[#efe7df] px-5 py-3 text-[12px] font-black text-[#6c5f58]">
                Return window: 7 days from delivery
              </div>
            </header>

            <div className="mt-8 grid gap-7 xl:grid-cols-[1fr_360px]">
              <section className="space-y-7">
                <Panel>
                  <SectionTitle icon={PackageCheck} title="Recent Orders" />
                  <p className="mt-4 text-[14px] font-medium leading-6 text-[#6c5f58]">
                    Choose the exact product you want to return. The complaint form appears after you start the request.
                  </p>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {recentOrders.map((order) => (
                      <RecentOrderCard
                        active={selectedOrderId === order.id}
                        key={order.id}
                        onSelect={() => {
                          setSelectedOrderId(order.id);
                          setActiveRequest(null);
                          setTrackingRequest(null);
                          setMessage("");
                        }}
                        order={order}
                      />
                    ))}
                  </div>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[13px] font-bold text-[#6c5f58]">
                      Selected product: <span className="text-[#342821]">{selectedOrder.productName}</span>
                    </p>
                    <button
                      className="h-[54px] rounded-full bg-gradient-to-r from-[#ff6507] to-[#ff8b54] px-8 text-[14px] font-black uppercase tracking-[0.08em] text-white shadow-[0_14px_24px_rgba(255,103,17,0.18)] transition hover:-translate-y-0.5"
                      onClick={startReturnRequest}
                      type="button"
                    >
                      Send Return Request
                    </button>
                  </div>
                </Panel>

                {activeRequest ? (
                  <>
                    <Panel>
                      <SectionTitle icon={FileText} title="Selected Product Details" />
                      <div className="mt-6 grid gap-5 rounded-[18px] border border-[#eadfd7] bg-[#fffaf6] p-4 sm:grid-cols-[180px_1fr] sm:p-5">
                        <div className="overflow-hidden rounded-[15px] bg-[#f3e6dc]">
                          <img
                            alt={selectedOrder.productName}
                            className="h-[190px] w-full object-cover transition duration-500 hover:scale-105 sm:h-full"
                            src={selectedOrder.image}
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <InfoPill label="Order ID" value={selectedOrder.id} />
                          <InfoPill label="Product ID" value={selectedOrder.productId} />
                          <InfoPill label="Order Date" value={selectedOrder.orderDate} />
                          <InfoPill label="Delivery Date" value={selectedOrder.deliveryDate} />
                        </div>
                      </div>
                    </Panel>

                    <Panel>
                      <SectionTitle icon={FileText} title="Return Reason" />
                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        {returnReasons.map((reason) => (
                          <button
                            aria-pressed={selectedReason === reason}
                            className={`min-h-[52px] rounded-[12px] border px-4 text-left text-[14px] font-black transition hover:-translate-y-0.5 ${
                              selectedReason === reason
                                ? "border-[#fd761a] bg-[#fff1e4] text-[#b64008] shadow-[0_10px_20px_rgba(191,76,12,0.12)]"
                                : "border-[#eadfd7] bg-white/80 text-[#342821] hover:border-[#f4b487]"
                            }`}
                            key={reason}
                            onClick={() => setSelectedReason(reason)}
                            type="button"
                          >
                            {reason}
                          </button>
                        ))}
                      </div>

                      {selectedReason === "Others" ? (
                        <label className="mt-5 block">
                          <span className="text-[13px] font-black uppercase tracking-[0.12em] text-[#77706a]">
                            Explain the reason
                          </span>
                          <textarea
                            className="mt-3 min-h-[112px] w-full resize-none rounded-[12px] border border-[#eadfd7] bg-white px-4 py-4 text-[14px] font-semibold text-[#342821] outline-none transition placeholder:text-[#9a8b82] focus:border-[#fd761a] focus:shadow-[0_0_0_4px_rgba(253,118,26,0.1)]"
                            onChange={(event) => setOtherReason(event.target.value)}
                            placeholder="Share what happened so our returns team can review it quickly."
                            value={otherReason}
                          />
                        </label>
                      ) : null}
                    </Panel>

                    <Panel>
                      <SectionTitle icon={Camera} title="Image Evidence" />
                      <p className="mt-4 text-[14px] font-medium leading-6 text-[#6c5f58]">
                        Capture up to 5 photos using your device camera. Add clear images of the item, invoice label, and packaging.
                      </p>

                      <button
                        className="mt-5 flex min-h-[56px] w-full items-center justify-center gap-3 rounded-[12px] bg-[#351405] px-5 text-[14px] font-black text-white transition hover:-translate-y-0.5 hover:bg-[#4b1d08] disabled:cursor-not-allowed disabled:opacity-55 sm:w-fit"
                        disabled={evidenceImages.length >= 5}
                        onClick={() => cameraInputRef.current?.click()}
                        type="button"
                      >
                        <Camera size={18} />
                        Capture Image
                      </button>

                      <input
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(event) => {
                          addEvidenceImages(event.target.files);
                          event.target.value = "";
                        }}
                        ref={cameraInputRef}
                        type="file"
                      />

                      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
                        {evidenceImages.map((image) => (
                          <div className="group relative aspect-square overflow-hidden rounded-[13px] border border-[#eadfd7] bg-white" key={image.id}>
                            <img alt={image.name} className="h-full w-full object-cover" src={image.url} />
                            <button
                              aria-label={`Remove ${image.name}`}
                              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-[#1d1009]/70 text-white opacity-100 transition hover:bg-[#b62917] sm:opacity-0 sm:group-hover:opacity-100"
                              onClick={() => removeEvidenceImage(image.id)}
                              type="button"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ))}
                        {evidenceSlots.map((_, index) => (
                          <div
                            className="grid aspect-square place-items-center rounded-[13px] border border-dashed border-[#dccdc2] bg-[#fffaf6] text-[#9a8b82]"
                            key={index}
                          >
                            <Camera size={20} />
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-[13px] font-bold text-[#6c5f58]">{evidenceImages.length}/5 images captured</p>
                        <button
                          className="h-[54px] rounded-full border border-[#eadfd7] bg-white px-8 text-[14px] font-black uppercase tracking-[0.08em] text-[#342821] transition hover:-translate-y-0.5 hover:border-[#fd761a] hover:text-[#b64008] disabled:cursor-not-allowed disabled:opacity-55"
                          disabled={!canSubmit}
                          onClick={submitReturnDetails}
                          type="button"
                        >
                          Submit Details
                        </button>
                      </div>

                      {message ? (
                        <p className="mt-5 rounded-[12px] border border-[#cfe4b5] bg-[#edf7e6] px-4 py-4 text-[13px] font-black text-[#4d8a35]">
                          {message}
                        </p>
                      ) : null}
                    </Panel>
                  </>
                ) : null}

                <Panel>
                  <SectionTitle icon={ClipboardList} title="Return Request History" />
                  <div className="mt-6 overflow-x-auto rounded-[16px] border border-[#eadfd7] bg-white">
                    <table className="min-w-[900px] w-full border-collapse text-left">
                      <thead className="bg-[#fff1e4] text-[11px] font-black uppercase tracking-[0.16em] text-[#8a4a17]">
                        <tr>
                          <th className="px-5 py-4">Return Request ID</th>
                          <th className="px-5 py-4">Product Name</th>
                          <th className="px-5 py-4">Rate</th>
                          <th className="px-5 py-4">Request Date</th>
                          <th className="px-5 py-4">Status</th>
                          <th className="px-5 py-4">Return Tracking</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#efe5dc] text-[14px]">
                        {returnRequests.map((request) => (
                          <tr className="bg-white transition hover:bg-[#fffaf6]" key={request.id}>
                            <td className="px-5 py-4 font-black text-[#342821]">{request.id}</td>
                            <td className="px-5 py-4 font-bold text-[#342821]">{request.productName}</td>
                            <td className="px-5 py-4 font-black text-[#5f5650]">{request.rate}</td>
                            <td className="px-5 py-4 font-semibold text-[#6c5f58]">{request.requestDate}</td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex rounded-full px-4 py-2 text-[12px] font-black ${statusTones[request.status] || statusTones.Pending}`}>
                                {request.status}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <button
                                aria-label={`View return tracking for ${request.id}`}
                                className={`grid h-10 w-10 place-items-center rounded-full border text-[#8a4a17] transition duration-300 hover:-translate-y-0.5 hover:border-[#fd761a] hover:bg-[#fff1e4] hover:text-[#b64008] hover:shadow-[0_10px_18px_rgba(191,76,12,0.14)] ${
                                  trackingRequest?.id === request.id
                                    ? "border-[#fd761a] bg-[#fff1e4] text-[#b64008] shadow-[0_10px_18px_rgba(191,76,12,0.14)]"
                                    : "border-[#eadfd7] bg-white"
                                }`}
                                onClick={() => setTrackingRequest(request)}
                                type="button"
                              >
                                <Eye size={18} strokeWidth={2.3} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>

                {trackingRequest ? (
                  <Panel>
                    <SectionTitle icon={RotateCcw} title="Return Tracking" />
                    <ReturnTrackingStepper request={trackingRequest} />
                  </Panel>
                ) : null}
              </section>

              <aside className="space-y-6">
                <StatusSummary status={latestRequest?.status || "Pending"} requestId={latestRequest?.id} />
                <PolicyCard />
                <SupportCard />
                <FaqCard />
              </aside>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Panel({ children }) {
  return (
    <section className="rounded-[21px] border border-[#e4d8cf] bg-white/74 px-6 py-6 shadow-[0_8px_24px_rgba(53,31,18,0.04)] sm:px-7">
      {children}
    </section>
  );
}

function RecentOrderCard({ active, onSelect, order }) {
  return (
    <button
      aria-pressed={active}
      className={`group relative overflow-hidden rounded-[18px] border p-4 text-left transition duration-300 hover:-translate-y-1 ${
        active
          ? "border-[#fd761a] bg-[#fff1e4] shadow-[0_16px_32px_rgba(191,76,12,0.16)]"
          : "border-[#eadfd7] bg-[#fffaf6] shadow-[0_8px_20px_rgba(53,31,18,0.035)] hover:border-[#f4b487] hover:bg-white"
      }`}
      onClick={onSelect}
      type="button"
    >
      <div className="flex gap-4">
        <div className="relative h-[108px] w-[108px] shrink-0 overflow-hidden rounded-[15px] bg-[#f3e6dc]">
          <img
            alt={order.productName}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            src={order.image}
          />
          <span className="absolute left-2 top-2 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-black text-[#4d8a35] shadow-sm">
            {order.status}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#9a8b82]">{order.productId}</p>
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition ${
                active ? "border-[#fd761a] bg-[#fd761a] text-white" : "border-[#d8c9be] bg-white text-transparent"
              }`}
            >
              <CheckCircle2 size={16} />
            </span>
          </div>
          <h2 className="mt-2 line-clamp-2 text-[19px] font-black leading-tight tracking-[-0.035em] text-[#342821]">
            {order.productName}
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px] font-black text-[#6c5f58]">
            <span className="rounded-full bg-white px-3 py-1.5">{order.rate}</span>
            <span className="rounded-full bg-white px-3 py-1.5">{order.orderDate}</span>
          </div>
          <p className="mt-3 truncate text-[12px] font-bold text-[#8b7d75]">{order.id}</p>
        </div>
      </div>
      <div
        className={`mt-4 h-1.5 rounded-full transition ${
          active ? "bg-[#fd761a]" : "bg-[#eadfd7] group-hover:bg-[#f4b487]"
        }`}
      />
    </button>
  );
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-4">
      <span className="grid h-12 w-12 place-items-center rounded-[12px] bg-[#ffd3c0] text-[#c7470a]">
        <Icon size={22} strokeWidth={2.2} />
      </span>
      <h2 className="text-[24px] font-black tracking-[-0.035em]">{title}</h2>
    </div>
  );
}

function InfoPill({ label, value }) {
  return (
    <div className="rounded-[11px] border border-[#eadfd7] bg-white px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#9a8b82]">{label}</p>
      <p className="mt-2 text-[13px] font-black text-[#342821]">{value}</p>
    </div>
  );
}

function getTrackerIndex(status) {
  if (status === "Completed") return 3;
  if (status === "Processing" || status === "Approved") return 1;
  return 0;
}

function StatusSummary({ requestId, status }) {
  const activeIndex = status === "Completed" ? 3 : status === "Processing" || status === "Approved" ? 1 : 0;

  return (
    <section className="rounded-[18px] border border-[#e4d8cf] bg-[#351405] px-6 py-6 text-white shadow-[0_14px_28px_rgba(53,20,5,0.18)]">
      <div className="flex items-center gap-3">
        <RotateCcw size={20} className="text-[#ff8b54]" />
        <h3 className="text-[18px] font-black">Latest Return</h3>
      </div>
      <p className="mt-3 text-[12px] font-bold text-white/68">{requestId || "No return request yet"}</p>
      <div className="mt-6 space-y-4">
        {trackerSteps.map((step, index) => (
          <div className="flex items-center gap-3" key={step}>
            <span className={`grid h-8 w-8 place-items-center rounded-full ${index <= activeIndex ? "bg-[#ff7624]" : "bg-white/14"}`}>
              {index <= activeIndex ? <CheckCircle2 size={16} /> : <Clock3 size={15} />}
            </span>
            <span className="text-[13px] font-black">{step}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReturnTrackingStepper({ request }) {
  const activeIndex = getTrackerIndex(request.status);

  return (
    <div className="mt-6 rounded-[18px] border border-[#eadfd7] bg-white px-5 py-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#9a8b82]">Tracking result</p>
          <h3 className="mt-2 text-[22px] font-black tracking-[-0.035em] text-[#342821]">{request.id}</h3>
        </div>
        <span className={`w-fit rounded-full px-4 py-2 text-[12px] font-black ${statusTones[request.status] || statusTones.Pending}`}>
          Current: {request.status}
        </span>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-4">
        {trackerSteps.map((step, index) => {
          const isComplete = index < activeIndex;
          const isCurrent = index === activeIndex;
          const isActive = index <= activeIndex;

          return (
            <div className="relative" key={step}>
              {index < trackerSteps.length - 1 ? (
                <span
                  className={`absolute left-[28px] top-7 hidden h-1 w-[calc(100%+20px)] rounded-full md:block ${
                    index < activeIndex ? "bg-[#fd761a]" : "bg-[#eadfd7]"
                  }`}
                />
              ) : null}
              <div className="relative flex items-center gap-4 md:flex-col md:items-start">
                <span
                  className={`relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-full border-4 transition-all duration-500 ${
                    isCurrent
                      ? "animate-pulse border-[#ffd3c0] bg-[#fd761a] text-white shadow-[0_0_0_8px_rgba(253,118,26,0.12)]"
                      : isComplete
                        ? "border-[#d8edc8] bg-[#4d8a35] text-white"
                        : "border-[#eadfd7] bg-[#fffaf6] text-[#9a8b82]"
                  }`}
                >
                  {isComplete ? <CheckCircle2 size={22} /> : isCurrent ? <CircleDot size={22} /> : <Clock3 size={20} />}
                </span>
                <div className="min-w-0">
                  <p className={`text-[15px] font-black ${isActive ? "text-[#342821]" : "text-[#9a8b82]"}`}>{step}</p>
                  <p className="mt-1 text-[12px] font-bold leading-5 text-[#6c5f58]">
                    {isCurrent ? "Current status" : isComplete ? "Completed" : "Pending update"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PolicyCard() {
  return (
    <section className="rounded-[18px] border border-[#e4d8cf] bg-white/74 px-6 py-6 shadow-[0_8px_24px_rgba(53,31,18,0.04)]">
      <div className="flex items-center gap-3">
        <ShieldCheck size={20} className="text-[#4d8a35]" />
        <h3 className="text-[18px] font-black">Return Policy Summary</h3>
      </div>
      <ul className="mt-4 space-y-3 text-[13px] font-semibold leading-6 text-[#5f5650]">
        <li>Returns are accepted within 7 days of delivery.</li>
        <li>Keep invoices, packaging, and product labels available.</li>
        <li>Food safety review may be required for opened packs.</li>
      </ul>
      <div className="mt-5 rounded-[12px] bg-[#fff1e4] px-4 py-4 text-[13px] font-black text-[#b64008]">
        Estimated refund timeline: 3-5 business days after approval.
      </div>
    </section>
  );
}

function SupportCard() {
  return (
    <section className="rounded-[18px] border border-[#e4d8cf] bg-white/74 px-6 py-6 shadow-[0_8px_24px_rgba(53,31,18,0.04)]">
      <div className="flex items-center gap-3">
        <Truck size={20} className="text-[#c7470a]" />
        <h3 className="text-[18px] font-black">Customer Support</h3>
      </div>
      <div className="mt-4 space-y-3 text-[13px] font-bold text-[#5f5650]">
        <p className="flex items-center gap-3"><Phone size={15} /> +91 98765 43210</p>
        <p className="flex items-center gap-3"><Mail size={15} /> returns@machinichi.com</p>
      </div>
    </section>
  );
}

function FaqCard() {
  return (
    <section className="rounded-[18px] border border-[#e4d8cf] bg-white/74 px-6 py-6 shadow-[0_8px_24px_rgba(53,31,18,0.04)]">
      <div className="flex items-center gap-3">
        <HelpCircle size={20} className="text-[#c7470a]" />
        <h3 className="text-[18px] font-black">Return FAQs</h3>
      </div>
      <div className="mt-4 space-y-4 text-[13px] font-semibold leading-6 text-[#5f5650]">
        <p><strong>Can I return partial items?</strong><br />Yes, select the product and mention missing or affected items.</p>
        <p><strong>Do I need proof?</strong><br />Images help the team approve returns faster.</p>
        <p className="flex gap-2 rounded-[12px] bg-[#fff8f1] px-4 py-3 text-[#8a4a17]">
          <AlertCircle size={16} className="mt-1 shrink-0" />
          Refunds are issued to the original payment method.
        </p>
      </div>
    </section>
  );
}

export default Return;
