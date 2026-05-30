/**
 * App.tsx — Phase 3
 *
 * WebSocketProvider wraps all authenticated consumers.
 * Single WS connection is established here; all children subscribe from context.
 */
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Suspense, lazy } from "react";
import { queryClient } from "./lib/queryClient";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import { ExecutionHistoryProvider } from "./contexts/ExecutionHistoryContext";
import { OrgProvider } from "./contexts/OrgContext";
import { useBackendHydration } from "./hooks/useBackendHydration";
import AppShell from "./components/AppShell";
import { CriticalAlertToaster } from "./components/CriticalAlertToaster";
import { CommandPalette } from "./components/CommandPalette";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { ErrorBoundary } from "./components/ErrorBoundary";

const Landing         = lazy(() => import("./pages/Landing"));
const Login           = lazy(() => import("./pages/Login"));
const Register        = lazy(() => import("./pages/Register"));
const Dashboard       = lazy(() => import("./pages/Dashboard"));
const Workflows       = lazy(() => import("./pages/Workflows"));
const WorkflowBuilder = lazy(() => import("./pages/WorkflowBuilder"));
const Automations     = lazy(() => import("./pages/Automations"));
const AIChat          = lazy(() => import("./pages/AIChat"));
const Connections     = lazy(() => import("./pages/Connections"));
const Plans           = lazy(() => import("./pages/Plans"));
const Referrals       = lazy(() => import("./pages/Referrals"));
const Settings        = lazy(() => import("./pages/Settings"));
const Admin           = lazy(() => import("./pages/Admin"));
const NotFound        = lazy(() => import("./pages/NotFound"));
const ExecutionPage        = lazy(() => import("./pages/ExecutionPage"));
const SharedExecutionPage  = lazy(() => import("./pages/SharedExecutionPage"));

function LoadingFallback() {
  return (
    <div style={{
      minHeight: "100vh", background: "#04060F",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div className="af-loader" />
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingFallback />;
  if (!isAuthenticated) return <Redirect to="/login" />;
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingFallback />;
  if (isAuthenticated) return <Redirect to="/dashboard" />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <LoadingFallback />;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (user?.role !== "admin") return <Redirect to="/dashboard" />;
  return <>{children}</>;
}

function Page({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <ErrorBoundary section={label}>
      <Suspense fallback={<LoadingFallback />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        {() => <Page label="Landing"><PublicOnlyRoute><Landing /></PublicOnlyRoute></Page>}
      </Route>
      <Route path="/login">
        {() => <Page label="Login"><PublicOnlyRoute><Login /></PublicOnlyRoute></Page>}
      </Route>
      <Route path="/register">
        {() => <Page label="Register"><PublicOnlyRoute><Register /></PublicOnlyRoute></Page>}
      </Route>
      <Route path="/dashboard">
        {() => <Page label="Dashboard"><PrivateRoute><AppShell><Dashboard /></AppShell></PrivateRoute></Page>}
      </Route>
      <Route path="/workflows">
        {() => <Page label="Workflows"><PrivateRoute><AppShell><Workflows /></AppShell></PrivateRoute></Page>}
      </Route>
      <Route path="/workflows/:id">
        {({ id }) => (
          <Page label="WorkflowBuilder">
            <PrivateRoute><WorkflowBuilder id={id!} /></PrivateRoute>
          </Page>
        )}
      </Route>
      <Route path="/automations">
        {() => <Page label="Automations"><PrivateRoute><AppShell><Automations /></AppShell></PrivateRoute></Page>}
      </Route>
      <Route path="/ai">
        {() => <Page label="AI Assistant"><PrivateRoute><AppShell><AIChat /></AppShell></PrivateRoute></Page>}
      </Route>
      <Route path="/connections">
        {() => <Page label="Connections"><PrivateRoute><AppShell><Connections /></AppShell></PrivateRoute></Page>}
      </Route>
      <Route path="/plans">
        {() => <Page label="Plans"><PrivateRoute><AppShell><Plans /></AppShell></PrivateRoute></Page>}
      </Route>
      <Route path="/referrals">
        {() => <Page label="Referrals"><PrivateRoute><AppShell><Referrals /></AppShell></PrivateRoute></Page>}
      </Route>
      <Route path="/settings">
        {() => <Page label="Settings"><PrivateRoute><AppShell><Settings /></AppShell></PrivateRoute></Page>}
      </Route>
      <Route path="/admin">
        {() => <Page label="Admin"><AdminRoute><AppShell><Admin /></AppShell></AdminRoute></Page>}
      </Route>
      <Route path="/share/execution/:token">
        {({ token }) => (
          <Page label="Shared Execution">
            <Suspense fallback={<LoadingFallback />}>
              <SharedExecutionPage token={token!} />
            </Suspense>
          </Page>
        )}
      </Route>
      <Route path="/executions/:runId">
        {({ runId }) => (
          <Page label="Execution">
            <PrivateRoute><ExecutionPage runId={runId!} /></PrivateRoute>
          </Page>
        )}
      </Route>
      <Route>
        {() => <Page label="404"><Suspense fallback={null}><NotFound /></Suspense></Page>}
      </Route>
    </Switch>
  );
}

/**
 * AuthGatedWebSocket — mounts WebSocketProvider only when authenticated.
 * This ensures a single WS connection for the session and cleans up on logout.
 */
function BackendHydrationMount() {
  useBackendHydration();
  return null;
}

function AuthGatedWebSocket({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token } = useAuth();
  const authToken = isAuthenticated ? token() : null;
  return (
    <WebSocketProvider token={authToken}>
      <ExecutionHistoryProvider>
        <OrgProvider>
          <BackendHydrationMount />
          {children}
        </OrgProvider>
      </ExecutionHistoryProvider>
    </WebSocketProvider>
  );
}

function App() {
  return (
    <ErrorBoundary section="Application">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthGatedWebSocket>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") ?? ""}>
                <Router />
              </WouterRouter>
              <Toaster />
              <CriticalAlertToaster />
              <CommandPalette />
              <ConnectionStatus />
            </TooltipProvider>
          </AuthGatedWebSocket>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
