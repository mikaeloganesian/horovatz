import { type FC, useRef, useState, useEffect } from 'react';
import type { Category } from '../../types';
import CategoryItem from './CategoryItem';
import './CategoryList.css';

interface CategoryListProps {
  categories: Category[];
  activeCategoryId: string;
  onCategoryChange: (id: string) => void;
}

const CategoryList: FC<CategoryListProps> = ({ categories, activeCategoryId, onCategoryChange }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftFade(scrollLeft > 10);
      setShowRightFade(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
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
  }, [categories]);

  useEffect(() => {
    // Прокручиваем активную категорию в центр при изменении
    const activeEl = scrollRef.current?.querySelector('.category-item.active');
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [activeCategoryId]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0));
    setScrollLeftState(scrollRef.current?.scrollLeft || 0);
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
      scrollRef.current.scrollLeft = scrollLeftState - walk;
    }
  };

  return (
    <div className={`category-list-container ${showLeftFade ? 'has-left-fade' : ''} ${showRightFade ? 'has-right-fade' : ''}`}>
      <div 
        className={`category-list-wrapper ${isDragging ? 'dragging' : ''}`} 
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        <div className="category-list">
          {categories.map((category) => (
            <CategoryItem
              key={category.id}
              id={category.id}
              title={category.title}
              icon={category.icon}
              isActive={category.id === activeCategoryId}
              onClick={onCategoryChange}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryList;
