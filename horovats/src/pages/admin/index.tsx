import { type FC, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../../context/StoreContext';
import { Navigate } from 'react-router-dom';
import CategoriesSection from './CategoriesSection';
import DishesSection from './DishesSection';
import OrdersSection from './OrdersSection';
import UsersSection from './UsersSection';
import ToastStack from '../../components/toast/ToastStack';
import './Admin.css';

type Tab = 'categories' | 'dishes' | 'orders' | 'users';

const AdminPanel: FC = observer(() => {
  const { authStore, adminStore, menuStore, toastStore } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('categories');

  useEffect(() => {
    menuStore.fetchCategories();
    menuStore.fetchDishes();
  }, [menuStore]);

  useEffect(() => {
    adminStore.clearError();
  }, [activeTab, adminStore]);

  useEffect(() => {
    return () => toastStore.clear();
  }, [toastStore]);

  const refreshMenu = () => {
    menuStore.fetchCategories();
    menuStore.fetchDishes();
  };

  if (authStore.isLoading) {
    return <div className="admin-loading">Загрузка...</div>;
  }

  if (!authStore.isAuth || authStore.user?.role !== 'admin') {
    return <Navigate to="/" />;
  }

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <h1 className="admin-page__title">Админ-панель</h1>
        <p className="admin-page__subtitle">Управление меню, заказами и пользователями</p>
      </header>

      <nav className="admin-tabs" aria-label="Разделы админки">
        <button
          type="button"
          className={`admin-tab${activeTab === 'categories' ? ' admin-tab--active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          Категории
        </button>
        <button
          type="button"
          className={`admin-tab${activeTab === 'dishes' ? ' admin-tab--active' : ''}`}
          onClick={() => setActiveTab('dishes')}
        >
          Блюда
        </button>
        <button
          type="button"
          className={`admin-tab${activeTab === 'orders' ? ' admin-tab--active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Заказы
        </button>
        <button
          type="button"
          className={`admin-tab${activeTab === 'users' ? ' admin-tab--active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Пользователи
        </button>
      </nav>

      {adminStore.error && (
        <div className="admin-alert admin-alert--error" role="alert">
          {adminStore.error}
        </div>
      )}

      {activeTab === 'categories' && (
        <CategoriesSection menuStore={menuStore} adminStore={adminStore} onRefresh={refreshMenu} />
      )}
      {activeTab === 'dishes' && (
        <DishesSection menuStore={menuStore} adminStore={adminStore} onRefresh={refreshMenu} />
      )}
      {activeTab === 'orders' && <OrdersSection adminStore={adminStore} />}
      {activeTab === 'users' && (
        <UsersSection adminStore={adminStore} currentUserId={authStore.user!.id} />
      )}

      <ToastStack />
    </div>
  );
});

export default AdminPanel;
