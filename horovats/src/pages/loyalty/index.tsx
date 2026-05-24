import { type FC } from 'react';
import { Link } from 'react-router-dom';
import { LEGAL } from '../../constants/legal';
import './Loyalty.css';

const LoyaltyPage: FC = () => {
  return (
    <div className="loyalty-page">
      <header className="loyalty-header">
        <h1 style={{ color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Доставка и Лояльность</h1>
        <p>Выгодные условия и быстрая доставка для наших любимых клиентов</p>
      </header>

      <section className="loyalty-content">
        <div className="loyalty-text">
          <h2>Условия доставки</h2>
          <p>Мы осуществляем быструю доставку горячих блюд <b>в пределах Третьего транспортного кольца (ТТК)</b>.</p>
          <p>Ориентировочное время доставки составляет <b>от 30 минут до 1.5 часов</b> в зависимости от загруженности дорог и объема заказа. Наша специальная термоупаковка гарантирует, что шашлык приедет к вам горячим, а салаты останутся свежими.</p>

          <div className="loyalty-notice">
            <p>Сразу после оформления заказа на сайте с вами свяжется наш оператор для подтверждения точного адреса и времени доставки.</p>
          </div>
          <p>
            Стоимость доставки — <b>{LEGAL.deliveryFeeRub} ₽</b> (бесплатно при заказе от 10 000 ₽).
            Оплата на сайте — банковской картой через сервис <b>ЮKassa</b>. Подробнее — в{' '}
            <Link to="/oferta">публичной оферте</Link>.
          </p>
        </div>

        <div className="loyalty-text">
          <h2>Программа лояльности</h2>
          <p>Наша система скидок работает <b>полностью автоматически</b>.</p>
          <p>Вам не нужно вводить промокоды или собирать баллы. Процент скидки будет рассчитан и применен к вашей корзине моментально в зависимости от общей суммы всех блюд в вашем заказе.</p>
        </div>
      </section>

      <div className="loyalty-grid">
        <div className="loyalty-card">
          <div className="loyalty-card-value">-10%</div>
          <div className="loyalty-card-title">От 3 000 ₽</div>
          <div className="loyalty-card-desc">Базовая скидка на весь ассортимент в вашей корзине.</div>
        </div>

        <div className="loyalty-card">
          <div className="loyalty-card-value">-15%</div>
          <div className="loyalty-card-title">От 5 000 ₽</div>
          <div className="loyalty-card-desc">Повышенная скидка для больших компаний и крупных заказов.</div>
        </div>

        <div className="loyalty-card" style={{ background: 'var(--color-primary)', color: 'white' }}>
          <div className="loyalty-card-value" style={{ color: 'white' }}>-20%</div>
          <div className="loyalty-card-title">От 10 000 ₽</div>
          <div className="loyalty-card-desc" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Максимальная скидка на весь заказ<br /><b style={{ color: 'white' }}>+ Бесплатная доставка</b>.
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoyaltyPage;
