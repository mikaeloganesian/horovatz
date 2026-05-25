import { type FC, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import Header from './components/header';
import CartSidebar from './components/cart/CartSidebar';
import ModalRoot from './components/modals/ModalRoot';
import LoadingScreen from './components/loading/LoadingScreen';
import { useStore } from './context/StoreContext';
import './App.css';
import './style/colors.css';

import MenuPage from './pages/menu';
import OffersPage from './pages/offers';
import AboutPage from './pages/about';
import LoyaltyPage from './pages/loyalty';
import ContactsPage from './pages/contacts';
import AuthPage from './pages/auth';
import ProfilePage from './pages/profile';
import AdminPanel from './pages/admin';
import AdminNewOrderAlert from './components/admin/AdminNewOrderAlert';
import SiteFooter from './components/footer/SiteFooter';
import OfertaPage from './pages/legal/oferta';
import PrivacyPage from './pages/legal/privacy';
import PaymentReturnPage from './pages/payment-return';

const AnimatedRoutes: FC = () => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionClass, setTransitionClass] = useState('fade-in');

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionClass('fade-out');
    }
  }, [location.pathname, displayLocation.pathname]);

  const handleAnimationEnd = () => {
    if (transitionClass === 'fade-out') {
      setTransitionClass('fade-in');
      setDisplayLocation(location);
    }
  };

  return (
    <div className={transitionClass} onAnimationEnd={handleAnimationEnd}>
      <Routes location={displayLocation}>
        <Route path="/" element={<MenuPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/offers" element={<OffersPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/loyalty" element={<LoyaltyPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/oferta" element={<OfertaPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/payment/return" element={<PaymentReturnPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminPanel />} />
        {/* 404 заглушка */}
        <Route path="*" element={<div style={{padding: '40px'}}>Страница не найдена</div>} />
      </Routes>
    </div>
  );
};

const App: FC = observer(() => {
  const { menuStore } = useStore();
  const [splashExiting, setSplashExiting] = useState(false);
  const [splashMounted, setSplashMounted] = useState(true);

  useEffect(() => {
    document.body.style.overflow = splashMounted ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [splashMounted]);

  useEffect(() => {
    let cancelled = false;
    void menuStore.bootstrap().finally(() => {
      if (!cancelled) {
        setSplashExiting(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [menuStore]);

  return (
    <>
      {splashMounted && (
        <LoadingScreen
          exiting={splashExiting}
          onExited={() => setSplashMounted(false)}
        />
      )}
      <Router>
        <div className="App">
          <Header />

          <main className="app-container">
            <AnimatedRoutes />
          </main>

          <SiteFooter />

          <ModalRoot />
          <CartSidebar />
          <AdminNewOrderAlert />
        </div>
      </Router>
    </>
  );
});

export default App;