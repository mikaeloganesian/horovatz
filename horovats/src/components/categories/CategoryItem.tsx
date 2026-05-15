import { type FC } from 'react';
import './CategoryItem.css';

interface CategoryItemProps {
  id: string;
  title: string;
  icon?: string;
  isActive?: boolean;
  onClick: (id: string) => void;
}

const CategoryItem: FC<CategoryItemProps> = ({ id, title, isActive, onClick }) => {
  return (
    <button 
      className={`category-item ${isActive ? 'active' : ''}`}
      onClick={() => onClick(id)}
    >
      <span className="category-title">{title}</span>
    </button>
  );
};

export default CategoryItem;
