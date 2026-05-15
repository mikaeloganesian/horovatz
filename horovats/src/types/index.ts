export interface Dish {
  id: string;
  title: string;
  description: string;
  price: number;
  weight?: string;
  categoryId: string;
  imageUrl?: string;
  ingredients?: string;
  recommendation?: string;
  recommendedDishId?: string;
}

export interface Category {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
}

export interface CartItem extends Dish {
  quantity: number;
}
