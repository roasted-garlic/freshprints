import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/hooks/use-cart";
import { AuthProvider } from "@/hooks/use-auth";
import { Layout } from "@/components/Layout";
import NotFound from "@/pages/not-found";

// Pages
import Home from "@/pages/Home";
import Shop from "@/pages/Shop";
import ProductDetails from "@/pages/ProductDetails";
import UploadPrint from "@/pages/UploadPrint";
import GangSheets from "@/pages/GangSheets";
import UploadGangSheet from "@/pages/UploadGangSheet";
import Builder from "@/pages/Builder";
import ShopifyTest from "@/pages/ShopifyTest";
import ShopifyProductDetails from "@/pages/ShopifyProductDetails";
import Account from "@/pages/Account";
import GangSheetDetails from "@/pages/GangSheetDetails";
import UploadSelect from "@/pages/UploadSelect";
import ShopSelect from "@/pages/ShopSelect";
import Cart from "@/pages/Cart";
import Contact from "@/pages/Contact";
import FAQ from "@/pages/FAQ";
import Search from "@/pages/Search";

const queryClient = new QueryClient();

function Router() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  // Full-screen routes — render outside Layout
  if (location === '/builder') return <Builder />;
  if (location === '/cart') return <Cart />;

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/shop" component={ShopSelect} />
        <Route path="/shop-prints" component={Shop} />
        <Route path="/shop-gang-sheets" component={GangSheets} />
        <Route path="/product/:id" component={ProductDetails} />
        <Route path="/upload-select" component={UploadSelect} />
        <Route path="/upload-print" component={UploadPrint} />
        <Route path="/gang-sheets" component={GangSheets} />
        <Route path="/upload-gang-sheet" component={UploadGangSheet} />
        <Route path="/shopify-test" component={ShopifyTest} />
        <Route path="/shopify-product/:handle" component={ShopifyProductDetails} />
        <Route path="/account" component={Account} />
        <Route path="/gang-sheet/:handle" component={GangSheetDetails} />
        <Route path="/contact" component={Contact} />
        <Route path="/faq" component={FAQ} />
        <Route path="/search" component={Search} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
