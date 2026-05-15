import { type FC, useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../context/StoreContext';
import './Header.css';
import logo from '../../assets/logo-small.png';

const Header: FC = observer(() => {
  const { cartStore, authStore } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mobileNavOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
    return undefined;
  }, [mobileNavOpen]);

  const handleLogout = () => {
    authStore.logout();
    navigate('/');
  };

  const menuNavClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link ${isActive || location.pathname === '/' ? 'active' : ''}`;

  return (
    <header className="main-header">
      <div className="header-container">
        <Link to="/" className="header-logo">
          <img src={logo} alt="ХОРОВАЦ" className="logo-img" />
        </Link>

        <nav className="header-nav" aria-label="Основная навигация">
          <ul className="nav-list">
            <li>
              <NavLink to="/menu" className={menuNavClass}>
                Меню
              </NavLink>
            </li>
            <li><NavLink to="/offers" className="nav-link">Спец. предложения</NavLink></li>
            <li><NavLink to="/about" className="nav-link">О нас</NavLink></li>
            <li><NavLink to="/loyalty" className="nav-link">Программа лояльности</NavLink></li>
            <li><NavLink to="/contacts" className="nav-link">Контакты</NavLink></li>
            {authStore.isAuth && authStore.user?.role === 'admin' && (
              <li><NavLink to="/admin" className="nav-link nav-link--admin">Админ-панель</NavLink></li>
            )}
          </ul>
        </nav>

        <div className="header-actions">
          <a href="tel:+79153380040" className="phone-number">
            +7-(915)-338-00-40
          </a>
          <button type="button" className="cart-icon-btn" onClick={() => cartStore.setIsCartOpen(true)} aria-label="Корзина">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            {cartStore.totalItems > 0 && <span className="cart-badge">{cartStore.totalItems}</span>}
          </button>

          {authStore.isAuth ? (
            <div className="header-auth-buttons">
              <Link to="/profile" className="btn-login btn-login--profile">Профиль</Link>
              <button type="button" onClick={handleLogout} className="btn-login">Выйти</button>
            </div>
          ) : (
            <Link to="/auth" className="btn-login btn-login--link">Войти</Link>
          )}

          <button
            type="button"
            className={`header-burger${mobileNavOpen ? ' header-burger--open' : ''}`}
            onClick={() => setMobileNavOpen((o) => !o)}
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-nav"
            aria-label={mobileNavOpen ? 'Закрыть меню' : 'Открыть меню'}
          >
            <span className="header-burger-line" />
            <span className="header-burger-line" />
            <span className="header-burger-line" />
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        className={`mobile-nav${mobileNavOpen ? ' mobile-nav--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Меню сайта"
        aria-hidden={!mobileNavOpen}
      >
        <div className="mobile-nav__backdrop" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
        <div className="mobile-nav__panel">
          <div className="mobile-nav__head">
            <span className="mobile-nav__title">Разделы</span>
            <button
              type="button"
              className="mobile-nav__close"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Закрыть меню"
            >
              ×
            </button>
          </div>
          <nav className="mobile-nav__body" aria-label="Мобильная навигация">
            <ul className="mobile-nav__list">
              <li>
                <NavLink to="/menu" className={menuNavClass} onClick={() => setMobileNavOpen(false)}>
                  Меню
                </NavLink>
              </li>
              <li><NavLink to="/offers" className="nav-link" onClick={() => setMobileNavOpen(false)}>Спец. предложения</NavLink></li>
              <li><NavLink to="/about" className="nav-link" onClick={() => setMobileNavOpen(false)}>О нас</NavLink></li>
              <li><NavLink to="/loyalty" className="nav-link" onClick={() => setMobileNavOpen(false)}>Программа лояльности</NavLink></li>
              <li><NavLink to="/contacts" className="nav-link" onClick={() => setMobileNavOpen(false)}>Контакты</NavLink></li>
              {authStore.isAuth && authStore.user?.role === 'admin' && (
                <li>
                  <NavLink to="/admin" className="nav-link nav-link--admin" onClick={() => setMobileNavOpen(false)}>
                    Админ-панель
                  </NavLink>
                </li>
              )}
            </ul>
          </nav>
          <div className="mobile-nav__footer">
            <a href="tel:+79153380040" className="mobile-nav__phone">
              +7 (915) 338-00-40
            </a>
          </div>
        </div>
      </div>
    </header>
  );
});

export default Header;
