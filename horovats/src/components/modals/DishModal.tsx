import { type FC, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../context/StoreContext';
import type { Dish } from '../../types';
import './DishModal.css';
import dishImage from '../../assets/hero-img.jpg';
import { getImageUrl } from '../../utils/image';

interface DishModalProps {
  dish: Dish | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectDish?: (dish: Dish) => void;
}

const DishModal: FC<DishModalProps> = observer(({ dish, isOpen, onClose, onSelectDish }) => {
  const { cartStore, menuStore } = useStore();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !dish) return null;

  const handleAddToCart = () => {
    cartStore.addToCart(dish);
    onClose();
  };

  const recommendedDish = dish.recommendedDishId
    ? menuStore.dishes.find((d) => d.id === dish.recommendedDishId) || null
    : dish.recommendation
      ? menuStore.dishes.find((d) =>
          d.title.toLowerCase().includes(dish.recommendation!.toLowerCase()) ||
          dish.recommendation!.toLowerCase().includes(d.title.toLowerCase()),
        ) || null
      : null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        
        <div className="modal-body">
          <div className="modal-image-section">
            <img src={getImageUrl(dish.imageUrl) || dishImage} alt={dish.title} className="modal-image" />
          </div>
          
          <div className="modal-info-section">
            <div className="modal-header-info">
              <h2 className="modal-title">{dish.title}</h2>
              {dish.weight && <span className="modal-weight">{dish.weight}</span>}
            </div>
            
            <p className="modal-description">{dish.description}</p>
            
            <div className="modal-additional-info">
              <h3>Состав:</h3>
              <p>{dish.ingredients || 'Мясо, специи, лук репчатый, соус фирменный, лаваш.'}</p>
              
              {recommendedDish && (
                <div className="modal-recommendation" style={{ marginTop: '25px' }}>
                  <h3 style={{ marginBottom: '12px' }}>Рекомендуем добавить:</h3>
                  <div 
                    className="mini-dish-card" 
                    onClick={() => onSelectDish?.(recommendedDish)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '15px', padding: '12px',
                      borderRadius: '16px', backgroundColor: '#f9f9f9', cursor: 'pointer',
                      border: '1px solid #eee', transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f0f0f0';
                      e.currentTarget.style.borderColor = 'var(--color-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f9f9f9';
                      e.currentTarget.style.borderColor = '#eee';
                    }}
                  >
                    <img 
                      src={getImageUrl(recommendedDish.imageUrl) || dishImage} 
                      alt={recommendedDish.title} 
                      style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover' }} 
                    />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-secondary)' }}>{recommendedDish.title}</h4>
                      <span style={{ fontSize: '0.9rem', color: 'var(--color-primary)', fontWeight: 700 }}>{recommendedDish.price} ₽</span>
                    </div>
                    <div 
                      style={{ 
                        width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'white', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--color-primary)', fontSize: '1.2rem', fontWeight: 'bold',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        cartStore.addToCart(recommendedDish);
                      }}
                    >
                      +
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <div className="modal-price-container">
                <span className="modal-price-label">Цена:</span>
                <span className="modal-price-value">{dish.price} ₽</span>
              </div>
              <button className="modal-add-btn" onClick={handleAddToCart}>Добавить в корзину</button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.getElementById('root')!
  );
});

export default DishModal;
