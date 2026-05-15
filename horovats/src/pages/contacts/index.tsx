import { type FC } from 'react';
import './Contacts.css';

const ContactsPage: FC = () => {
  return (
    <div className="contacts-page">
      <header className="contacts-header">
        <h1 style={{ color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Контакты</h1>
        <p>Мы всегда на связи, чтобы сделать ваш день вкуснее</p>
      </header>

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
          <h3 className="contact-card-title">Заказы по телефону</h3>
          <a href="tel:+79153380040" className="contact-card-value">+7 (915) 338-00-40</a>
        </div>
        
        <div className="contact-card">
          <h3 className="contact-card-title">График работы</h3>
          <div className="contact-card-value">Круглосуточно 24/7</div>
        </div>

        <div className="contact-card">
          <h3 className="contact-card-title">Адрес ресторана</h3>
          <div className="contact-card-value">
            ул. Сергия Радонежского, 29-31с4
          </div>
        </div>
      </div>

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
