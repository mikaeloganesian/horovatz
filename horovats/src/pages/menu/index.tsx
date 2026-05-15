import { type FC, useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../context/StoreContext';
import type { Dish } from '../../types';
import CategoryList from '../../components/categories/CategoryList';
import DishCard from '../../components/dishes/DishCard';
import DishModal from '../../components/modals/DishModal';
import CategorySection from '../../components/menu-sections/CategorySection';
import './MenuPage.css';

const MenuPage: FC = observer(() => {
  const { menuStore } = useStore();
  const { categories, dishes, isLoading } = menuStore;

  const [activeCategory, setActiveCategory] = useState('all');
  const [displayedCategory, setDisplayedCategory] = useState('all');
  const [transitionClass, setTransitionClass] = useState('fade-in');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);

  useEffect(() => {
    menuStore.fetchCategories();
    menuStore.fetchDishes();
  }, [menuStore]);

  if (activeCategory !== displayedCategory && transitionClass !== 'fade-out') {
    setTransitionClass('fade-out');
  }

  const handleCategoryChange = (newCategory: string) => {
    if (newCategory !== activeCategory) {
      setActiveCategory(newCategory);
    }
  };

  const handleAnimationEnd = () => {
    if (transitionClass === 'fade-out') {
      setDisplayedCategory(activeCategory);
      setTransitionClass('fade-in');
    }
  };

  const filteredDishes = dishes.filter(dish => 
    (displayedCategory === 'all' || dish.categoryId === displayedCategory) && 
    dish.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <div className="menu-loading">Загрузка меню...</div>;
  }

  return (
    <div className="menu-page">
      <section className="menu-header">
        <div className="title-group">
          <h1 className="menu-title">Наше Меню</h1>
          <p className="menu-subtitle">Выбирайте лучшее из нашей кухни</p>
        </div>

        <div className="search-container">
          <input
            type="search"
            className="menu-search-input"
            placeholder="Поиск блюд..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
            enterKeyHint="search"
          />
        </div>
      </section>

      <CategoryList 
        categories={categories} 
        activeCategoryId={activeCategory} 
        onCategoryChange={handleCategoryChange} 
      />

      <div
        className={`menu-content menu-content-inner ${transitionClass}`}
        onAnimationEnd={handleAnimationEnd}
      >
        {displayedCategory === 'all' && !searchQuery ? (
          <div className="menu-category-stack">
            {categories.filter(c => c.id !== 'all').map(category => (
              <CategorySection
                key={category.id}
                title={category.title}
                subtitle={category.subtitle}
                dishes={dishes.filter(d => d.categoryId === category.id)}
                onDishClick={setSelectedDish}
              />
            ))}
          </div>
        ) : filteredDishes.length > 0 ? (
          <div className="category-grid-container">
            <div className="menu-spacer" />
            <div
              className={
                displayedCategory === 'all'
                  ? 'menu-dish-grid menu-dish-grid--auto-fill'
                  : 'menu-dish-grid menu-dish-grid--five-cols'
              }
            >
              {filteredDishes.map(dish => (
                <DishCard key={dish.id} {...dish} onClick={() => setSelectedDish(dish)} />
              ))}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>
            <p style={{ fontSize: '1.2rem' }}>Ничего не найдено</p>
          </div>
        )}
      </div>

      <DishModal 
        dish={selectedDish} 
        isOpen={!!selectedDish} 
        onClose={() => setSelectedDish(null)} 
        onSelectDish={setSelectedDish}
      />
    </div>
  );
});

export default MenuPage;
