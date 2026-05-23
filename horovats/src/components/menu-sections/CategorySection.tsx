import { type FC, useRef, useState, useEffect } from 'react';
import type { Dish } from '../../types';
import DishCard from '../dishes/DishCard';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import './CategorySection.css';

interface CategorySectionProps {
  title: string;
  subtitle?: string;
  dishes: Dish[];
  onDishClick: (dish: Dish) => void;
}

const CategorySection: FC<CategorySectionProps> = ({ title, subtitle, dishes, onDishClick }) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isVisible, setIsVisible] = useState(!isMobile);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  useEffect(() => {
    if (!isMobile) {
      setIsVisible(true);
      return;
    }

    setIsVisible(false);
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '240px 0px', threshold: 0.01 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isMobile, title]);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftFade(scrollLeft > 10);
      setShowRightFade(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    if (!isVisible) return;
    checkScroll();
    const scrollEl = scrollRef.current;
    if (scrollEl) {
      scrollEl.addEventListener('scroll', checkScroll);
    }
    window.addEventListener('resize', checkScroll);

    return () => {
      if (scrollEl) {
        scrollEl.removeEventListener('scroll', checkScroll);
      }
      window.removeEventListener('resize', checkScroll);
    };
  }, [dishes, isVisible]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0));
    setScrollLeft(scrollRef.current?.scrollLeft || 0);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (scrollRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2;
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  if (dishes.length === 0) return null;

  if (!isVisible) {
    return (
      <div ref={sectionRef} className="category-section category-section--placeholder">
        <h2 className="category-section-title">{title}</h2>
        {subtitle && <p className="category-section-subtitle">{subtitle}</p>}
        <div className="category-section-skeleton" aria-hidden />
      </div>
    );
  }

  return (
    <div ref={sectionRef} className="category-section">
      <h2 className="category-section-title">{title}</h2>
      {subtitle && <p className="category-section-subtitle">{subtitle}</p>}
      <div className={`category-section-scroll-container ${showLeftFade ? 'has-left-fade' : ''} ${showRightFade ? 'has-right-fade' : ''}`}>
        <div
          className={`category-section-scroll ${isDragging ? 'dragging' : ''}`}
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          <div className="category-section-inner">
            {dishes.map((dish) => (
              <div key={dish.id} className="category-section-item">
                <DishCard {...dish} onClick={() => onDishClick(dish)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategorySection;
