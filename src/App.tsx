import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminSidebar from "./AdminSidebar";
import DashboardMain from "./DashboardMain";
import Login from "./Login";
import Incoming from "./Incoming";
import ClientManagement from "./ClientManagement";
import CompanyDetails from "./CompanyDetails";
import EquipmentManagement from "./EquipmentManagement";
import EquipmentDetails from "./EquipmentDetails";
import PricingManagement from "./PricingManagement";
import ContentManagement from "./ContentManagement";
import ContentDetails from "./ContentDetails";
import QuoteManagement from "./QuoteManagement";
import HireManagement from "./HireManagement";
import Reporting from "./Reporting";
import ContractSetup from "./ContractSetup";
import Maintenance from "./Maintenance";
import Faults from "./Faults";
import Profile from "./Profile";
import Chat from "./components/Chat";
import PrivateRoute from "./components/PrivateRoute";
import ClientPrivateRoute from "./components/ClientPrivateRoute";
import { OnlineStatusProvider } from "./contexts/OnlineStatusContext";
import HomePage from "./HomePage";

// Client Portal Components
import ClientLogin from "./client/ClientLogin";
import ClientDashboard from "./client/ClientDashboard";
import ClientProfile from "./client/ClientProfile";
import ForgotPassword from "./client/ForgotPassword";
import VerifyOTP from "./client/VerifyOTP";
import ResetPassword from "./client/ResetPassword";
import PriceHistory from "./PriceHistory";
import Suppliers from "./Suppliers";
import JobPage from "./JobPage";

// Without this, a single error anywhere unmounts the whole app and every page
// goes blank with nothing on screen to explain it. Now the page that broke says
// so, and the rest of the app keeps working.
class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err };
  }
  componentDidCatch(err, info) {
    console.error("Page crashed:", err, info);
  }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="p-8">
        <div className="max-w-2xl bg-[#1F1F20] border border-[#7f1d1d] rounded-xl p-6">
          <h2 className="text-[#ef4444] font-[Inter] text-[18px] font-semibold mb-2">
            This page hit a problem
          </h2>
          <p className="text-[#9CA3AF] font-[Inter] text-[14px] mb-4">
            The rest of the app still works — use the menu to go elsewhere. If you
            can, send this message on:
          </p>
          <pre className="bg-[#292A2B] border border-[#333] rounded-lg p-3 text-[#E5E5E5] font-mono text-[12px] whitespace-pre-wrap break-words mb-4">
            {String(this.state.err && (this.state.err.stack || this.state.err.message || this.state.err))}
          </pre>
          <button
            onClick={() => this.setState({ err: null })}
            className="px-3 py-1.5 rounded bg-[#FDCE06] text-[#1F1F20] font-[Inter] font-bold text-[14px] hover:bg-[#E5B800] transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}

