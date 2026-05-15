import { type FC, useRef, useState, useEffect } from 'react';
import type { Dish } from '../../types';
import DishCard from '../dishes/DishCard';
import './CategorySection.css';

interface CategorySectionProps {
  title: string;
  subtitle?: string;
  dishes: Dish[];
  onDishClick: (dish: Dish) => void;
}

const CategorySection: FC<CategorySectionProps> = ({ title, subtitle, dishes, onDishClick }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftFade(scrollLeft > 10);
      setShowRightFade(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    // Добавляем слушатель события прокрутки
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
  }, [dishes]);

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
    const walk = (x - startX) * 2; // Множитель скорости прокрутки
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  if (dishes.length === 0) return null;

  return (
    <div className="category-section">
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
