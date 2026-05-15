import { type FC } from 'react';
import './Offers.css';

import heroImg from '../../assets/hero-img.jpg';

const OffersPage: FC = () => {
  return (
    <div className="offers-page">
      <header className="offers-header">
        <h1 style={{ color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Спецпредложения</h1>
        <p>Лучшие акции и выгодные условия для наших гостей</p>
      </header>

      <div className="offers-hero">
        <img src={heroImg} alt="Бизнес-ланч" className="offers-hero-img" />
        <div className="offers-hero-overlay">
          <h2>Бизнес-ланчи</h2>
          <p>Вкусные и сытные обеды по будням с 12:00 до 16:00</p>
        </div>
      </div>

      <section className="offers-content-section">
        <div className="offers-text">
          <h2>Обедайте с удовольствием</h2>
          <p>
            Мы знаем, как важен полноценный обед в разгар рабочего дня. Наши бизнес-ланчи — это сочетание домашнего уюта и ресторанного качества.
          </p>
          <p>
            Каждую неделю мы обновляем меню ланчей, включая в него популярные блюда кавказской, европейской и азиатской кухонь. Вы можете выбрать один из трех вариантов сетов, которые включают суп, горячее, салат и напиток.
          </p>
          <div className="offers-highlight">
            <p>Стоимость полноценного бизнес-ланча — от 450 ₽</p>
          </div>
        </div>

        <div className="offers-text">
          <h2>Скидки для своих</h2>
          <p>
            Мы ценим наших постоянных гостей и хотим сделать ваши заказы еще приятнее. В «ХОРОВАЦ» действует накопительная система скидок, которая привязывается к вашему номеру телефона.
          </p>
          <p>
            Чем чаще вы заказываете у нас, тем выше ваша персональная скидка. Она рассчитывается автоматически при оформлении заказа через сайт и может достигать 20% на всё меню.
          </p>
          <p>
            Также мы дарим <b>скидку 15%</b> на весь заказ в ваш День Рождения (действует 3 дня до и 3 дня после праздника).
          </p>
        </div>
      </section>
    </div>
  );
};

export default OffersPage;