function DashboardLayout({ children }) {
  const location = useLocation();
  const isChatPath = location.pathname.startsWith("/chat");

  return (
    <OnlineStatusProvider>
      <div className="flex min-h-screen bg-[#292A2B]">
        <AdminSidebar />
        <main
          className={`flex-1 overflow-y-auto  lg:ml-[256px] lg:w-[calc(100vw - 256px)] ${isChatPath && "!mb-0"}`}
          style={{
            height: "100vh",
          }}
        >
          <PageErrorBoundary key={location.pathname}>{children}</PageErrorBoundary>
        </main>
      </div>
    </OnlineStatusProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute allowedRoles={["super_admin"]}>
              <DashboardLayout>
                <DashboardMain />
              </DashboardLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/client-management"
          element={
            <PrivateRoute allowedRoles={["super_admin"]}>
              <DashboardLayout>
                <ClientManagement />
              </DashboardLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/client-management/:id"
          element={
            <PrivateRoute allowedRoles={["super_admin"]}>
              <DashboardLayout>
                <CompanyDetails />
              </DashboardLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/equipment-management"
          element={
            <PrivateRoute allowedRoles={["super_admin"]}>
              <DashboardLayout>
                <EquipmentManagement />
              </DashboardLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/equipment-management/:id"
          element={
            <PrivateRoute allowedRoles={["super_admin"]}>
              <DashboardLayout>
                <EquipmentDetails />
              </DashboardLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/pricing-management"
          element={
            <PrivateRoute allowedRoles={["super_admin"]}>
              <DashboardLayout>
                <PricingManagement />
              </DashboardLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/content-management"
          element={
            <PrivateRoute allowedRoles={["super_admin"]}>
              <DashboardLayout>
                <ContentManagement />
              </DashboardLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/content-management/:id"
          element={
            <PrivateRoute allowedRoles={["super_admin"]}>
              <DashboardLayout>
                <ContentDetails />
              </DashboardLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/quote-management"
          element={
            <PrivateRoute allowedRoles={["super_admin"]}>
              <DashboardLayout>
                <QuoteManagement />
              </DashboardLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/hire-management"
          element={
            <PrivateRoute allowedRoles={["super_admin"]}>
              <DashboardLayout>
                <HireManagement />
              </DashboardLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/reporting"
          element={
            <PrivateRoute allowedRoles={["super_admin"]}>
              <DashboardLayout>
                <Reporting />
              </DashboardLayout>
            </PrivateRoute>
          }
        />
        <Route path="/contract-setup" element={<PrivateRoute allowedRoles={["super_admin"]}><DashboardLayout><ContractSetup /></DashboardLayout></PrivateRoute>} />
        <Route path="/maintenance" element={<PrivateRoute allowedRoles={["super_admin"]}><DashboardLayout><Maintenance /></DashboardLayout></PrivateRoute>} />
        <Route path="/price-history" element={<PrivateRoute allowedRoles={["super_admin"]}><DashboardLayout><PriceHistory /></DashboardLayout></PrivateRoute>} />
        <Route path="/suppliers" element={<PrivateRoute allowedRoles={["super_admin"]}><DashboardLayout><Suppliers /></DashboardLayout></PrivateRoute>} />
        <Route path="/faults" element={<PrivateRoute allowedRoles={["super_admin"]}><DashboardLayout><Faults /></DashboardLayout></PrivateRoute>} />
        <Route
          path="/chat"
          element={
            <PrivateRoute allowedRoles={["super_admin"]}>
              <DashboardLayout>
                <Chat />
              </DashboardLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute allowedRoles={["super_admin"]}>
              <DashboardLayout>
                <Profile />
              </DashboardLayout>
            </PrivateRoute>
          }
        />
        <Route path="/incoming" element={<Incoming />} />

        {/* Supplier job pages. Deliberately public — a tyre fitter will not
            create an account, so the token in the address is the credential. */}
        <Route path="/job/:token" element={
          <PageErrorBoundary><JobPage /></PageErrorBoundary>} />
        <Route path="/job/:token/:choice" element={
          <PageErrorBoundary><JobPage /></PageErrorBoundary>} />

        {/* Client Portal Routes. Each is wrapped so a crash shows the client
            what went wrong instead of a blank screen — the boundary in
            DashboardLayout only covers the admin side. */}
        <Route path="/client/login" element={
          <PageErrorBoundary><ClientLogin /></PageErrorBoundary>} />
        <Route
          path="/client/dashboard"
          element={
            <ClientPrivateRoute>
              <PageErrorBoundary><ClientDashboard /></PageErrorBoundary>
            </ClientPrivateRoute>
          }
        />
        <Route
          path="/client/profile"
          element={
            <ClientPrivateRoute>
              <PageErrorBoundary><ClientProfile /></PageErrorBoundary>
            </ClientPrivateRoute>
          }
        />
        <Route path="/client/forgot-password" element={
          <PageErrorBoundary><ForgotPassword /></PageErrorBoundary>} />
        <Route path="/client/verify-otp" element={
          <PageErrorBoundary><VerifyOTP /></PageErrorBoundary>} />
        <Route path="/client/reset-password" element={
          <PageErrorBoundary><ResetPassword /></PageErrorBoundary>} />
      </Routes>

      {/* Global Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3500}
        hideProgressBar
        newestOnTop
        closeOnClick
        pauseOnFocusLoss={false}
        pauseOnHover
        draggable
        theme="dark"
      />
    </BrowserRouter>
  );
}

export default App;
