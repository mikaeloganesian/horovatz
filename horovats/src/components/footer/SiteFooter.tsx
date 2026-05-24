import { type FC } from 'react';
import { Link } from 'react-router-dom';
import { LEGAL } from '../../constants/legal';
import './SiteFooter.css';

const SiteFooter: FC = () => (
  <footer className="site-footer">
    <nav className="site-footer__nav" aria-label="Юридическая информация">
      <Link to="/oferta">Публичная оферта</Link>
      <Link to="/privacy">Политика конфиденциальности</Link>
      <Link to="/loyalty">Доставка и оплата</Link>
      <Link to="/contacts">Контакты</Link>
    </nav>
    <p className="site-footer__requisites">
      {LEGAL.sellerLabel} · ИНН {LEGAL.inn} · ОГРНИП {LEGAL.ogrnip}
    </p>
    <p className="site-footer__copy">© 2026 {LEGAL.brand}. Premium доставка.</p>
  </footer>
);

export default SiteFooter;
