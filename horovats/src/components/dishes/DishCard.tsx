import { type FC } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../context/StoreContext';
import type { Dish } from '../../types';
import './DishCard.css';
import dishImage from '../../assets/hero-img.jpg';
import { getImageUrl } from '../../utils/image';

interface DishCardProps extends Omit<Dish, 'categoryId' | 'ingredients'> {
  categoryId?: string;
  ingredients?: string;
  onClick?: () => void;
}

const DishCard: FC<DishCardProps> = observer(({ id, title, description, price, weight, categoryId, imageUrl, ingredients, recommendation, recommendedDishId, onClick }) => {
  const { cartStore } = useStore();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    cartStore.addToCart({
      id,
      title,
      description,
      price,
      weight,
      categoryId: categoryId || '',
      imageUrl,
      ingredients,
      recommendation,
      recommendedDishId,
    });
  };

  return (
    <div className="dish-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="dish-image-container">
        <div className="dish-image-wrapper">
          <img src={getImageUrl(imageUrl) || dishImage} alt={title} className="dish-image" />
          {weight && <span className="dish-weight">{weight}</span>}
        </div>
      </div>
      
      <div className="dish-info">
        <h3 className="dish-title">{title}</h3>
        <p className="dish-description">{description}</p>
        
        <div className="dish-footer">
          <span className="dish-price">{price} ₽</span>
          <button 
            type="button" 
            className="btn-add-to-cart"
            onClick={handleAddToCart}
          >
            В корзину
          </button>
        </div>
      </div>
    </div>
  );
});

export default DishCard;
