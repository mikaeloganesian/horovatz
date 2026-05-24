import { type FC } from 'react';
import { Link } from 'react-router-dom';
import { LEGAL } from '../../constants/legal';
import './Contacts.css';

const YANDEX_EDA_RESTAURANTS = [
  {
    name: 'Мукузани',
    url: 'https://eda.yandex.ru/r/mukuzani_gruzinskaa_kuhna_saslyki?placeSlug=mukuzani_b3cxm',
  },
  {
    name: 'Пури & Мания',
    url: 'https://eda.yandex.ru/r/puri_mania_gruzia_premium?placeSlug=shaurma_7dxwb',
  },
  {
    name: 'Грузинская душа',
    url: 'https://eda.yandex.ru/r/mukuzani_gruzinskaa_kuhna_saslyki?placeSlug=gruzinskaya_dusha',
  },
  {
    name: 'Фестиваль хинкали',
    url: 'https://eda.yandex.ru/r/cajhana_ip_sanoan?placeSlug=chajxana_rmdt6',
  },
] as const;

const ContactsPage: FC = () => {
  return (
    <div className="contacts-page">
      <header className="contacts-header">
        <h1 style={{ color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Контакты</h1>
        <p>Мы всегда на связи, чтобы сделать ваш день вкуснее</p>
      </header>

      <section className="contacts-intro">
        <p>
          <strong>horovats.ru</strong> — объединение наших ресторанов. На сайте вы видите общее меню и можете
          оформить заказ на доставку; каждый ресторан также доступен отдельно в Яндекс Еде.
        </p>
      </section>

      <section className="contacts-content">
        <div className="contacts-text">
          <h2>Работаем 24/7</h2>
          <p>
            Наша команда работает круглосуточно, чтобы вы могли насладиться любимыми блюдами в любое время. Если у вас возникли вопросы по заказу или качеству обслуживания, наш оператор всегда готов помочь.
          </p>
          <p>
            Мы ценим каждого гостя и стремимся сделать сервис максимально удобным и быстрым. Ваша обратная связь помогает нам становиться лучше.
          </p>
        </div>
        <div className="contacts-text">
          <h2>Где мы находимся</h2>
          <p>
            Наше производство и точка самовывоза расположены в историческом районе Москвы, всего в паре минут ходьбы от метро.
          </p>
          <p>
            Приезжайте к нам в гости, чтобы забрать заказ самостоятельно со скидкой или просто познакомиться с нашей командой. Мы всегда рады видеть ценителей качественной кухни.
          </p>
        </div>
      </section>

      <div className="contacts-grid">
        <div className="contact-card">
          <h3 className="contact-card-title">Продавец</h3>
          <div className="contact-card-value">{LEGAL.sellerLabel}</div>
        </div>

        <div className="contact-card">
          <h3 className="contact-card-title">Заказы по телефону</h3>
          <a href={`tel:${LEGAL.orderPhoneHref}`} className="contact-card-value">{LEGAL.orderPhone}</a>
        </div>

        <div className="contact-card">
          <h3 className="contact-card-title">Email</h3>
          <a href={`mailto:${LEGAL.email}`} className="contact-card-value">{LEGAL.email}</a>
        </div>

        <div className="contact-card">
          <h3 className="contact-card-title">График работы</h3>
          <div className="contact-card-value">Круглосуточно 24/7</div>
        </div>

        <div className="contact-card">
          <h3 className="contact-card-title">Юридический адрес</h3>
          <div className="contact-card-value">{LEGAL.address}</div>
        </div>

        <div className="contact-card">
          <h3 className="contact-card-title">Адрес ресторана</h3>
          <div className="contact-card-value">{LEGAL.pickupAddress}</div>
        </div>

        <div className="contact-card">
          <h3 className="contact-card-title">ИНН</h3>
          <div className="contact-card-value">{LEGAL.inn}</div>
        </div>

        <div className="contact-card">
          <h3 className="contact-card-title">ОГРНИП</h3>
          <div className="contact-card-value">{LEGAL.ogrnip}</div>
        </div>

        <div className="contact-card contact-card--eda">
          <h3 className="contact-card-title">Заказ в Яндекс Еде</h3>
          <p className="contact-card-note">Каждый ресторан — отдельно в приложении</p>
          <ul className="contact-eda-links">
            {YANDEX_EDA_RESTAURANTS.map((restaurant) => (
              <li key={restaurant.name}>
                <a
                  href={restaurant.url}
                  className="contact-eda-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {restaurant.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="contacts-legal-links">
        <Link to="/oferta">Публичная оферта</Link>
        {' · '}
        <Link to="/privacy">Политика конфиденциальности</Link>
      </p>

      <div className="map-container">
        <iframe
          src="https://yandex.ru/map-widget/v1/?text=Москва,+улица+Сергия+Радонежского,+29-31с4&z=16"
          allowFullScreen={true}
          loading="lazy"
          title="Карта расположения ресторана ХОРОВАЦ"
        ></iframe>
      </div>
    </div>
  );
};

export default ContactsPage;
