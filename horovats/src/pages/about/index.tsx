import { type FC } from 'react';
import './About.css';
import heroImg from '../../assets/hero-img.jpg';

const AboutPage: FC = () => {
  return (
    <div className="about-page">
      <header className="about-header">
        <h1 style={{ color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>О нас</h1>
        <p>Четыре концепции вкуса в одной доставке</p>
      </header>

      <div className="about-hero">
        <img src={heroImg} alt="Процесс приготовления блюд" className="about-hero-img" />
        <div className="about-hero-overlay">
          <h2>Объединяя лучшее</h2>
        </div>
      </div>

      <section className="about-content">
        <div className="about-text">
          <h2 style={{ color: 'var(--color-primary)' }}>Четыре ресторана. Одно место.</h2>
          <p>
            «ХОРОВАЦ» — это уникальный гастрономический проект, объединяющий под одной крышей сразу четыре разных ресторанных концепции. Мы собрали лучшие блюда разных кухонь, чтобы каждый в вашей компании мог найти то, что ему по душе.
          </p>
          <p>
            Вам больше не нужно идти на компромиссы или спорить, что заказать на ужин. Настоящий кавказский шашлык на углях, сочные крафтовые бургеры, классическая итальянская пицца на тонком тесте и свежие салаты — всё это готовится на одной большой кухне профессиональными шефами.
          </p>
        </div>
        <div className="about-text">
          <h2 style={{ color: 'var(--color-primary)' }}>Единая Premium доставка</h2>
          <p>
            Главное преимущество нашего проекта — возможность оформить заказ из разных ресторанов в одном чеке. Больше никаких ожиданий нескольких курьеров из разных концов города и переплат за доставку.
          </p>
          <p>
            Мы разработали единые стандарты качества и специальную термоупаковку, чтобы шашлык оставался горячим, салат — хрустящим, а пицца — ароматной. Наши курьеры доставляют весь ваш разнообразный заказ одновременно, быстро и аккуратно.
          </p>
        </div>
      </section>

      <section className="about-features">
        <div className="feature-card">
          <h3 className="feature-title">Разные кухни</h3>
          <p className="feature-desc">Огромный выбор блюд: от шашлыка до пиццы и бургеров. Каждый найдет любимое блюдо.</p>
        </div>
        <div className="feature-card">
          <h3 className="feature-title">Единый заказ</h3>
          <p className="feature-desc">Объединяйте разные концепции в одной корзине без переплат за доставку из разных мест.</p>
        </div>
        <div className="feature-card">
          <h3 className="feature-title">Premium упаковка</h3>
          <p className="feature-desc">Инновационные материалы сохраняют идеальную температуру и свежесть каждого блюда.</p>
        </div>
        <div className="feature-card">
          <h3 className="feature-title">Высокие стандарты</h3>
          <p className="feature-desc">Единый строгий контроль качества продуктов и приготовления во всех четырех направлениях.</p>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
